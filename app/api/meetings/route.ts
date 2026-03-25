import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  normalizeAddress,
  toBigIntOrThrow,
  toNonEmptyString,
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
  resolveCreatorProfileIdByAddress,
  serializeMeeting,
} from "@/lib/managerDesk/server";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PostBody = {
  address?: unknown;
  creatorProfileId?: unknown;
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

function parseCreatorProfileId(raw: string): bigint {
  return toBigIntOrThrow(raw, "CREATOR_PROFILE_ID_INVALID");
}

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

function toRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
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

function toLimit(value: string | null): number {
  if (!value) return 20;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 20;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 100) return 100;
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

function toActionLogVisibilityFromMeeting(
  visibility: "INTERNAL" | "CREATOR_VISIBLE"
): "INTERNAL" | "CREATOR_VISIBLE" {
  return visibility === "CREATOR_VISIBLE" ? "CREATOR_VISIBLE" : "INTERNAL";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileId = await resolveTargetCreatorProfileId(
      ownerSession.address,
      toNonEmptyString(searchParams.get("creatorProfileId"))
    );
    if (!creatorProfileId) {
      return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const meetingTypeRaw = searchParams.get("meetingType");
    const meetingType =
      meetingTypeRaw == null ? null : toMeetingType(meetingTypeRaw);
    if (meetingTypeRaw && !meetingType) {
      return errJson("MEETING_TYPE_INVALID", 400);
    }

    const statusRaw = searchParams.get("status");
    const status = statusRaw == null ? null : toMeetingStatus(statusRaw);
    if (statusRaw && !status) return errJson("MEETING_STATUS_INVALID", 400);

    const visibilityRaw = searchParams.get("visibility");
    const visibility =
      visibilityRaw == null ? null : toMeetingVisibility(visibilityRaw);
    if (visibilityRaw && !visibility) {
      return errJson("MEETING_VISIBILITY_INVALID", 400);
    }
    if (
      access.role === "CREATOR_OWNER" &&
      visibility &&
      !canCreatorViewMeetingVisibility(visibility)
    ) {
      return errJson("FORBIDDEN_MEETING_VISIBILITY", 403);
    }

    const rows = await prisma.meeting.findMany({
      where: {
        creatorProfileId,
        ...(meetingType ? { meetingType } : {}),
        ...(status ? { status } : {}),
        ...(access.role === "CREATOR_OWNER"
          ? { visibility: "CREATOR_VISIBLE" }
          : visibility
            ? { visibility }
            : {}),
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: toLimit(searchParams.get("limit")),
    });

    return okJson({
      meetings: rows.map(serializeMeeting),
      count: rows.length,
      accessRole: access.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("MEETINGS_GET_FAILED", error);
    return errJson("MEETINGS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PostBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileId = await resolveTargetCreatorProfileId(
      ownerSession.address,
      toNonEmptyString(body.creatorProfileId)
    );
    if (!creatorProfileId) {
      return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const meetingType = toMeetingType(body.meetingType) ?? "OTHER";
    if (body.meetingType !== undefined && !toMeetingType(body.meetingType)) {
      return errJson("MEETING_TYPE_INVALID", 400);
    }

    const status = toMeetingStatus(body.status) ?? "SCHEDULED";
    if (body.status !== undefined && !toMeetingStatus(body.status)) {
      return errJson("MEETING_STATUS_INVALID", 400);
    }

    const visibility =
      toMeetingVisibility(body.visibility) ?? "CREATOR_VISIBLE";
    if (body.visibility !== undefined && !toMeetingVisibility(body.visibility)) {
      return errJson("MEETING_VISIBILITY_INVALID", 400);
    }
    if (
      access.role === "CREATOR_OWNER" &&
      !canCreatorViewMeetingVisibility(visibility)
    ) {
      return errJson("VISIBILITY_FORBIDDEN_FOR_CREATOR", 403);
    }

    const title = toNonEmptyString(body.title);
    if (!title) return errJson("TITLE_REQUIRED", 400);

    const scheduledAt = toRequiredDate(body.scheduledAt);
    if (!scheduledAt) return errJson("SCHEDULED_AT_REQUIRED", 400);

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

    const projectIdRaw = toNonEmptyString(body.projectId);
    const projectId = projectIdRaw
      ? toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID")
      : null;

    const managerAssignmentId =
      toNonEmptyString(body.managerAssignmentId) ?? access.managerAssignmentId;

    const created = await prisma.$transaction(async (tx) => {
      if (projectId) {
        const project = await tx.project.findFirst({
          where: {
            id: projectId,
            creatorProfileId,
          },
          select: { id: true },
        });
        if (!project) throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
      }

      if (managerAssignmentId) {
        const assignment = await tx.managerAssignment.findUnique({
          where: { id: managerAssignmentId },
        });
        if (
          !assignment ||
          assignment.creatorProfileId !== creatorProfileId ||
          (access.role === "MANAGER" &&
            assignment.managerWalletAddress !==
              normalizeAddress(ownerSession.address))
        ) {
          throw new Error("MANAGER_ASSIGNMENT_INVALID");
        }
      }

      const meeting = await tx.meeting.create({
        data: {
          creatorProfileId,
          managerAssignmentId,
          projectId,
          createdByWalletAddress: ownerSession.address,
          meetingType,
          status,
          visibility,
          title,
          scheduledAt,
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
        },
      });

      await appendActionLogTx(tx, {
        creatorProfileId: meeting.creatorProfileId,
        projectId: meeting.projectId,
        managerAssignmentId: meeting.managerAssignmentId,
        actorType: access.role === "MANAGER" ? "MANAGER" : "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType: "MEETING_CREATED",
        title: meeting.title,
        targetEntityType: "MEETING",
        targetEntityId: meeting.id,
        summary: "Meeting scheduled.",
        metadataJson: {
          meetingType: meeting.meetingType,
          status: meeting.status,
          scheduledAt: meeting.scheduledAt.toISOString(),
        },
        visibility: toActionLogVisibilityFromMeeting(meeting.visibility),
      });

      if (meeting.status === "COMPLETED") {
        await appendActionLogTx(tx, {
          creatorProfileId: meeting.creatorProfileId,
          projectId: meeting.projectId,
          managerAssignmentId: meeting.managerAssignmentId,
          actorType: access.role === "MANAGER" ? "MANAGER" : "CREATOR",
          actorWalletAddress: ownerSession.address,
          actionType: "MEETING_COMPLETED",
          title: meeting.title,
          targetEntityType: "MEETING",
          targetEntityId: meeting.id,
          summary: "Meeting completed on creation.",
          visibility: toActionLogVisibilityFromMeeting(meeting.visibility),
        });
      }

      return meeting;
    });

    return okJson({
      meeting: serializeMeeting(created),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    if (message === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    if (message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "MANAGER_ASSIGNMENT_INVALID") {
      return errJson("MANAGER_ASSIGNMENT_INVALID", 400);
    }
    console.error("MEETING_POST_FAILED", error);
    return errJson("MEETING_POST_FAILED", 500);
  }
}
