// app/api/_lib/chain.ts
import { normalizeAddress } from "./db";

type Currency = "JPYC" | "USDC";

const TRANSFER_TOPIC0 =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"; // keccak256("Transfer(address,address,uint256)")

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

export function getRpcUrl(chainId: number): string | null {
  // 既存 env と新 env を両対応
  if (chainId === 1)
    return env("NEXT_PUBLIC_RPC_URL_ETHEREUM") || env("ETHEREUM_RPC_URL");
  if (chainId === 137)
    return (
      env("NEXT_PUBLIC_RPC_URL_POLYGON") ||
      env("NEXT_PUBLIC_RPC_URL") ||
      env("POLYGON_RPC_URL")
    );
  if (chainId === 80002)
    return env("NEXT_PUBLIC_RPC_URL_POLYGON") || env("NEXT_PUBLIC_RPC_URL");
  if (chainId === 43114)
    return (
      env("NEXT_PUBLIC_RPC_URL_AVAX") || "https://api.avax.network/ext/bc/C/rpc"
    );
  if (chainId === 43113)
    return (
      env("NEXT_PUBLIC_RPC_URL_AVAX_FUJI") ||
      "https://api.avax-test.network/ext/bc/C/rpc"
    );
  return null;
}

export function getRpcUrls(chainId: number): string[] {
  const urls: string[] = [];
  const add = (url: string | null | undefined) => {
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed || urls.includes(trimmed)) return;
    urls.push(trimmed);
  };

  add(getRpcUrl(chainId));

  if (chainId === 137) {
    add(env("POLYGON_RPC_URL"));
    add("https://polygon-rpc.com");
    add(env("ANKR_RPC_URL"));
    const ankrKey = env("ANKR_API_KEY");
    if (ankrKey) {
      add(`https://rpc.ankr.com/polygon/${ankrKey}`);
    }
    add("https://polygon-bor-rpc.publicnode.com");
  }

  if (chainId === 80002) {
    add(env("POLYGON_AMOY_RPC_URL"));
    add("https://rpc-amoy.polygon.technology");
    add("https://polygon-amoy-bor-rpc.publicnode.com");
  }

  return urls;
}

export function getTokenAddress(
  chainId: number,
  currency: Currency
): string | null {
  // チェーン別envを優先
  if (chainId === 1) {
    if (currency === "JPYC") return env("NEXT_PUBLIC_JPYC_ADDRESS_ETHEREUM");
    if (currency === "USDC") return env("NEXT_PUBLIC_USDC_ADDRESS_ETHEREUM");
  }
  if (chainId === 137 || chainId === 80002) {
    if (currency === "JPYC")
      return (
        env("NEXT_PUBLIC_JPYC_ADDRESS_POLYGON") ||
        env("NEXT_PUBLIC_JPYC_ADDRESS")
      );
    if (currency === "USDC")
      return (
        env("NEXT_PUBLIC_USDC_ADDRESS_POLYGON") ||
        env("NEXT_PUBLIC_USDC_ADDRESS")
      );
  }
  if (chainId === 43114 || chainId === 43113) {
    if (currency === "JPYC")
      return (
        env("NEXT_PUBLIC_JPYC_ADDRESS_AVAX") || env("NEXT_PUBLIC_JPYC_ADDRESS")
      );
    if (currency === "USDC") return env("NEXT_PUBLIC_USDC_ADDRESS_AVAX");
  }
  return null;
}

type RpcReceipt = {
  status?: string; // "0x1" / "0x0"
  transactionHash: string;
  blockNumber?: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
};

type RpcTx = {
  from?: string;
  to?: string | null;
};

async function rpcCall<T>(
  rpcUrl: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC_HTTP_${res.status}`);
  const json = (await res.json()) as {
    result?: T;
    error?: { message?: string };
  };
  if (json.error) throw new Error(json.error.message || "RPC_ERROR");
  if (json.result === undefined) throw new Error("RPC_EMPTY_RESULT");
  return json.result;
}

function topicToAddress(topic: string): string {
  // topic is 0x + 64 hex (32bytes). last 40 hex is address
  const t = topic.toLowerCase();
  const last40 = t.slice(t.length - 40);
  return normalizeAddress("0x" + last40);
}

function dataToUint256Raw(data: string): string {
  // data is 0x + 64 hex
  const hex = data.startsWith("0x") ? data.slice(2) : data;
  // strip leading zeros but keep "0" if all zeros
  const stripped = hex.replace(/^0+/, "") || "0";
  // BigInt-safe string
  return BigInt("0x" + stripped).toString();
}

export type VerifyTransferInput = {
  chainId: number;
  currency: Currency;
  txHash: string;
  expectedFrom?: string; // optional
  expectedTo: string; // required: recipient address
};

export type VerifyTransferResult = {
  ok: boolean;
  confirmed: boolean;
  failReason?: string;
  from?: string;
  to?: string | null;
  amountRaw?: string; // string integer
  decimals?: number;
  blockNumber?: string;
};

export async function verifyErc20Transfer(
  input: VerifyTransferInput
): Promise<VerifyTransferResult> {
  const rpcUrl = getRpcUrl(input.chainId);
  if (!rpcUrl) {
    return { ok: false, confirmed: false, failReason: "RPC_URL_NOT_SET" };
  }

  const tokenAddr = getTokenAddress(input.chainId, input.currency);
  if (!tokenAddr) {
    return { ok: false, confirmed: false, failReason: "TOKEN_ADDRESS_NOT_SET" };
  }

  const tx = await rpcCall<RpcTx>(rpcUrl, "eth_getTransactionByHash", [
    input.txHash,
  ]);
  const receipt = await rpcCall<RpcReceipt>(
    rpcUrl,
    "eth_getTransactionReceipt",
    [input.txHash]
  );

  const statusHex = (receipt.status || "").toLowerCase();
  const success = statusHex === "0x1";
  if (!success) {
    return {
      ok: true,
      confirmed: false,
      failReason: "TX_FAILED",
      from: tx.from,
      to: tx.to ?? null,
    };
  }

  const expectedTo = normalizeAddress(input.expectedTo);
  const expectedFrom = input.expectedFrom
    ? normalizeAddress(input.expectedFrom)
    : null;
  const tokenNorm = normalizeAddress(tokenAddr);

  // Transfer(from,to,value) log を探す
  for (const log of receipt.logs) {
    if (normalizeAddress(log.address) !== tokenNorm) continue;
    if (!log.topics?.length || log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC0)
      continue;
    if (log.topics.length < 3) continue;

    const from = topicToAddress(log.topics[1]);
    const to = topicToAddress(log.topics[2]);

    if (to !== expectedTo) continue;
    if (expectedFrom && from !== expectedFrom) continue;

    const amountRaw = dataToUint256Raw(log.data);

    return {
      ok: true,
      confirmed: true,
      from,
      to,
      amountRaw,
      decimals: input.currency === "JPYC" ? 18 : 6, // PoC: JPYC=18, USDC=6（必要なら後でチェーン別に調整）
      blockNumber: receipt.blockNumber,
    };
  }

  return {
    ok: true,
    confirmed: false,
    failReason: "TRANSFER_LOG_NOT_FOUND",
    from: tx.from,
    to: tx.to ?? null,
  };
}
