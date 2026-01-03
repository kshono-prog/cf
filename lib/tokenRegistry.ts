// lib/tokenRegistry.ts
import type { Address } from "viem";
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

/**
 * NOTE:
 * - ここは “設定レイヤ” なので、将来チェーンが増えたら byChainId に追記するだけ。
 * - address は viem の Address を採用（安全）。
 * - env で上書きする場合も、型の枠内（SupportedChainId）だけを持つ。
 */
export const TOKENS: Readonly<Record<TokenKey, TokenDefinition>> = {
  JPYC: {
    key: "JPYC",
    displayName: "JPYC",
    byChainId: {
      137: (() => {
        const a =
          process.env.NEXT_PUBLIC_JPYC_ADDRESS_POLYGON ??
          process.env.NEXT_PUBLIC_JPYC_ADDRESS;
        return a
          ? ({ address: a as Address, decimals: 18 } as const)
          : undefined;
      })(),
      43114: (() => {
        const a = process.env.NEXT_PUBLIC_JPYC_ADDRESS_AVAX;
        return a
          ? ({ address: a as Address, decimals: 18 } as const)
          : undefined;
      })(),
      1: (() => {
        const a = process.env.NEXT_PUBLIC_JPYC_ADDRESS_ETHEREUM;
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
      // 必要になったら mainnet only の範囲で環境変数を追加
      // 例:
      // 1:   { address: process.env.NEXT_PUBLIC_USDC_ADDRESS_ETHEREUM as Address, decimals: 6 }
      // 137: { address: process.env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON as Address, decimals: 6 }
      // 43114: { address: process.env.NEXT_PUBLIC_USDC_ADDRESS_AVAX as Address, decimals: 6 }
    },
  },
} as const;

export function getTokenOnChain(
  token: TokenKey,
  chainId: SupportedChainId
): TokenOnChain | null {
  const def = TOKENS[token];
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
