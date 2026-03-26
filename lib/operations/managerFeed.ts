import { normalizeAddress } from "@/lib/api/guards";
import { prisma } from "@/lib/prisma";
import type {
  CreatorManagerFeedData,
  CreatorManagerFeedItem,
} from "@/lib/operations/managerFeedTypes";

const DUE_SOON_MS = 1000 * 60 * 60 * 24 * 3;

function toManagerLabel(args: {
  roleType: "PRIMARY" | "SUPPORTING" | null;
  authoredByManagerWalletAddress: string;
  managerWalletAddress: string | null;
}): string {
  if (args.roleType === "PRIMARY") return "主担当 Manager";
  if (args.roleType === "SUPPORTING") return "副担当 Manager";

  if (args.managerWalletAddress) {
    const normalizedAuthor = normalizeAddress(args.authoredByManagerWalletAddress);
    const normalizedManager = normalizeAddress(args.managerWalletAddress);
    if (normalizedAuthor === normalizedManager) {
      return "Manager";
    }
  }

  return "Manager update";
}

function toTone(args: {
  followUpNeeded: boolean;
  followUpDueAt: Date | null;
  noteType: CreatorManagerFeedItem["noteType"];
  now: Date;
}): CreatorManagerFeedItem["tone"] {
  if (args.followUpDueAt && args.followUpDueAt.getTime() <= args.now.getTime()) {
    return "attention";
  }
  if (args.noteType === "RISK") return "attention";
  if (args.followUpNeeded) return "recommended";
  return "neutral";
}

function buildSummaryText(args: {
  aiSummary: string | null;
  body: string;
  externalContactOrganizationName: string | null;
  meetingTitle: string | null;
}): string {
  const base = args.aiSummary ?? args.body;
  const trimmed = base.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }

  if (args.externalContactOrganizationName) {
    return `${args.externalContactOrganizationName} まわりの共有事項です。`;
  }

  if (args.meetingTitle) {
    return `${args.meetingTitle} に向けた共有事項です。`;
  }

  return "Manager からの共有事項です。";
}

export async function getCreatorManagerFeed(args: {
  creatorProfileId: bigint;
  limit?: number;
}): Promise<CreatorManagerFeedData> {
  const now = new Date();
  const limit = Math.max(1, Math.min(args.limit ?? 4, 12));

  const notes = await prisma.managerNote.findMany({
    where: {
      creatorProfileId: args.creatorProfileId,
      visibility: "SHAREABLE_WITH_CREATOR",
      isArchived: false,
    },
    include: {
      project: {
        select: {
          title: true,
        },
      },
      externalContact: {
        select: {
          organizationName: true,
        },
      },
      managerAssignment: {
        select: {
          roleType: true,
          managerWalletAddress: true,
        },
      },
    },
    orderBy: [{ followUpDueAt: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });

  const meetingIds = Array.from(
    new Set(
      notes
        .map((note) => note.relatedMeetingId)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  const meetings =
    meetingIds.length > 0
      ? await prisma.meeting.findMany({
          where: {
            id: { in: meetingIds },
          },
          select: {
            id: true,
            title: true,
          },
        })
      : [];

  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));

  const items = notes.map((note) => {
    const relatedMeeting =
      note.relatedMeetingId != null ? meetingsById.get(note.relatedMeetingId) : null;
    const tone = toTone({
      followUpNeeded: note.followUpNeeded,
      followUpDueAt: note.followUpDueAt,
      noteType: note.noteType,
      now,
    });

    return {
      id: note.id,
      title: note.title,
      summary: buildSummaryText({
        aiSummary: note.aiSummary,
        body: note.body,
        externalContactOrganizationName:
          note.externalContact?.organizationName ?? null,
        meetingTitle: relatedMeeting?.title ?? null,
      }),
      noteType: note.noteType,
      tone,
      managerLabel: toManagerLabel({
        roleType: note.managerAssignment?.roleType ?? null,
        authoredByManagerWalletAddress: note.authoredByManagerWalletAddress,
        managerWalletAddress: note.managerAssignment?.managerWalletAddress ?? null,
      }),
      projectTitle: note.project?.title ?? null,
      contactLabel: note.externalContact?.organizationName ?? null,
      meetingLabel: relatedMeeting?.title ?? null,
      followUpNeeded: note.followUpNeeded,
      followUpDueAt: note.followUpDueAt?.toISOString() ?? null,
      updatedAt: note.updatedAt.toISOString(),
    } satisfies CreatorManagerFeedItem;
  });

  return {
    creatorProfileId: args.creatorProfileId.toString(),
    items,
    summary: {
      itemCount: items.length,
      followUpCount: items.filter((item) => item.followUpNeeded).length,
      dueSoonCount: items.filter((item) => {
        if (!item.followUpDueAt) return false;
        const dueAt = new Date(item.followUpDueAt).getTime();
        return dueAt > now.getTime() && dueAt - now.getTime() <= DUE_SOON_MS;
      }).length,
      attentionCount: items.filter((item) => item.tone === "attention").length,
      latestUpdateAt: items[0]?.updatedAt ?? null,
    },
    generatedAt: now.toISOString(),
  };
}
