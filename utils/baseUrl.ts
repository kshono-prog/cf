// utils/baseUrl.ts
export function withBaseUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return base.endsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
