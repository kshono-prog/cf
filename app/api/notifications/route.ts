import { NextRequest, NextResponse } from "next/server";

import { fetchNotificationsByOwnerAddress } from "@/lib/notificationsApi";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const ownerSession = await requireOwnerSession(
    req,
    searchParams.get("address") ?? undefined
  );
  if (!ownerSession.ok) {
    return ownerSession.response;
  }

  try {
    const response = await fetchNotificationsByOwnerAddress(ownerSession.address);
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    console.error("NOTIFICATIONS_GET_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "NOTIFICATIONS_GET_FAILED" },
      { status: 500 }
    );
  }
}
