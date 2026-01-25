// src/lib/walletService.ts
import {
  createPublicClient,
  formatUnits,
  http,
  type Address,
  type PublicClient,
} from "viem";
import type { SupportedChainId } from "./chainConfig";
import { getChainConfig } from "./chainConfig";
import type { TokenKey } from "./tokenRegistry";
import { getTokenOnChain } from "./tokenRegistry";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "value", type: "uint256" }],
  },
] as const;

/** 個々のトークン残高情報 */
export type WalletTokenBalance = Readonly<{
  symbol: TokenKey;
  address: Address;
  decimals: number;
  raw: bigint;
  formatted: string;
}>;

/** トークンキーごとの残高マップ（内部では mutable に扱う） */
export type WalletTokenMap = Partial<Record<TokenKey, WalletTokenBalance>>;

export type WalletBalances = Readonly<{
  chainId: SupportedChainId;
  nativeSymbol: string;
  nativeWei: bigint;
  nativeFormatted: string;
  /** 呼び出し側からは読み取り専用として扱う */
  tokens: Readonly<WalletTokenMap>;
}>;

const BALANCE_CACHE_TTL_MS = 10_000;
const balanceCache = new Map<
  string,
  { expiresAt: number; value: WalletBalances }
>();
const inflightBalanceRequests = new Map<string, Promise<WalletBalances>>();

function getBalanceCacheKey(params: {
  chainId: SupportedChainId;
  account: Address;
  tokenKeys: readonly TokenKey[];
}): string {
  return `${params.chainId}:${params.account}:${params.tokenKeys.join(",")}`;
}

/** chainId から PublicClient を生成（RPC は viem/chains の既定を使用） */
export function getPublicClientForChain(
  chainId: SupportedChainId
): PublicClient {
  const cfg = getChainConfig(chainId);
  if (!cfg) throw new Error(`Unsupported chainId=${chainId}`);
  return createPublicClient({
    chain: cfg.viemChain,
    transport: http(),
  });
}

export async function readBalances(params: {
  chainId: SupportedChainId;
  account: Address;
  tokenKeys: readonly TokenKey[];
}): Promise<WalletBalances> {
  const cfg = getChainConfig(params.chainId);
  if (!cfg) throw new Error(`Unsupported chainId=${params.chainId}`);

  const cacheKey = getBalanceCacheKey(params);
  const cached = balanceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const inflight = inflightBalanceRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  // EVM ネイティブ通貨（POL / AVAX / ETHなど）は基本 18 桁
  const requestPromise = (async () => {
    const client = getPublicClientForChain(params.chainId);
    // EVM ネイティブ通貨（POL / AVAX / ETHなど）は基本 18 桁
    const nativeWei = await client.getBalance({ address: params.account });
    const nativeFormatted = formatUnits(nativeWei, 18);

    // 内部用: mutable なトークンマップ
    const tokenResults: WalletTokenMap = {};

    const tokenConfigs = params.tokenKeys
      .map((key) => {
        const tok = getTokenOnChain(key, params.chainId);
        if (!tok) return null;
        return { key, tok };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (tokenConfigs.length > 0) {
      const contracts = tokenConfigs.map(({ tok }) => ({
        address: tok.address,
        abi: ERC20_ABI,
        functionName: "balanceOf" as const,
        args: [params.account],
      }));

      const results = await client.multicall({
        contracts,
        allowFailure: true,
      });

      results.forEach((result, index) => {
        if (result.status !== "success") return;
        const { key, tok } = tokenConfigs[index];
        const raw = result.result;
        tokenResults[key] = {
          symbol: key,
          address: tok.address,
          decimals: tok.decimals,
          raw,
          formatted: formatUnits(raw, tok.decimals),
        };
      });
    }
    const response: WalletBalances = {
      chainId: params.chainId,
      nativeSymbol: cfg.nativeSymbol,
      nativeWei,
      nativeFormatted,
      // 戻り値側では Readonly<WalletTokenMap> として公開
      tokens: tokenResults,
    };

    balanceCache.set(cacheKey, {
      expiresAt: Date.now() + BALANCE_CACHE_TTL_MS,
      value: response,
    });
    return response;
  })();

  inflightBalanceRequests.set(cacheKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inflightBalanceRequests.delete(cacheKey);
  }
}

/**
 * 送金前の “ネットワーク一致” 判定（UI 側のガード用）
 * - 実際の switch は wagmi/walletClient/provider に依存するため、ここでは判定だけ薄く提供
 */
export function isNetworkMatched(params: {
  connectedChainId: number | null | undefined;
  requiredChainId: SupportedChainId;
}): boolean {
  return params.connectedChainId === params.requiredChainId;
}
