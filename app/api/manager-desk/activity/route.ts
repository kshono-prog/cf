import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { getManagerDeskActivityTimeline } from "@/lib/managerDesk/readModel";
import type { ManagerDeskActivityTimelineSourceType } from "@/lib/managerDesk/readModelTypes";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ACTIVITY_TIMELINE_SOURCE_TYPES = [
  "ACTION_LOG",
  "MEETING",
  "SHAREABLE_NOTE",
] as const satisfies readonly ManagerDeskActivityTimelineSourceType[];

function toLimit(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 200) return 200;
  return truncated;
}

function toActivityTimelineSourceType(
  value: string | null
): ManagerDeskActivityTimelineSourceType | null {
  if (!value) return null;
  return ACTIVITY_TIMELINE_SOURCE_TYPES.includes(
    value as ManagerDeskActivityTimelineSourceType
  )
    ? (value as ManagerDeskActivityTimelineSourceType)
    : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileIdRaw = searchParams.get("creatorProfileId");
    const creatorProfileId =
      creatorProfileIdRaw == null
        ? null
        : toBigIntOrThrow(creatorProfileIdRaw, "CREATOR_PROFILE_ID_INVALID");

    const sourceTypeRaw = searchParams.get("sourceType");
    const sourceType = toActivityTimelineSourceType(sourceTypeRaw);
    if (sourceTypeRaw !== null && sourceType === null) {
      return errJson("ACTIVITY_TIMELINE_SOURCE_TYPE_INVALID", 400);
    }

    const activityTimeline = await getManagerDeskActivityTimeline({
      managerWalletAddress: ownerSession.address,
      creatorProfileId,
      sourceType,
      limit: toLimit(searchParams.get("limit"), 120),
    });

    return okJson(activityTimeline);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_DESK_ACTIVITY_TIMELINE_GET_FAILED", error);
    return errJson("MANAGER_DESK_ACTIVITY_TIMELINE_GET_FAILED", 500);
  }
}
