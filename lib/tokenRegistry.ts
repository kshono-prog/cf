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
 * - address は `0x${string}` ではなく viem の Address を採用（安全）。
 * - env で上書きしたい場合は、build 時に address を差し込む方式が安全（型崩れを防ぐ）。
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
      80002: (() => {
        const a =
          process.env.NEXT_PUBLIC_JPYC_ADDRESS_AMOY ??
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
      43113: (() => {
        const a = process.env.NEXT_PUBLIC_JPYC_ADDRESS_FUJI;
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
      11155111: (() => {
        const a = process.env.NEXT_PUBLIC_JPYC_ADDRESS_SEPOLIA;
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
      // 必要になったら同様に環境変数で追加（未設定は登録しない）
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
