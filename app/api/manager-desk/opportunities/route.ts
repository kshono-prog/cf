import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { getManagerDeskOpportunityPipeline } from "@/lib/managerDesk/readModel";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(req, searchParams);
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileIdRaw = searchParams.get("creatorProfileId");
    const creatorProfileId =
      creatorProfileIdRaw == null
        ? null
        : toBigIntOrThrow(creatorProfileIdRaw, "CREATOR_PROFILE_ID_INVALID");

    const data = await getManagerDeskOpportunityPipeline({
      managerWalletAddress: ownerSession.address,
      creatorProfileId,
    });

    return okJson(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_DESK_OPPORTUNITY_PIPELINE_GET_FAILED", error);
    return errJson("MANAGER_DESK_OPPORTUNITY_PIPELINE_GET_FAILED", 500);
  }
}
