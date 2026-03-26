import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  requireCreatorOwnership,
  resolveCreatorProfileIdByAddress,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { getSupporterCrm } from "@/lib/operations/supporterCrm";

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

    const data = await getSupporterCrm({ creatorProfileId, limit: 20 });

    return okJson({ ...data, ok: true });
  } catch (error) {
    console.error("MYPAGE_SUPPORTER_CRM_GET_FAILED", error);
    return errJson("MYPAGE_SUPPORTER_CRM_GET_FAILED", 500);
  }
}
