import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  normalizeAddress,
  toBigIntOrThrow,
} from "@/lib/api/guards";
import {
  toMeetingStatus,
  toMeetingType,
  toMeetingVisibility,
} from "@/lib/managerDesk/contracts";
import {
  appendActionLogTx,
  canCreatorViewMeetingVisibility,
  requireCreatorAccess,
  serializeMeeting,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromBody, requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { meetingId: string };

type PatchBody = {
  address?: unknown;
  managerAssignmentId?: unknown;
  projectId?: unknown;
  meetingType?: unknown;
  status?: unknown;
  visibility?: unknown;
  title?: unknown;
  scheduledAt?: unknown;
  durationMinutes?: unknown;
  locationText?: unknown;
  agenda?: unknown;
  notes?: unknown;
  decisions?: unknown;
  nextActionsSummary?: unknown;
  aiSummary?: unknown;
  nextMeetingSuggestionAt?: unknown;
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

function toOptionalDurationMinutes(
  value: unknown
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const truncated = Math.trunc(value);
  if (truncated < 1 || truncated > 1440) return undefined;
  return truncated;
}

function toActionLogVisibilityFromMeeting(
  visibility: "INTERNAL" | "CREATOR_VISIBLE"
): "INTERNAL" | "CREATOR_VISIBLE" {
  return visibility === "CREATOR_VISIBLE" ? "CREATOR_VISIBLE" : "INTERNAL";
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { meetingId } = await ctx.params;
    if (!meetingId) return errJson("MEETING_ID_REQUIRED", 400);

    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) return errJson("MEETING_NOT_FOUND", 404);

    const access = await requireCreatorAccess({
      creatorProfileId: meeting.creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);
    if (
      access.role === "CREATOR_OWNER" &&
      !canCreatorViewMeetingVisibility(meeting.visibility)
    ) {
      return errJson("FORBIDDEN_MEETING_VISIBILITY", 403);
    }

    return okJson({
      meeting: serializeMeeting(meeting),
    });
  } catch (error) {
    console.error("MEETING_GET_FAILED", error);
    return errJson("MEETING_GET_FAILED", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { meetingId } = await ctx.params;
    if (!meetingId) return errJson("MEETING_ID_REQUIRED", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PatchBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const current = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!current) return errJson("MEETING_NOT_FOUND", 404);

    const access = await requireCreatorAccess({
      creatorProfileId: current.creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);
    if (
      access.role === "CREATOR_OWNER" &&
      !canCreatorViewMeetingVisibility(current.visibility)
    ) {
      return errJson("FORBIDDEN_MEETING_VISIBILITY", 403);
    }

    const meetingType =
      body.meetingType === undefined ? undefined : toMeetingType(body.meetingType);
    if (body.meetingType !== undefined && !meetingType) {
      return errJson("MEETING_TYPE_INVALID", 400);
    }

    const status =
      body.status === undefined ? undefined : toMeetingStatus(body.status);
    if (body.status !== undefined && !status) {
      return errJson("MEETING_STATUS_INVALID", 400);
    }

    const visibility =
      body.visibility === undefined
        ? undefined
        : toMeetingVisibility(body.visibility);
    if (body.visibility !== undefined && !visibility) {
      return errJson("MEETING_VISIBILITY_INVALID", 400);
    }
    if (
      access.role === "CREATOR_OWNER" &&
      visibility &&
      !canCreatorViewMeetingVisibility(visibility)
    ) {
      return errJson("VISIBILITY_FORBIDDEN_FOR_CREATOR", 403);
    }

    const title = toOptionalNullableString(body.title);
    if (body.title !== undefined && title === undefined) {
      return errJson("TITLE_INVALID", 400);
    }

    let scheduledAt: Date | undefined;
    if (body.scheduledAt !== undefined) {
      if (
        typeof body.scheduledAt !== "string" ||
        body.scheduledAt.trim().length === 0
      ) {
        return errJson("SCHEDULED_AT_INVALID", 400);
      }
      const parsedScheduledAt = new Date(body.scheduledAt);
      if (Number.isNaN(parsedScheduledAt.getTime())) {
        return errJson("SCHEDULED_AT_INVALID", 400);
      }
      scheduledAt = parsedScheduledAt;
    }
    if (body.scheduledAt !== undefined && scheduledAt === undefined) {
      return errJson("SCHEDULED_AT_INVALID", 400);
    }

    const durationMinutes = toOptionalDurationMinutes(body.durationMinutes);
    if (body.durationMinutes !== undefined && durationMinutes === undefined) {
      return errJson("DURATION_MINUTES_INVALID", 400);
    }

    const locationText = toOptionalNullableString(body.locationText);
    if (body.locationText !== undefined && locationText === undefined) {
      return errJson("LOCATION_TEXT_INVALID", 400);
    }

    const agenda = toOptionalNullableString(body.agenda);
    if (body.agenda !== undefined && agenda === undefined) {
      return errJson("AGENDA_INVALID", 400);
    }

    const notes = toOptionalNullableString(body.notes);
    if (body.notes !== undefined && notes === undefined) {
      return errJson("NOTES_INVALID", 400);
    }

    const decisions = toOptionalNullableString(body.decisions);
    if (body.decisions !== undefined && decisions === undefined) {
      return errJson("DECISIONS_INVALID", 400);
    }

    const nextActionsSummary = toOptionalNullableString(body.nextActionsSummary);
    if (
      body.nextActionsSummary !== undefined &&
      nextActionsSummary === undefined
    ) {
      return errJson("NEXT_ACTIONS_SUMMARY_INVALID", 400);
    }

    const aiSummary = toOptionalNullableString(body.aiSummary);
    if (body.aiSummary !== undefined && aiSummary === undefined) {
      return errJson("AI_SUMMARY_INVALID", 400);
    }

    const nextMeetingSuggestionAt = toOptionalDate(body.nextMeetingSuggestionAt);
    if (
      body.nextMeetingSuggestionAt !== undefined &&
      nextMeetingSuggestionAt === undefined
    ) {
      return errJson("NEXT_MEETING_SUGGESTION_AT_INVALID", 400);
    }

    const projectIdRaw = toOptionalNullableString(body.projectId);
    const projectId =
      projectIdRaw === undefined
        ? undefined
        : projectIdRaw === null
          ? null
          : toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");

    const managerAssignmentId = toOptionalNullableString(body.managerAssignmentId);
    if (body.managerAssignmentId !== undefined && managerAssignmentId === undefined) {
      return errJson("MANAGER_ASSIGNMENT_ID_INVALID", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (projectId !== undefined && projectId !== null) {
        const project = await tx.project.findFirst({
          where: {
            id: projectId,
            creatorProfileId: current.creatorProfileId,
          },
          select: { id: true },
        });
        if (!project) throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
      }

      if (managerAssignmentId !== undefined && managerAssignmentId !== null) {
        const assignment = await tx.managerAssignment.findUnique({
          where: { id: managerAssignmentId },
        });
        if (
          !assignment ||
          assignment.creatorProfileId !== current.creatorProfileId ||
          (access.role === "MANAGER" &&
            assignment.managerWalletAddress !==
              normalizeAddress(ownerSession.address))
        ) {
          throw new Error("MANAGER_ASSIGNMENT_INVALID");
        }
      }

      const meeting = await tx.meeting.update({
        where: { id: meetingId },
        data: {
          ...(meetingType ? { meetingType } : {}),
          ...(status ? { status } : {}),
          ...(visibility ? { visibility } : {}),
          ...(title !== undefined ? { title: title ?? current.title } : {}),
          ...(scheduledAt !== undefined ? { scheduledAt } : {}),
          ...(durationMinutes !== undefined ? { durationMinutes } : {}),
          ...(locationText !== undefined ? { locationText } : {}),
          ...(agenda !== undefined ? { agenda } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(decisions !== undefined ? { decisions } : {}),
          ...(nextActionsSummary !== undefined ? { nextActionsSummary } : {}),
          ...(aiSummary !== undefined ? { aiSummary } : {}),
          ...(nextMeetingSuggestionAt !== undefined
            ? { nextMeetingSuggestionAt }
            : {}),
          ...(projectId !== undefined
            ? {
                project:
                  projectId === null
                    ? { disconnect: true }
                    : { connect: { id: projectId } },
              }
            : {}),
          ...(managerAssignmentId !== undefined
            ? {
                managerAssignment:
                  managerAssignmentId === null
                    ? { disconnect: true }
                    : { connect: { id: managerAssignmentId } },
              }
            : {}),
        },
      });

      const effectiveVisibility = visibility ?? meeting.visibility;
      const statusChanged = status !== undefined && status !== current.status;
      const actionType =
        statusChanged && meeting.status === "COMPLETED"
          ? "MEETING_COMPLETED"
          : statusChanged
            ? "STATUS_CHANGED"
            : "OTHER";

      await appendActionLogTx(tx, {
        creatorProfileId: meeting.creatorProfileId,
        projectId: meeting.projectId,
        managerAssignmentId: meeting.managerAssignmentId,
        actorType: access.role === "MANAGER" ? "MANAGER" : "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType,
        title: meeting.title,
        targetEntityType: "MEETING",
        targetEntityId: meeting.id,
        summary:
          actionType === "MEETING_COMPLETED"
            ? "Meeting completed."
            : statusChanged
              ? `Meeting status changed to ${meeting.status}.`
              : "Meeting updated.",
        metadataJson: {
          meetingType: meeting.meetingType,
          status: meeting.status,
          scheduledAt: meeting.scheduledAt.toISOString(),
        },
        visibility: toActionLogVisibilityFromMeeting(effectiveVisibility),
      });

      return meeting;
    });

    return okJson({
      meeting: serializeMeeting(updated),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    if (message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "MANAGER_ASSIGNMENT_INVALID") {
      return errJson("MANAGER_ASSIGNMENT_INVALID", 400);
    }
    console.error("MEETING_PATCH_FAILED", error);
    return errJson("MEETING_PATCH_FAILED", 500);
  }
}
