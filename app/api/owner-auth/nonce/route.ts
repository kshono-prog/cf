import { NextRequest, NextResponse } from "next/server";

import { issueOwnerAuthNonce } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const result = await issueOwnerAuthNonce(searchParams.get("address"));
    if (!result.ok) return result.response;

    return NextResponse.json({
      ok: true,
      address: result.address,
      message: result.message,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("OWNER_AUTH_NONCE_GET_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "OWNER_AUTH_NONCE_GET_FAILED" },
      { status: 500 }
    );
  }
}
