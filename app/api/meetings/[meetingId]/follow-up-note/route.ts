import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  appendActionLogTx,
  requireCreatorAccess,
  serializeManagerNote,
} from "@/lib/managerDesk/server";
import { enrichManagerNote } from "@/lib/managerDesk/managerNoteEnrichment";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { meetingId: string };

type PostBody = {
  address?: unknown;
  followUpDueAt?: unknown;
};

function toOptionalDate(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { meetingId } = await ctx.params;
    if (!meetingId) return errJson("MEETING_ID_REQUIRED", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PostBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) return errJson("MEETING_NOT_FOUND", 404);
    if (meeting.status !== "COMPLETED") {
      return errJson("MEETING_NOT_COMPLETED", 400);
    }
    if (!meeting.decisions && !meeting.nextActionsSummary) {
      return errJson("MEETING_NO_DECISIONS_OR_NEXT_ACTIONS", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId: meeting.creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);
    if (access.role === "CREATOR_OWNER") {
      return errJson("MANAGER_ROLE_REQUIRED", 403);
    }

    const followUpDueAt = toOptionalDate(body.followUpDueAt);

    // Build note body from meeting decisions + nextActionsSummary
    const bodyParts: string[] = [];
    if (meeting.decisions) {
      bodyParts.push(`## 決定事項\n${meeting.decisions}`);
    }
    if (meeting.nextActionsSummary) {
      bodyParts.push(`## 次のアクション\n${meeting.nextActionsSummary}`);
    }
    const noteBody = bodyParts.join("\n\n");

    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.managerNote.create({
        data: {
          creatorProfileId: meeting.creatorProfileId,
          authoredByManagerWalletAddress: ownerSession.address,
          managerAssignmentId: access.managerAssignmentId ?? null,
          projectId: meeting.projectId,
          relatedMeetingId: meeting.id,
          noteType: "FOLLOW_UP",
          visibility: "MANAGER_ONLY",
          title: `${meeting.title} — フォローアップ`,
          body: noteBody,
          followUpNeeded: true,
          followUpDueAt: followUpDueAt,
        },
      });

      await appendActionLogTx(tx, {
        creatorProfileId: meeting.creatorProfileId,
        projectId: meeting.projectId,
        managerAssignmentId: access.managerAssignmentId ?? null,
        actorType: "MANAGER",
        actorWalletAddress: ownerSession.address,
        actionType: "MANAGER_NOTE_CREATED",
        title: created.title,
        targetEntityType: "MANAGER_NOTE",
        targetEntityId: created.id,
        summary: `Meeting "${meeting.title}" の決定事項からフォローアップNoteを作成しました。`,
        metadataJson: { sourceMeetingId: meeting.id },
        visibility: "INTERNAL",
      });

      return created;
    });

    // Enrich asynchronously (non-blocking)
    void enrichManagerNote({
      title: note.title,
      body: note.body,
      noteType: note.noteType,
      meetingTitle: meeting.title,
      meetingNextActionsSummary: meeting.nextActionsSummary,
    }).then(async (result) => {
      await prisma.managerNote.update({
        where: { id: note.id },
        data: {
          aiSummary: result.aiSummary,
          aiTags: result.aiTags,
        },
      });
    }).catch((err) => {
      console.error("MEETING_FOLLOW_UP_NOTE_ENRICH_FAILED", err);
    });

    return okJson({ note: serializeManagerNote(note) });
  } catch (error) {
    console.error("MEETING_FOLLOW_UP_NOTE_POST_FAILED", error);
    return errJson("MEETING_FOLLOW_UP_NOTE_POST_FAILED", 500);
  }
}
