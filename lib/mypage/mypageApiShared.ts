import type { Address } from "viem";

import { getErrorFromApiJson, isRecord } from "@/lib/mypage/helpers";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

export { isRecord };

export async function requestJson(args: {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  cache?: RequestCache;
  authAddress?: Address | string;
  apiBase?: string;
}): Promise<{ res: Response; json: unknown }> {
  const requestInit: RequestInit = {
    method: args.method ?? "GET",
    headers: args.body ? { "Content-Type": "application/json" } : undefined,
    body: args.body === undefined ? undefined : JSON.stringify(args.body),
    cache: args.cache,
    credentials: "include",
  };
  const res = args.authAddress
    ? await ownerAuthFetch({
        address: String(args.authAddress),
        apiBase: args.apiBase,
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

export function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function asBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
