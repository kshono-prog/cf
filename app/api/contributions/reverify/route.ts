/* app/api/contributions/reverify/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Contribution } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";

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
import { polygon, polygonAmoy, avalanche, avalancheFuji } from "viem/chains";

import { isSupportedChainId, type SupportedChainId } from "@/lib/chainConfig";
import { getTokenOnChain } from "@/lib/tokenRegistry";
import { tryAutoAchieveGoal } from "@/lib/goalAutoAchieve";

export const dynamic = "force-dynamic";

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

/* -------------------- helpers: chain/rpc -------------------- */
function getRpcUrl(chainId: number): string | null {
  if (chainId === 137) return process.env.POLYGON_RPC_URL ?? null;
  if (chainId === 80002) return process.env.POLYGON_AMOY_RPC_URL ?? null;

  if (chainId === 43114) return process.env.AVALANCHE_RPC_URL ?? null;
  if (chainId === 43113) return process.env.AVALANCHE_FUJI_RPC_URL ?? null;

  return null;
}

function getViemChain(chainId: number) {
  if (chainId === 137) return polygon;
  if (chainId === 80002) return polygonAmoy;
  if (chainId === 43114) return avalanche;
  if (chainId === 43113) return avalancheFuji;
  return null;
}

/* -------------------- helpers: token address resolution -------------------- */
function resolveTokenAddress(params: {
  chainId: number;
  currency: Currency;
}): Address | null {
  if (!isSupportedChainId(params.chainId)) return null;

  const token = getTokenOnChain(
    params.currency,
    params.chainId as SupportedChainId
  );
  if (!token) return null;

  return isAddress(token.address) ? getAddress(token.address) : null;
}

function toAddr(v: string): Address {
  if (!isAddress(v)) throw new Error("INVALID_ADDRESS");
  return getAddress(v);
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

function isReceiptNotFoundError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const r = e as { name?: unknown; shortMessage?: unknown; message?: unknown };
  const name = typeof r.name === "string" ? r.name : "";
  if (name === "TransactionReceiptNotFoundError") return true;

  // 念のためメッセージも見る（環境差対策）
  const msg =
    (typeof r.shortMessage === "string" && r.shortMessage) ||
    (typeof r.message === "string" && r.message) ||
    "";
  return (
    msg.includes("Transaction receipt") && msg.includes("could not be found")
  );
}

/* -------------------- verify -------------------- */
async function verifyTransfer(params: {
  chainId: number;
  currency: Currency;
  txHash: `0x${string}`;
  from: Address;
  to: Address;
  amountHuman: string; // Decimal文字列
}): Promise<
  | {
      ok: true;
      decimals: number;
      valueRaw: bigint;
      blockNumber: bigint;
    }
  | {
      ok: false;
      reason:
        | "UNSUPPORTED_CHAIN_OR_MISSING_RPC"
        | "TOKEN_NOT_CONFIGURED_ON_CHAIN"
        | "RECEIPT_NOT_FOUND_YET"
        | "TX_REVERTED"
        | "DECIMALS_READ_FAILED"
        | "INVALID_DECIMALS"
        | "AMOUNT_PARSE_FAILED"
        | "TRANSFER_LOG_NOT_FOUND_OR_MISMATCH"
        | "RPC_READ_FAILED";
    }
> {
  const rpcUrl = getRpcUrl(params.chainId);
  const chain = getViemChain(params.chainId);
  if (!rpcUrl || !chain) {
    return { ok: false, reason: "UNSUPPORTED_CHAIN_OR_MISSING_RPC" };
  }

  const token = resolveTokenAddress({
    chainId: params.chainId,
    currency: params.currency,
  });
  if (!token) return { ok: false, reason: "TOKEN_NOT_CONFIGURED_ON_CHAIN" };

  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>;
  try {
    receipt = await client.getTransactionReceipt({ hash: params.txHash });
  } catch (e) {
    if (isReceiptNotFoundError(e)) {
      // ここが今回の肝：500にしない
      return { ok: false, reason: "RECEIPT_NOT_FOUND_YET" };
    }
    return { ok: false, reason: "RPC_READ_FAILED" };
  }

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

/* -------------------- handler -------------------- */
type Body = { txHash?: unknown };

function parseBody(
  raw: unknown
): { ok: true; txHash: `0x${string}` } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "INVALID_JSON" };
  const b = raw as Body;

  if (typeof b.txHash !== "string" || !b.txHash.trim()) {
    return { ok: false, error: "TX_HASH_REQUIRED" };
  }
  const s = b.txHash.trim();
  if (!isHash(s)) return { ok: false, error: "TX_HASH_INVALID" };

  return { ok: true, txHash: s as `0x${string}` };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    const parsed = parseBody(raw);
    if (!parsed.ok) return errJson(parsed.error, 400);

    const row = await prisma.contribution.findUnique({
      where: { txHash: parsed.txHash },
    });
    if (!row) return errJson("CONTRIBUTION_NOT_FOUND", 404);

    if (row.status === "CONFIRMED") {
      return okJson({
        verified: true,
        contribution: serializeContribution(row),
      });
    }

    const amountHuman = row.amountDecimal
      ? (row.amountDecimal as Prisma.Decimal).toString()
      : "";
    if (!amountHuman) return errJson("AMOUNT_DECIMAL_MISSING", 400);

    const v = await verifyTransfer({
      chainId: row.chainId,
      currency: row.currency as Currency,
      txHash: parsed.txHash,
      from: toAddr(row.fromAddress),
      to: toAddr(row.toAddress),
      amountHuman,
    });

    if (!v.ok) {
      // ReceiptNotFound等は「未確定」扱いで正常系レスポンス
      return okJson({
        verified: false,
        reason: v.reason,
        contribution: serializeContribution(row),
      });
    }

    const now = new Date();

    const updated = await prisma.contribution.update({
      where: { txHash: parsed.txHash },
      data: {
        status: "CONFIRMED",
        confirmedAt: now,
        decimals: v.decimals,
        amountRaw: v.valueRaw.toString(),
        updatedAt: now,
      },
    });

    // 目標自動達成は “副作用” として試す（失敗してもreverify自体は成功扱い）
    try {
      if (updated.projectId) {
        await tryAutoAchieveGoal({
          db: prisma,
          projectId: updated.projectId,
          now,
        });
      }
    } catch (e) {
      console.warn("GOAL_AUTO_ACHIEVE_FAILED", e);
    }

    return okJson({
      verified: true,
      contribution: serializeContribution(updated),
    });
  } catch (e) {
    console.error("CONTRIBUTION_REVERIFY_FAILED", e);
    return errJson("CONTRIBUTION_REVERIFY_FAILED", 500);
  }
}
