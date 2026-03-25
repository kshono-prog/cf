import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
} from "@/lib/api/guards";
import {
  toManagerAssignmentRole,
  toManagerAssignmentStatus,
} from "@/lib/managerDesk/contracts";
import {
  appendActionLogTx,
  requireCreatorOwnership,
  serializeManagerAssignment,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { assignmentId: string };

type PatchBody = {
  address?: unknown;
  roleType?: unknown;
  status?: unknown;
  assignedAt?: unknown;
  endedAt?: unknown;
};

function toOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function toRequiredDate(value: unknown): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { assignmentId } = await ctx.params;
    if (!assignmentId) return errJson("ASSIGNMENT_ID_REQUIRED", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PatchBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const current = await prisma.managerAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!current) return errJson("MANAGER_ASSIGNMENT_NOT_FOUND", 404);

    const access = await requireCreatorOwnership({
      creatorProfileId: current.creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const roleType = body.roleType === undefined
      ? undefined
      : toManagerAssignmentRole(body.roleType);
    if (body.roleType !== undefined && !roleType) {
      return errJson("ROLE_TYPE_INVALID", 400);
    }

    const status = body.status === undefined
      ? undefined
      : toManagerAssignmentStatus(body.status);
    if (body.status !== undefined && !status) {
      return errJson("STATUS_INVALID", 400);
    }

    const assignedAt = toRequiredDate(body.assignedAt);
    if (body.assignedAt !== undefined && assignedAt === undefined) {
      return errJson("ASSIGNED_AT_INVALID", 400);
    }

    const endedAt = toOptionalDate(body.endedAt);
    if (body.endedAt !== undefined && endedAt === undefined) {
      return errJson("ENDED_AT_INVALID", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextStatus = status ?? current.status;
      const nextEndedAt =
        body.endedAt !== undefined
          ? endedAt
          : nextStatus === "ENDED" && !current.endedAt
          ? new Date()
          : current.endedAt;

      const assignment = await tx.managerAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(roleType ? { roleType } : {}),
          ...(status ? { status } : {}),
          ...(assignedAt !== undefined ? { assignedAt } : {}),
          ...(nextEndedAt !== current.endedAt ? { endedAt: nextEndedAt } : {}),
        },
      });

      await appendActionLogTx(tx, {
        creatorProfileId: assignment.creatorProfileId,
        managerAssignmentId: assignment.id,
        actorType: "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType: "STATUS_CHANGED",
        title: "Manager assignment updated",
        targetEntityType: "OTHER",
        targetEntityId: assignment.id,
        summary: "Manager assignment fields were updated.",
        metadataJson: {
          roleType: assignment.roleType,
          status: assignment.status,
          endedAt: assignment.endedAt?.toISOString() ?? null,
        },
        visibility: "INTERNAL",
      });

      return assignment;
    });

    return okJson({
      assignment: serializeManagerAssignment(updated),
    });
  } catch (error) {
    console.error("MANAGER_ASSIGNMENT_PATCH_FAILED", error);
    return errJson("MANAGER_ASSIGNMENT_PATCH_FAILED", 500);
  }
}
