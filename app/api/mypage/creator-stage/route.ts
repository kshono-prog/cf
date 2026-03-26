import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage } from "@/lib/creatorStage";
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

    const credibility = await getCreatorActivityCredibility(creatorProfileId);
    const stageResult = deriveCreatorStage(credibility);

    return okJson({
      creatorProfileId: creatorProfileId.toString(),
      credibility,
      stage: stageResult,
    });
  } catch (error) {
    console.error("MYPAGE_CREATOR_STAGE_GET_FAILED", error);
    return errJson("MYPAGE_CREATOR_STAGE_GET_FAILED", 500);
  }
}
