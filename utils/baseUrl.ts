function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string): string {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.split(",")[0]?.trim();
  return normalized ? normalized : null;
}

function inferProtocol(host: string): "http" | "https" {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1")
    ? "http"
    : "https";
}

export function resolveBaseUrlFromHeaders(headers: Pick<Headers, "get">): string {
  const host =
    firstHeaderValue(headers.get("x-forwarded-host")) ??
    firstHeaderValue(headers.get("host"));
  if (host) {
    const protocol =
      firstHeaderValue(headers.get("x-forwarded-proto")) ?? inferProtocol(host);
    return `${protocol}://${host}`;
  }

  return normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL ?? "");
}

export function resolveBaseUrlFromRequestUrl(requestUrl: string): string {
  try {
    return normalizeBaseUrl(new URL(requestUrl).origin);
  } catch {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL ?? "");
  }
}

export function withBaseUrl(
  path = "",
  baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ""
): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = normalizePath(path);

  if (!normalizedBase) {
    return normalizedPath || "/";
  }

  return normalizedPath ? `${normalizedBase}${normalizedPath}` : normalizedBase;
}
