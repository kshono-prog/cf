// src/lib/chainConfig.ts
import {
  mainnet,
  sepolia,
  polygon,
  polygonAmoy,
  avalanche,
  avalancheFuji,
  type Chain as ViemChain,
} from "viem/chains";

export const SUPPORTED_CHAINS = [
  mainnet,
  sepolia,
  polygon,
  polygonAmoy,
  avalanche,
  avalancheFuji,
] as const;

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
  [sepolia.id]: {
    id: sepolia.id,
    name: "Ethereum Sepolia",
    shortName: "Sepolia",
    nativeSymbol: "ETH",
    explorerBaseUrl: "https://sepolia.etherscan.io",
    viemChain: sepolia,
  },
  [polygon.id]: {
    id: polygon.id,
    name: "Polygon Mainnet",
    shortName: "Polygon",
    nativeSymbol: "POL",
    explorerBaseUrl: "https://polygonscan.com",
    viemChain: polygon,
  },
  [polygonAmoy.id]: {
    id: polygonAmoy.id,
    name: "Polygon Amoy",
    shortName: "Amoy",
    nativeSymbol: "POL",
    explorerBaseUrl: "https://amoy.polygonscan.com",
    viemChain: polygonAmoy,
  },
  [avalanche.id]: {
    id: avalanche.id,
    name: "Avalanche C-Chain",
    shortName: "Avalanche",
    nativeSymbol: "AVAX",
    explorerBaseUrl: "https://snowtrace.io",
    viemChain: avalanche,
  },
  [avalancheFuji.id]: {
    id: avalancheFuji.id,
    name: "Avalanche Fuji",
    shortName: "Fuji",
    nativeSymbol: "AVAX",
    explorerBaseUrl: "https://testnet.snowtrace.io",
    viemChain: avalancheFuji,
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

/** 既定チェーン（env で切替、未設定なら Polygon Mainnet） */
export function getDefaultChainId(): SupportedChainId {
  const raw = Number(process.env.NEXT_PUBLIC_CHAIN_ID || String(polygon.id));
  return isSupportedChainId(raw) ? raw : polygon.id;
}

/** AppKit/Wagmi に渡す “対応チェーン配列” */
export function getSupportedViemChains(): readonly SupportedViemChain[] {
  return SUPPORTED_CHAINS;
}
