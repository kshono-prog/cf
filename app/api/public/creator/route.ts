// app/api/public/creator/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  fetchPublicCreatorByUsername,
  type PublicErr,
  type PublicOk,
} from "@/lib/publicCreatorApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<PublicOk | PublicErr>> {
  const { searchParams } = new URL(req.url);
  const usernameRaw = searchParams.get("username");

  if (!isNonEmptyString(usernameRaw)) {
    return NextResponse.json(
      { ok: false, error: "USERNAME_REQUIRED" },
      { status: 400 }
    );
  }

  const username = usernameRaw.trim();
  const response = await fetchPublicCreatorByUsername(username);
  return NextResponse.json(response.body, { status: response.status });
}
