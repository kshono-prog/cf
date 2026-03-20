export type SeedCurrency = "JPYC" | "USDC";
export type SeedPurposeMode = "OPTIONAL" | "REQUIRED" | "NONE";

function optionalEnv(
  env: Record<string, string | undefined>,
  name: string
): string | null {
  const value = env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function optionalPositiveIntEnv(
  env: Record<string, string | undefined>,
  name: string
): number | null {
  const raw = optionalEnv(env, name);
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }

  return Math.floor(parsed);
}

function optionalDateEnv(
  env: Record<string, string | undefined>,
  name: string
): Date | null {
  const raw = optionalEnv(env, name);
  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${name}: ${raw}`);
  }

  return parsed;
}

function optionalCurrencyEnv(
  env: Record<string, string | undefined>,
  name: string,
  fallback: SeedCurrency
): SeedCurrency {
  const raw = optionalEnv(env, name);
  if (!raw) return fallback;
  if (raw === "JPYC" || raw === "USDC") return raw;
  throw new Error(`Invalid ${name}: ${raw}`);
}

function optionalPurposeModeEnv(
  env: Record<string, string | undefined>,
  name: string,
  fallback: SeedPurposeMode
): SeedPurposeMode {
  const raw = optionalEnv(env, name);
  if (!raw) return fallback;
  if (raw === "OPTIONAL" || raw === "REQUIRED" || raw === "NONE") {
    return raw;
  }
  throw new Error(`Invalid ${name}: ${raw}`);
}

export type SeedProjectConfig = {
  currency: SeedCurrency;
  purposeMode: SeedPurposeMode;
  goalTargetAmount: number | null;
  goalDeadline: Date | null;
};

export function parseSeedProjectConfig(
  env: Record<string, string | undefined>
): SeedProjectConfig {
  return {
    currency: optionalCurrencyEnv(env, "SEED_PROJECT_CURRENCY", "JPYC"),
    purposeMode: optionalPurposeModeEnv(
      env,
      "SEED_PROJECT_PURPOSE_MODE",
      "OPTIONAL"
    ),
    goalTargetAmount: optionalPositiveIntEnv(env, "SEED_GOAL_TARGET_AMOUNT"),
    goalDeadline: optionalDateEnv(env, "SEED_GOAL_DEADLINE"),
  };
}
