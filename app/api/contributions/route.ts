/* app/api/contributions/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Contribution, Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toNonEmptyString,
  toBigIntOrThrow,
  toAddressOrNull,
} from "@/lib/api/guards";
import {
  applyConfirmedContributionToPostTips,
  ensurePostTipLink,
  isUuidString,
} from "@/lib/social";
import { recordFirstTipReceivedIfNeeded } from "@/lib/growth/firstTip";
import { awardExpFireAndForget } from "@/lib/rpg/awardExpHelper";
import { getRpcUrl as getRpcUrlFromLib } from "../_lib/chain";
import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  isAddress,
  isHash,
  parseAbiItem,
  parseUnits,
  type Address,
} from "viem";
import { mainnet, polygon, avalanche } from "viem/chains";
import { isSupportedChainId, type SupportedChainId } from "@/lib/chainConfig";
import { getTokenOnChain } from "@/lib/tokenRegistry";

import { toCurrency, type CurrencyCode } from "@/lib/currencyUtils";

export const dynamic = "force-dynamic";

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

type Currency = CurrencyCode;

type ContributionPostBody = {
  contributionId?: unknown; // UUID string
  projectId?: unknown; // string (BigInt as string)
  purposeId?: unknown; // string|null|undefined
  chainId?: unknown;
  currency?: unknown; // "JPYC"|"USDC"
  txHash?: unknown;
  fromAddress?: unknown;
  toAddress?: unknown;
  amount?: unknown; // human string
  postId?: unknown; // UUID string|null|undefined
  message?: unknown; // optional supporter message
};

function toChainId(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

/**
 * 本番チェーンのみ許可（テストネットは完全に拒否）
 * - Ethereum: 1
 * - Polygon: 137
 * - Avalanche: 43114
 */
const MAINNET_ONLY_CHAIN_IDS = new Set<number>([1, 137, 43114]);

function isMainnetOnlyChainId(chainId: number): chainId is SupportedChainId {
  return MAINNET_ONLY_CHAIN_IDS.has(chainId) && isSupportedChainId(chainId);
}

function getViemChain(chainId: number) {
  // テストネットはここに存在させない
  if (chainId === 1) return mainnet;
  if (chainId === 137) return polygon;
  if (chainId === 43114) return avalanche;
  return null;
}

function resolveTokenAddress(params: {
  chainId: number;
  currency: Currency;
}): Address | null {
  if (!isMainnetOnlyChainId(params.chainId)) return null;

  const token = getTokenOnChain(
    params.currency,
    params.chainId as SupportedChainId
  );
  if (!token) return null;

  return isAddress(token.address) ? getAddress(token.address) : null;
}

function normalizeTo18(amountHuman: string): string {
  const s = amountHuman.replace(/[^\d.]/g, "");
  if (!s) return "0.000000000000000000";
  const [iRaw, dRaw = ""] = s.split(".");
  const i = iRaw && iRaw.length > 0 ? iRaw : "0";
  const d18 = (dRaw + "0".repeat(18)).slice(0, 18);

  let intPart = "0";
  try {
    intPart = String(BigInt(i));
  } catch {
    intPart = "0";
  }

  return `${intPart}.${d18}`;
}

