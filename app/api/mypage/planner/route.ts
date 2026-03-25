import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { getPlannerTimeline } from "@/lib/operations/plannerTimeline";
import {
  requireCreatorOwnership,
  resolveCreatorProfileIdByAddress,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toLimit(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 20) return 20;
  return truncated;
}

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

    const planner = await getPlannerTimeline({
      creatorProfileId,
      actorMode: "CREATOR_HOME",
      limit: toLimit(searchParams.get("limit"), 6),
    });

    return okJson(planner);
  } catch (error) {
    console.error("MYPAGE_PLANNER_GET_FAILED", error);
    return errJson("MYPAGE_PLANNER_GET_FAILED", 500);
  }
}
