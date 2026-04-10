import { getAddress, isAddress, parseUnits } from "viem";

import {
  getChainConfig,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chainConfig";
import { getTokenOnChain, TOKENS, type TokenKey } from "@/lib/tokenRegistry";

export type ExternalWalletTipAssetKey = "NATIVE" | TokenKey;

export type ExternalWalletTipAssetOption = Readonly<{
  key: ExternalWalletTipAssetKey;
  kind: "native" | "erc20";
  displayName: string;
  symbol: string;
  decimals: number;
  chainId: SupportedChainId;
  tokenAddress: `0x${string}` | null;
}>;

export type ExternalWalletTipQrPayload = Readonly<{
  mode: "address" | "native-transfer" | "erc20-transfer";
  qrText: string;
  address: `0x${string}`;
  chainId: SupportedChainId;
  asset: ExternalWalletTipAssetKey;
  assetKind: "native" | "erc20";
  displayName: string;
  symbol: string;
  amount: string | null;
  amountBaseUnits: string | null;
  tokenAddress: `0x${string}` | null;
}>;

const ERC20_TOKEN_KEYS: readonly TokenKey[] = ["JPYC", "USDC"] as const;

function normalizeAmountInputValue(
  value: string,
  options?: { preserveTrailingDecimal?: boolean }
): string {
  const sanitized = value.replace(/[^\d.]/g, "");
  const dotIndex = sanitized.indexOf(".");
  if (dotIndex === -1) {
    return sanitized;
  }

  const whole = sanitized.slice(0, dotIndex).replace(/\./g, "");
  const fraction = sanitized
    .slice(dotIndex + 1)
    .replace(/\./g, "")
    .slice(0, 18);
  const normalizedWhole = whole.length > 0 ? whole : "0";

  if (fraction.length > 0) {
    return `${normalizedWhole}.${fraction}`;
  }

  if (options?.preserveTrailingDecimal === true) {
    return `${normalizedWhole}.`;
  }

  return normalizedWhole;
}

function resolveExternalWalletTipAssetOption(
  chainId: SupportedChainId,
  asset: ExternalWalletTipAssetKey
): ExternalWalletTipAssetOption {
  const chain = getChainConfig(chainId);
  if (!chain) {
    throw new Error("CHAIN_ID_INVALID");
  }

  if (asset === "NATIVE") {
    return {
      key: "NATIVE",
      kind: "native",
      displayName: chain.shortName,
      symbol: chain.nativeSymbol,
      decimals: 18,
      chainId,
      tokenAddress: null,
    };
  }

  const tokenOnChain = getTokenOnChain(asset, chainId);
  if (!tokenOnChain) {
    throw new Error("TIP_ASSET_UNAVAILABLE");
  }

  return {
    key: asset,
    kind: "erc20",
    displayName: TOKENS[asset].displayName,
    symbol: TOKENS[asset].displayName,
    decimals: tokenOnChain.decimals,
    chainId,
    tokenAddress: tokenOnChain.address,
  };
}

export function normalizeExternalWalletTipAmountInput(value: string): string {
  return normalizeAmountInputValue(value, { preserveTrailingDecimal: true });
}

export function parseExternalWalletTipChainId(
  value: string | null | undefined,
  fallback: SupportedChainId
): SupportedChainId {
  if (!value) return fallback;
  const parsed = Number(value);
  return isSupportedChainId(parsed) ? parsed : fallback;
}

export function parseExternalWalletTipAsset(
  value: string | null | undefined
): ExternalWalletTipAssetKey {
  if (value === "JPYC" || value === "USDC") {
    return value;
  }
  return "NATIVE";
}

export function listExternalWalletTipAssets(
  chainId: SupportedChainId
): ExternalWalletTipAssetOption[] {
  const options: ExternalWalletTipAssetOption[] = [
    resolveExternalWalletTipAssetOption(chainId, "NATIVE"),
  ];

  for (const tokenKey of ERC20_TOKEN_KEYS) {
    const tokenOnChain = getTokenOnChain(tokenKey, chainId);
    if (!tokenOnChain) {
      continue;
    }

    options.push({
      key: tokenKey,
      kind: "erc20",
      displayName: TOKENS[tokenKey].displayName,
      symbol: TOKENS[tokenKey].displayName,
      decimals: tokenOnChain.decimals,
      chainId,
      tokenAddress: tokenOnChain.address,
    });
  }

  return options;
}

export function buildExternalWalletTipQrPayload(args: {
  address: string;
  chainId: SupportedChainId;
  asset?: ExternalWalletTipAssetKey;
  amountInput?: string | null;
}): ExternalWalletTipQrPayload {
  if (!isAddress(args.address, { strict: false })) {
    throw new Error("CREATOR_ADDRESS_INVALID");
  }

  const address = getAddress(args.address);
  const asset = args.asset ?? "NATIVE";
  const assetOption = resolveExternalWalletTipAssetOption(args.chainId, asset);
  const normalizedAmount = normalizeAmountInputValue(args.amountInput ?? "").trim();

  if (assetOption.kind === "native") {
    if (!normalizedAmount) {
      return {
        mode: "address",
        qrText: address,
        address,
        chainId: assetOption.chainId,
        asset: assetOption.key,
        assetKind: assetOption.kind,
        displayName: assetOption.displayName,
        symbol: assetOption.symbol,
        amount: null,
        amountBaseUnits: null,
        tokenAddress: null,
      };
    }

    const baseUnits = parseUnits(normalizedAmount, assetOption.decimals);
    if (baseUnits <= 0n) {
      throw new Error("TIP_AMOUNT_INVALID");
    }

    return {
      mode: "native-transfer",
      qrText: `ethereum:${address}@${assetOption.chainId}?value=${baseUnits.toString()}`,
      address,
      chainId: assetOption.chainId,
      asset: assetOption.key,
      assetKind: assetOption.kind,
      displayName: assetOption.displayName,
      symbol: assetOption.symbol,
      amount: normalizedAmount,
      amountBaseUnits: baseUnits.toString(),
      tokenAddress: null,
    };
  }

  const tokenAddress = assetOption.tokenAddress;
  if (!tokenAddress) {
    throw new Error("TIP_ASSET_UNAVAILABLE");
  }

  if (!normalizedAmount) {
    return {
      mode: "erc20-transfer",
      qrText: `ethereum:${tokenAddress}@${assetOption.chainId}/transfer?address=${address}`,
      address,
      chainId: assetOption.chainId,
      asset: assetOption.key,
      assetKind: assetOption.kind,
      displayName: assetOption.displayName,
      symbol: assetOption.symbol,
      amount: null,
      amountBaseUnits: null,
      tokenAddress,
    };
  }

  const baseUnits = parseUnits(normalizedAmount, assetOption.decimals);
  if (baseUnits <= 0n) {
    throw new Error("TIP_AMOUNT_INVALID");
  }

  return {
    mode: "erc20-transfer",
    qrText: `ethereum:${tokenAddress}@${assetOption.chainId}/transfer?address=${address}&uint256=${baseUnits.toString()}`,
    address,
    chainId: assetOption.chainId,
    asset: assetOption.key,
    assetKind: assetOption.kind,
    displayName: assetOption.displayName,
    symbol: assetOption.symbol,
    amount: normalizedAmount,
    amountBaseUnits: baseUnits.toString(),
    tokenAddress,
  };
}

export function buildExternalWalletTipDeepLinkHref(
  payload: ExternalWalletTipQrPayload
): string {
  if (payload.mode === "address") {
    return `ethereum:${payload.address}@${payload.chainId}`;
  }

  return payload.qrText;
}