function parseBody(raw: unknown):
  | {
      ok: true;
      projectIdStr: string;
      contributionId: string | null;
      purposeIdStr: string | null | undefined;
      chainId: number;
      currency: Currency;
      txHash: `0x${string}`;
      from: Address;
      to: Address;
      amountHuman: string;
      postIdStr: string | null | undefined;
      message: string | null;
    }
  | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "INVALID_JSON" };
  const b = raw as ContributionPostBody;

  const projectIdStr = toNonEmptyString(b.projectId);
  if (!projectIdStr) return { ok: false, error: "PROJECT_ID_REQUIRED" };

  const contributionIdRaw =
    typeof b.contributionId === "string" ? b.contributionId.trim() : "";
  const contributionId = contributionIdRaw.length > 0 ? contributionIdRaw : null;
  if (contributionId !== null && !isUuidString(contributionId)) {
    return { ok: false, error: "CONTRIBUTION_ID_INVALID" };
  }

  let purposeIdStr: string | null | undefined = undefined;
  if (b.purposeId === null) {
    purposeIdStr = null;
  } else if (typeof b.purposeId === "string") {
    const s = b.purposeId.trim();
    purposeIdStr = s ? s : null;
  } else if (typeof b.purposeId === "undefined") {
    purposeIdStr = undefined;
  } else {
    return { ok: false, error: "PURPOSE_ID_INVALID" };
  }

  const chainId = toChainId(b.chainId);
  if (chainId == null) return { ok: false, error: "CHAIN_ID_REQUIRED" };

  // ✅ ここで「テストネットは拒否」
  if (!isMainnetOnlyChainId(chainId)) {
    return { ok: false, error: "CHAIN_ID_NOT_ALLOWED" };
  }

  const currency = toCurrency(b.currency);
  if (!currency) return { ok: false, error: "CURRENCY_REQUIRED" };

  const txHashStr = toNonEmptyString(b.txHash);
  if (!txHashStr) return { ok: false, error: "TX_HASH_REQUIRED" };
  if (!isHash(txHashStr)) return { ok: false, error: "TX_HASH_INVALID" };

  const from = toAddressOrNull(toNonEmptyString(b.fromAddress));
  const to = toAddressOrNull(toNonEmptyString(b.toAddress));
  if (!from || !to) return { ok: false, error: "FROM_TO_ADDRESS_REQUIRED" };

  const amountHuman = toNonEmptyString(b.amount);
  if (!amountHuman) return { ok: false, error: "AMOUNT_REQUIRED" };

  let postIdStr: string | null | undefined = undefined;
  if (b.postId === null) {
    postIdStr = null;
  } else if (typeof b.postId === "string") {
    const trimmed = b.postId.trim();
    if (!trimmed) {
      postIdStr = null;
    } else {
      if (!isUuidString(trimmed)) return { ok: false, error: "POST_ID_INVALID" };
      postIdStr = trimmed;
    }
  } else if (typeof b.postId !== "undefined") {
    return { ok: false, error: "POST_ID_INVALID" };
  }

  let message: string | null = null;
  if (typeof b.message === "string") {
    const trimmed = b.message.trim();
    message = trimmed.length > 0 ? trimmed.slice(0, 500) : null;
  }

  return {
    ok: true,
    projectIdStr,
    contributionId,
    purposeIdStr,
    chainId,
    currency,
    txHash: txHashStr as `0x${string}`,
    from,
    to,
    amountHuman,
    postIdStr,
    message,
  };
}

async function verifyAndExtract(params: {
  chainId: number;
  currency: Currency;
  txHash: `0x${string}`;
  expectedFrom: Address;
  expectedTo: Address;
  expectedAmountHuman: string;
}): Promise<
  | { ok: true; decimals: number; valueRaw: bigint; blockNumber: bigint }
  | { ok: false; reason: string }
> {
  // ✅ 念のため二重ガード（parseBody を経由しない呼び出しが将来入っても安全）
  if (!isMainnetOnlyChainId(params.chainId)) {
    return { ok: false, reason: "CHAIN_ID_NOT_ALLOWED" };
  }

  const rpcUrl = getRpcUrlFromLib(params.chainId);
  const chain = getViemChain(params.chainId);
  if (!rpcUrl || !chain) {
    return { ok: false, reason: "UNSUPPORTED_CHAIN_OR_MISSING_RPC" };
  }

  const tokenAddress = resolveTokenAddress({
    chainId: params.chainId,
    currency: params.currency,
  });
  if (!tokenAddress) {
    return { ok: false, reason: "TOKEN_NOT_CONFIGURED_ON_CHAIN" };
  }

  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>> | null =
    null;
  try {
    receipt = await client.getTransactionReceipt({ hash: params.txHash });
  } catch (e) {
    console.warn("TX_RECEIPT_NOT_FOUND_YET", {
      chainId: params.chainId,
      txHash: params.txHash,
      message: e instanceof Error ? e.message : String(e),
    });
    return { ok: false, reason: "TX_RECEIPT_NOT_FOUND_YET" };
  }

  if (!receipt) return { ok: false, reason: "TX_RECEIPT_NOT_FOUND_YET" };
  if (receipt.status !== "success") return { ok: false, reason: "TX_REVERTED" };

  let decimals: number;
  try {
    const d = await client.readContract({
      address: tokenAddress,
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
    expectedRaw = parseUnits(params.expectedAmountHuman, decimals);
  } catch {
    return { ok: false, reason: "AMOUNT_PARSE_FAILED" };
  }

  const tokenLower = tokenAddress.toLowerCase();

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

      const from = decoded.args.from as Address;
      const to = decoded.args.to as Address;
      const value = decoded.args.value as bigint;

      if (
        from.toLowerCase() === params.expectedFrom.toLowerCase() &&
        to.toLowerCase() === params.expectedTo.toLowerCase() &&
        value === expectedRaw
      ) {
        return {
          ok: true,
          decimals,
          valueRaw: value,
          blockNumber: receipt.blockNumber,
        };
      }
    } catch {
      continue;
    }
  }

  return { ok: false, reason: "TRANSFER_LOG_NOT_FOUND_OR_MISMATCH" };
}

