import crypto from "crypto";

import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  normalizeOwnerAddressOrNull,
  parseOwnerAddressFromBody,
  parseOwnerAddressFromSearchParams,
} from "@/lib/ownerAuthAddress";

const OWNER_AUTH_CHAIN_ID = 0;
const OWNER_AUTH_NONCE_TTL_MS = 5 * 60_000;
const OWNER_AUTH_SESSION_TTL_MS = 12 * 60 * 60_000;

export const OWNER_SESSION_COOKIE_NAME = "cf_owner_session";

type OwnerSessionRecord = {
  nonce: string;
  expiresAt: Date;
};

type IssueOwnerAuthNonceDeps = {
  now?: () => Date;
  randomHex?: (bytes: number) => string;
  upsertNonce?: (args: {
    address: string;
    nonce: string;
    expiresAt: Date;
  }) => Promise<void>;
};

type CreateOwnerSessionDeps = {
  now?: () => Date;
  randomHex?: (bytes: number) => string;
  verifyMessage?: (message: string, signature: string) => string;
  findNonce?: (address: string) => Promise<OwnerSessionRecord | null>;
  updateNonce?: (args: {
    address: string;
    nonce: string;
    expiresAt: Date;
  }) => Promise<void>;
};

type ResolveOwnerSessionDeps = {
  now?: () => Date;
  findNonce?: (address: string) => Promise<OwnerSessionRecord | null>;
};

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function normalizeOwnerAddress(value: unknown): string | null {
  return normalizeOwnerAddressOrNull(value);
}

function buildUnauthorizedResponse(error: string): NextResponse {
  const response = NextResponse.json({ ok: false, error }, { status: 401 });
  clearOwnerSessionCookie(response);
  return response;
}

