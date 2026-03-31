// lib/tokenRegistry.ts
import type { Address } from "viem";
import { getPublicEnv } from "@/lib/publicEnv";
import type { SupportedChainId } from "./chainConfig";

export type TokenKey = "JPYC" | "USDC";

export type TokenOnChain = Readonly<{
  address: Address;
  decimals: number;
}>;

export type TokenDefinition = Readonly<{
  key: TokenKey;
  displayName: string;
  /** チェーン別定義（未対応チェーンは key を持たない） */
  byChainId: Readonly<Partial<Record<SupportedChainId, TokenOnChain>>>;
}>;

// Circle native USDC on Polygon mainnet
const DEFAULT_USDC_ADDRESS_POLYGON =
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359" as Address;

/**
 * NOTE:
 * - ここは "設定レイヤ" なので、将来チェーンが増えたら byChainId に追記するだけ。
 * - address は viem の Address を採用（安全）。
 * - env で上書きする場合も、型の枠内（SupportedChainId）だけを持つ。
 * - getPublicEnv() は初回アクセス時に遅延評価する（テスト環境での import 安全性のため）。
 */
function buildTokenDefinitions(): Readonly<Record<TokenKey, TokenDefinition>> {
  const env = getPublicEnv();
  return {
    JPYC: {
      key: "JPYC",
      displayName: "JPYC",
      byChainId: {
        137: (() => {
          const a = env.jpycAddressPolygon ?? env.jpycAddress;
          return a
            ? ({ address: a as Address, decimals: 18 } as const)
            : undefined;
        })(),
        43114: (() => {
          const a = env.jpycAddressAvax;
          return a
            ? ({ address: a as Address, decimals: 18 } as const)
            : undefined;
        })(),
        1: (() => {
          const a = env.jpycAddressEthereum;
          return a
            ? ({ address: a as Address, decimals: 18 } as const)
            : undefined;
        })(),
      },
    },
    USDC: {
      key: "USDC",
      displayName: "USDC",
      byChainId: {
        137: (() => {
          const a = env.usdcAddressPolygon ?? DEFAULT_USDC_ADDRESS_POLYGON;
          return { address: a as Address, decimals: 6 } as const;
        })(),
        43114: (() => {
          const a = env.usdcAddressAvax;
          return a
            ? ({ address: a as Address, decimals: 6 } as const)
            : undefined;
        })(),
        1: (() => {
          const a = env.usdcAddressEthereum;
          return a
            ? ({ address: a as Address, decimals: 6 } as const)
            : undefined;
        })(),
      },
    },
  };
}

let _tokenCache: Readonly<Record<TokenKey, TokenDefinition>> | null = null;

function lazyTokens(): Readonly<Record<TokenKey, TokenDefinition>> {
  return (_tokenCache ??= buildTokenDefinitions());
}

export const TOKENS: Readonly<Record<TokenKey, TokenDefinition>> = {
  get JPYC() {
    return lazyTokens().JPYC;
  },
  get USDC() {
    return lazyTokens().USDC;
  },
};

export function getTokenOnChain(
  token: TokenKey,
  chainId: SupportedChainId
): TokenOnChain | null {
  const def = lazyTokens()[token];
  const onChain = def.byChainId[chainId];
  return onChain ?? null;
}

export function mustGetTokenOnChain(
  token: TokenKey,
  chainId: SupportedChainId
): TokenOnChain {
  const v = getTokenOnChain(token, chainId);
  if (!v) {
    throw new Error(`Token ${token} is not configured on chainId=${chainId}`);
  }
  return v;
}
