"use client";

import { isRecord } from "@/lib/api/guards";
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

const OWNER_SESSION_REFRESH_BUFFER_MS = 60_000;

let registeredSignerAddress: string | null = null;
let registeredSigner: OwnerAuthSignMessage | null = null;
let currentOwnerSession: OwnerSessionState | null = null;
let pendingOwnerSessionPromise: Promise<void> | null = null;

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

export function registerOwnerAuthSigner(
  address: string | null,
  signer: OwnerAuthSignMessage | null
): void {
  registeredSignerAddress = normalizeOwnerAddressOrNull(address);
  registeredSigner = signer;
}

export function clearOwnerAuthSessionCache(): void {
  const address = currentOwnerSession?.address ?? registeredSignerAddress;
  currentOwnerSession = null;
  pendingOwnerSessionPromise = null;
  clearPublicViewerIdentityCache(address ?? undefined);
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

      currentOwnerSession = {
        address: normalizeOwnerAddressOrNull(sessionPayload.address) ?? address,
        expiresAtMs: Date.parse(sessionPayload.expiresAt),
      };
      clearPublicViewerIdentityCache(currentOwnerSession.address);
    } catch (error) {
      clearPublicViewerIdentityCache(address);
      throw error;
    }
  })().finally(() => {
    pendingOwnerSessionPromise = null;
  });

  return pendingOwnerSessionPromise;
}

export async function ownerAuthFetch(args: {
  address: string;
  url: string;
  apiBase?: string;
  init?: RequestInit;
}): Promise<Response> {
  await ensureOwnerSession({ address: args.address, apiBase: args.apiBase });

  const requestInit: RequestInit = {
    ...(args.init ?? {}),
    credentials: "include",
  };

  let response = await fetch(args.url, requestInit);
  if (response.status !== 401) {
    return response;
  }

  clearOwnerAuthSessionCache();
  await ensureOwnerSession({ address: args.address, apiBase: args.apiBase });
  response = await fetch(args.url, requestInit);
  return response;
}
