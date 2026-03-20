import { getAddress, isAddress } from "viem";

type EnvSource = Record<string, string | undefined>;

function readOptionalString(source: EnvSource, name: string): string | null {
  const value = source[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readRequiredString(source: EnvSource, name: string): string {
  const value = readOptionalString(source, name);
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

function readOptionalUrl(source: EnvSource, name: string): string | null {
  const value = readOptionalString(source, name);
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    throw new Error(`INVALID_${name}`);
  }
}

function readOptionalInteger(
  source: EnvSource,
  name: string
): number | null {
  const value = readOptionalString(source, name);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`INVALID_${name}`);
  }
  return parsed;
}

function readIntegerWithDefault(
  source: EnvSource,
  name: string,
  defaultValue: number
): number {
  return readOptionalInteger(source, name) ?? defaultValue;
}

function readOptionalAddress(source: EnvSource, name: string): string | null {
  const value = readOptionalString(source, name);
  if (!value) return null;
  if (!isAddress(value, { strict: false })) {
    throw new Error(`INVALID_${name}`);
  }
  return getAddress(value);
}

export type PublicEnv = {
  projectId: string;
  walletConnectProjectId: string;
  defaultChainId: number;
  defaultAvaxChainId: number | null;
  polygonChainId: number | null;
  ethereumChainId: number | null;
  rpcUrlEthereum: string | null;
  rpcUrlPolygon: string | null;
  rpcUrlAvalanche: string | null;
  rpcUrlAvalancheFuji: string | null;
  jpycAddress: string | null;
  jpycAddressPolygon: string | null;
  jpycAddressAvax: string | null;
  jpycAddressEthereum: string | null;
  usdcAddress: string | null;
  usdcAddressPolygon: string | null;
  usdcAddressAvax: string | null;
  usdcAddressEthereum: string | null;
  supabaseUrl: string | null;
  baseUrl: string | null;
};

export function parsePublicEnv(source: EnvSource): PublicEnv {
  const jpycAddress = readOptionalAddress(source, "NEXT_PUBLIC_JPYC_ADDRESS");
  const usdcAddressPolygon = readOptionalAddress(
    source,
    "NEXT_PUBLIC_USDC_ADDRESS_POLYGON"
  );
  const usdcAddress = readOptionalAddress(source, "NEXT_PUBLIC_USDC_ADDRESS");
  const projectId = readRequiredString(source, "NEXT_PUBLIC_PROJECT_ID");

  return {
    projectId,
    walletConnectProjectId:
      readOptionalString(source, "NEXT_PUBLIC_WC_PROJECT_ID") ?? projectId,
    defaultChainId: readIntegerWithDefault(source, "NEXT_PUBLIC_CHAIN_ID", 43114),
    defaultAvaxChainId: readOptionalInteger(source, "NEXT_PUBLIC_CHAIN_ID_AVAX"),
    polygonChainId:
      readOptionalInteger(source, "NEXT_PUBLIC_POLYGON_CHAIN_ID") ??
      readOptionalInteger(source, "NEXT_PUBLIC_CHAIN_ID"),
    ethereumChainId:
      readOptionalInteger(source, "NEXT_PUBLIC_ETHEREUM_CHAIN_ID") ??
      readOptionalInteger(source, "NEXT_PUBLIC_CHAIN_ID_ETHEREUM"),
    rpcUrlEthereum: readOptionalUrl(source, "NEXT_PUBLIC_RPC_URL_ETHEREUM"),
    rpcUrlPolygon:
      readOptionalUrl(source, "NEXT_PUBLIC_RPC_URL_POLYGON") ??
      readOptionalUrl(source, "NEXT_PUBLIC_RPC_URL"),
    rpcUrlAvalanche: readOptionalUrl(source, "NEXT_PUBLIC_RPC_URL_AVAX"),
    rpcUrlAvalancheFuji: readOptionalUrl(source, "NEXT_PUBLIC_RPC_URL_AVAX_FUJI"),
    jpycAddress,
    jpycAddressPolygon:
      readOptionalAddress(source, "NEXT_PUBLIC_JPYC_ADDRESS_POLYGON") ?? jpycAddress,
    jpycAddressAvax: readOptionalAddress(source, "NEXT_PUBLIC_JPYC_ADDRESS_AVAX"),
    jpycAddressEthereum: readOptionalAddress(
      source,
      "NEXT_PUBLIC_JPYC_ADDRESS_ETHEREUM"
    ),
    usdcAddress,
    usdcAddressPolygon: usdcAddressPolygon ?? usdcAddress,
    usdcAddressAvax: readOptionalAddress(source, "NEXT_PUBLIC_USDC_ADDRESS_AVAX"),
    usdcAddressEthereum: readOptionalAddress(
      source,
      "NEXT_PUBLIC_USDC_ADDRESS_ETHEREUM"
    ),
    supabaseUrl: readOptionalUrl(source, "NEXT_PUBLIC_SUPABASE_URL"),
    baseUrl: readOptionalUrl(source, "NEXT_PUBLIC_BASE_URL"),
  };
}

