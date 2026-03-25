import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  normalizeAddress,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  toManagerNoteType,
  toNoteVisibility,
} from "@/lib/managerDesk/contracts";
import {
  appendActionLogTx,
  canCreatorViewManagerNoteVisibility,
  requireCreatorAccess,
  resolveCreatorProfileIdByAddress,
  serializeManagerNote,
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
  managerAssignmentId?: unknown;
  projectId?: unknown;
  externalContactId?: unknown;
  relatedMeetingId?: unknown;
  noteType?: unknown;
  visibility?: unknown;
  title?: unknown;
  body?: unknown;
  urgencyScore?: unknown;
  followUpNeeded?: unknown;
  followUpDueAt?: unknown;
};

function parseCreatorProfileId(raw: string): bigint {
  return toBigIntOrThrow(raw, "CREATOR_PROFILE_ID_INVALID");
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return undefined;
  return value;
}

function toOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function toOptionalUrgencyScore(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const truncated = Math.trunc(value);
  if (truncated < 1 || truncated > 5) return undefined;
  return truncated;
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

function toFlag(value: string | null): boolean {
  return value === "1" || value === "true";
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

    const noteTypeRaw = searchParams.get("noteType");
    const noteType = noteTypeRaw == null ? null : toManagerNoteType(noteTypeRaw);
    if (noteTypeRaw && !noteType) return errJson("NOTE_TYPE_INVALID", 400);

    const visibilityRaw = searchParams.get("visibility");
    const visibility =
      visibilityRaw == null ? null : toNoteVisibility(visibilityRaw);
    if (visibilityRaw && !visibility) return errJson("VISIBILITY_INVALID", 400);
    if (
      access.role === "CREATOR_OWNER" &&
      visibility &&
      !canCreatorViewManagerNoteVisibility(visibility)
    ) {
      return errJson("FORBIDDEN_NOTE_VISIBILITY", 403);
    }

    const includeArchived = toFlag(searchParams.get("includeArchived"));
    const followUpOnly = toFlag(searchParams.get("followUpOnly"));

    const rows = await prisma.managerNote.findMany({
      where: {
        creatorProfileId: targetCreatorProfileId,
        ...(noteType ? { noteType } : {}),
        ...(visibility ? { visibility } : {}),
        ...(includeArchived ? {} : { isArchived: false }),
        ...(followUpOnly ? { followUpNeeded: true } : {}),
        ...(access.role === "CREATOR_OWNER"
          ? { visibility: "SHAREABLE_WITH_CREATOR" }
          : {}),
      },
      orderBy: [
        { followUpDueAt: "asc" },
        { createdAt: "desc" },
      ],
      take: toLimit(searchParams.get("limit")),
    });

    return okJson({
      notes: rows.map(serializeManagerNote),
      count: rows.length,
      accessRole: access.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MANAGER_NOTES_GET_FAILED", error);
    return errJson("MANAGER_NOTES_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PostBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const targetCreatorProfileId = await resolveTargetCreatorProfileId(
      ownerSession.address,
      toNonEmptyString(body.creatorProfileId)
    );
    if (!targetCreatorProfileId) {
      return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId: targetCreatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const noteType = toManagerNoteType(body.noteType);
    if (!noteType) return errJson("NOTE_TYPE_INVALID", 400);

    const visibility = toNoteVisibility(body.visibility);
    if (!visibility) return errJson("VISIBILITY_INVALID", 400);
    if (
      access.role === "CREATOR_OWNER" &&
      !canCreatorViewManagerNoteVisibility(visibility)
    ) {
      return errJson("VISIBILITY_FORBIDDEN_FOR_CREATOR", 403);
    }

    const title = toNonEmptyString(body.title);
    if (!title) return errJson("TITLE_REQUIRED", 400);

    const noteBody = toNonEmptyString(body.body);
    if (!noteBody) return errJson("BODY_REQUIRED", 400);

    const relatedMeetingId = toNonEmptyString(body.relatedMeetingId) ?? null;

    const projectIdRaw = toNonEmptyString(body.projectId);
    const projectId = projectIdRaw ? toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID") : null;

    const externalContactId = toNonEmptyString(body.externalContactId) ?? null;
    const managerAssignmentIdRaw =
      toNonEmptyString(body.managerAssignmentId) ?? access.managerAssignmentId;

    const urgencyScore = toOptionalUrgencyScore(body.urgencyScore);
    if (body.urgencyScore !== undefined && urgencyScore === undefined) {
      return errJson("URGENCY_SCORE_INVALID", 400);
    }

    const followUpNeeded = toOptionalBoolean(body.followUpNeeded) ?? false;
    if (body.followUpNeeded !== undefined && toOptionalBoolean(body.followUpNeeded) === undefined) {
      return errJson("FOLLOW_UP_NEEDED_INVALID", 400);
    }

    const followUpDueAt = toOptionalDate(body.followUpDueAt);
    if (body.followUpDueAt !== undefined && followUpDueAt === undefined) {
      return errJson("FOLLOW_UP_DUE_AT_INVALID", 400);
    }

    const created = await prisma.$transaction(async (tx) => {
      const managerAssignmentId: string | null = managerAssignmentIdRaw;
      if (managerAssignmentId) {
        const assignment = await tx.managerAssignment.findUnique({
          where: { id: managerAssignmentId },
        });
        if (
          !assignment ||
          assignment.creatorProfileId !== targetCreatorProfileId ||
          assignment.managerWalletAddress !== normalizeAddress(ownerSession.address)
        ) {
          throw new Error("MANAGER_ASSIGNMENT_INVALID");
        }
      }

      if (projectId) {
        const project = await tx.project.findFirst({
          where: {
            id: projectId,
            creatorProfileId: targetCreatorProfileId,
          },
          select: { id: true },
        });
        if (!project) throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
      }

      if (externalContactId) {
        const contact = await tx.externalContact.findUnique({
          where: { id: externalContactId },
          select: { id: true, creatorProfileId: true },
        });
        if (!contact || contact.creatorProfileId !== targetCreatorProfileId) {
          throw new Error("EXTERNAL_CONTACT_NOT_FOUND_OR_FORBIDDEN");
        }
      }

      const note = await tx.managerNote.create({
        data: {
          creatorProfileId: targetCreatorProfileId,
          authoredByManagerWalletAddress: ownerSession.address,
          managerAssignmentId,
          projectId,
          externalContactId,
          relatedMeetingId,
          noteType,
          visibility,
          title,
          body: noteBody,
          urgencyScore: urgencyScore ?? null,
          followUpNeeded,
          followUpDueAt: followUpDueAt ?? null,
        },
      });

      await appendActionLogTx(tx, {
        creatorProfileId: targetCreatorProfileId,
        projectId,
        managerAssignmentId,
        actorType: access.role === "MANAGER" ? "MANAGER" : "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType: "MANAGER_NOTE_CREATED",
        title: title,
        targetEntityType: "MANAGER_NOTE",
        targetEntityId: note.id,
        summary: `${noteType} note created.`,
        metadataJson: {
          noteType,
          visibility,
          followUpNeeded,
        },
        visibility:
          visibility === "SHAREABLE_WITH_CREATOR"
            ? "CREATOR_VISIBLE"
            : "INTERNAL",
      });

      return note;
    });

    return okJson(
      {
        created: true,
        note: serializeManagerNote(created),
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    if (message === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    if (message === "MANAGER_ASSIGNMENT_INVALID") {
      return errJson("MANAGER_ASSIGNMENT_INVALID", 400);
    }
    if (message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "EXTERNAL_CONTACT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("EXTERNAL_CONTACT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    console.error("MANAGER_NOTES_POST_FAILED", error);
    return errJson("MANAGER_NOTES_POST_FAILED", 500);
  }
}
