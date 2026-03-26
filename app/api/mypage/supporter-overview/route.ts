import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  requireCreatorOwnership,
  resolveCreatorProfileIdByAddress,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { getSupporterOverview } from "@/lib/operations/supporterOverview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(req, searchParams);
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileId = await resolveCreatorProfileIdByAddress(ownerSession.address);
    if (!creatorProfileId) {
      return errJson("CREATOR_PROFILE_NOT_FOUND", 404);
    }

    const ownership = await requireCreatorOwnership({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!ownership.ok) return errJson(ownership.error, ownership.status);

    const data = await getSupporterOverview({ creatorProfileId });

    return okJson({ ...data, ok: true });
  } catch (error) {
    console.error("MYPAGE_SUPPORTER_OVERVIEW_GET_FAILED", error);
    return errJson("MYPAGE_SUPPORTER_OVERVIEW_GET_FAILED", 500);
  }
}
