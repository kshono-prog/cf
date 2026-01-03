/* lib/bridgeVerify.ts */
import {
  createPublicClient,
  http,
  isAddress,
  getAddress,
  type Address,
} from "viem";
import { polygon, polygonAmoy, avalanche, avalancheFuji } from "viem/chains";
import { isSupportedChainId, type SupportedChainId } from "@/lib/chainConfig";
import { getTokenOnChain } from "@/lib/tokenRegistry";

type Currency = "JPYC" | "USDC";

const ERC20_BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

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

function toAddr(v: string): Address | null {
  if (!isAddress(v)) return null;
  return getAddress(v);
}

function toBigIntOrNull(v: string | null | undefined): bigint | null {
  if (!v) return null;
  try {
    return BigInt(v);
  } catch {
    return null;
  }
}

/** "22" -> 22 * 10^decimals */
function decimalToRawOrNull(
  amountDecimal: string | null | undefined,
  decimals: number
): bigint | null {
  if (!amountDecimal) return null;

  const s = amountDecimal.trim();
  if (!s) return null;

  // JPYCは整数運用前提（あなたの現状設計に合わせる）
  // "22.5" などが来たら安全側で弾く
  if (s.includes(".")) return null;

  let intPart: bigint;
  try {
    intPart = BigInt(s);
  } catch {
    return null;
  }

  if (intPart < 0n) return null;

  const mul = 10n ** BigInt(decimals);
  return intPart * mul;
}

export type SourceReceiptResult =
  | { ok: true; blockNumber: bigint }
  | {
      ok: false;
      reason:
        | "UNSUPPORTED_CHAIN_OR_MISSING_RPC"
        | "TX_RECEIPT_NOT_FOUND_YET"
        | "TX_REVERTED";
    };

export async function verifySourceReceipt(params: {
  chainId: number; // eventFundingChainId (Polygon)
  txHash: `0x${string}`;
}): Promise<SourceReceiptResult> {
  const rpcUrl = getRpcUrl(params.chainId);
  const chain = getViemChain(params.chainId);
  if (!rpcUrl || !chain) {
    return { ok: false, reason: "UNSUPPORTED_CHAIN_OR_MISSING_RPC" };
  }

  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  try {
    const receipt = await client.getTransactionReceipt({ hash: params.txHash });
    if (receipt.status !== "success")
      return { ok: false, reason: "TX_REVERTED" };
    return { ok: true, blockNumber: receipt.blockNumber };
  } catch {
    // viem は receipt not found を throw する
    return { ok: false, reason: "TX_RECEIPT_NOT_FOUND_YET" };
  }
}

export type DestVerifyResult =
  | {
      ok: true;
      verified: true;
      currentBalanceRaw: bigint;
      expectedIncreaseRaw: bigint;
    }
  | {
      ok: true;
      verified: false;
      reason:
        | "TOKEN_NOT_CONFIGURED_ON_CHAIN"
        | "RECIPIENT_INVALID"
        | "EXPECTED_AMOUNT_INVALID"
        | "NOT_RECEIVED_YET";
      currentBalanceRaw?: bigint;
    };

export async function verifyDestinationReceivedByBalance(params: {
  destChainId: number; // liquidityChainId (Avalanche)
  currency: Currency;
  recipientAddress: string;
  baselineRecipientBalanceRaw: string | null | undefined; // BridgeRun.recipientBalanceRaw
  expectedAmountDecimal: string | null | undefined; // BridgeRun.dbConfirmedTotalAmountDecimal
}): Promise<DestVerifyResult> {
  if (!isSupportedChainId(params.destChainId)) {
    return {
      ok: true,
      verified: false,
      reason: "TOKEN_NOT_CONFIGURED_ON_CHAIN",
    };
  }

  const token = getTokenOnChain(
    params.currency,
    params.destChainId as SupportedChainId
  );
  if (!token)
    return {
      ok: true,
      verified: false,
      reason: "TOKEN_NOT_CONFIGURED_ON_CHAIN",
    };

  const recipient = toAddr(params.recipientAddress);
  if (!recipient)
    return { ok: true, verified: false, reason: "RECIPIENT_INVALID" };

  const rpcUrl = getRpcUrl(params.destChainId);
  const chain = getViemChain(params.destChainId);
  if (!rpcUrl || !chain) {
    return {
      ok: true,
      verified: false,
      reason: "TOKEN_NOT_CONFIGURED_ON_CHAIN",
    };
  }

  const decimals =
    typeof token.decimals === "number" && Number.isFinite(token.decimals)
      ? token.decimals
      : 18;
  const expectedIncreaseRaw = decimalToRawOrNull(
    params.expectedAmountDecimal,
    decimals
  );
  if (expectedIncreaseRaw == null || expectedIncreaseRaw <= 0n) {
    return { ok: true, verified: false, reason: "EXPECTED_AMOUNT_INVALID" };
  }

  const baseline = toBigIntOrNull(params.baselineRecipientBalanceRaw) ?? 0n;

  const client = createPublicClient({ chain, transport: http(rpcUrl) });

  const current = await client.readContract({
    address: token.address,
    abi: ERC20_BALANCE_OF_ABI,
    functionName: "balanceOf",
    args: [recipient],
  });

  const needAtLeast = baseline + expectedIncreaseRaw;

  if (current >= needAtLeast) {
    return {
      ok: true,
      verified: true,
      currentBalanceRaw: current,
      expectedIncreaseRaw,
    };
  }

  return {
    ok: true,
    verified: false,
    reason: "NOT_RECEIVED_YET",
    currentBalanceRaw: current,
  };
}
