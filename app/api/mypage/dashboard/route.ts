import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { toAddressOrNull } from "@/lib/api/guards";
import { getMyPageDashboard } from "@/lib/mypageDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const address = toAddressOrNull(searchParams.get("address"));
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    const dashboard = await getMyPageDashboard(address);
    return okJson(dashboard);
  } catch (e) {
    console.error("MYPAGE_DASHBOARD_GET_FAILED", e);
    return errJson("MYPAGE_DASHBOARD_GET_FAILED", 500);
  }
}
