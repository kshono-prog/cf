import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { toExternalContactStatus } from "@/lib/managerDesk/contracts";
import { getManagerDeskContactPipeline } from "@/lib/managerDesk/readModel";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toLimit(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 200) return 200;
  return truncated;
}

function toFlag(value: string | null): boolean {
  return value === "1" || value === "true";
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

    const statusRaw = searchParams.get("status");
    const status =
      statusRaw == null ? null : toExternalContactStatus(statusRaw);
    if (statusRaw !== null && status === null) {
      return errJson("CONTACT_STATUS_INVALID", 400);
    }

    const pipeline = await getManagerDeskContactPipeline({
      managerWalletAddress: ownerSession.address,
      creatorProfileId,
      status,
      overdueOnly: toFlag(searchParams.get("overdue")),
      limit: toLimit(searchParams.get("limit"), 100),
    });

    return okJson(pipeline);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_DESK_CONTACT_PIPELINE_GET_FAILED", error);
    return errJson("MANAGER_DESK_CONTACT_PIPELINE_GET_FAILED", 500);
  }
}
