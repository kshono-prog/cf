import { normalizeOwnerAddressOrNull } from "@/lib/ownerAuthAddress";

export const DEV_MANUAL_CHECK_SEARCH_PARAM = "manualCheck";
export const DEV_OWNER_AUTH_OVERRIDE_HEADER = "x-cf-dev-owner-address";

function readFirst(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return typeof value === "string" ? value : null;
}

export function isDevRuntime(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isLocalDevHost(value: string | null | undefined): boolean {
  if (!value) return false;
  return (
    value === "localhost" ||
    value.startsWith("localhost:") ||
    value === "127.0.0.1" ||
    value.startsWith("127.0.0.1:")
  );
}

export function isDevManualCheckEnabled(
  value: string | string[] | undefined
): boolean {
  const raw = readFirst(value)?.trim().toLowerCase() ?? "";
  return raw === "1" || raw === "true" || raw === "yes";
}

export function resolveDevManualCheckAddress(value: unknown): string | null {
  return normalizeOwnerAddressOrNull(value);
}
