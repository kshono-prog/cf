import { NextRequest, NextResponse } from "next/server";

import { errJson, routeJson } from "@/lib/api/responses";
import { fetchNotificationsByOwnerAddress } from "@/lib/notificationsApi";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const ownerSession = await requireOwnerSessionFromSearchParams(
    req,
    searchParams
  );
  if (!ownerSession.ok) {
    return ownerSession.response;
  }

  try {
    const response = await fetchNotificationsByOwnerAddress(ownerSession.address);
    return routeJson(response);
  } catch (error) {
    console.error("NOTIFICATIONS_GET_FAILED", error);
    return errJson("NOTIFICATIONS_GET_FAILED", 500);
  }
}
