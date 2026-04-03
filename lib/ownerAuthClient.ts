"use client";

import { isRecord } from "@/lib/api/guards";
import {
  DEV_OWNER_AUTH_OVERRIDE_HEADER,
  resolveDevManualCheckAddress,
} from "@/lib/manualCheckDev";
import { normalizeOwnerAddressOrNull } from "@/lib/ownerAuthAddress";
import { clearPublicViewerIdentityCache } from "@/lib/publicViewerIdentityClient";

export type OwnerAuthSignMessage = (args: {
  message: string;
}) => Promise<string>;

type OwnerSessionState = {
  address: string;
  expiresAtMs: number;
};

type OwnerNonceResponse = {
  ok: true;
  address: string;
  message: string;
  expiresAt: string;
};

type OwnerSessionResponse = {
  ok: true;
  address: string;
  expiresAt: string;
};

type OwnerSessionStatusResponse = {
  ok: true;
  authenticated: boolean;
  address: string | null;
  expiresAt: string | null;
};

export type OwnerSessionSnapshot = {
  status: "idle" | "checking" | "authenticated" | "unauthenticated";
  address: string | null;
  expiresAtMs: number | null;
};

type OwnerAuthFetchMode = "session-only" | "auto-auth";

const OWNER_SESSION_REFRESH_BUFFER_MS = 60_000;

let registeredSignerAddress: string | null = null;
let registeredSigner: OwnerAuthSignMessage | null = null;
let currentOwnerSession: OwnerSessionState | null = null;
let pendingOwnerSessionPromise: Promise<void> | null = null;
let currentDevOwnerOverrideAddress: string | null = null;
const ownerSessionListeners = new Set<
  (snapshot: OwnerSessionSnapshot) => void
>();

function parseNonceResponse(value: unknown): OwnerNonceResponse | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (
    typeof value.address !== "string" ||
    typeof value.message !== "string" ||
    typeof value.expiresAt !== "string"
  ) {
    return null;
  }

  return {
    ok: true,
    address: value.address,
    message: value.message,
    expiresAt: value.expiresAt,
  };
}

function parseSessionResponse(value: unknown): OwnerSessionResponse | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (typeof value.address !== "string" || typeof value.expiresAt !== "string") {
    return null;
  }

  return {
    ok: true,
    address: value.address,
    expiresAt: value.expiresAt,
  };
}

function parseSessionStatusResponse(
  value: unknown
): OwnerSessionStatusResponse | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (
    typeof value.authenticated !== "boolean" ||
    (value.address !== null && typeof value.address !== "string") ||
    (value.expiresAt !== null && typeof value.expiresAt !== "string")
  ) {
    return null;
  }

  return {
    ok: true,
    authenticated: value.authenticated,
    address: value.address,
    expiresAt: value.expiresAt,
  };
}

function getOwnerSessionSnapshot(): OwnerSessionSnapshot {
  if (!currentOwnerSession) {
    return {
      status: "unauthenticated",
      address: registeredSignerAddress,
      expiresAtMs: null,
    };
  }

  return {
    status: "authenticated",
    address: currentOwnerSession.address,
    expiresAtMs: currentOwnerSession.expiresAtMs,
  };
}

function emitOwnerSessionSnapshot(snapshot: OwnerSessionSnapshot): void {
  for (const listener of ownerSessionListeners) {
    listener(snapshot);
  }
}

function setCurrentOwnerSession(session: OwnerSessionState | null): void {
  currentOwnerSession = session;
  emitOwnerSessionSnapshot(getOwnerSessionSnapshot());
}

function setCheckingOwnerSession(address: string | null): void {
  emitOwnerSessionSnapshot({
    status: "checking",
    address,
    expiresAtMs: currentOwnerSession?.expiresAtMs ?? null,
  });
}

function resolveOwnerAuthFetchMode(init?: RequestInit): OwnerAuthFetchMode {
  const method = init?.method?.toUpperCase() ?? "GET";
  return method === "GET" || method === "HEAD" ? "session-only" : "auto-auth";
}

export function subscribeOwnerSession(
  listener: (snapshot: OwnerSessionSnapshot) => void
): () => void {
  ownerSessionListeners.add(listener);
  return () => {
    ownerSessionListeners.delete(listener);
  };
}

export function readOwnerSessionSnapshot(): OwnerSessionSnapshot {
  return getOwnerSessionSnapshot();
}

export function registerOwnerAuthSigner(
  address: string | null,
  signer: OwnerAuthSignMessage | null
): void {
  registeredSignerAddress = normalizeOwnerAddressOrNull(address);
  registeredSigner = signer;
}

export function registerOwnerAuthDevOverride(address: string | null): void {
  currentDevOwnerOverrideAddress = resolveDevManualCheckAddress(address);
}

export function clearOwnerAuthSessionCache(): void {
  const address = currentOwnerSession?.address ?? registeredSignerAddress;
  setCurrentOwnerSession(null);
  pendingOwnerSessionPromise = null;
  clearPublicViewerIdentityCache(address ?? undefined);
}

