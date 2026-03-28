import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  getCachedMyPageDashboard,
  getMyPageDashboard,
} from "@/lib/mypageDashboard";
import { resolveWorkspaceView } from "@/lib/mypage/workspaceView";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const view = resolveWorkspaceView(searchParams.get("view"));
  const ownerSession = await requireOwnerSessionFromSearchParams(
    req,
    searchParams
  );
  if (!ownerSession.ok) return ownerSession.response;

  try {
    const dashboard = await getMyPageDashboard(ownerSession.address, view);
    return okJson(dashboard);
  } catch (e) {
    if (isPrismaUnavailableError(e)) {
      const staleDashboard = getCachedMyPageDashboard(ownerSession.address, view);
      if (staleDashboard) {
        return okJson(staleDashboard);
      }
    }

    console.error("MYPAGE_DASHBOARD_GET_FAILED", e);
    return errJson("MYPAGE_DASHBOARD_GET_FAILED", 500);
  }
}
