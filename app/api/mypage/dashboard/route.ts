import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { getMyPageDashboard } from "@/lib/mypageDashboard";
import { resolveWorkspaceView } from "@/lib/mypage/workspaceView";
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
    const view = resolveWorkspaceView(searchParams.get("view"));

    const dashboard = await getMyPageDashboard(ownerSession.address, view);
    return okJson(dashboard);
  } catch (e) {
    console.error("MYPAGE_DASHBOARD_GET_FAILED", e);
    return errJson("MYPAGE_DASHBOARD_GET_FAILED", 500);
  }
}
