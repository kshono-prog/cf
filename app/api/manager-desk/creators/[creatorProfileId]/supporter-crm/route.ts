import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { requireCreatorAccess } from "@/lib/managerDesk/server";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { getSupporterCrm } from "@/lib/operations/supporterCrm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { creatorProfileId: string };

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

    const data = await getSupporterCrm({ creatorProfileId, limit: 20 });

    return okJson({ ...data, ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_DESK_SUPPORTER_CRM_GET_FAILED", error);
    return errJson("MANAGER_DESK_SUPPORTER_CRM_GET_FAILED", 500);
  }
}
