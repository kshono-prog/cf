import { withBaseUrl } from "@/utils/baseUrl";

function toTrimmedString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function buildCreatorProfileQrCodePath(username: string): string {
  const normalizedUsername = username.trim();
  return `/api/creators/${encodeURIComponent(normalizedUsername)}/qrcode`;
}

export function normalizeCreatorProfileQrCodeUrl(
  value: string | null | undefined
): string | null {
  const normalized = toTrimmedString(value);
  if (!normalized) return null;

  if (normalized.startsWith("/")) {
    return normalized;
  }

  try {
    const url = new URL(normalized);
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function isReusableCreatorProfileQrCodeUrl(
  value: string | null | undefined,
  username: string
): boolean {
  return (
    normalizeCreatorProfileQrCodeUrl(value) ===
    buildCreatorProfileQrCodePath(username)
  );
}

export function resolveCreatorProfileQrCodeImageSrc(args: {
  username: string;
  qrcodeUrl?: string | null;
}): string {
  const canonicalPath = buildCreatorProfileQrCodePath(args.username);
  return isReusableCreatorProfileQrCodeUrl(args.qrcodeUrl, args.username)
    ? canonicalPath
    : canonicalPath;
}

export function buildCreatorProfilePublicUrl(
  username: string,
  baseUrl: string
): string {
  return withBaseUrl(`/${encodeURIComponent(username.trim())}`, baseUrl);
}
