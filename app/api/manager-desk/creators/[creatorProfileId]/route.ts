import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { getManagerDeskCreatorDetail } from "@/lib/managerDesk/readModel";
import { requireCreatorAccess } from "@/lib/managerDesk/server";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { creatorProfileId: string };

function toLimit(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 50) return 50;
  return truncated;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { creatorProfileId: creatorProfileIdRaw } = await ctx.params;
    const creatorProfileId = toBigIntOrThrow(
      creatorProfileIdRaw,
      "CREATOR_PROFILE_ID_INVALID"
    );

    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const access = await requireCreatorAccess({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const detail = await getManagerDeskCreatorDetail({
      creatorProfileId,
      address: ownerSession.address,
      noteLimit: toLimit(searchParams.get("noteLimit"), 5),
      contactLimit: toLimit(searchParams.get("contactLimit"), 5),
      logLimit: toLimit(searchParams.get("logLimit"), 10),
    });

    if (!detail) return errJson("CREATOR_NOT_FOUND", 404);

    return okJson(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_DESK_CREATOR_DETAIL_GET_FAILED", error);
    return errJson("MANAGER_DESK_CREATOR_DETAIL_GET_FAILED", 500);
  }
}
