import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  applyOwnerSessionCookie,
  clearOwnerSessionCookie,
  createOwnerSession,
  getOptionalOwnerSession,
  issueOwnerAuthNonce,
} from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export type OwnerAuthNonceRouteDeps = {
  issueOwnerAuthNonce?: typeof issueOwnerAuthNonce;
};

export async function handleOwnerAuthNonceGet(
  req: NextRequest,
  deps: OwnerAuthNonceRouteDeps = {}
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const result = await (deps.issueOwnerAuthNonce ?? issueOwnerAuthNonce)(
      searchParams.get("address")
    );
    if (!result.ok) return result.response;

    return okJson({
      address: result.address,
      message: result.message,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("OWNER_AUTH_NONCE_GET_FAILED", error);
    return errJson("OWNER_AUTH_NONCE_GET_FAILED", 500);
  }
}

export type OwnerAuthSessionRouteDeps = {
  createOwnerSession?: typeof createOwnerSession;
  applyOwnerSessionCookie?: typeof applyOwnerSessionCookie;
  getOptionalOwnerSession?: typeof getOptionalOwnerSession;
  clearOwnerSessionCookie?: typeof clearOwnerSessionCookie;
};

export async function handleOwnerAuthSessionGet(
  req: NextRequest,
  deps: OwnerAuthSessionRouteDeps = {}
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const expectedAddress = searchParams.get("address");
    const session = await (deps.getOptionalOwnerSession ?? getOptionalOwnerSession)(
      req,
      expectedAddress
    );

    return okJson({
      authenticated: Boolean(session),
      address: session?.address ?? null,
      expiresAt: session?.expiresAt.toISOString() ?? null,
    });
  } catch (error) {
    console.error("OWNER_AUTH_SESSION_GET_FAILED", error);
    return errJson("OWNER_AUTH_SESSION_GET_FAILED", 500);
  }
}

export async function handleOwnerAuthSessionPost(
  req: NextRequest,
  deps: OwnerAuthSessionRouteDeps = {}
): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) {
      return errJson("INVALID_JSON", 400);
    }

    const result = await (deps.createOwnerSession ?? createOwnerSession)({
      address: raw.address,
      message: raw.message,
      signature: raw.signature,
    });
    if (!result.ok) return result.response;

    const response = okJson({
      address: result.address,
      expiresAt: result.expiresAt.toISOString(),
    });
    (deps.applyOwnerSessionCookie ?? applyOwnerSessionCookie)(response, result);

    // RPG: award LOGIN_DAILY EXP (fire-and-forget)
    void (async () => {
      try {
        const profile = await prisma.creatorProfile.findUnique({
          where: { walletAddress: result.address },
          select: { id: true },
        });
        if (profile) {
          const { awardExpFireAndForget } = await import("./rpg/awardExpHelper");
          awardExpFireAndForget({
            creatorProfileId: profile.id,
            eventType: "LOGIN_DAILY",
            occurredAt: new Date(),
            idempotencyKey: `login:${profile.id}:${new Date().toISOString().slice(0, 10)}`,
            payloadJson: {},
          });
        }
      } catch (e) {
        console.warn("[RPG] login EXP award failed", e);
      }
    })();

    return response;
  } catch (error) {
    console.error("OWNER_AUTH_SESSION_POST_FAILED", error);
    return errJson("OWNER_AUTH_SESSION_POST_FAILED", 500);
  }
}

export async function handleOwnerAuthSessionDelete(
  _req: NextRequest,
  deps: OwnerAuthSessionRouteDeps = {}
): Promise<NextResponse> {
  try {
    const response = okJson({ cleared: true });
    (deps.clearOwnerSessionCookie ?? clearOwnerSessionCookie)(response);
    return response;
  } catch (error) {
    console.error("OWNER_AUTH_SESSION_DELETE_FAILED", error);
    return errJson("OWNER_AUTH_SESSION_DELETE_FAILED", 500);
  }
}
