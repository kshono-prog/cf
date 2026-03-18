/**
 * Deep link URL parameter contract for creator profile pages.
 *
 * Query parameters:
 *   projectId  — numeric project ID (bigint-safe string)
 *   purposeId  — numeric purpose ID (bigint-safe string)
 *   currency   — "JPYC" | "USDC"
 *   amount     — positive decimal string (display unit, not atomic)
 *   support    — "1" to open the support sheet on load
 */

export type DeepLinkCurrency = "JPYC" | "USDC";

export type ProfileDeepLinkParams = {
  projectId?: string;
  purposeId?: string;
  currency?: DeepLinkCurrency;
  amount?: string;
  support?: "1";
};

/** Build a profile deep-link URL path + query string. */
export function buildProfileDeepLink(
  username: string,
  params: ProfileDeepLinkParams
): string {
  const q = new URLSearchParams();
  if (params.projectId) q.set("projectId", params.projectId);
  if (params.purposeId) q.set("purposeId", params.purposeId);
  if (params.currency) q.set("currency", params.currency);
  if (params.amount) q.set("amount", params.amount);
  if (params.support) q.set("support", params.support);
  const qs = q.toString();
  return `/${encodeURIComponent(username)}${qs ? `?${qs}` : ""}`;
}

/**
 * Parse and validate deep-link params from URLSearchParams (client side).
 * Unknown or invalid values are dropped rather than errored.
 */
export function parseProfileDeepLinkParams(
  searchParams: URLSearchParams
): ProfileDeepLinkParams {
  const result: ProfileDeepLinkParams = {};

  const projectId = searchParams.get("projectId");
  if (projectId && isPositiveIntString(projectId)) {
    result.projectId = projectId;
  }

  const purposeId = searchParams.get("purposeId");
  if (purposeId && isPositiveIntString(purposeId)) {
    result.purposeId = purposeId;
  }

  const currency = searchParams.get("currency");
  if (currency === "JPYC" || currency === "USDC") {
    result.currency = currency;
  }

  const amount = searchParams.get("amount");
  if (amount && isPositiveDecimalString(amount)) {
    result.amount = amount;
  }

  const support = searchParams.get("support");
  if (support === "1") {
    result.support = "1";
  }

  return result;
}

// ── Server-side validation helpers ────────────────────────────────────────────

/** Validate and return a DeepLinkCurrency, or null if invalid. */
export function toDeepLinkCurrencyOrNull(v: unknown): DeepLinkCurrency | null {
  if (v === "JPYC" || v === "USDC") return v;
  return null;
}

/** Validate a purposeId query param (positive integer string). Returns null if invalid. */
export function toPurposeIdOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (!isPositiveIntString(v)) return null;
  return v;
}

/** Validate an amount query param (positive decimal string). Returns null if invalid. */
export function toAmountOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (!isPositiveDecimalString(v)) return null;
  return v;
}

// ── Internal ──────────────────────────────────────────────────────────────────

function isPositiveIntString(s: string): boolean {
  if (!/^\d+$/.test(s)) return false;
  try {
    return BigInt(s) > 0n;
  } catch {
    return false;
  }
}

function isPositiveDecimalString(s: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(s)) return false;
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}