function buildInvalidResponse(error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export function buildOwnerAuthMessage(address: string, nonce: string): string {
  return [
    "creator founding owner auth",
    `address:${address}`,
    `nonce:${nonce}`,
  ].join("\n");
}

export async function issueOwnerAuthNonce(addressRaw: unknown): Promise<
  | { ok: true; address: string; message: string; expiresAt: Date }
  | { ok: false; response: NextResponse }
>;
export async function issueOwnerAuthNonce(
  addressRaw: unknown,
  deps: IssueOwnerAuthNonceDeps
): Promise<
  | { ok: true; address: string; message: string; expiresAt: Date }
  | { ok: false; response: NextResponse }
>;
export async function issueOwnerAuthNonce(
  addressRaw: unknown,
  deps?: IssueOwnerAuthNonceDeps
): Promise<
  | { ok: true; address: string; message: string; expiresAt: Date }
  | { ok: false; response: NextResponse }
> {
  const address = normalizeOwnerAddress(addressRaw);
  if (!address) {
    return { ok: false, response: buildInvalidResponse("ADDRESS_REQUIRED") };
  }

  const now = deps?.now?.() ?? new Date();
  const nonce =
    deps?.randomHex?.(16) ?? crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(now.getTime() + OWNER_AUTH_NONCE_TTL_MS);

  if (deps?.upsertNonce) {
    await deps.upsertNonce({ address, nonce, expiresAt });
  } else {
    await prisma.gasSupportNonce.upsert({
      where: {
        chainId_address: {
          chainId: OWNER_AUTH_CHAIN_ID,
          address,
        },
      },
      update: {
        nonce,
        expiresAt,
      },
      create: {
        chainId: OWNER_AUTH_CHAIN_ID,
        address,
        nonce,
        expiresAt,
      },
    });
  }

  return {
    ok: true,
    address,
    message: buildOwnerAuthMessage(address, nonce),
    expiresAt,
  };
}

export async function createOwnerSession(args: {
  address: unknown;
  message: unknown;
  signature: unknown;
}): Promise<
  | {
      ok: true;
      address: string;
      sessionToken: string;
      expiresAt: Date;
    }
  | { ok: false; response: NextResponse }
>;
export async function createOwnerSession(
  args: {
    address: unknown;
    message: unknown;
    signature: unknown;
  },
  deps: CreateOwnerSessionDeps
): Promise<
  | {
      ok: true;
      address: string;
      sessionToken: string;
      expiresAt: Date;
    }
  | { ok: false; response: NextResponse }
>;
export async function createOwnerSession(
  args: {
    address: unknown;
    message: unknown;
    signature: unknown;
  },
  deps?: CreateOwnerSessionDeps
): Promise<
  | {
      ok: true;
      address: string;
      sessionToken: string;
      expiresAt: Date;
    }
  | { ok: false; response: NextResponse }
> {
  const address = normalizeOwnerAddress(args.address);
  if (!address) {
    return { ok: false, response: buildInvalidResponse("ADDRESS_REQUIRED") };
  }

  if (typeof args.message !== "string" || args.message.trim().length === 0) {
    return { ok: false, response: buildInvalidResponse("MESSAGE_REQUIRED") };
  }

  if (typeof args.signature !== "string" || args.signature.trim().length === 0) {
    return { ok: false, response: buildInvalidResponse("SIGNATURE_REQUIRED") };
  }

  const nonceRow = deps?.findNonce
    ? await deps.findNonce(address)
    : await prisma.gasSupportNonce.findUnique({
        where: {
          chainId_address: {
            chainId: OWNER_AUTH_CHAIN_ID,
            address,
          },
        },
      });

  if (!nonceRow) {
    return {
      ok: false,
      response: buildUnauthorizedResponse("OWNER_AUTH_NONCE_NOT_FOUND"),
    };
  }

  const now = deps?.now?.() ?? new Date();

  if (nonceRow.expiresAt.getTime() < now.getTime()) {
    return {
      ok: false,
      response: buildUnauthorizedResponse("OWNER_AUTH_NONCE_EXPIRED"),
    };
  }

  const expectedMessage = buildOwnerAuthMessage(address, nonceRow.nonce);
  if (args.message !== expectedMessage) {
    return {
      ok: false,
      response: buildUnauthorizedResponse("OWNER_AUTH_MESSAGE_INVALID"),
    };
  }

  const recoveredAddress = (
    deps?.verifyMessage?.(args.message, args.signature) ??
    ethers.verifyMessage(args.message, args.signature)
  ).toLowerCase();
  if (recoveredAddress !== address) {
    return {
      ok: false,
      response: buildUnauthorizedResponse("OWNER_AUTH_SIGNATURE_INVALID"),
    };
  }

  const sessionToken =
    deps?.randomHex?.(24) ?? crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(now.getTime() + OWNER_AUTH_SESSION_TTL_MS);

  if (deps?.updateNonce) {
    await deps.updateNonce({ address, nonce: sessionToken, expiresAt });
  } else {
    await prisma.gasSupportNonce.update({
      where: {
        chainId_address: {
          chainId: OWNER_AUTH_CHAIN_ID,
          address,
        },
      },
      data: {
        nonce: sessionToken,
        expiresAt,
      },
    });
  }

  return {
    ok: true,
    address,
    sessionToken,
    expiresAt,
  };
}

export function applyOwnerSessionCookie(
  response: NextResponse,
  args: {
    address: string;
    sessionToken: string;
    expiresAt: Date;
  }
): void {
  response.cookies.set(OWNER_SESSION_COOKIE_NAME, `${args.address}:${args.sessionToken}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    expires: args.expiresAt,
    path: "/",
  });
}

export function clearOwnerSessionCookie(response: NextResponse): void {
  response.cookies.set(OWNER_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    expires: new Date(0),
    path: "/",
  });
}

async function resolveOwnerSessionAddress(
  req: NextRequest,
  expectedAddressRaw?: unknown,
  deps?: ResolveOwnerSessionDeps
): Promise<string | null> {
  const cookieValue = req.cookies.get(OWNER_SESSION_COOKIE_NAME)?.value ?? "";
  const separator = cookieValue.indexOf(":");
  if (separator <= 0) {
    return null;
  }

  const cookieAddress = normalizeOwnerAddress(cookieValue.slice(0, separator));
  const sessionToken = cookieValue.slice(separator + 1).trim();

  if (!cookieAddress || sessionToken.length === 0) {
    return null;
  }

  const expectedAddress =
    typeof expectedAddressRaw === "undefined"
      ? null
      : normalizeOwnerAddress(expectedAddressRaw);

  if (
    expectedAddressRaw !== undefined &&
    (!expectedAddress || expectedAddress !== cookieAddress)
  ) {
    return null;
  }

  const sessionRow = deps?.findNonce
    ? await deps.findNonce(cookieAddress)
    : await prisma.gasSupportNonce.findUnique({
        where: {
          chainId_address: {
            chainId: OWNER_AUTH_CHAIN_ID,
            address: cookieAddress,
          },
        },
      });

  if (!sessionRow) {
    return null;
  }

  const now = deps?.now?.() ?? new Date();

  if (sessionRow.expiresAt.getTime() < now.getTime()) {
    return null;
  }

  if (sessionRow.nonce !== sessionToken) {
    return null;
  }

  return cookieAddress;
}

export async function getOptionalOwnerSessionAddress(
  req: NextRequest,
  expectedAddressRaw?: unknown,
  deps?: ResolveOwnerSessionDeps
): Promise<string | null> {
  return resolveOwnerSessionAddress(req, expectedAddressRaw, deps);
}

export async function requireOwnerSession(
  req: NextRequest,
  expectedAddressRaw?: unknown,
  deps?: ResolveOwnerSessionDeps
): Promise<
  | { ok: true; address: string }
  | { ok: false; response: NextResponse }
> {
  const address = await resolveOwnerSessionAddress(req, expectedAddressRaw, deps);
  if (!address) {
    return {
      ok: false,
      response: buildUnauthorizedResponse("OWNER_AUTH_REQUIRED"),
    };
  }

  return { ok: true, address };
}

export async function requireOwnerSessionFromBody(
  req: NextRequest,
  body: unknown,
  keys: readonly string[] = ["address"]
): Promise<
  | { ok: true; address: string }
  | { ok: false; response: NextResponse }
> {
  const address = parseOwnerAddressFromBody(body, keys);
  if (!address) {
    return { ok: false, response: buildInvalidResponse("ADDRESS_REQUIRED") };
  }

  return requireOwnerSession(req, address);
}

export async function requireOwnerSessionFromSearchParams(
  req: NextRequest,
  searchParams: URLSearchParams,
  key = "address"
): Promise<
  | { ok: true; address: string }
  | { ok: false; response: NextResponse }
> {
  const address = parseOwnerAddressFromSearchParams(searchParams, key);
  if (!address) {
    return { ok: false, response: buildInvalidResponse("ADDRESS_REQUIRED") };
  }

  return requireOwnerSession(req, address);
}
