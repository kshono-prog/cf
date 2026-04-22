/* app/api/projects/[projectId]/payment-intents/[paymentIntentId]/reverify/route.ts
 *
 * PaymentIntent に紐づく contribution を再検証し、RewardTier の readiness を再計算する。
 * 既存の contribution 再検証ロジックを直接呼ぶのではなく、txHash ベースの再検証を内部で完結させる。
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  isAddress,
  parseAbiItem,
  parseUnits,
  type Address,
} from "viem";
import { polygon, polygonAmoy, avalanche, avalancheFuji } from "viem/chains";
import { isSupportedChainId, type SupportedChainId } from "@/lib/chainConfig";
import { getTokenOnChain } from "@/lib/tokenRegistry";
import { getBridgeRuntimeEnv } from "@/lib/env";
import { Prisma } from "@prisma/client";
import { applyConfirmedContributionToPostTips } from "@/lib/social";
import { tryAutoAchieveGoal } from "@/lib/goalAutoAchieve";
import { recalcAndPersistRewardTierProduction } from "@/lib/rewardTierService";
import { toPaymentIntentDetailDto } from "@/lib/paymentIntents";
import { isUuidString } from "@/lib/social";

export const dynamic = "force-dynamic";

type Params = { projectId: string; paymentIntentId: string };

type Currency = "JPYC" | "USDC";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);
const ERC20_DECIMALS_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

const bridgeRuntimeEnv = getBridgeRuntimeEnv();

function getRpcUrl(chainId: number): string | null {
  if (chainId === 137) return bridgeRuntimeEnv.polygonRpcUrl;
  if (chainId === 80002) return bridgeRuntimeEnv.polygonAmoyRpcUrl;
  if (chainId === 43114) return bridgeRuntimeEnv.avalancheRpcUrl;
  if (chainId === 43113) return bridgeRuntimeEnv.avalancheFujiRpcUrl;
  return null;
}

function getViemChain(chainId: number) {
  if (chainId === 137) return polygon;
  if (chainId === 80002) return polygonAmoy;
  if (chainId === 43114) return avalanche;
  if (chainId === 43113) return avalancheFuji;
  return null;
}

function resolveTokenAddress(chainId: number, currency: Currency): Address | null {
  if (!isSupportedChainId(chainId)) return null;
  const token = getTokenOnChain(currency, chainId as SupportedChainId);
  if (!token) return null;
  return isAddress(token.address) ? getAddress(token.address) : null;
}

async function verifyTransfer(params: {
  chainId: number;
  currency: Currency;
  txHash: `0x${string}`;
  from: Address;
  to: Address;
  amountHuman: string;
}): Promise<
  | { ok: true; decimals: number; valueRaw: bigint; blockNumber: bigint }
  | { ok: false; reason: string }
> {
  const rpcUrl = getRpcUrl(params.chainId);
  const chain = getViemChain(params.chainId);
  if (!rpcUrl || !chain) {
    return { ok: false, reason: "UNSUPPORTED_CHAIN_OR_MISSING_RPC" };
  }
  const token = resolveTokenAddress(params.chainId, params.currency);
  if (!token) return { ok: false, reason: "TOKEN_NOT_CONFIGURED_ON_CHAIN" };
  const client = createPublicClient({ chain, transport: http(rpcUrl) });
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: params.txHash });
  } catch {
    return { ok: false, reason: "RECEIPT_NOT_FOUND_YET" };
  }
  if (!receipt) return { ok: false, reason: "RECEIPT_NOT_FOUND_YET" };
  if (receipt.status !== "success") return { ok: false, reason: "TX_REVERTED" };

  let decimals: number;
  try {
    const d = await client.readContract({
      address: token,
      abi: ERC20_DECIMALS_ABI,
      functionName: "decimals",
    });
    decimals = Number(d);
    if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) {
      return { ok: false, reason: "INVALID_DECIMALS" };
    }
  } catch {
    return { ok: false, reason: "DECIMALS_READ_FAILED" };
  }

  let expectedRaw: bigint;
  try {
    expectedRaw = parseUnits(params.amountHuman, decimals);
  } catch {
    return { ok: false, reason: "AMOUNT_PARSE_FAILED" };
  }

  const tokenLower = token.toLowerCase();
  for (const log of receipt.logs) {
    if (!log.address) continue;
    if (log.address.toLowerCase() !== tokenLower) continue;
    try {
      const decoded = decodeEventLog({
        abi: [TRANSFER_EVENT],
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Transfer") continue;
      const lf = decoded.args.from as Address;
      const lt = decoded.args.to as Address;
      const lv = decoded.args.value as bigint;
      if (
        lf.toLowerCase() === params.from.toLowerCase() &&
        lt.toLowerCase() === params.to.toLowerCase() &&
        lv === expectedRaw
      ) {
        return {
          ok: true,
          decimals,
          valueRaw: lv,
          blockNumber: receipt.blockNumber,
        };
      }
    } catch {
      continue;
    }
  }
  return { ok: false, reason: "TRANSFER_LOG_NOT_FOUND_OR_MISMATCH" };
}

function toAddr(v: string): Address {
  if (!isAddress(v)) throw new Error("INVALID_ADDRESS");
  return getAddress(v);
}

export async function POST(_req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId, paymentIntentId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");
    if (!isUuidString(paymentIntentId)) {
      return errJson("PAYMENT_INTENT_ID_INVALID", 400);
    }

    const intent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        contribution: true,
      },
    });
    if (!intent || intent.projectId !== pid) {
      return errJson("PAYMENT_INTENT_NOT_FOUND", 404);
    }
    if (!intent.contribution || !intent.contributionId) {
      return errJson("CONTRIBUTION_NOT_LINKED", 409);
    }

    const contribution = intent.contribution;

    if (contribution.status === "CONFIRMED") {
      // 既に CONFIRMED なら readiness 再計算のみ行う
      if (intent.rewardTierId) {
        await recalcAndPersistRewardTierProduction({
          db: prisma,
          tierId: intent.rewardTierId,
        });
      }
    } else {
      const amountHuman = contribution.amountDecimal
        ? (contribution.amountDecimal as Prisma.Decimal).toString()
        : "";
      if (!amountHuman) return errJson("AMOUNT_DECIMAL_MISSING", 400);

      const v = await verifyTransfer({
        chainId: contribution.chainId,
        currency: contribution.currency as Currency,
        txHash: contribution.txHash as `0x${string}`,
        from: toAddr(contribution.fromAddress),
        to: toAddr(contribution.toAddress),
        amountHuman,
      });

      if (v.ok) {
        const now = new Date();
        await prisma.$transaction(async (tx) => {
          const next = await tx.contribution.update({
            where: { id: contribution.id },
            data: {
              status: "CONFIRMED",
              confirmedAt: now,
              decimals: v.decimals,
              amountRaw: v.valueRaw.toString(),
              updatedAt: now,
            },
          });
          if (next.currency === "JPYC" || next.currency === "USDC") {
            await applyConfirmedContributionToPostTips({
              tx,
              contributionId: next.id,
              currency: next.currency,
              amountDecimal: next.amountDecimal
                ? (next.amountDecimal as Prisma.Decimal)
                : null,
              now,
            });
          }
        });

        try {
          await tryAutoAchieveGoal({
            db: prisma,
            projectId: contribution.projectId,
            now,
          });
        } catch (e) {
          console.warn("GOAL_AUTO_ACHIEVE_FAILED", e);
        }

        if (intent.rewardTierId) {
          await recalcAndPersistRewardTierProduction({
            db: prisma,
            tierId: intent.rewardTierId,
          });
        }
      }
    }

    const refreshed = await prisma.paymentIntent.findUnique({
      where: { id: intent.id },
      include: {
        rewardTier: {
          select: {
            id: true,
            title: true,
            priceJpyc: true,
            currency: true,
            productionStatus: true,
          },
        },
        contribution: {
          select: {
            id: true,
            status: true,
            txHash: true,
            fromAddress: true,
            toAddress: true,
            confirmedAt: true,
          },
        },
        items: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!refreshed) return errJson("PAYMENT_INTENT_NOT_FOUND", 404);

    const dto = toPaymentIntentDetailDto({
      id: refreshed.id,
      projectId: refreshed.projectId,
      storedStatus: refreshed.status,
      expectedAmountJpyc: refreshed.expectedAmountJpyc,
      currency: refreshed.currency,
      chainId: refreshed.chainId,
      quantity: refreshed.quantity,
      customerLabel: refreshed.customerLabel,
      recipientAddress: refreshed.recipientAddress,
      note: refreshed.note,
      purposeId: refreshed.purposeId,
      expiresAt: refreshed.expiresAt,
      canceledAt: refreshed.canceledAt,
      createdAt: refreshed.createdAt,
      rewardTier: refreshed.rewardTier,
      contribution: refreshed.contribution,
      items: refreshed.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        unitPriceJpyc: item.unitPriceJpyc,
        quantity: item.quantity,
        subtotalJpyc: item.subtotalJpyc,
      })),
    });

    return okJson({ ok: true, paymentIntent: dto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PAYMENT_INTENT_REVERIFY_FAILED", e);
    return errJson("PAYMENT_INTENT_REVERIFY_FAILED", 500);
  }
}
