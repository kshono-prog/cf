import crypto from "crypto";

import { ethers } from "ethers";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { toAddressOrNull } from "@/lib/api/guards";

const OWNER_AUTH_CHAIN_ID = 0;
const OWNER_AUTH_NONCE_TTL_MS = 5 * 60_000;
const OWNER_AUTH_SESSION_TTL_MS = 12 * 60 * 60_000;

export const OWNER_SESSION_COOKIE_NAME = "cf_owner_session";

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

function normalizeOwnerAddress(value: unknown): string | null {
  const address = toAddressOrNull(value);
  return address ? address.toLowerCase() : null;
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
> {
  const address = normalizeOwnerAddress(addressRaw);
  if (!address) {
    return { ok: false, response: buildInvalidResponse("ADDRESS_REQUIRED") };
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + OWNER_AUTH_NONCE_TTL_MS);

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

  const nonceRow = await prisma.gasSupportNonce.findUnique({
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

  if (nonceRow.expiresAt.getTime() < Date.now()) {
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

  const recoveredAddress = ethers.verifyMessage(
    args.message,
    args.signature
  ).toLowerCase();
  if (recoveredAddress !== address) {
    return {
      ok: false,
      response: buildUnauthorizedResponse("OWNER_AUTH_SIGNATURE_INVALID"),
    };
  }

  const sessionToken = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + OWNER_AUTH_SESSION_TTL_MS);

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
  expectedAddressRaw?: unknown
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

  const sessionRow = await prisma.gasSupportNonce.findUnique({
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

  if (sessionRow.expiresAt.getTime() < Date.now()) {
    return null;
  }

  if (sessionRow.nonce !== sessionToken) {
    return null;
  }

  return cookieAddress;
}

export async function getOptionalOwnerSessionAddress(
  req: NextRequest,
  expectedAddressRaw?: unknown
): Promise<string | null> {
  return resolveOwnerSessionAddress(req, expectedAddressRaw);
}

export async function requireOwnerSession(
  req: NextRequest,
  expectedAddressRaw?: unknown
): Promise<
  | { ok: true; address: string }
  | { ok: false; response: NextResponse }
> {
  const address = await resolveOwnerSessionAddress(req, expectedAddressRaw);
  if (!address) {
    return {
      ok: false,
      response: buildUnauthorizedResponse("OWNER_AUTH_REQUIRED"),
    };
  }

  return { ok: true, address };
}
