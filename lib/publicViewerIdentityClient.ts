"use client";

import {
  parsePublicViewerMeResponse,
  type PublicViewerIdentity,
} from "@/lib/publicViewerState";
import {
  PUBLIC_VIEWER_IDENTITY_CACHE_TTL_MS,
  PUBLIC_VIEWER_IDENTITY_ERROR_TTL_MS,
  PUBLIC_VIEWER_IDENTITY_INVALIDATION_STORAGE_KEY,
} from "@/lib/publicViewerIdentityCacheConfig";

type CacheEntry = {
  expiresAt: number;
  value: unknown | null;
  promise: Promise<unknown | null> | null;
};

type PublicViewerIdentityInvalidationMessage =
  | {
      scope: "all";
      at: number;
      nonce: string;
    }
  | {
      scope: "address";
      address: string;
      at: number;
      nonce: string;
    };

type StorageEventLike = {
  key: string | null;
  newValue: string | null;
};

type LocalStorageLike = Pick<Storage, "setItem">;
type WindowLike = Pick<Window, "addEventListener" | "removeEventListener"> & {
  localStorage: LocalStorageLike;
};

const viewerIdentityCache = new Map<string, CacheEntry>();
let storageSyncTarget: WindowLike | null = null;
const publicViewerIdentityStorageListener: EventListener = (event) => {
  handlePublicViewerIdentityStorageEvent(event as unknown as StorageEventLike);
};

function getWindowLike(): WindowLike | null {
  if (typeof window === "undefined") return null;
  return window as WindowLike;
}

function toCacheKey(address: string): string {
  return address.trim().toLowerCase();
}

function clearPublicViewerIdentityCacheLocal(address?: string): void {
  if (typeof address === "string" && address.trim().length > 0) {
    viewerIdentityCache.delete(toCacheKey(address));
    return;
  }

  viewerIdentityCache.clear();
}

function createInvalidationMessage(
  address?: string
): PublicViewerIdentityInvalidationMessage {
  if (typeof address === "string" && address.trim().length > 0) {
    return {
      scope: "address",
      address: toCacheKey(address),
      at: Date.now(),
      nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    };
  }

  return {
    scope: "all",
    at: Date.now(),
    nonce: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}

function broadcastInvalidation(message: PublicViewerIdentityInvalidationMessage): void {
  const targetWindow = getWindowLike();
  if (!targetWindow) return;

  try {
    targetWindow.localStorage.setItem(
      PUBLIC_VIEWER_IDENTITY_INVALIDATION_STORAGE_KEY,
      JSON.stringify(message)
    );
  } catch {
    // ignore storage write failures
  }
}

export function parsePublicViewerIdentityInvalidationMessage(
  value: string | null
): PublicViewerIdentityInvalidationMessage | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
      record.scope === "all" &&
      typeof record.at === "number" &&
      typeof record.nonce === "string"
    ) {
      return {
        scope: "all",
        at: record.at,
        nonce: record.nonce,
      };
    }

    if (
      record.scope === "address" &&
      typeof record.address === "string" &&
      record.address.trim().length > 0 &&
      typeof record.at === "number" &&
      typeof record.nonce === "string"
    ) {
      return {
        scope: "address",
        address: toCacheKey(record.address),
        at: record.at,
        nonce: record.nonce,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function applyPublicViewerIdentityInvalidation(
  message: PublicViewerIdentityInvalidationMessage
): void {
  if (message.scope === "all") {
    clearPublicViewerIdentityCacheLocal();
    return;
  }

  clearPublicViewerIdentityCacheLocal(message.address);
}

export function handlePublicViewerIdentityStorageEvent(
  event: StorageEventLike
): void {
  if (event.key !== PUBLIC_VIEWER_IDENTITY_INVALIDATION_STORAGE_KEY) {
    return;
  }

  const message = parsePublicViewerIdentityInvalidationMessage(event.newValue);
  if (!message) return;
  applyPublicViewerIdentityInvalidation(message);
}

export function ensurePublicViewerIdentityCacheSync(
  targetWindow: WindowLike | null = getWindowLike()
): void {
  if (!targetWindow) return;
  if (storageSyncTarget === targetWindow) return;

  if (storageSyncTarget) {
    storageSyncTarget.removeEventListener("storage", publicViewerIdentityStorageListener);
  }

  targetWindow.addEventListener("storage", publicViewerIdentityStorageListener);
  storageSyncTarget = targetWindow;
}

export function resetPublicViewerIdentityClientForTests(): void {
  clearPublicViewerIdentityCacheLocal();
  if (storageSyncTarget) {
    storageSyncTarget.removeEventListener("storage", publicViewerIdentityStorageListener);
  }
  storageSyncTarget = null;
}

export async function fetchMeResponseCached(
  address: string
): Promise<unknown | null> {
  ensurePublicViewerIdentityCacheSync();

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
        expiresAt: Date.now() + PUBLIC_VIEWER_IDENTITY_CACHE_TTL_MS,
        promise: null,
      });
      return value;
    })
    .catch(() => {
      viewerIdentityCache.set(key, {
        value: null,
        expiresAt: Date.now() + PUBLIC_VIEWER_IDENTITY_ERROR_TTL_MS,
        promise: null,
      });
      return null;
    });

  viewerIdentityCache.set(key, {
    value: cached?.value ?? null,
    expiresAt: now + PUBLIC_VIEWER_IDENTITY_CACHE_TTL_MS,
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

export function clearPublicViewerIdentityCache(
  address?: string,
  options?: { broadcast?: boolean }
): void {
  const normalizedAddress =
    typeof address === "string" && address.trim().length > 0
      ? toCacheKey(address)
      : undefined;

  clearPublicViewerIdentityCacheLocal(normalizedAddress);

  if (options?.broadcast === false) {
    return;
  }

  broadcastInvalidation(createInvalidationMessage(normalizedAddress));
}
