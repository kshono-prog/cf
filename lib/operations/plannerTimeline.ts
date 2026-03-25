import type {
  ExternalContact,
  ManagerNote,
  Meeting,
  Project,
} from "@prisma/client";

import {
  canCreatorViewManagerNoteVisibility,
  canCreatorViewMeetingVisibility,
} from "@/lib/managerDesk/server";
import type {
  PlannerActorMode,
  PlannerTimelineData,
  PlannerTimelineItem,
  PlannerTimelineItemOwner,
  PlannerTimelineItemStatus,
} from "@/lib/operations/plannerTypes";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CLOSED_PROJECT_STATUSES } from "@/lib/recruitingProjects";

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_WINDOW_MS = 7 * DAY_MS;

type ProjectDeadlineRow = Pick<Project, "id" | "title" | "status"> & {
  goal: {
    deadline: Date | null;
    achievedAt: Date | null;
  } | null;
};

function toItemStatus(
  dueAt: Date | null,
  now: Date
): PlannerTimelineItemStatus {
  if (!dueAt) return "UPCOMING";
  const diffMs = dueAt.getTime() - now.getTime();
  if (diffMs < 0) return "OVERDUE";
  if (diffMs <= DUE_SOON_WINDOW_MS) return "DUE_SOON";
  return "UPCOMING";
}

function toOwnerForMeeting(
  visibility: Meeting["visibility"]
): PlannerTimelineItemOwner {
  return visibility === "CREATOR_VISIBLE" ? "SHARED" : "MANAGER";
}

function toOwnerForNote(
  note: Pick<ManagerNote, "visibility">
): PlannerTimelineItemOwner {
  return canCreatorViewManagerNoteVisibility(note.visibility)
    ? "SHARED"
    : "MANAGER";
}

