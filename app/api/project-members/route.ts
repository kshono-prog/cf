import { NextRequest, NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toBigIntOrThrow, toNonEmptyString } from "@/lib/api/guards";
import {
  requireCreatorAccess,
  resolveCreatorProfileIdByAddress,
} from "@/lib/managerDesk/server";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MEMBER_ROLES = ["OWNER", "MANAGER", "COLLABORATOR", "ADVISOR"] as const;
type MemberRole = (typeof MEMBER_ROLES)[number];

function toMemberRole(value: unknown): MemberRole {
  if (typeof value === "string" && MEMBER_ROLES.includes(value as MemberRole)) {
    return value as MemberRole;
  }
  return "COLLABORATOR";
}

function toSharePercent(value: unknown): Decimal | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  return new Decimal(n.toFixed(2));
}

function serializeMember(row: {
  id: string;
  projectId: bigint;
  creatorProfileId: bigint | null;
  walletAddress: string | null;
  displayName: string | null;
  role: string;
  sharePercent: Decimal | null;
  note: string | null;
  status: string;
  addedAt: Date;
  createdAt: Date;
}) {
  return {
    id: row.id,
    projectId: row.projectId.toString(),
    creatorProfileId: row.creatorProfileId?.toString() ?? null,
    walletAddress: row.walletAddress,
    displayName: row.displayName,
    role: row.role,
    sharePercent: row.sharePercent != null ? Number(row.sharePercent) : null,
    note: row.note,
    status: row.status,
    addedAt: row.addedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(req, searchParams);
    if (!ownerSession.ok) return ownerSession.response;

    const projectIdRaw = toNonEmptyString(searchParams.get("projectId"));
    const creatorProfileIdRaw = toNonEmptyString(searchParams.get("creatorProfileId"));

    let resolvedCreatorProfileId: bigint | null = null;
    if (creatorProfileIdRaw) {
      try {
        resolvedCreatorProfileId = toBigIntOrThrow(creatorProfileIdRaw, "CREATOR_PROFILE_ID_INVALID");
      } catch {
        return errJson("CREATOR_PROFILE_ID_INVALID", 400);
      }
    } else {
      resolvedCreatorProfileId = await resolveCreatorProfileIdByAddress(ownerSession.address);
    }
    if (!resolvedCreatorProfileId) return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);

    const access = await requireCreatorAccess({
      creatorProfileId: resolvedCreatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    let projectId: bigint | null = null;
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    const rows = await prisma.projectMember.findMany({
      where: {
        ...(projectId ? { projectId } : { project: { creatorProfileId: resolvedCreatorProfileId } }),
        status: "ACTIVE",
      },
      orderBy: [{ role: "asc" }, { addedAt: "asc" }],
      take: 50,
    });

    return okJson({ projectMembers: rows.map(serializeMember), count: rows.length });
  } catch (error) {
    console.error("PROJECT_MEMBERS_GET_FAILED", error);
    return errJson("PROJECT_MEMBERS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const projectIdRaw = toNonEmptyString(raw.projectId as unknown);
    if (!projectIdRaw) return errJson("PROJECT_ID_REQUIRED", 400);
    let projectId: bigint;
    try {
      projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
    } catch {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    // Verify the project belongs to the caller's creator profile
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { creatorProfileId: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const access = project.creatorProfileId
      ? await requireCreatorAccess({
          creatorProfileId: project.creatorProfileId,
          address: ownerSession.address,
        })
      : { ok: false as const, error: "FORBIDDEN", status: 403 };
    if (!access.ok) return errJson(access.error, access.status);

    // Resolve creatorProfileId from walletAddress if provided
    let memberCreatorProfileId: bigint | null = null;
    const memberCreatorProfileIdRaw = toNonEmptyString(raw.creatorProfileId as unknown);
    if (memberCreatorProfileIdRaw) {
      try {
        memberCreatorProfileId = toBigIntOrThrow(memberCreatorProfileIdRaw, "MEMBER_PROFILE_ID_INVALID");
      } catch {
        return errJson("MEMBER_PROFILE_ID_INVALID", 400);
      }
    }

    const role = toMemberRole(raw.role);
    const sharePercent = toSharePercent(raw.sharePercent);
    const walletAddress = toNonEmptyString(raw.walletAddress as unknown) ?? null;
    const displayName = toNonEmptyString(raw.displayName as unknown) ?? null;
    const note = toNonEmptyString(raw.note as unknown) ?? null;

    const created = await prisma.projectMember.create({
      data: {
        projectId,
        creatorProfileId: memberCreatorProfileId,
        walletAddress,
        displayName,
        role,
        sharePercent,
        note,
        status: "ACTIVE",
      },
    });

    return okJson({ created: true, projectMember: serializeMember(created) }, 201);
  } catch (error) {
    console.error("PROJECT_MEMBERS_POST_FAILED", error);
    return errJson("PROJECT_MEMBERS_POST_FAILED", 500);
  }
}
