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

type Currency = "JPYC" | "USDC";

type ContributionPostBody = {
  projectId?: unknown; // string (BigInt as string)
  purposeId?: unknown; // string|null|undefined
  chainId?: unknown;
  currency?: unknown; // "JPYC"|"USDC"
  txHash?: unknown;
  fromAddress?: unknown;
  toAddress?: unknown;
  amount?: unknown; // human string
};

function toCurrency(v: unknown): Currency | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function toChainId(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

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

function normalizeTo18(amountHuman: string): string {
  // "1.2" -> "1.200...(18)" / "100" -> "100.000...(18)"
  const s = amountHuman.replace(/[^\d.]/g, "");
  if (!s) return "0.000000000000000000";
  const [iRaw, dRaw = ""] = s.split(".");
  const i = iRaw && iRaw.length > 0 ? iRaw : "0";
  const d18 = (dRaw + "0".repeat(18)).slice(0, 18);

  // i は数値文字列の想定だが、極端に長い場合でも BigInt 化で安全に正規化
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
      purposeIdStr: string | null | undefined;
      chainId: number;
      currency: Currency;
      txHash: `0x${string}`;
      from: Address;
      to: Address;
      amountHuman: string;
    }
  | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "INVALID_JSON" };
  const b = raw as ContributionPostBody;

  const projectIdStr = toNonEmptyString(b.projectId);
  if (!projectIdStr) return { ok: false, error: "PROJECT_ID_REQUIRED" };

  // purposeId: undefined / null / non-empty string 以外はエラー
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

  return {
    ok: true,
    projectIdStr,
    purposeIdStr,
    chainId,
    currency,
    txHash: txHashStr as `0x${string}`,
    from,
    to,
    amountHuman,
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
  const rpcUrl = getRpcUrl(params.chainId);
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

  // ✅ receipt 未検出は「例外で落とさず PENDING 理由」として返す
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

    // 既に CONFIRMED なら冪等
    const existing = await prisma.contribution.findUnique({
      where: { txHash: parsed.txHash },
    });
    if (existing && existing.status === "CONFIRMED") {
      return okJson({
        verified: true,
        contribution: serializeContribution(existing),
      });
    }

    const v = await verifyAndExtract({
      chainId: parsed.chainId,
      currency: parsed.currency,
      txHash: parsed.txHash,
      expectedFrom: parsed.from,
      expectedTo: parsed.to,
      expectedAmountHuman: parsed.amountHuman,
    });

    const now = new Date();
    const status: "CONFIRMED" | "PENDING" = v.ok ? "CONFIRMED" : "PENDING";
    const confirmedAt = v.ok ? now : null;

    // verified のときだけ確定値を入れる（PENDING は reverify で更新）
    const decimals = v.ok ? v.decimals : 0;
    const amountRawStr = v.ok ? v.valueRaw.toString() : "0";

    // amountDecimal は「送信額（human）」の正規化（18桁固定）を保存（既存設計に合わせる）
    const amountDecimalStr = normalizeTo18(parsed.amountHuman);

    const row = await prisma.contribution.upsert({
      where: { txHash: parsed.txHash },
      create: {
        projectId,
        // create は必ず値が必要なので、undefined は null として入れる
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

    return okJson({
      verified: v.ok,
      verifyReason: v.ok ? null : v.reason,
      contribution: serializeContribution(row),
    });
  } catch (e) {
    console.error("CONTRIBUTION_POST_FAILED", e);
    return errJson("CONTRIBUTION_POST_FAILED", 500);
  }
}
