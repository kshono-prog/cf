import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { getCreatorGrowthOverview } from "@/lib/growth/overviewServer";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const overview = await getCreatorGrowthOverview(ownerSession.address);
    return okJson({ overview });
  } catch (error) {
    console.error("MYPAGE_GROWTH_OVERVIEW_GET_FAILED", error);
    return errJson("MYPAGE_GROWTH_OVERVIEW_GET_FAILED", 500);
  }
}