function serializeContribution(row: Contribution) {
  return {
    ...row,
    projectId: row.projectId.toString(),
    purposeId: row.purposeId ? row.purposeId.toString() : null,
    amountRaw:
      typeof row.amountRaw === "string" ? row.amountRaw : String(row.amountRaw),
    amountDecimal: row.amountDecimal
      ? (row.amountDecimal as Prisma.Decimal).toString()
      : null,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = parseBody(raw);
    if (!parsed.ok) return errJson(parsed.error, 400);

    let projectId: bigint;
    try {
      projectId = toBigIntOrThrow(parsed.projectIdStr, "PROJECT_ID_INVALID");
    } catch {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    let purposeId: bigint | null | undefined = undefined;
    if (parsed.purposeIdStr === null) {
      purposeId = null;
    } else if (typeof parsed.purposeIdStr === "string") {
      try {
        purposeId = toBigIntOrThrow(parsed.purposeIdStr, "PURPOSE_ID_INVALID");
      } catch {
        return errJson("PURPOSE_ID_INVALID", 400);
      }
    } else {
      purposeId = undefined;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        currency: true,
        creatorProfileId: true,
        ownerAddress: true,
      },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    if (project.currency !== parsed.currency) {
      return errJson("PROJECT_CURRENCY_MISMATCH", 400);
    }

    let postId: string | null = null;
    if (parsed.postIdStr) {
      const post = await prisma.post.findUnique({
        where: { id: parsed.postIdStr },
        select: {
          id: true,
          creatorProfileId: true,
          projectId: true,
          creatorProfile: {
            select: { walletAddress: true },
          },
        },
      });
      if (!post) return errJson("POST_NOT_FOUND", 404);

      const projectMatchesCreator =
        (project.creatorProfileId !== null &&
          project.creatorProfileId === post.creatorProfileId) ||
        (project.creatorProfileId === null &&
          typeof project.ownerAddress === "string" &&
          typeof post.creatorProfile.walletAddress === "string" &&
          project.ownerAddress.toLowerCase() ===
            post.creatorProfile.walletAddress.toLowerCase());

      if (!projectMatchesCreator) {
        return errJson("POST_PROJECT_CREATOR_MISMATCH", 400);
      }
      if (post.projectId !== null && post.projectId !== projectId) {
        return errJson("POST_PROJECT_MISMATCH", 400);
      }

      postId = post.id;
    }

    const reservedContribution = parsed.contributionId
      ? await prisma.contribution.findUnique({
          where: { id: parsed.contributionId },
        })
      : null;

    if (parsed.contributionId && !reservedContribution) {
      return errJson("CONTRIBUTION_RESERVATION_NOT_FOUND", 404);
    }

    if (
      reservedContribution &&
      (reservedContribution.projectId !== projectId ||
        reservedContribution.currency !== parsed.currency ||
        reservedContribution.chainId !== parsed.chainId)
    ) {
      return errJson("CONTRIBUTION_RESERVATION_MISMATCH", 400);
    }

    const existing = await prisma.contribution.findUnique({
      where: { txHash: parsed.txHash },
    });

    if (
      existing &&
      parsed.contributionId &&
      existing.id !== parsed.contributionId
    ) {
      return okJson({
        verified: existing.status === "CONFIRMED",
        contribution: serializeContribution(existing),
      });
    }

    if (existing && existing.status === "CONFIRMED" && !postId) {
      return okJson({
        verified: true,
        contribution: serializeContribution(existing),
      });
    }

    const baseContribution =
      reservedContribution && reservedContribution.txHash === parsed.txHash
        ? reservedContribution
        : existing ?? reservedContribution;
    const wasConfirmedBefore = baseContribution?.status === "CONFIRMED";
    const confirmedContribution = wasConfirmedBefore ? baseContribution : null;
    const v = wasConfirmedBefore
      ? null
      : await verifyAndExtract({
          chainId: parsed.chainId,
          currency: parsed.currency,
          txHash: parsed.txHash,
          expectedFrom: parsed.from,
          expectedTo: parsed.to,
          expectedAmountHuman: parsed.amountHuman,
        });

    const now = new Date();
    const status: "CONFIRMED" | "PENDING" =
      wasConfirmedBefore || (v && v.ok) ? "CONFIRMED" : "PENDING";
    const confirmedAt =
      confirmedContribution?.confirmedAt
        ? confirmedContribution.confirmedAt
        : v && v.ok
          ? now
          : null;

    const decimals = wasConfirmedBefore
      ? (confirmedContribution?.decimals ?? 0)
      : v && v.ok
        ? v.decimals
        : 0;
    const amountRawStr = wasConfirmedBefore
      ? String(confirmedContribution?.amountRaw ?? "0")
      : v && v.ok
        ? v.valueRaw.toString()
        : "0";
    const amountDecimalStr = existing?.amountDecimal
      ? (existing.amountDecimal as Prisma.Decimal).toString()
      : normalizeTo18(parsed.amountHuman);

    const result = await prisma.$transaction(async (tx) => {
      const row = confirmedContribution
        ? confirmedContribution
        : reservedContribution
        ? await tx.contribution.update({
            where: { id: reservedContribution.id },
            data: {
              projectId,
              purposeId: purposeId === undefined ? null : purposeId,
              chainId: parsed.chainId,
              currency: parsed.currency,
              txHash: parsed.txHash,
              fromAddress: parsed.from,
              toAddress: parsed.to,
              amountRaw: amountRawStr,
              decimals,
              amountDecimal: amountDecimalStr,
              status,
              confirmedAt,
              message: parsed.message,
              updatedAt: now,
            },
          })
        : await tx.contribution.upsert({
            where: { txHash: parsed.txHash },
            create: {
              projectId,
              purposeId: purposeId === undefined ? null : purposeId,
              chainId: parsed.chainId,
              currency: parsed.currency,
              txHash: parsed.txHash,
              fromAddress: parsed.from,
              toAddress: parsed.to,
              amountRaw: amountRawStr,
              decimals,
              amountDecimal: amountDecimalStr,
              status,
              confirmedAt,
              message: parsed.message,
              createdAt: now,
              updatedAt: now,
            },
            update: {
              projectId,
              ...(purposeId === undefined ? {} : { purposeId }),
              chainId: parsed.chainId,
              currency: parsed.currency,
              fromAddress: parsed.from,
              toAddress: parsed.to,
              amountRaw: amountRawStr,
              decimals,
              amountDecimal: amountDecimalStr,
              status,
              confirmedAt,
              updatedAt: now,
            },
          });

      let postTipLinked = false;
      if (postId) {
        const link = await ensurePostTipLink({
          tx,
          postId,
          contributionId: row.id,
          now,
        });
        postTipLinked = true;

        const shouldApplyPostTipTotals =
          row.status === "CONFIRMED" &&
          (!wasConfirmedBefore || link.created);

        if (shouldApplyPostTipTotals) {
          await applyConfirmedContributionToPostTips({
            tx,
            contributionId: row.id,
            currency: parsed.currency,
            amountDecimal: row.amountDecimal
              ? (row.amountDecimal as Prisma.Decimal)
              : amountDecimalStr,
            now,
          });
        }
      }

      return { row, postTipLinked };
    });

    if (!wasConfirmedBefore && result.row.status === "CONFIRMED") {
      try {
        await recordFirstTipReceivedIfNeeded({
          contributionId: result.row.id,
          now,
        });
      } catch (error) {
        console.warn("FIRST_TIP_RECEIVED_TRACK_FAILED", error);
      }
      // RPG: award SUPPORT_CREATED EXP (fire-and-forget)
      void (async () => {
        try {
          const supporterProfile = await prisma.creatorProfile.findUnique({
            where: { walletAddress: parsed.from.toLowerCase() },
            select: { id: true },
          });
          if (supporterProfile) {
            const [totalCount, sameProjectCount] = await Promise.all([
              prisma.contribution.count({
                where: { fromAddress: parsed.from.toLowerCase(), status: "CONFIRMED" },
              }),
              prisma.contribution.count({
                where: { fromAddress: parsed.from.toLowerCase(), projectId: result.row.projectId, status: "CONFIRMED" },
              }),
            ]);
            const isFirstSupport = totalCount === 1;
            awardExpFireAndForget({
              creatorProfileId: supporterProfile.id,
              eventType: "SUPPORT_CREATED",
              occurredAt: now,
              idempotencyKey: `support:${result.row.id}`,
              payloadJson: { projectId: String(result.row.projectId), isFirstSupport },
            });
            const { evaluateBadgesAfterSupport } = await import("@/lib/rpg/badgeService");
            void evaluateBadgesAfterSupport(supporterProfile.id, result.row.projectId, totalCount, sameProjectCount).catch(() => {});
          }
        } catch (e) {
          console.warn("[RPG] support EXP award failed", e);
        }
      })();
    }

    return okJson({
      verified: status === "CONFIRMED",
      verifyReason:
        status === "CONFIRMED" || !v || v.ok ? null : v.reason,
      contribution: serializeContribution(result.row),
      ...(postId
        ? {
            postTipLinked: result.postTipLinked,
            postId,
          }
        : {}),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "CONTRIBUTION_ALREADY_LINKED_TO_ANOTHER_POST") {
      return errJson("CONTRIBUTION_ALREADY_LINKED_TO_ANOTHER_POST", 409);
    }
    console.error("CONTRIBUTION_POST_FAILED", e);
    return errJson("CONTRIBUTION_POST_FAILED", 500);
  }
}