const runtimePublicEnvSource: EnvSource = {
  NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
  NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
  NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
  NEXT_PUBLIC_CHAIN_ID_AVAX: process.env.NEXT_PUBLIC_CHAIN_ID_AVAX,
  NEXT_PUBLIC_POLYGON_CHAIN_ID: process.env.NEXT_PUBLIC_POLYGON_CHAIN_ID,
  NEXT_PUBLIC_ETHEREUM_CHAIN_ID: process.env.NEXT_PUBLIC_ETHEREUM_CHAIN_ID,
  NEXT_PUBLIC_CHAIN_ID_ETHEREUM: process.env.NEXT_PUBLIC_CHAIN_ID_ETHEREUM,
  NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  NEXT_PUBLIC_RPC_URL_ETHEREUM: process.env.NEXT_PUBLIC_RPC_URL_ETHEREUM,
  NEXT_PUBLIC_RPC_URL_POLYGON: process.env.NEXT_PUBLIC_RPC_URL_POLYGON,
  NEXT_PUBLIC_RPC_URL_AVAX: process.env.NEXT_PUBLIC_RPC_URL_AVAX,
  NEXT_PUBLIC_RPC_URL_AVAX_FUJI: process.env.NEXT_PUBLIC_RPC_URL_AVAX_FUJI,
  NEXT_PUBLIC_JPYC_ADDRESS: process.env.NEXT_PUBLIC_JPYC_ADDRESS,
  NEXT_PUBLIC_JPYC_ADDRESS_POLYGON: process.env.NEXT_PUBLIC_JPYC_ADDRESS_POLYGON,
  NEXT_PUBLIC_JPYC_ADDRESS_AVAX: process.env.NEXT_PUBLIC_JPYC_ADDRESS_AVAX,
  NEXT_PUBLIC_JPYC_ADDRESS_ETHEREUM: process.env.NEXT_PUBLIC_JPYC_ADDRESS_ETHEREUM,
  NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS,
  NEXT_PUBLIC_USDC_ADDRESS_POLYGON: process.env.NEXT_PUBLIC_USDC_ADDRESS_POLYGON,
  NEXT_PUBLIC_USDC_ADDRESS_AVAX: process.env.NEXT_PUBLIC_USDC_ADDRESS_AVAX,
  NEXT_PUBLIC_USDC_ADDRESS_ETHEREUM: process.env.NEXT_PUBLIC_USDC_ADDRESS_ETHEREUM,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
};

let publicEnvCache: PublicEnv | null = null;

export function getPublicEnv(source?: EnvSource): PublicEnv {
  if (source) {
    return parsePublicEnv(source);
  }

  if (!publicEnvCache) {
    publicEnvCache = parsePublicEnv(runtimePublicEnvSource);
  }

  return publicEnvCache;
}
