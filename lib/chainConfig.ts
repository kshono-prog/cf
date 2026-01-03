// src/lib/chainConfig.ts
import {
  mainnet,
  polygon,
  avalanche,
  type Chain as ViemChain,
} from "viem/chains";

// ===== mainnet only =====
export const SUPPORTED_CHAINS = [mainnet, polygon, avalanche] as const;

export type SupportedViemChain = (typeof SUPPORTED_CHAINS)[number];
export type SupportedChainId = SupportedViemChain["id"];

/** EVM チェーン設定（UI とロジックが必要とする最小項目） */
export type ChainConfig = Readonly<{
  id: SupportedChainId;
  name: string;
  shortName: string;
  nativeSymbol: string;
  explorerBaseUrl: string;
  viemChain: SupportedViemChain;
}>;

const CHAIN_CONFIGS: Readonly<Record<SupportedChainId, ChainConfig>> = {
  [mainnet.id]: {
    id: mainnet.id,
    name: "Ethereum Mainnet",
    shortName: "Ethereum",
    nativeSymbol: "ETH",
    explorerBaseUrl: "https://etherscan.io",
    viemChain: mainnet,
  },
  [polygon.id]: {
    id: polygon.id,
    name: "Polygon Mainnet",
    shortName: "Polygon",
    nativeSymbol: "POL",
    explorerBaseUrl: "https://polygonscan.com",
    viemChain: polygon,
  },
  [avalanche.id]: {
    id: avalanche.id,
    name: "Avalanche C-Chain",
    shortName: "Avalanche",
    nativeSymbol: "AVAX",
    explorerBaseUrl: "https://snowtrace.io",
    viemChain: avalanche,
  },
} as const;

export function isSupportedChainId(v: unknown): v is SupportedChainId {
  return (
    typeof v === "number" &&
    Object.prototype.hasOwnProperty.call(CHAIN_CONFIGS, v)
  );
}

/** 非対応チェーンの場合は null を返す（UI 側でガードしやすい） */
export function getChainConfig(chainId: number): ChainConfig | null {
  if (!isSupportedChainId(chainId)) return null;
  return CHAIN_CONFIGS[chainId];
}

export function getDefaultChainId(): SupportedChainId {
  // 優先順位：
  // 1) NEXT_PUBLIC_CHAIN_ID_AVAX
  // 2) NEXT_PUBLIC_CHAIN_ID
  // 3) avalanche.id（最終デフォルト）
  const raw =
    Number(process.env.NEXT_PUBLIC_CHAIN_ID_AVAX) ||
    Number(process.env.NEXT_PUBLIC_CHAIN_ID) ||
    avalanche.id;

  // mainnet-only なので、未知値は avalanche にフォールバック
  return isSupportedChainId(raw) ? raw : avalanche.id;
}

/** AppKit/Wagmi に渡す “対応チェーン配列” */
export function getSupportedViemChains(): readonly SupportedViemChain[] {
  return SUPPORTED_CHAINS;
}
