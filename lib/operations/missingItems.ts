import { normalizeAddress } from "@/lib/api/guards";
import { prisma } from "@/lib/prisma";
import type {
  MissingItem,
  MissingItemCategory,
  MissingItemsCreatorSummary,
  MissingItemsData,
  MissingItemSeverity,
} from "@/lib/operations/missingItemsTypes";

const STALE_CONTACT_DAYS = 30;

function severityForCategory(category: MissingItemCategory): MissingItemSeverity {
  switch (category) {
    case "NOTE_FOLLOW_UP_OVERDUE":
    case "CONTACT_NEXT_ACTION_OVERDUE":
      return "HIGH";
    case "NOTE_FOLLOW_UP_NO_DUE_DATE":
    case "CONTACT_NO_NEXT_ACTION":
    case "MEETING_NO_FOLLOW_UP":
      return "MEDIUM";
    case "MEETING_NO_AGENDA":
      return "LOW";
  }
}

function severityOrder(s: MissingItemSeverity): number {
  if (s === "HIGH") return 0;
  if (s === "MEDIUM") return 1;
  return 2;
}

export async function getMissingItems(args: {
  managerWalletAddress: string;
}): Promise<MissingItemsData> {
  const managerWalletAddress = normalizeAddress(args.managerWalletAddress);
  const now = new Date();
  const staleThreshold = new Date(
    now.getTime() - STALE_CONTACT_DAYS * 24 * 60 * 60 * 1000
  );

  const assignments = await prisma.managerAssignment.findMany({
    where: {
      managerWalletAddress,
      status: "ACTIVE",
      OR: [{ endedAt: null }, { endedAt: { gt: now } }],
    },
    include: {
      creatorProfile: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  if (assignments.length === 0) {
    return {
      managerWalletAddress,
      items: [],
      summary: {
        totalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        byCreator: [],
      },
      generatedAt: now.toISOString(),
    };
  }

  const creatorIds = Array.from(
    new Set(assignments.map((a) => a.creatorProfileId))
  );

  const creatorNameById = new Map<string, string>(
    assignments
      .filter((a) => a.creatorProfile !== null)
      .map((a) => [
        a.creatorProfileId.toString(),
        a.creatorProfile!.displayName || a.creatorProfile!.username,
      ])
  );

  const [notes, contacts, meetings] = await Promise.all([
    prisma.managerNote.findMany({
      where: {
        creatorProfileId: { in: creatorIds },
        isArchived: false,
        followUpNeeded: true,
      },
      select: {
        id: true,
        creatorProfileId: true,
        title: true,
        followUpDueAt: true,
        aiSummary: true,
        body: true,
      },
    }),
    prisma.externalContact.findMany({
      where: {
        creatorProfileId: { in: creatorIds },
        isArchived: false,
        status: { notIn: ["LOST", "WON"] },
      },
      select: {
        id: true,
        creatorProfileId: true,
        organizationName: true,
        nextAction: true,
        nextActionDueAt: true,
        lastContactAt: true,
        status: true,
      },
    }),
    prisma.meeting.findMany({
      where: {
        creatorProfileId: { in: creatorIds },
        status: { in: ["SCHEDULED", "COMPLETED"] },
      },
      select: {
        id: true,
        creatorProfileId: true,
        title: true,
        status: true,
        scheduledAt: true,
        agenda: true,
        decisions: true,
        nextActionsSummary: true,
      },
      orderBy: { scheduledAt: "desc" },
      take: 200,
    }),
  ]);

  const items: MissingItem[] = [];

  // --- ManagerNote gaps ---
  for (const note of notes) {
    const creatorProfileId = note.creatorProfileId.toString();
    const creatorName = creatorNameById.get(creatorProfileId) ?? "Unknown";

    if (!note.followUpDueAt) {
      const category: MissingItemCategory = "NOTE_FOLLOW_UP_NO_DUE_DATE";
      items.push({
        id: `note-no-due-${note.id}`,
        category,
        severity: severityForCategory(category),
        creatorProfileId,
        creatorName,
        entityType: "MANAGER_NOTE",
        entityId: note.id,
        title: note.title,
        detail: `フォローアップが必要ですが期限が設定されていません。期限を設定して追跡を明確にしてください。`,
        dueAt: null,
      });
    } else if (note.followUpDueAt.getTime() < now.getTime()) {
      const category: MissingItemCategory = "NOTE_FOLLOW_UP_OVERDUE";
      items.push({
        id: `note-overdue-${note.id}`,
        category,
        severity: severityForCategory(category),
        creatorProfileId,
        creatorName,
        entityType: "MANAGER_NOTE",
        entityId: note.id,
        title: note.title,
        detail: `フォローアップ期限を過ぎています。確認・対応または期限更新が必要です。`,
        dueAt: note.followUpDueAt.toISOString(),
      });
    }
  }

  // --- ExternalContact gaps ---
  for (const contact of contacts) {
    const creatorProfileId = contact.creatorProfileId?.toString();
    if (!creatorProfileId) continue;
    const creatorName = creatorNameById.get(creatorProfileId) ?? "Unknown";

    if (contact.nextActionDueAt && contact.nextActionDueAt.getTime() < now.getTime()) {
      const category: MissingItemCategory = "CONTACT_NEXT_ACTION_OVERDUE";
      items.push({
        id: `contact-overdue-${contact.id}`,
        category,
        severity: severityForCategory(category),
        creatorProfileId,
        creatorName,
        entityType: "EXTERNAL_CONTACT",
        entityId: contact.id,
        title: `${contact.organizationName} への次アクション期限超過`,
        detail:
          contact.nextAction ??
          `期限を過ぎた次アクションがあります。状況を確認してください。`,
        dueAt: contact.nextActionDueAt.toISOString(),
      });
    } else if (
      !contact.nextAction &&
      (!contact.lastContactAt ||
        contact.lastContactAt.getTime() < staleThreshold.getTime())
    ) {
      const category: MissingItemCategory = "CONTACT_NO_NEXT_ACTION";
      items.push({
        id: `contact-no-action-${contact.id}`,
        category,
        severity: severityForCategory(category),
        creatorProfileId,
        creatorName,
        entityType: "EXTERNAL_CONTACT",
        entityId: contact.id,
        title: `${contact.organizationName} — 次アクション未設定`,
        detail: `${STALE_CONTACT_DAYS}日以上アクションのない接点です。次アクションを設定してください。`,
        dueAt: null,
      });
    }
  }

  // --- Meeting gaps ---
  for (const meeting of meetings) {
    const creatorProfileId = meeting.creatorProfileId.toString();
    const creatorName = creatorNameById.get(creatorProfileId) ?? "Unknown";

    if (meeting.status === "SCHEDULED" && !meeting.agenda) {
      // Only flag meetings scheduled within the next 14 days
      const daysUntil =
        (meeting.scheduledAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (daysUntil >= 0 && daysUntil <= 14) {
        const category: MissingItemCategory = "MEETING_NO_AGENDA";
        items.push({
          id: `meeting-no-agenda-${meeting.id}`,
          category,
          severity: severityForCategory(category),
          creatorProfileId,
          creatorName,
          entityType: "MEETING",
          entityId: meeting.id,
          title: `${meeting.title} — アジェンダ未設定`,
          detail: `14日以内に予定されているミーティングにアジェンダがありません。議題を追加してください。`,
          dueAt: meeting.scheduledAt.toISOString(),
        });
      }
    }

    if (
      meeting.status === "COMPLETED" &&
      !meeting.decisions &&
      !meeting.nextActionsSummary
    ) {
      // Only flag recently completed meetings (within 7 days)
      const daysSince =
        (now.getTime() - meeting.scheduledAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince >= 0 && daysSince <= 7) {
        const category: MissingItemCategory = "MEETING_NO_FOLLOW_UP";
        items.push({
          id: `meeting-no-followup-${meeting.id}`,
          category,
          severity: severityForCategory(category),
          creatorProfileId,
          creatorName,
          entityType: "MEETING",
          entityId: meeting.id,
          title: `${meeting.title} — 決定事項・次アクション未記録`,
          detail: `完了ミーティングに決定事項または次アクションが記録されていません。ミーティング後のフォローアップを記録してください。`,
          dueAt: meeting.scheduledAt.toISOString(),
        });
      }
    }
  }

  // Sort: HIGH first, then by dueAt asc
  items.sort((a, b) => {
    const severityDiff = severityOrder(a.severity) - severityOrder(b.severity);
    if (severityDiff !== 0) return severityDiff;
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  });

  const byCreatorMap = new Map<string, number>();
  for (const item of items) {
    byCreatorMap.set(
      item.creatorProfileId,
      (byCreatorMap.get(item.creatorProfileId) ?? 0) + 1
    );
  }
  const byCreator: MissingItemsCreatorSummary[] = Array.from(
    byCreatorMap.entries()
  )
    .map(([creatorProfileId, count]) => ({
      creatorProfileId,
      creatorName: creatorNameById.get(creatorProfileId) ?? "Unknown",
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    managerWalletAddress,
    items,
    summary: {
      totalCount: items.length,
      highCount: items.filter((i) => i.severity === "HIGH").length,
      mediumCount: items.filter((i) => i.severity === "MEDIUM").length,
      lowCount: items.filter((i) => i.severity === "LOW").length,
      byCreator,
    },
    generatedAt: now.toISOString(),
  };
}
