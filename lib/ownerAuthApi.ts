import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  applyOwnerSessionCookie,
  createOwnerSession,
  issueOwnerAuthNonce,
} from "@/lib/ownerAuthSession";

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
};

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
    return response;
  } catch (error) {
    console.error("OWNER_AUTH_SESSION_POST_FAILED", error);
    return errJson("OWNER_AUTH_SESSION_POST_FAILED", 500);
  }
}
