import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  normalizeAddress,
  toBigIntOrThrow,
} from "@/lib/api/guards";
import {
  toManagerNoteType,
  toNoteVisibility,
} from "@/lib/managerDesk/contracts";
import {
  appendActionLogTx,
  canCreatorViewManagerNoteVisibility,
  requireCreatorAccess,
  serializeManagerNote,
} from "@/lib/managerDesk/server";
import { enrichManagerNote } from "@/lib/managerDesk/managerNoteEnrichment";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { noteId: string };

type PatchBody = {
  address?: unknown;
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
  isArchived?: unknown;
};

function toOptionalNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return undefined;
  return value;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { noteId } = await ctx.params;
    if (!noteId) return errJson("NOTE_ID_REQUIRED", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PatchBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const current = await prisma.managerNote.findUnique({
      where: { id: noteId },
    });
    if (!current) return errJson("MANAGER_NOTE_NOT_FOUND", 404);

    const access = await requireCreatorAccess({
      creatorProfileId: current.creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);
    if (
      access.role === "CREATOR_OWNER" &&
      !canCreatorViewManagerNoteVisibility(current.visibility)
    ) {
      return errJson("FORBIDDEN_NOTE_VISIBILITY", 403);
    }

    const noteType =
      body.noteType === undefined ? undefined : toManagerNoteType(body.noteType);
    if (body.noteType !== undefined && !noteType) {
      return errJson("NOTE_TYPE_INVALID", 400);
    }

    const visibility =
      body.visibility === undefined ? undefined : toNoteVisibility(body.visibility);
    if (body.visibility !== undefined && !visibility) {
      return errJson("VISIBILITY_INVALID", 400);
    }
    if (
      access.role === "CREATOR_OWNER" &&
      visibility &&
      !canCreatorViewManagerNoteVisibility(visibility)
    ) {
      return errJson("VISIBILITY_FORBIDDEN_FOR_CREATOR", 403);
    }

    const title = toOptionalNullableString(body.title);
    if (body.title !== undefined && title === undefined) {
      return errJson("TITLE_INVALID", 400);
    }

    const noteBody = toOptionalNullableString(body.body);
    if (body.body !== undefined && noteBody === undefined) {
      return errJson("BODY_INVALID", 400);
    }

    const relatedMeetingId = toOptionalNullableString(body.relatedMeetingId);
    if (body.relatedMeetingId !== undefined && relatedMeetingId === undefined) {
      return errJson("RELATED_MEETING_ID_INVALID", 400);
    }

    const projectIdRaw = toOptionalNullableString(body.projectId);
    const projectId =
      projectIdRaw === undefined
        ? undefined
        : projectIdRaw === null
        ? null
        : toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");

    const externalContactId = toOptionalNullableString(body.externalContactId);
    if (body.externalContactId !== undefined && externalContactId === undefined) {
      return errJson("EXTERNAL_CONTACT_ID_INVALID", 400);
    }

    const managerAssignmentId = toOptionalNullableString(body.managerAssignmentId);
    if (body.managerAssignmentId !== undefined && managerAssignmentId === undefined) {
      return errJson("MANAGER_ASSIGNMENT_ID_INVALID", 400);
    }

    const urgencyScore = toOptionalUrgencyScore(body.urgencyScore);
    if (body.urgencyScore !== undefined && urgencyScore === undefined) {
      return errJson("URGENCY_SCORE_INVALID", 400);
    }

    const followUpNeeded = toOptionalBoolean(body.followUpNeeded);
    if (body.followUpNeeded !== undefined && followUpNeeded === undefined) {
      return errJson("FOLLOW_UP_NEEDED_INVALID", 400);
    }

    const followUpDueAt = toOptionalDate(body.followUpDueAt);
    if (body.followUpDueAt !== undefined && followUpDueAt === undefined) {
      return errJson("FOLLOW_UP_DUE_AT_INVALID", 400);
    }

    const isArchived = toOptionalBoolean(body.isArchived);
    if (body.isArchived !== undefined && isArchived === undefined) {
      return errJson("IS_ARCHIVED_INVALID", 400);
    }

    const finalNoteType = noteType ?? current.noteType;
    const finalTitle = title ?? current.title;
    const finalBody = noteBody ?? current.body;
    const finalProjectId =
      projectId !== undefined ? projectId : current.projectId;
    const finalExternalContactId =
      externalContactId !== undefined
        ? externalContactId
        : current.externalContactId;
    const finalRelatedMeetingId =
      relatedMeetingId !== undefined
        ? relatedMeetingId
        : current.relatedMeetingId;
    const finalManagerAssignmentId =
      managerAssignmentId !== undefined
        ? managerAssignmentId
        : current.managerAssignmentId;

    if (finalManagerAssignmentId !== null) {
      const assignment = await prisma.managerAssignment.findUnique({
        where: { id: finalManagerAssignmentId },
      });
      if (
        !assignment ||
        assignment.creatorProfileId !== current.creatorProfileId ||
        (access.role === "MANAGER" &&
          assignment.managerWalletAddress !== normalizeAddress(ownerSession.address))
      ) {
        return errJson("MANAGER_ASSIGNMENT_INVALID", 400);
      }
    }

    const project =
      finalProjectId === null
        ? null
        : await prisma.project.findFirst({
            where: {
              id: finalProjectId,
              creatorProfileId: current.creatorProfileId,
            },
            select: { id: true, title: true },
          });
    if (finalProjectId !== null && !project) {
      return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const contact =
      finalExternalContactId === null
        ? null
        : await prisma.externalContact.findUnique({
            where: { id: finalExternalContactId },
            select: {
              id: true,
              creatorProfileId: true,
              organizationName: true,
              nextAction: true,
            },
          });
    if (
      finalExternalContactId !== null &&
      (!contact || contact.creatorProfileId !== current.creatorProfileId)
    ) {
      return errJson("EXTERNAL_CONTACT_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const meeting =
      finalRelatedMeetingId === null
        ? null
        : await prisma.meeting.findUnique({
            where: { id: finalRelatedMeetingId },
            select: {
              id: true,
              creatorProfileId: true,
              title: true,
              nextActionsSummary: true,
            },
          });
    if (
      finalRelatedMeetingId !== null &&
      (!meeting || meeting.creatorProfileId !== current.creatorProfileId)
    ) {
      return errJson("RELATED_MEETING_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const shouldRefreshEnrichment =
      noteType !== undefined ||
      title !== undefined ||
      noteBody !== undefined ||
      projectId !== undefined ||
      externalContactId !== undefined ||
      relatedMeetingId !== undefined ||
      current.aiSummary == null ||
      current.aiSummary.trim().length === 0 ||
      current.aiTags.length === 0 ||
      (followUpNeeded === undefined && !current.followUpNeeded) ||
      (followUpDueAt === undefined && current.followUpDueAt == null) ||
      (urgencyScore === undefined && current.urgencyScore == null);

    const enrichment = shouldRefreshEnrichment
      ? await enrichManagerNote({
          title: finalTitle,
          body: finalBody,
          noteType: finalNoteType,
          projectTitle: project?.title ?? null,
          externalContactName: contact?.organizationName ?? null,
          externalContactNextAction: contact?.nextAction ?? null,
          meetingTitle: meeting?.title ?? null,
          meetingNextActionsSummary: meeting?.nextActionsSummary ?? null,
        })
      : null;

    const effectiveUrgencyScore =
      urgencyScore !== undefined
        ? urgencyScore
        : shouldRefreshEnrichment
          ? enrichment?.urgencyScore ?? null
          : current.urgencyScore;
    const effectiveFollowUpNeeded =
      followUpNeeded !== undefined
        ? followUpNeeded
        : shouldRefreshEnrichment
          ? enrichment?.followUpNeeded ?? false
          : current.followUpNeeded;
    const effectiveFollowUpDueAt =
      followUpDueAt !== undefined
        ? followUpDueAt
        : shouldRefreshEnrichment
          ? enrichment?.followUpDueAt ?? null
          : current.followUpDueAt;

    const updated = await prisma.$transaction(async (tx) => {

      const note = await tx.managerNote.update({
        where: { id: noteId },
        data: {
          ...(noteType ? { noteType } : {}),
          ...(visibility ? { visibility } : {}),
          ...(title !== undefined ? { title: title ?? current.title } : {}),
          ...(noteBody !== undefined ? { body: noteBody ?? current.body } : {}),
          ...(managerAssignmentId !== undefined
            ? { managerAssignmentId }
            : {}),
          ...(projectId !== undefined ? { projectId } : {}),
          ...(externalContactId !== undefined ? { externalContactId } : {}),
          ...(relatedMeetingId !== undefined ? { relatedMeetingId } : {}),
          urgencyScore: effectiveUrgencyScore,
          followUpNeeded: effectiveFollowUpNeeded,
          followUpDueAt: effectiveFollowUpDueAt,
          ...(enrichment
            ? {
                aiSummary: enrichment.aiSummary,
                aiTags: enrichment.aiTags,
              }
            : {}),
          ...(isArchived !== undefined
            ? {
                isArchived,
                archivedAt: isArchived ? new Date() : null,
              }
            : {}),
        },
      });

      const effectiveVisibility = visibility ?? note.visibility;

      await appendActionLogTx(tx, {
        creatorProfileId: note.creatorProfileId,
        projectId: note.projectId,
        managerAssignmentId: note.managerAssignmentId,
        actorType: access.role === "MANAGER" ? "MANAGER" : "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType: "MANAGER_NOTE_UPDATED",
        title: note.title,
        targetEntityType: "MANAGER_NOTE",
        targetEntityId: note.id,
        summary: "Manager note updated.",
        metadataJson: {
          noteType: note.noteType,
          visibility: effectiveVisibility,
          isArchived: note.isArchived,
          aiSummaryGenerated: enrichment !== null,
          followUpNeeded: effectiveFollowUpNeeded,
        },
        visibility:
          effectiveVisibility === "SHAREABLE_WITH_CREATOR"
            ? "CREATOR_VISIBLE"
            : "INTERNAL",
      });

      return note;
    });

    return okJson({
      note: serializeManagerNote(updated),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    if (message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "EXTERNAL_CONTACT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("EXTERNAL_CONTACT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "RELATED_MEETING_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("RELATED_MEETING_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "MANAGER_ASSIGNMENT_INVALID") {
      return errJson("MANAGER_ASSIGNMENT_INVALID", 400);
    }
    console.error("MANAGER_NOTE_PATCH_FAILED", error);
    return errJson("MANAGER_NOTE_PATCH_FAILED", 500);
  }
}
