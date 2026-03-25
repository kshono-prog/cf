import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  normalizeAddress,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  toManagerAssignmentRole,
  toManagerAssignmentStatus,
} from "@/lib/managerDesk/contracts";
import {
  appendActionLogTx,
  requireCreatorAccess,
  requireCreatorOwnership,
  resolveCreatorProfileIdByAddress,
  serializeManagerAssignment,
} from "@/lib/managerDesk/server";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PostBody = {
  address?: unknown;
  creatorProfileId?: unknown;
  managerWalletAddress?: unknown;
  roleType?: unknown;
  status?: unknown;
  assignedAt?: unknown;
  endedAt?: unknown;
};

function parseCreatorProfileId(raw: string): bigint {
  return toBigIntOrThrow(raw, "CREATOR_PROFILE_ID_INVALID");
}

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

function toLimit(value: string | null): number {
  if (!value) return 50;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 100) return 100;
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

    const creatorProfileIdRaw = toNonEmptyString(
      searchParams.get("creatorProfileId")
    );
    const statusRaw = searchParams.get("status");
    const status =
      statusRaw == null ? null : toManagerAssignmentStatus(statusRaw);
    if (statusRaw && !status) return errJson("STATUS_INVALID", 400);

    const managerWalletAddressRaw = toNonEmptyString(
      searchParams.get("managerWalletAddress")
    );
    const managerWalletAddress = managerWalletAddressRaw
      ? normalizeAddress(managerWalletAddressRaw)
      : null;

    if (creatorProfileIdRaw) {
      const creatorProfileId = parseCreatorProfileId(creatorProfileIdRaw);
      const access = await requireCreatorAccess({
        creatorProfileId,
        address: ownerSession.address,
      });
      if (!access.ok) return errJson(access.error, access.status);

      const rows = await prisma.managerAssignment.findMany({
        where: {
          creatorProfileId,
          ...(status ? { status } : {}),
          ...(managerWalletAddress ? { managerWalletAddress } : {}),
        },
        orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
        take: toLimit(searchParams.get("limit")),
      });

      return okJson({
        assignments: rows.map(serializeManagerAssignment),
        count: rows.length,
      });
    }

    const requesterCreatorProfileId = await resolveCreatorProfileIdByAddress(
      ownerSession.address
    );

    if (requesterCreatorProfileId) {
      const access = await requireCreatorAccess({
        creatorProfileId: requesterCreatorProfileId,
        address: ownerSession.address,
      });
      if (!access.ok) return errJson(access.error, access.status);

      const rows = await prisma.managerAssignment.findMany({
        where: {
          creatorProfileId: requesterCreatorProfileId,
          ...(status ? { status } : {}),
          ...(managerWalletAddress ? { managerWalletAddress } : {}),
        },
        orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
        take: toLimit(searchParams.get("limit")),
      });

      return okJson({
        assignments: rows.map(serializeManagerAssignment),
        count: rows.length,
      });
    }

    const rows = await prisma.managerAssignment.findMany({
      where: {
        managerWalletAddress: ownerSession.address,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
      take: toLimit(searchParams.get("limit")),
    });

    return okJson({
      assignments: rows.map(serializeManagerAssignment),
      count: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_ASSIGNMENTS_GET_FAILED", error);
    return errJson("MANAGER_ASSIGNMENTS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileIdRaw = toNonEmptyString(body.creatorProfileId);
    if (!creatorProfileIdRaw) {
      return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);
    }
    const creatorProfileId = parseCreatorProfileId(creatorProfileIdRaw);

    const managerWalletAddressRaw = toNonEmptyString(body.managerWalletAddress);
    if (!managerWalletAddressRaw) {
      return errJson("MANAGER_WALLET_ADDRESS_REQUIRED", 400);
    }
    const managerWalletAddress = normalizeAddress(managerWalletAddressRaw);

    const roleType =
      toManagerAssignmentRole(body.roleType) ?? "PRIMARY";
    if (body.roleType !== undefined && !toManagerAssignmentRole(body.roleType)) {
      return errJson("ROLE_TYPE_INVALID", 400);
    }

    const status =
      toManagerAssignmentStatus(body.status) ?? "ACTIVE";
    if (body.status !== undefined && !toManagerAssignmentStatus(body.status)) {
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

    const access = await requireCreatorOwnership({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const created = await prisma.$transaction(async (tx) => {
      const assignment = await tx.managerAssignment.create({
        data: {
          creatorProfileId,
          managerWalletAddress,
          roleType,
          status,
          assignedAt: assignedAt ?? new Date(),
          endedAt: endedAt ?? null,
        },
      });

      await appendActionLogTx(tx, {
        creatorProfileId,
        managerAssignmentId: assignment.id,
        actorType: "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType: "STATUS_CHANGED",
        title: "Manager assignment created",
        targetEntityType: "OTHER",
        targetEntityId: assignment.id,
        summary: `Assigned ${managerWalletAddress} as ${roleType}.`,
        metadataJson: {
          managerWalletAddress,
          roleType,
          status,
        },
        visibility: "INTERNAL",
      });

      return assignment;
    });

    return okJson(
      {
        created: true,
        assignment: serializeManagerAssignment(created),
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_ASSIGNMENTS_POST_FAILED", error);
    return errJson("MANAGER_ASSIGNMENTS_POST_FAILED", 500);
  }
}
