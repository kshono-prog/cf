import type { Address } from "viem";

import { getErrorFromApiJson } from "@/lib/mypage/helpers";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

export function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function toBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function toMediaType(
  value: unknown
): "IMAGE" | "VIDEO" | "LINK" | null | undefined {
  if (value === null) return null;
  if (value === "IMAGE" || value === "VIDEO" || value === "LINK") return value;
  return undefined;
}

export async function requestJson(args: {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  authAddress?: Address | string;
}): Promise<{ res: Response; json: unknown }> {
  const requestInit: RequestInit = {
    method: args.method ?? "GET",
    headers: args.body ? { "Content-Type": "application/json" } : undefined,
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
    cache: "no-store",
    credentials: "include",
  };
  const res = args.authAddress
    ? await ownerAuthFetch({
        address: String(args.authAddress),
        url: args.url,
        init: requestInit,
      })
    : await fetch(args.url, requestInit);
  const json: unknown = await res.json().catch(() => null);
  return { res, json };
}

export function toApiError(json: unknown, fallback: string): string {
  return getErrorFromApiJson(json) ?? fallback;
}
