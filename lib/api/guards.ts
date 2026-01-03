// lib/api/guards.ts
import { isAddress, getAddress, type Address } from "viem";

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function toNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

export function toBigIntOrThrow(v: string, code: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error(code);
  }
}

export function toAddressOrNull(v: unknown): Address | null {
  const s = toNonEmptyString(v);
  if (!s) return null;
  if (!isAddress(s)) return null;
  return getAddress(s);
}

export function lowerOrNull(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.toLowerCase();
}

export function toBool(v: unknown): boolean {
  return v === true;
}

export function toNumberOrNull(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

export function isJsonObjectOrArray(
  v: unknown
): v is Record<string, unknown> | unknown[] {
  if (Array.isArray(v)) return true;
  return typeof v === "object" && v !== null;
}
