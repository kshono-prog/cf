import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  toActionLogType,
  toActionLogVisibility,
} from "@/lib/managerDesk/contracts";
import {
  canCreatorViewActionLogVisibility,
  requireCreatorAccess,
  resolveCreatorProfileIdByAddress,
  serializeActionLog,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseCreatorProfileId(raw: string): bigint {
  return toBigIntOrThrow(raw, "CREATOR_PROFILE_ID_INVALID");
}

function toLimit(value: string | null): number {
  if (!value) return 100;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 200) return 200;
  return truncated;
}

async function resolveTargetCreatorProfileId(
  address: string,
  creatorProfileIdRaw: string | null
): Promise<bigint | null> {
  if (creatorProfileIdRaw) {
    return parseCreatorProfileId(creatorProfileIdRaw);
  }
  return resolveCreatorProfileIdByAddress(address);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const targetCreatorProfileId = await resolveTargetCreatorProfileId(
      ownerSession.address,
      toNonEmptyString(searchParams.get("creatorProfileId"))
    );
    if (!targetCreatorProfileId) {
      return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId: targetCreatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const projectIdRaw = toNonEmptyString(searchParams.get("projectId"));
    const projectId = projectIdRaw
      ? toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID")
      : null;

    const actionTypeRaw = searchParams.get("actionType");
    const actionType =
      actionTypeRaw == null ? null : toActionLogType(actionTypeRaw);
    if (actionTypeRaw && !actionType) {
      return errJson("ACTION_TYPE_INVALID", 400);
    }

    const visibilityRaw = searchParams.get("visibility");
    const visibility =
      visibilityRaw == null ? null : toActionLogVisibility(visibilityRaw);
    if (visibilityRaw && !visibility) {
      return errJson("VISIBILITY_INVALID", 400);
    }
    if (
      access.role === "CREATOR_OWNER" &&
      visibility &&
      !canCreatorViewActionLogVisibility(visibility)
    ) {
      return errJson("FORBIDDEN_ACTION_LOG_VISIBILITY", 403);
    }

    const rows = await prisma.actionLog.findMany({
      where: {
        creatorProfileId: targetCreatorProfileId,
        ...(projectId ? { projectId } : {}),
        ...(actionType ? { actionType } : {}),
        ...(visibility ? { visibility } : {}),
        ...(access.role === "CREATOR_OWNER"
          ? { visibility: "CREATOR_VISIBLE" }
          : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: toLimit(searchParams.get("limit")),
    });

    return okJson({
      logs: rows.map(serializeActionLog),
      count: rows.length,
      accessRole: access.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    if (message === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    console.error("ACTION_LOGS_GET_FAILED", error);
    return errJson("ACTION_LOGS_GET_FAILED", 500);
  }
}
