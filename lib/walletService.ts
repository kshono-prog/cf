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

  const client = getPublicClientForChain(params.chainId);

  // EVM ネイティブ通貨（POL / AVAX / ETHなど）は基本 18 桁
  const nativeWei = await client.getBalance({ address: params.account });
  const nativeFormatted = formatUnits(nativeWei, 18);

  // 内部用: mutable なトークンマップ
  const tokenResults: WalletTokenMap = {};

  for (const key of params.tokenKeys) {
    const tok = getTokenOnChain(key, params.chainId);
    if (!tok) continue;

    const raw = await client.readContract({
      address: tok.address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [params.account],
    });

    tokenResults[key] = {
      symbol: key,
      address: tok.address,
      decimals: tok.decimals,
      raw,
      formatted: formatUnits(raw, tok.decimals),
    };
  }

  return {
    chainId: params.chainId,
    nativeSymbol: cfg.nativeSymbol,
    nativeWei,
    nativeFormatted,
    // 戻り値側では Readonly<WalletTokenMap> として公開
    tokens: tokenResults,
  };
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
