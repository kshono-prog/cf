import "server-only";

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
    return new URL(value).toString();
  } catch {
    throw new Error(`INVALID_${name}`);
  }
}

function readRequiredUrl(source: EnvSource, name: string): string {
  const value = readOptionalUrl(source, name);
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

function readOptionalInteger(source: EnvSource, name: string): number | null {
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

function readOptionalPrivateKey(source: EnvSource, name: string): string | null {
  const value = readOptionalString(source, name);
  if (!value) return null;
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`INVALID_${name}`);
  }
  return value;
}

function readRequiredPrivateKey(source: EnvSource, name: string): string {
  const value = readOptionalPrivateKey(source, name);
  if (!value) {
    throw new Error(`MISSING_${name}`);
  }
  return value;
}

export type BridgeRuntimeEnv = {
  polygonRpcUrl: string;
  polygonAmoyRpcUrl: string | null;
  avalancheRpcUrl: string;
  avalancheFujiRpcUrl: string | null;
};

export type EventChainEnv = {
  eventRpcPolygon: string;
  eventRpcPolygonAmoy: string | null;
  eventRpcAvax: string;
  eventOperatorPrivateKey: string;
};

export type EventRpcEnv = {
  eventRpcPolygon: string;
  eventRpcPolygonAmoy: string | null;
  eventRpcAvax: string;
};

export type GasSupportEnv = {
  defaultChainId: number;
  faucetPrivateKey: string;
  faucetPrivateKeyAvax: string | null;
  jpycAddress: string | null;
};

export type AvatarUploadEnv = {
  supabaseUrl: string;
  supabaseServiceKey: string;
};

export type CorsEnv = {
  allowedOrigins: string[];
};

function readRequiredUrlFromAliases(
  source: EnvSource,
  names: string[]
): string {
  for (const name of names) {
    const value = readOptionalUrl(source, name);
    if (value) return value;
  }
  throw new Error(`MISSING_${names[0]}`);
}

function readOptionalUrlFromAliases(
  source: EnvSource,
  names: string[]
): string | null {
  for (const name of names) {
    const value = readOptionalUrl(source, name);
    if (value) return value;
  }
  return null;
}

function uniqStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function parseOriginList(value: string, name: string): string[] {
  const origins = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      try {
        return new URL(entry).origin;
      } catch {
        throw new Error(`INVALID_${name}`);
      }
    });

  return uniqStrings(origins);
}

export function parseBridgeRuntimeEnv(source: EnvSource): BridgeRuntimeEnv {
  return {
    polygonRpcUrl: readRequiredUrl(source, "POLYGON_RPC_URL"),
    polygonAmoyRpcUrl: readOptionalUrl(source, "POLYGON_AMOY_RPC_URL"),
    avalancheRpcUrl: readRequiredUrl(source, "AVALANCHE_RPC_URL"),
    avalancheFujiRpcUrl: readOptionalUrl(source, "AVALANCHE_FUJI_RPC_URL"),
  };
}

export function parseEventChainEnv(source: EnvSource): EventChainEnv {
  return {
    ...parseEventRpcEnv(source),
    eventOperatorPrivateKey: readRequiredPrivateKey(
      source,
      "EVENT_OPERATOR_PRIVATE_KEY"
    ),
  };
}

export function parseEventRpcEnv(source: EnvSource): EventRpcEnv {
  return {
    eventRpcPolygon: readRequiredUrlFromAliases(source, [
      "EVENT_RPC_POLYGON",
      "POLYGON_RPC_URL",
      "NEXT_PUBLIC_RPC_URL_POLYGON",
      "NEXT_PUBLIC_RPC_URL",
    ]),
    eventRpcPolygonAmoy: readOptionalUrlFromAliases(source, [
      "EVENT_RPC_POLYGON_AMOY",
      "POLYGON_AMOY_RPC_URL",
    ]),
    eventRpcAvax: readRequiredUrlFromAliases(source, [
      "EVENT_RPC_AVAX",
      "EVENT_RPC_AVALANCHE",
      "AVALANCHE_RPC_URL",
      "NEXT_PUBLIC_RPC_URL_AVAX",
    ]),
  };
}

export function parseGasSupportEnv(source: EnvSource): GasSupportEnv {
  return {
    defaultChainId: readIntegerWithDefault(source, "CHAIN_ID", 137),
    faucetPrivateKey: readRequiredPrivateKey(source, "FAUCET_PRIVATE_KEY"),
    faucetPrivateKeyAvax: readOptionalPrivateKey(
      source,
      "FAUCET_PRIVATE_KEY_AVAX"
    ),
    jpycAddress: readOptionalAddress(source, "JPYC_ADDRESS"),
  };
}

