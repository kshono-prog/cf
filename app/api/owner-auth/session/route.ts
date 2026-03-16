import { NextRequest, NextResponse } from "next/server";

import {
  applyOwnerSessionCookie,
  createOwnerSession,
} from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const result = await createOwnerSession({
      address: raw.address,
      message: raw.message,
      signature: raw.signature,
    });
    if (!result.ok) return result.response;

    const response = NextResponse.json({
      ok: true,
      address: result.address,
      expiresAt: result.expiresAt.toISOString(),
    });
    applyOwnerSessionCookie(response, result);
    return response;
  } catch (error) {
    console.error("OWNER_AUTH_SESSION_POST_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "OWNER_AUTH_SESSION_POST_FAILED" },
      { status: 500 }
    );
  }
}
