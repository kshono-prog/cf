import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { getCreatorDailyBriefing } from "@/lib/operations/dailyBriefing";
import {
  requireCreatorOwnership,
  resolveCreatorProfileIdByAddress,
} from "@/lib/managerDesk/server";
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

    const creatorProfileId = await resolveCreatorProfileIdByAddress(
      ownerSession.address
    );
    if (!creatorProfileId) {
      return errJson("CREATOR_PROFILE_NOT_FOUND", 404);
    }

    const ownership = await requireCreatorOwnership({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!ownership.ok) return errJson(ownership.error, ownership.status);

    const briefing = await getCreatorDailyBriefing({
      creatorProfileId,
    });
    if (!briefing) return errJson("CREATOR_PROFILE_NOT_FOUND", 404);

    return okJson(briefing);
  } catch (error) {
    console.error("MYPAGE_DAILY_BRIEFING_GET_FAILED", error);
    return errJson("MYPAGE_DAILY_BRIEFING_GET_FAILED", 500);
  }
}