export function parseAvatarUploadEnv(source: EnvSource): AvatarUploadEnv {
  return {
    supabaseUrl: readRequiredUrl(source, "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseServiceKey: readRequiredString(source, "SUPABASE_SERVICE_KEY"),
  };
}

export function parseCorsEnv(source: EnvSource): CorsEnv {
  const configuredOrigins = readOptionalString(source, "CORS_ALLOWED_ORIGINS");
  const baseUrl = readOptionalUrl(source, "NEXT_PUBLIC_BASE_URL");
  const nodeEnv = readOptionalString(source, "NODE_ENV") ?? "development";

  const allowedOrigins = configuredOrigins
    ? parseOriginList(configuredOrigins, "CORS_ALLOWED_ORIGINS")
    : [];

  if (baseUrl) {
    allowedOrigins.push(new URL(baseUrl).origin);
  }

  if (nodeEnv !== "production") {
    allowedOrigins.push(
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3001",
      "http://localhost:3001"
    );
  }

  return {
    allowedOrigins: uniqStrings(allowedOrigins),
  };
}

let bridgeRuntimeEnvCache: BridgeRuntimeEnv | null = null;
let eventChainEnvCache: EventChainEnv | null = null;
let eventRpcEnvCache: EventRpcEnv | null = null;
let gasSupportEnvCache: GasSupportEnv | null = null;
let avatarUploadEnvCache: AvatarUploadEnv | null = null;
let corsEnvCache: CorsEnv | null = null;

export function getBridgeRuntimeEnv(source?: EnvSource): BridgeRuntimeEnv {
  if (source) return parseBridgeRuntimeEnv(source);
  if (!bridgeRuntimeEnvCache) {
    bridgeRuntimeEnvCache = parseBridgeRuntimeEnv(process.env);
  }
  return bridgeRuntimeEnvCache;
}

export function getEventChainEnv(source?: EnvSource): EventChainEnv {
  if (source) return parseEventChainEnv(source);
  if (!eventChainEnvCache) {
    eventChainEnvCache = parseEventChainEnv(process.env);
  }
  return eventChainEnvCache;
}

export function getEventRpcEnv(source?: EnvSource): EventRpcEnv {
  if (source) return parseEventRpcEnv(source);
  if (!eventRpcEnvCache) {
    eventRpcEnvCache = parseEventRpcEnv(process.env);
  }
  return eventRpcEnvCache;
}

export function getGasSupportEnv(source?: EnvSource): GasSupportEnv {
  if (source) return parseGasSupportEnv(source);
  if (!gasSupportEnvCache) {
    gasSupportEnvCache = parseGasSupportEnv(process.env);
  }
  return gasSupportEnvCache;
}

export function getAvatarUploadEnv(source?: EnvSource): AvatarUploadEnv {
  if (source) return parseAvatarUploadEnv(source);
  if (!avatarUploadEnvCache) {
    avatarUploadEnvCache = parseAvatarUploadEnv(process.env);
  }
  return avatarUploadEnvCache;
}

export function getCorsEnv(source?: EnvSource): CorsEnv {
  if (source) return parseCorsEnv(source);
  if (!corsEnvCache) {
    corsEnvCache = parseCorsEnv(process.env);
  }
  return corsEnvCache;
}

export function getOptionalServerPrivateKey(name: string): string | null {
  return readOptionalPrivateKey(process.env, name);
}

export function getRequiredServerPrivateKey(name: string): string {
  return readRequiredPrivateKey(process.env, name);
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export type DatabaseEnv = {
  databaseUrl: string;
};

export function parseDatabaseEnv(source: EnvSource): DatabaseEnv {
  const raw = readRequiredString(source, "DATABASE_URL");
  let scheme: string;
  try {
    scheme = new URL(raw).protocol;
  } catch {
    throw new Error("INVALID_DATABASE_URL");
  }
  if (!["postgresql:", "postgres:"].includes(scheme)) {
    throw new Error("INVALID_DATABASE_URL");
  }
  return { databaseUrl: raw };
}

let databaseEnvCache: DatabaseEnv | null = null;

export function getDatabaseEnv(source?: EnvSource): DatabaseEnv {
  if (source) return parseDatabaseEnv(source);
  if (!databaseEnvCache) {
    databaseEnvCache = parseDatabaseEnv(process.env);
  }
  return databaseEnvCache;
}
