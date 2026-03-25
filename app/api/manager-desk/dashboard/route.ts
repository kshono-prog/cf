import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { getManagerDeskDashboard } from "@/lib/managerDesk/readModel";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const dashboard = await getManagerDeskDashboard({
      managerWalletAddress: ownerSession.address,
    });

    return okJson(dashboard);
  } catch (error) {
    console.error("MANAGER_DESK_DASHBOARD_GET_FAILED", error);
    return errJson("MANAGER_DESK_DASHBOARD_GET_FAILED", 500);
  }
}
