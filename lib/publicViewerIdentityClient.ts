"use client";

import {
  parsePublicViewerMeResponse,
  type PublicViewerIdentity,
} from "@/lib/publicViewerState";

type CacheEntry = {
  expiresAt: number;
  value: unknown | null;
  promise: Promise<unknown | null> | null;
};

const VIEWER_IDENTITY_TTL_MS = 8_000;
const VIEWER_IDENTITY_ERROR_TTL_MS = 3_000;
const viewerIdentityCache = new Map<string, CacheEntry>();

function toCacheKey(address: string): string {
  return address.trim().toLowerCase();
}

export async function fetchMeResponseCached(
  address: string
): Promise<unknown | null> {
  const key = toCacheKey(address);
  const now = Date.now();
  const cached = viewerIdentityCache.get(key);

  if (cached?.promise) {
    return cached.promise;
  }

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const promise = fetch(`/api/public/viewer?address=${encodeURIComponent(address)}`, {
    method: "GET",
    cache: "no-store",
  })
    .then(async (response) => {
      const json: unknown = await response.json().catch(() => null);
      return response.ok ? json : null;
    })
    .then((value) => {
      viewerIdentityCache.set(key, {
        value,
        expiresAt: Date.now() + VIEWER_IDENTITY_TTL_MS,
        promise: null,
      });
      return value;
    })
    .catch(() => {
      viewerIdentityCache.set(key, {
        value: null,
        expiresAt: Date.now() + VIEWER_IDENTITY_ERROR_TTL_MS,
        promise: null,
      });
      return null;
    });

  viewerIdentityCache.set(key, {
    value: cached?.value ?? null,
    expiresAt: now + VIEWER_IDENTITY_TTL_MS,
    promise,
  });

  return promise;
}

export async function fetchPublicViewerIdentityCached(
  address: string
): Promise<PublicViewerIdentity | null> {
  const payload = await fetchMeResponseCached(address);
  return parsePublicViewerMeResponse(payload);
}

export function clearPublicViewerIdentityCache(address?: string): void {
  if (typeof address === "string" && address.trim().length > 0) {
    viewerIdentityCache.delete(toCacheKey(address));
    return;
  }

  viewerIdentityCache.clear();
}
