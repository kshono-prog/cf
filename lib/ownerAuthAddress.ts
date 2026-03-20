import {
  isRecord,
  toAddressOrNull,
  toNonEmptyString,
} from "@/lib/api/guards";

export function normalizeOwnerAddressOrNull(value: unknown): string | null {
  const address = toAddressOrNull(value);
  return address ? address.toLowerCase() : null;
}

export function parseOwnerAddressFromRecord(
  record: Record<string, unknown>,
  keys: readonly string[] = ["address"]
): string | null {
  for (const key of keys) {
    const raw = toNonEmptyString(record[key]);
    if (raw !== null) {
      return normalizeOwnerAddressOrNull(raw);
    }
  }

  return null;
}

export function parseOwnerAddressFromBody(
  body: unknown,
  keys: readonly string[] = ["address"]
): string | null {
  if (!isRecord(body)) return null;
  return parseOwnerAddressFromRecord(body, keys);
}

export function parseOwnerAddressFromSearchParams(
  searchParams: URLSearchParams,
  key = "address"
): string | null {
  const raw = searchParams.get(key);
  if (raw === null) return null;
  return normalizeOwnerAddressOrNull(raw);
}