function serializeDueAt(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function compareTimelineItems(
  left: PlannerTimelineItem,
  right: PlannerTimelineItem
): number {
  const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightDue = right.dueAt
    ? new Date(right.dueAt).getTime()
    : Number.MAX_SAFE_INTEGER;

  if (leftDue !== rightDue) {
    return leftDue - rightDue;
  }

  if (left.status !== right.status) {
    const rank: Record<PlannerTimelineItemStatus, number> = {
      OVERDUE: 0,
      DUE_SOON: 1,
      UPCOMING: 2,
    };
    return rank[left.status] - rank[right.status];
  }

  return left.title.localeCompare(right.title, "ja");
}

export async function getPlannerTimeline(args: {
  creatorProfileId: bigint;
  actorMode: PlannerActorMode;
  limit?: number;
}): Promise<PlannerTimelineData> {
  const now = new Date();
  const limit = Math.max(1, Math.min(args.limit ?? 6, 20));
  const sourceLimit = Math.max(limit * 2, 6);

  const [meetings, notes, contacts, projects] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        creatorProfileId: args.creatorProfileId,
        status: "SCHEDULED",
        ...(args.actorMode === "CREATOR_HOME"
          ? { visibility: "CREATOR_VISIBLE" }
          : {}),
      },
      orderBy: [{ scheduledAt: "asc" }],
      take: sourceLimit,
    }),
    prisma.managerNote.findMany({
      where: {
        creatorProfileId: args.creatorProfileId,
        isArchived: false,
        followUpNeeded: true,
        ...(args.actorMode === "CREATOR_HOME"
          ? { visibility: "SHAREABLE_WITH_CREATOR" }
          : {}),
      },
      orderBy: [{ followUpDueAt: "asc" }, { createdAt: "desc" }],
      take: sourceLimit,
    }),
    args.actorMode === "MANAGER_DESK"
      ? prisma.externalContact.findMany({
          where: {
            creatorProfileId: args.creatorProfileId,
            isArchived: false,
            OR: [{ nextAction: { not: null } }, { nextActionDueAt: { not: null } }],
          },
          orderBy: [{ nextActionDueAt: "asc" }, { updatedAt: "desc" }],
          take: sourceLimit,
        })
      : Promise.resolve([] as ExternalContact[]),
    prisma.project.findMany({
      where: {
        creatorProfileId: args.creatorProfileId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        goal: {
          select: {
            deadline: true,
            achievedAt: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: sourceLimit,
    }),
  ]);

  const items: PlannerTimelineItem[] = [];

  for (const meeting of meetings) {
    if (
      args.actorMode === "CREATOR_HOME" &&
      !canCreatorViewMeetingVisibility(meeting.visibility)
    ) {
      continue;
    }

    const description =
      meeting.nextActionsSummary ??
      meeting.aiSummary ??
      meeting.agenda ??
      meeting.notes ??
      "会議の論点をここで確認します。";

    items.push({
      id: `meeting-${meeting.id}`,
      sourceType: "MEETING",
      entityType: "MEETING",
      entityId: meeting.id,
      title: meeting.title,
      description,
      dueAt: serializeDueAt(meeting.scheduledAt),
      owner: toOwnerForMeeting(meeting.visibility),
      status: toItemStatus(meeting.scheduledAt, now),
      managerOnly: meeting.visibility === "INTERNAL",
    });
  }

  for (const note of notes) {
    const dueAt = note.followUpDueAt ?? null;
    items.push({
      id: `note-${note.id}`,
      sourceType: "MANAGER_NOTE_FOLLOW_UP",
      entityType: "MANAGER_NOTE",
      entityId: note.id,
      title: note.title,
      description:
        note.aiSummary ??
        (note.body.slice(0, 120) || "次回確認事項が残っています。"),
      dueAt: serializeDueAt(dueAt),
      owner: toOwnerForNote(note),
      status: toItemStatus(dueAt, now),
      managerOnly: !canCreatorViewManagerNoteVisibility(note.visibility),
    });
  }

  for (const contact of contacts) {
    const dueAt = contact.nextActionDueAt ?? null;
    items.push({
      id: `contact-${contact.id}`,
      sourceType: "EXTERNAL_CONTACT_NEXT_ACTION",
      entityType: "EXTERNAL_CONTACT",
      entityId: contact.id,
      title: `${contact.organizationName} への次アクション`,
      description:
        contact.nextAction ?? "接点の更新と温度感の確認が必要です。",
      dueAt: serializeDueAt(dueAt),
      owner: "MANAGER",
      status: toItemStatus(dueAt, now),
      managerOnly: true,
    });
  }

  for (const project of projects as ProjectDeadlineRow[]) {
    const deadline = project.goal?.deadline ?? null;
    const achievedAt = project.goal?.achievedAt ?? null;
    if (!deadline || achievedAt) continue;
    if (PUBLIC_CLOSED_PROJECT_STATUSES.has(project.status)) continue;

    items.push({
      id: `project-${project.id.toString()}`,
      sourceType: "PROJECT_DEADLINE",
      entityType: "PROJECT",
      entityId: project.id.toString(),
      title: `${project.title} の goal 期限`,
      description: "期限前に告知・会議・進捗更新を見直します。",
      dueAt: serializeDueAt(deadline),
      owner: "CREATOR",
      status: toItemStatus(deadline, now),
      managerOnly: false,
    });
  }

  const orderedItems = items.sort(compareTimelineItems);
  const nextDueAt =
    orderedItems.find((item) => item.dueAt !== null)?.dueAt ?? null;

  return {
    items: orderedItems.slice(0, limit),
    summary: {
      overdueCount: orderedItems.filter((item) => item.status === "OVERDUE").length,
      dueSoonCount: orderedItems.filter((item) => item.status === "DUE_SOON").length,
      meetingCount: orderedItems.filter((item) => item.sourceType === "MEETING")
        .length,
      followUpCount: orderedItems.filter(
        (item) => item.sourceType !== "MEETING"
      ).length,
      managerOnlyCount: orderedItems.filter((item) => item.managerOnly).length,
      nextDueAt,
      totalCount: orderedItems.length,
    },
    generatedAt: now.toISOString(),
  };
}