export async function fetchOwnerSessionState(args: {
  address: string;
  apiBase?: string;
}): Promise<OwnerSessionSnapshot> {
  const address = normalizeOwnerAddressOrNull(args.address);
  if (!address) {
    throw new Error("ADDRESS_REQUIRED");
  }

  const apiBase = args.apiBase ?? "";

  if (currentDevOwnerOverrideAddress === address) {
    const snapshot: OwnerSessionSnapshot = {
      status: "authenticated",
      address,
      expiresAtMs: Date.now() + OWNER_SESSION_REFRESH_BUFFER_MS,
    };
    emitOwnerSessionSnapshot(snapshot);
    return snapshot;
  }

  setCheckingOwnerSession(address);

  const response = await fetch(
    `${apiBase}/api/owner-auth/session?address=${encodeURIComponent(address)}`,
    {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    }
  );
  const payload = parseSessionStatusResponse(
    await response.json().catch(() => null)
  );

  if (!response.ok || !payload) {
    clearOwnerAuthSessionCache();
    throw new Error("OWNER_AUTH_SESSION_STATUS_FAILED");
  }

  if (!payload.authenticated || payload.address !== address || !payload.expiresAt) {
    clearOwnerAuthSessionCache();
    return {
      status: "unauthenticated",
      address,
      expiresAtMs: null,
    };
  }

  const snapshot: OwnerSessionSnapshot = {
    status: "authenticated",
    address,
    expiresAtMs: Date.parse(payload.expiresAt),
  };
  setCurrentOwnerSession({
    address,
    expiresAtMs: snapshot.expiresAtMs ?? Date.now(),
  });
  clearPublicViewerIdentityCache(address);
  return snapshot;
}

export async function ensureOwnerSession(args: {
  address: string;
  apiBase?: string;
}): Promise<void> {
  const address = normalizeOwnerAddressOrNull(args.address);
  if (!address) {
    throw new Error("ADDRESS_REQUIRED");
  }
  const apiBase = args.apiBase ?? "";

  if (currentDevOwnerOverrideAddress === address) {
    return;
  }

  if (
    currentOwnerSession &&
    currentOwnerSession.address === address &&
    currentOwnerSession.expiresAtMs - Date.now() > OWNER_SESSION_REFRESH_BUFFER_MS
  ) {
    return;
  }

  if (pendingOwnerSessionPromise) {
    return pendingOwnerSessionPromise;
  }

  if (!registeredSigner || registeredSignerAddress !== address) {
    throw new Error("OWNER_SIGNER_NOT_READY");
  }

  setCheckingOwnerSession(address);

  pendingOwnerSessionPromise = (async () => {
    try {
      const nonceRes = await fetch(
        `${apiBase}/api/owner-auth/nonce?address=${encodeURIComponent(address)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );
      const nonceJson: unknown = await nonceRes.json().catch(() => null);
      const noncePayload = parseNonceResponse(nonceJson);

      if (!nonceRes.ok || !noncePayload) {
        throw new Error("OWNER_AUTH_NONCE_FAILED");
      }

      const signature = await registeredSigner({
        message: noncePayload.message,
      });

      const sessionRes = await fetch(`${apiBase}/api/owner-auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({
          address,
          message: noncePayload.message,
          signature,
        }),
      });
      const sessionJson: unknown = await sessionRes.json().catch(() => null);
      const sessionPayload = parseSessionResponse(sessionJson);

      if (!sessionRes.ok || !sessionPayload) {
        throw new Error("OWNER_AUTH_SESSION_FAILED");
      }

      setCurrentOwnerSession({
        address: normalizeOwnerAddressOrNull(sessionPayload.address) ?? address,
        expiresAtMs: Date.parse(sessionPayload.expiresAt),
      });
      clearPublicViewerIdentityCache(address);
    } catch (error) {
      setCurrentOwnerSession(null);
      clearPublicViewerIdentityCache(address);
      throw error;
    }
  })().finally(() => {
    pendingOwnerSessionPromise = null;
  });

  return pendingOwnerSessionPromise;
}

export async function logoutOwnerSession(args?: {
  apiBase?: string;
}): Promise<void> {
  const apiBase = args?.apiBase ?? "";

  try {
    await fetch(`${apiBase}/api/owner-auth/session`, {
      method: "DELETE",
      cache: "no-store",
      credentials: "include",
    });
  } finally {
    clearOwnerAuthSessionCache();
  }
}

export async function ownerAuthFetch(args: {
  address: string;
  url: string;
  apiBase?: string;
  init?: RequestInit;
  authMode?: OwnerAuthFetchMode;
}): Promise<Response> {
  const requestInit: RequestInit = {
    ...(args.init ?? {}),
    credentials: "include",
  };

  const address = normalizeOwnerAddressOrNull(args.address);
  if (!address) {
    throw new Error("ADDRESS_REQUIRED");
  }

  if (currentDevOwnerOverrideAddress === address) {
    const headers = new Headers(requestInit.headers);
    headers.set(DEV_OWNER_AUTH_OVERRIDE_HEADER, address);
    requestInit.headers = headers;
    return fetch(args.url, requestInit);
  }

  const authMode = args.authMode ?? resolveOwnerAuthFetchMode(requestInit);

  if (authMode === "session-only") {
    const response = await fetch(args.url, requestInit);
    if (response.status === 401) {
      clearOwnerAuthSessionCache();
    }
    return response;
  }

  await ensureOwnerSession({ address, apiBase: args.apiBase });

  let response = await fetch(args.url, requestInit);
  if (response.status !== 401) {
    return response;
  }

  clearOwnerAuthSessionCache();
  await ensureOwnerSession({ address, apiBase: args.apiBase });
  response = await fetch(args.url, requestInit);
  return response;
}
