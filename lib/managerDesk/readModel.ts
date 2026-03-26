import { Prisma } from "@prisma/client";

import { normalizeAddress } from "@/lib/api/guards";
import {
  requireCreatorAccess,
  serializeActionLog,
  serializeExternalContact,
  serializeManagerAssignment,
  serializeManagerNote,
  serializeMeeting,
} from "@/lib/managerDesk/server";
import type { SerializedActionLog } from "@/lib/managerDesk/server";
import type {
  ManagerDeskActivityTimelineData,
  ManagerDeskActivityTimelineItem,
  ManagerDeskActivityTimelineSourceType,
  ManagerDeskContactPipelineData,
  ManagerDeskContactPipelineDueState,
  ManagerDeskContactPipelineItem,
  ManagerDeskCreatorDetailData,
  ManagerDeskCreatorIdentity,
  ManagerDeskDashboardCard,
  ManagerDeskDashboardData,
  ManagerDeskDashboardPriority,
  ManagerDeskNotesSurfaceData,
  ManagerDeskNotesSurfaceItem,
  ManagerDeskProjectSummary,
  ManagerDeskOpportunityCrmData,
} from "@/lib/managerDesk/readModelTypes";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage } from "@/lib/creatorStage";
import { getPlannerTimeline } from "@/lib/operations/plannerTimeline";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CLOSED_PROJECT_STATUSES } from "@/lib/recruitingProjects";

type SupportedCurrency = "JPYC" | "USDC";

type CreatorRow = {
  id: bigint;
  username: string;
  displayName: string;
  profileText: string | null;
  avatarUrl: string | null;
  creatorType: string | null;
  walletAddress: string | null;
  activeProjectIdJpyc: bigint | null;
  activeProjectIdUsdc: bigint | null;
};

type ProjectRow = {
  id: bigint;
  creatorProfileId: bigint | null;
  title: string;
  status: string;
  currency: string;
  updatedAt: Date;
  createdAt: Date;
  goal: {
    targetAmount: number;
    targetAmountJpyc: number;
    deadline: Date | null;
    achievedAt: Date | null;
  } | null;
};

type ContributionTotalRow = {
  projectId: bigint;
  currency: string;
  _sum: {
    amountDecimal: Prisma.Decimal | null;
  };
};

type ProjectContributionTotals = {
  JPYC: Prisma.Decimal;
  USDC: Prisma.Decimal;
};

type PriorityLevel = "HIGH" | "MEDIUM" | "LOW";

const ZERO_DECIMAL = new Prisma.Decimal(0);
const DUE_SOON_MS = 1000 * 60 * 60 * 24 * 3;

function isSupportedCurrency(value: string): value is SupportedCurrency {
  return value === "JPYC" || value === "USDC";
}

function toProjectTotalsMap(
  rows: ContributionTotalRow[]
): Map<string, ProjectContributionTotals> {
  const totalsByProject = new Map<string, ProjectContributionTotals>();

  for (const row of rows) {
    if (!isSupportedCurrency(row.currency)) continue;
    const current = totalsByProject.get(row.projectId.toString()) ?? {
      JPYC: ZERO_DECIMAL,
      USDC: ZERO_DECIMAL,
    };
    current[row.currency] = row._sum.amountDecimal ?? ZERO_DECIMAL;
    totalsByProject.set(row.projectId.toString(), current);
  }

  return totalsByProject;
}

function decimalToAmountByCurrency(
  currency: SupportedCurrency,
  amount: Prisma.Decimal
): number {
  const asNumber = Number(amount.toString());
  if (!Number.isFinite(asNumber)) return 0;
  if (currency === "USDC") {
    return Number(asNumber.toFixed(2));
  }
  return Math.floor(asNumber);
}

function serializeCreator(row: CreatorRow): ManagerDeskCreatorIdentity {
  return {
    id: row.id.toString(),
    username: row.username,
    displayName: row.displayName,
    profileText: row.profileText,
    avatarUrl: row.avatarUrl,
    creatorType: row.creatorType,
    walletAddress: row.walletAddress,
  };
}

function selectPreferredProject(
  creator: CreatorRow,
  projects: ProjectRow[]
): ProjectRow | null {
  if (projects.length === 0) return null;
  const projectsById = new Map(projects.map((project) => [project.id.toString(), project]));
  const preferredIds = [
    creator.activeProjectIdJpyc?.toString() ?? null,
    creator.activeProjectIdUsdc?.toString() ?? null,
  ];

  for (const preferredId of preferredIds) {
    if (!preferredId) continue;
    const matched = projectsById.get(preferredId);
    if (matched) return matched;
  }

  const openProject =
    projects.find(
      (project) =>
        !PUBLIC_CLOSED_PROJECT_STATUSES.has(project.status) &&
        project.goal?.achievedAt == null
    ) ?? null;

  return openProject ?? projects[0] ?? null;
}

function toProjectSummary(
  project: ProjectRow | null,
  totalsByProject: Map<string, ProjectContributionTotals>
): ManagerDeskProjectSummary | null {
  if (!project) return null;
  if (!isSupportedCurrency(project.currency)) return null;

  const totals = totalsByProject.get(project.id.toString()) ?? {
    JPYC: ZERO_DECIMAL,
    USDC: ZERO_DECIMAL,
  };
  const confirmedAmount = decimalToAmountByCurrency(
    project.currency,
    totals[project.currency]
  );
  const targetAmount =
    project.goal?.targetAmount ?? project.goal?.targetAmountJpyc ?? null;
  const progressPct =
    targetAmount && targetAmount > 0
      ? Math.min(100, (confirmedAmount / targetAmount) * 100)
      : 0;

  return {
    projectId: project.id.toString(),
    title: project.title,
    status: project.status,
    currency: project.currency,
    targetAmount,
    confirmedAmount,
    progressPct: Number(progressPct.toFixed(2)),
    achievedAt: project.goal?.achievedAt?.toISOString() ?? null,
    deadline: project.goal?.deadline?.toISOString() ?? null,
    updatedAt: project.updatedAt.toISOString(),
  };
}

function pickLatestByDate<T>(
  rows: readonly T[],
  getDate: (row: T) => Date | null
): T | null {
  let latest: T | null = null;
  let latestTime = -1;

  for (const row of rows) {
    const date = getDate(row);
    if (!date) continue;
    const time = date.getTime();
    if (time > latestTime) {
      latest = row;
      latestTime = time;
    }
  }

  return latest;
}

function toStaleDays(latestActionAt: Date | null, now: Date): number | null {
  if (!latestActionAt) return null;
  const diffMs = now.getTime() - latestActionAt.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function buildPriority(args: {
  now: Date;
  activeProject: ManagerDeskProjectSummary | null;
  latestActionAt: Date | null;
  riskNoteCount: number;
  followUpNoteCount: number;
  overdueFollowUpCount: number;
  contactActionCount: number;
  overdueContactCount: number;
}): ManagerDeskDashboardPriority {
  let score = 0;
  const reasons: string[] = [];

  if (args.overdueFollowUpCount > 0) {
    score += 40;
    reasons.push("期限超過のフォローアップがあります");
  }

  if (args.overdueContactCount > 0) {
    score += 35;
    reasons.push("期限超過の対外フォローがあります");
  }

  if (args.riskNoteCount > 0) {
    score += 25;
    reasons.push("リスクメモが残っています");
  }

  if (args.followUpNoteCount > 0 && args.overdueFollowUpCount === 0) {
    score += 15;
    reasons.push("未処理のフォローアップがあります");
  }

  if (args.contactActionCount > 0 && args.overdueContactCount === 0) {
    score += 10;
    reasons.push("次アクション付きの接点があります");
  }

  const staleDays = toStaleDays(args.latestActionAt, args.now);
  if (staleDays !== null && staleDays >= 7) {
    score += 20;
    reasons.push("最近の動きが止まっています");
  }

  if (
    args.activeProject?.deadline &&
    args.activeProject.achievedAt == null
  ) {
    const deadline = new Date(args.activeProject.deadline);
    const diffDays = Math.ceil(
      (deadline.getTime() - args.now.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (Number.isFinite(diffDays) && diffDays >= 0 && diffDays <= 7) {
      score += 15;
      reasons.push("目標期限が近いです");
    }
  }

  if (!args.activeProject) {
    score += 5;
    reasons.push("現在確認対象のプロジェクトがありません");
  }

  const level: PriorityLevel =
    score >= 60 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";

  return {
    score,
    level,
    reasons,
  };
}

function maxDate(...dates: Array<Date | null>): Date | null {
  return pickLatestByDate(
    dates.filter((date): date is Date => date !== null),
    (date) => date
  );
}

function sortDashboardCards(
  cards: ManagerDeskDashboardCard[]
): ManagerDeskDashboardCard[] {
  return [...cards].sort((left, right) => {
    if (left.priority.score !== right.priority.score) {
      return right.priority.score - left.priority.score;
    }

    const leftAction = left.latestActionAt
      ? new Date(left.latestActionAt).getTime()
      : 0;
    const rightAction = right.latestActionAt
      ? new Date(right.latestActionAt).getTime()
      : 0;
    return leftAction - rightAction;
  });
}

function toContactPipelineDueState(
  nextActionDueAt: Date | null,
  now: Date
): ManagerDeskContactPipelineDueState {
  if (!nextActionDueAt) return "NONE";
  const diffMs = nextActionDueAt.getTime() - now.getTime();
  if (diffMs < 0) return "OVERDUE";
  if (diffMs <= DUE_SOON_MS) return "DUE_SOON";
  return "NONE";
}

function compareContactPipelineItems(
  left: ManagerDeskContactPipelineItem,
  right: ManagerDeskContactPipelineItem
): number {
  const dueStateRank: Record<ManagerDeskContactPipelineDueState, number> = {
    OVERDUE: 0,
    DUE_SOON: 1,
    NONE: 2,
  };

  if (left.dueState !== right.dueState) {
    return dueStateRank[left.dueState] - dueStateRank[right.dueState];
  }

  const leftDueAt = left.contact.nextActionDueAt
    ? new Date(left.contact.nextActionDueAt).getTime()
    : Number.POSITIVE_INFINITY;
  const rightDueAt = right.contact.nextActionDueAt
    ? new Date(right.contact.nextActionDueAt).getTime()
    : Number.POSITIVE_INFINITY;

  if (leftDueAt !== rightDueAt) {
    return leftDueAt - rightDueAt;
  }

  const leftUpdatedAt = new Date(left.contact.updatedAt).getTime();
  const rightUpdatedAt = new Date(right.contact.updatedAt).getTime();
  return rightUpdatedAt - leftUpdatedAt;
}

function compareActivityTimelineItems(
  left: ManagerDeskActivityTimelineItem,
  right: ManagerDeskActivityTimelineItem
): number {
  const leftTime = new Date(left.happenedAt).getTime();
  const rightTime = new Date(right.happenedAt).getTime();
  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title, "ja");
}

function actorLabelFromWalletAddress(
  walletAddress: string | null,
  assignment: { managerWalletAddress: string } | null
): string {
  if (walletAddress && assignment) {
    const normalizedActor = normalizeAddress(walletAddress);
    const normalizedManager = normalizeAddress(assignment.managerWalletAddress);
    if (normalizedActor === normalizedManager) {
      return "Manager";
    }
  }

  return walletAddress ? `Wallet ${walletAddress.slice(0, 6)}` : "Actor 未設定";
}

function actionLogActorLabel(args: {
  actorType: SerializedActionLog["actorType"];
  actorWalletAddress: string | null;
  creatorWalletAddress: string | null;
  assignment: { managerWalletAddress: string } | null;
}): string {
  if (args.actorType === "CREATOR") return "Creator";
  if (args.actorType === "AI_OFFICE") return "AI Office";
  if (args.actorType === "SYSTEM") return "System";

  if (args.actorWalletAddress && args.creatorWalletAddress) {
    const normalizedActor = normalizeAddress(args.actorWalletAddress);
    const normalizedCreator = normalizeAddress(args.creatorWalletAddress);
    if (normalizedActor === normalizedCreator) {
      return "Creator";
    }
  }

  return actorLabelFromWalletAddress(args.actorWalletAddress, args.assignment);
}

function meetingActorLabel(args: {
  createdByWalletAddress: string;
  creatorWalletAddress: string | null;
  assignment: { managerWalletAddress: string } | null;
}): string {
  if (args.creatorWalletAddress) {
    const normalizedCreator = normalizeAddress(args.creatorWalletAddress);
    const normalizedActor = normalizeAddress(args.createdByWalletAddress);
    if (normalizedCreator === normalizedActor) {
      return "Creator";
    }
  }

  return actorLabelFromWalletAddress(
    args.createdByWalletAddress,
    args.assignment
  );
}

export async function getManagerDeskDashboard(args: {
  managerWalletAddress: string;
}): Promise<ManagerDeskDashboardData> {
  const managerWalletAddress = normalizeAddress(args.managerWalletAddress);
  const now = new Date();

  const assignments = await prisma.managerAssignment.findMany({
    where: {
      managerWalletAddress,
      status: "ACTIVE",
      OR: [
        { endedAt: null },
        { endedAt: { gt: now } },
      ],
    },
    include: {
      creatorProfile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          profileText: true,
          avatarUrl: true,
          creatorType: true,
          walletAddress: true,
          activeProjectIdJpyc: true,
          activeProjectIdUsdc: true,
        },
      },
    },
    orderBy: [{ roleType: "asc" }, { assignedAt: "desc" }],
  });

  if (assignments.length === 0) {
    return {
      managerWalletAddress,
      cards: [],
      summary: {
        assignmentCount: 0,
        creatorCount: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        staleCreatorCount: 0,
        followUpCreatorCount: 0,
        contactActionCreatorCount: 0,
      },
      generatedAt: now.toISOString(),
    };
  }

  const creatorIds = Array.from(
    new Set(assignments.map((assignment) => assignment.creatorProfileId.toString()))
  ).map((id) => BigInt(id));

  const [projects, contributionRows, notes, contacts, actionLogs] =
    await Promise.all([
      prisma.project.findMany({
        where: { creatorProfileId: { in: creatorIds } },
        select: {
          id: true,
          creatorProfileId: true,
          title: true,
          status: true,
          currency: true,
          updatedAt: true,
          createdAt: true,
          goal: {
            select: {
              targetAmount: true,
              targetAmountJpyc: true,
              deadline: true,
              achievedAt: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.contribution.groupBy({
        by: ["projectId", "currency"],
        where: {
          project: {
            is: {
              creatorProfileId: { in: creatorIds },
            },
          },
          status: "CONFIRMED",
        },
        _sum: { amountDecimal: true },
      }),
      prisma.managerNote.findMany({
        where: {
          creatorProfileId: { in: creatorIds },
          isArchived: false,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.externalContact.findMany({
        where: {
          creatorProfileId: { in: creatorIds },
          isArchived: false,
        },
        orderBy: [{ nextActionDueAt: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.actionLog.findMany({
        where: {
          creatorProfileId: { in: creatorIds },
        },
        orderBy: { occurredAt: "desc" },
        take: Math.max(creatorIds.length * 20, 50),
      }),
    ]);

  const totalsByProject = toProjectTotalsMap(contributionRows as ContributionTotalRow[]);
  const projectsByCreator = new Map<string, ProjectRow[]>();
  for (const project of projects) {
    if (project.creatorProfileId == null) continue;
    const key = project.creatorProfileId.toString();
    const current = projectsByCreator.get(key) ?? [];
    current.push(project);
    projectsByCreator.set(key, current);
  }

  const notesByCreator = new Map<string, typeof notes>();
  for (const note of notes) {
    const key = note.creatorProfileId.toString();
    const current = notesByCreator.get(key) ?? [];
    current.push(note);
    notesByCreator.set(key, current);
  }

  const contactsByCreator = new Map<string, typeof contacts>();
  for (const contact of contacts) {
    if (contact.creatorProfileId == null) continue;
    const key = contact.creatorProfileId.toString();
    const current = contactsByCreator.get(key) ?? [];
    current.push(contact);
    contactsByCreator.set(key, current);
  }

  const logsByCreator = new Map<string, typeof actionLogs>();
  for (const log of actionLogs) {
    if (log.creatorProfileId == null) continue;
    const key = log.creatorProfileId.toString();
    const current = logsByCreator.get(key) ?? [];
    current.push(log);
    logsByCreator.set(key, current);
  }

  const cards = assignments.map((assignment) => {
    const creator = assignment.creatorProfile;
    const creatorKey = assignment.creatorProfileId.toString();
    const creatorProjects = projectsByCreator.get(creatorKey) ?? [];
    const activeProject = toProjectSummary(
      selectPreferredProject(creator, creatorProjects),
      totalsByProject
    );
    const creatorNotes = notesByCreator.get(creatorKey) ?? [];
    const creatorContacts = contactsByCreator.get(creatorKey) ?? [];
    const creatorLogs = logsByCreator.get(creatorKey) ?? [];

    const latestNote = creatorNotes[0] ?? null;
    const nextContact =
      creatorContacts.find((contact) => contact.nextActionDueAt !== null) ??
      creatorContacts[0] ??
      null;
    const latestLog = creatorLogs[0] ?? null;

    const riskNoteCount = creatorNotes.filter(
      (note) => note.noteType === "RISK"
    ).length;
    const followUpNotes = creatorNotes.filter((note) => note.followUpNeeded);
    const followUpNoteCount = followUpNotes.length;
    const overdueFollowUpCount = followUpNotes.filter(
      (note) =>
        note.followUpDueAt !== null && note.followUpDueAt.getTime() <= now.getTime()
    ).length;

    const contactActionCount = creatorContacts.filter(
      (contact) => contact.nextActionDueAt !== null
    ).length;
    const overdueContactCount = creatorContacts.filter(
      (contact) =>
        contact.nextActionDueAt !== null &&
        contact.nextActionDueAt.getTime() <= now.getTime()
    ).length;

    const latestActionAtDate = maxDate(
      latestLog?.occurredAt ?? null,
      latestNote?.updatedAt ?? null,
      nextContact?.updatedAt ?? null,
      activeProject ? new Date(activeProject.updatedAt) : null
    );
    const latestActionTitle =
      latestLog?.title ??
      latestNote?.title ??
      nextContact?.organizationName ??
      activeProject?.title ??
      null;

    return {
      assignment: serializeManagerAssignment(assignment),
      creator: serializeCreator(creator),
      activeProject,
      latestManagerNote: latestNote ? serializeManagerNote(latestNote) : null,
      nextContact: nextContact ? serializeExternalContact(nextContact) : null,
      latestActionAt: latestActionAtDate?.toISOString() ?? null,
      latestActionTitle,
      riskNoteCount,
      followUpNoteCount,
      contactActionCount,
      staleDays: toStaleDays(latestActionAtDate, now),
      priority: buildPriority({
        now,
        activeProject,
        latestActionAt: latestActionAtDate,
        riskNoteCount,
        followUpNoteCount,
        overdueFollowUpCount,
        contactActionCount,
        overdueContactCount,
      }),
    } satisfies ManagerDeskDashboardCard;
  });

  const orderedCards = sortDashboardCards(cards);

  return {
    managerWalletAddress,
    cards: orderedCards,
    summary: {
      assignmentCount: assignments.length,
      creatorCount: orderedCards.length,
      highPriorityCount: orderedCards.filter(
        (card) => card.priority.level === "HIGH"
      ).length,
      mediumPriorityCount: orderedCards.filter(
        (card) => card.priority.level === "MEDIUM"
      ).length,
      staleCreatorCount: orderedCards.filter(
        (card) => card.staleDays !== null && card.staleDays >= 7
      ).length,
      followUpCreatorCount: orderedCards.filter(
        (card) => card.followUpNoteCount > 0
      ).length,
      contactActionCreatorCount: orderedCards.filter(
        (card) => card.contactActionCount > 0
      ).length,
    },
    generatedAt: now.toISOString(),
  };
}

export async function getManagerDeskContactPipeline(args: {
  managerWalletAddress: string;
  creatorProfileId?: bigint | null;
  status?: ManagerDeskContactPipelineData["filters"]["status"];
  overdueOnly?: boolean;
  limit?: number;
}): Promise<ManagerDeskContactPipelineData> {
  const managerWalletAddress = normalizeAddress(args.managerWalletAddress);
  const now = new Date();
  const limit = args.limit ?? 100;

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
          profileText: true,
          avatarUrl: true,
          creatorType: true,
          walletAddress: true,
          activeProjectIdJpyc: true,
          activeProjectIdUsdc: true,
        },
      },
    },
    orderBy: [{ roleType: "asc" }, { assignedAt: "desc" }],
  });

  const creatorIdentityById = new Map<string, ManagerDeskCreatorIdentity>();
  const assignmentByCreatorId = new Map<string, (typeof assignments)[number]>();

  for (const assignment of assignments) {
    const creatorId = assignment.creatorProfileId.toString();
    if (!creatorIdentityById.has(creatorId)) {
      creatorIdentityById.set(
        creatorId,
        serializeCreator(assignment.creatorProfile)
      );
    }
    if (!assignmentByCreatorId.has(creatorId)) {
      assignmentByCreatorId.set(creatorId, assignment);
    }
  }

  const availableCreators = Array.from(creatorIdentityById.values()).sort(
    (left, right) =>
      (left.displayName || left.username).localeCompare(
        right.displayName || right.username,
        "ja"
      )
  );

  const emptyResult: ManagerDeskContactPipelineData = {
    managerWalletAddress,
    availableCreators,
    items: [],
    filters: {
      creatorProfileId: args.creatorProfileId?.toString() ?? null,
      status: args.status ?? null,
      overdueOnly: args.overdueOnly === true,
    },
    summary: {
      totalCount: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      withNextActionCount: 0,
      warmContactCount: 0,
      creatorCount: 0,
    },
    generatedAt: now.toISOString(),
  };

  if (availableCreators.length === 0) {
    return emptyResult;
  }

  const assignedCreatorIds = new Set(availableCreators.map((creator) => creator.id));
  const targetCreatorIds =
    args.creatorProfileId == null
      ? Array.from(assignedCreatorIds).map((value) => BigInt(value))
      : assignedCreatorIds.has(args.creatorProfileId.toString())
        ? [args.creatorProfileId]
        : [];

  if (targetCreatorIds.length === 0) {
    return emptyResult;
  }

  const contacts = await prisma.externalContact.findMany({
    where: {
      creatorProfileId: { in: targetCreatorIds },
      isArchived: false,
      ...(args.status ? { status: args.status } : {}),
      ...(args.overdueOnly ? { nextActionDueAt: { lte: now } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: Math.max(1, Math.min(limit, 200)),
  });

  const items = contacts
    .map((contact) => {
      if (contact.creatorProfileId == null) return null;
      const creatorId = contact.creatorProfileId.toString();
      const creator = creatorIdentityById.get(creatorId);
      if (!creator) return null;

      const assignment = assignmentByCreatorId.get(creatorId) ?? null;
      const latestSignalAt = maxDate(contact.lastContactAt, contact.updatedAt);

      return {
        assignment: assignment ? serializeManagerAssignment(assignment) : null,
        creator,
        contact: serializeExternalContact(contact),
        dueState: toContactPipelineDueState(contact.nextActionDueAt, now),
        staleDays: toStaleDays(latestSignalAt, now),
      } satisfies ManagerDeskContactPipelineItem;
    })
    .filter((value): value is ManagerDeskContactPipelineItem => value !== null)
    .sort(compareContactPipelineItems);

  return {
    ...emptyResult,
    items,
    summary: {
      totalCount: items.length,
      overdueCount: items.filter((item) => item.dueState === "OVERDUE").length,
      dueSoonCount: items.filter((item) => item.dueState === "DUE_SOON").length,
      withNextActionCount: items.filter(
        (item) =>
          item.contact.nextActionDueAt !== null || item.contact.nextAction !== null
      ).length,
      warmContactCount: items.filter(
        (item) =>
          item.contact.temperature === "WARM" || item.contact.temperature === "HOT"
      ).length,
      creatorCount: new Set(items.map((item) => item.creator.id)).size,
    },
  };
}

export async function getManagerDeskOpportunityPipeline(args: {
  managerWalletAddress: string;
  creatorProfileId?: bigint | null;
}): Promise<ManagerDeskOpportunityCrmData> {
  const managerWalletAddress = normalizeAddress(args.managerWalletAddress);
  const now = new Date();

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
          profileText: true,
          avatarUrl: true,
          creatorType: true,
          walletAddress: true,
          activeProjectIdJpyc: true,
          activeProjectIdUsdc: true,
        },
      },
    },
    orderBy: [{ roleType: "asc" }, { assignedAt: "desc" }],
  });

  const creatorIdentityById = new Map<string, ManagerDeskCreatorIdentity>();
  const assignmentByCreatorId = new Map<string, (typeof assignments)[number]>();
  for (const assignment of assignments) {
    const creatorId = assignment.creatorProfileId.toString();
    if (!creatorIdentityById.has(creatorId)) {
      creatorIdentityById.set(creatorId, serializeCreator(assignment.creatorProfile));
    }
    if (!assignmentByCreatorId.has(creatorId)) {
      assignmentByCreatorId.set(creatorId, assignment);
    }
  }

  const availableCreators = Array.from(creatorIdentityById.values()).sort((a, b) =>
    (a.displayName || a.username).localeCompare(b.displayName || b.username, "ja")
  );

  const opportunityStatuses = [
    "IN_DISCUSSION",
    "NEGOTIATING",
    "WON",
    "ONGOING",
  ] as const;

  const emptyResult: ManagerDeskOpportunityCrmData = {
    managerWalletAddress,
    availableCreators,
    stages: opportunityStatuses.map((status) => ({ status, items: [] })),
    creatorProfileId: args.creatorProfileId?.toString() ?? null,
    summary: {
      totalCount: 0,
      inDiscussionCount: 0,
      negotiatingCount: 0,
      wonCount: 0,
      ongoingCount: 0,
      hotCount: 0,
    },
    generatedAt: now.toISOString(),
  };

  if (availableCreators.length === 0) return emptyResult;

  const assignedCreatorIds = new Set(availableCreators.map((c) => c.id));
  const targetCreatorIds =
    args.creatorProfileId == null
      ? Array.from(assignedCreatorIds).map((v) => BigInt(v))
      : assignedCreatorIds.has(args.creatorProfileId.toString())
        ? [args.creatorProfileId]
        : [];

  if (targetCreatorIds.length === 0) return emptyResult;

  const contacts = await prisma.externalContact.findMany({
    where: {
      creatorProfileId: { in: targetCreatorIds },
      isArchived: false,
      status: { in: [...opportunityStatuses] },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });

  const allItems: ManagerDeskContactPipelineItem[] = contacts
    .map((contact) => {
      if (contact.creatorProfileId == null) return null;
      const creatorId = contact.creatorProfileId.toString();
      const creator = creatorIdentityById.get(creatorId);
      if (!creator) return null;
      const assignment = assignmentByCreatorId.get(creatorId) ?? null;
      const latestSignalAt = maxDate(contact.lastContactAt, contact.updatedAt);
      return {
        assignment: assignment ? serializeManagerAssignment(assignment) : null,
        creator,
        contact: serializeExternalContact(contact),
        dueState: toContactPipelineDueState(contact.nextActionDueAt, now),
        staleDays: toStaleDays(latestSignalAt, now),
      } satisfies ManagerDeskContactPipelineItem;
    })
    .filter((v): v is ManagerDeskContactPipelineItem => v !== null);

  const stages = opportunityStatuses.map((status) => ({
    status,
    items: allItems
      .filter((item) => item.contact.status === status)
      .sort(compareContactPipelineItems),
  }));

  return {
    managerWalletAddress,
    availableCreators,
    stages,
    creatorProfileId: args.creatorProfileId?.toString() ?? null,
    summary: {
      totalCount: allItems.length,
      inDiscussionCount: allItems.filter((i) => i.contact.status === "IN_DISCUSSION").length,
      negotiatingCount: allItems.filter((i) => i.contact.status === "NEGOTIATING").length,
      wonCount: allItems.filter((i) => i.contact.status === "WON").length,
      ongoingCount: allItems.filter((i) => i.contact.status === "ONGOING").length,
      hotCount: allItems.filter(
        (i) => i.contact.temperature === "HOT" || i.contact.temperature === "WARM"
      ).length,
    },
    generatedAt: now.toISOString(),
  };
}

export async function getManagerDeskNotesSurface(args: {
  managerWalletAddress: string;
  creatorProfileId?: bigint | null;
  noteType?: ManagerDeskNotesSurfaceData["filters"]["noteType"];
  visibility?: ManagerDeskNotesSurfaceData["filters"]["visibility"];
  followUpOnly?: boolean;
  q?: string | null;
  limit?: number;
}): Promise<ManagerDeskNotesSurfaceData> {
  const managerWalletAddress = normalizeAddress(args.managerWalletAddress);
  const now = new Date();
  const limit = args.limit ?? 100;

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
          profileText: true,
          avatarUrl: true,
          creatorType: true,
          walletAddress: true,
          activeProjectIdJpyc: true,
          activeProjectIdUsdc: true,
        },
      },
    },
    orderBy: [{ roleType: "asc" }, { assignedAt: "desc" }],
  });

  const creatorIdentityById = new Map<string, ManagerDeskCreatorIdentity>();
  const assignmentByCreatorId = new Map<string, (typeof assignments)[number]>();

  for (const assignment of assignments) {
    const creatorId = assignment.creatorProfileId.toString();
    if (!creatorIdentityById.has(creatorId)) {
      creatorIdentityById.set(
        creatorId,
        serializeCreator(assignment.creatorProfile)
      );
    }
    if (!assignmentByCreatorId.has(creatorId)) {
      assignmentByCreatorId.set(creatorId, assignment);
    }
  }

  const availableCreators = Array.from(creatorIdentityById.values()).sort(
    (left, right) =>
      (left.displayName || left.username).localeCompare(
        right.displayName || right.username,
        "ja"
      )
  );

  const normalizedQuery = args.q?.trim() ?? null;
  const emptyResult: ManagerDeskNotesSurfaceData = {
    managerWalletAddress,
    availableCreators,
    items: [],
    filters: {
      creatorProfileId: args.creatorProfileId?.toString() ?? null,
      noteType: args.noteType ?? null,
      visibility: args.visibility ?? null,
      followUpOnly: args.followUpOnly === true,
      q: normalizedQuery && normalizedQuery.length > 0 ? normalizedQuery : null,
    },
    summary: {
      totalCount: 0,
      followUpCount: 0,
      overdueCount: 0,
      riskCount: 0,
      shareableCount: 0,
      creatorCount: 0,
    },
    generatedAt: now.toISOString(),
  };

  if (availableCreators.length === 0) {
    return emptyResult;
  }

  const assignedCreatorIds = new Set(availableCreators.map((creator) => creator.id));
  const targetCreatorIds =
    args.creatorProfileId == null
      ? Array.from(assignedCreatorIds).map((value) => BigInt(value))
      : assignedCreatorIds.has(args.creatorProfileId.toString())
        ? [args.creatorProfileId]
        : [];

  if (targetCreatorIds.length === 0) {
    return emptyResult;
  }

  const notes = await prisma.managerNote.findMany({
    where: {
      creatorProfileId: { in: targetCreatorIds },
      isArchived: false,
      ...(args.noteType ? { noteType: args.noteType } : {}),
      ...(args.visibility ? { visibility: args.visibility } : {}),
      ...(args.followUpOnly ? { followUpNeeded: true } : {}),
      ...(normalizedQuery && normalizedQuery.length > 0
        ? {
            OR: [
              { title: { contains: normalizedQuery, mode: "insensitive" } },
              { body: { contains: normalizedQuery, mode: "insensitive" } },
              { aiSummary: { contains: normalizedQuery, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ followUpDueAt: "asc" }, { updatedAt: "desc" }],
    take: Math.max(1, Math.min(limit, 200)),
  });

  const items = notes
    .map((note) => {
      const creatorId = note.creatorProfileId.toString();
      const creator = creatorIdentityById.get(creatorId);
      if (!creator) return null;

      const assignment = assignmentByCreatorId.get(creatorId) ?? null;

      return {
        assignment: assignment ? serializeManagerAssignment(assignment) : null,
        creator,
        note: serializeManagerNote(note),
        staleDays: toStaleDays(note.updatedAt, now),
      } satisfies ManagerDeskNotesSurfaceItem;
    })
    .filter((value): value is ManagerDeskNotesSurfaceItem => value !== null);

  return {
    ...emptyResult,
    items,
    summary: {
      totalCount: items.length,
      followUpCount: items.filter((item) => item.note.followUpNeeded).length,
      overdueCount: items.filter((item) => {
        if (item.note.followUpDueAt == null) return false;
        return new Date(item.note.followUpDueAt).getTime() < now.getTime();
      }).length,
      riskCount: items.filter((item) => item.note.noteType === "RISK").length,
      shareableCount: items.filter(
        (item) => item.note.visibility === "SHAREABLE_WITH_CREATOR"
      ).length,
      creatorCount: new Set(items.map((item) => item.creator.id)).size,
    },
  };
}

export async function getManagerDeskActivityTimeline(args: {
  managerWalletAddress: string;
  creatorProfileId?: bigint | null;
  sourceType?: ManagerDeskActivityTimelineSourceType | null;
  limit?: number;
}): Promise<ManagerDeskActivityTimelineData> {
  const managerWalletAddress = normalizeAddress(args.managerWalletAddress);
  const now = new Date();
  const limit = args.limit ?? 100;

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
          profileText: true,
          avatarUrl: true,
          creatorType: true,
          walletAddress: true,
          activeProjectIdJpyc: true,
          activeProjectIdUsdc: true,
        },
      },
    },
    orderBy: [{ roleType: "asc" }, { assignedAt: "desc" }],
  });

  const creatorIdentityById = new Map<string, ManagerDeskCreatorIdentity>();
  const assignmentByCreatorId = new Map<string, (typeof assignments)[number]>();

  for (const assignment of assignments) {
    const creatorId = assignment.creatorProfileId.toString();
    if (!creatorIdentityById.has(creatorId)) {
      creatorIdentityById.set(
        creatorId,
        serializeCreator(assignment.creatorProfile)
      );
    }
    if (!assignmentByCreatorId.has(creatorId)) {
      assignmentByCreatorId.set(creatorId, assignment);
    }
  }

  const availableCreators = Array.from(creatorIdentityById.values()).sort(
    (left, right) =>
      (left.displayName || left.username).localeCompare(
        right.displayName || right.username,
        "ja"
      )
  );

  const emptyResult: ManagerDeskActivityTimelineData = {
    managerWalletAddress,
    availableCreators,
    items: [],
    filters: {
      creatorProfileId: args.creatorProfileId?.toString() ?? null,
      sourceType: args.sourceType ?? null,
    },
    summary: {
      totalCount: 0,
      actionLogCount: 0,
      meetingCount: 0,
      shareableNoteCount: 0,
      creatorCount: 0,
    },
    generatedAt: now.toISOString(),
  };

  if (availableCreators.length === 0) {
    return emptyResult;
  }

  const assignedCreatorIds = new Set(availableCreators.map((creator) => creator.id));
  const targetCreatorIds =
    args.creatorProfileId == null
      ? Array.from(assignedCreatorIds).map((value) => BigInt(value))
      : assignedCreatorIds.has(args.creatorProfileId.toString())
        ? [args.creatorProfileId]
        : [];

  if (targetCreatorIds.length === 0) {
    return emptyResult;
  }

  const perSourceTake = Math.max(30, Math.min(limit, 200));

  const [actionLogs, meetings, shareableNotes] = await Promise.all([
    prisma.actionLog.findMany({
      where: {
        creatorProfileId: { in: targetCreatorIds },
      },
      orderBy: [{ occurredAt: "desc" }],
      take: perSourceTake,
    }),
    prisma.meeting.findMany({
      where: {
        creatorProfileId: { in: targetCreatorIds },
        status: "COMPLETED",
      },
      orderBy: [{ scheduledAt: "desc" }],
      take: perSourceTake,
    }),
    prisma.managerNote.findMany({
      where: {
        creatorProfileId: { in: targetCreatorIds },
        visibility: "SHAREABLE_WITH_CREATOR",
        isArchived: false,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: perSourceTake,
    }),
  ]);

  const rawItems: Array<ManagerDeskActivityTimelineItem | null> = [
    ...actionLogs.map((log) => {
      if (log.creatorProfileId == null) return null;
      const creatorId = log.creatorProfileId.toString();
      const creator = creatorIdentityById.get(creatorId);
      if (!creator) return null;

      const assignment = assignmentByCreatorId.get(creatorId) ?? null;

      return {
        id: `action-log-${log.id}`,
        sourceType: "ACTION_LOG",
        assignment: assignment ? serializeManagerAssignment(assignment) : null,
        creator,
        actorLabel: actionLogActorLabel({
          actorType: log.actorType,
          actorWalletAddress: log.actorWalletAddress,
          creatorWalletAddress: creator.walletAddress,
          assignment,
        }),
        title: log.title,
        summary: log.summary ?? null,
        happenedAt: log.occurredAt.toISOString(),
        href: `/manager-desk/creators/${creatorId}#recent-action-log`,
        actionLog: serializeActionLog(log),
        meeting: null,
        note: null,
      } satisfies ManagerDeskActivityTimelineItem;
    }),
    ...meetings.map((meeting) => {
      const creatorId = meeting.creatorProfileId.toString();
      const creator = creatorIdentityById.get(creatorId);
      if (!creator) return null;

      const assignment = assignmentByCreatorId.get(creatorId) ?? null;

      return {
        id: `meeting-${meeting.id}`,
        sourceType: "MEETING",
        assignment: assignment ? serializeManagerAssignment(assignment) : null,
        creator,
        actorLabel: meetingActorLabel({
          createdByWalletAddress: meeting.createdByWalletAddress,
          creatorWalletAddress: creator.walletAddress,
          assignment,
        }),
        title: meeting.title,
        summary:
          meeting.aiSummary ??
          meeting.decisions ??
          meeting.nextActionsSummary ??
          meeting.notes ??
          meeting.agenda ??
          null,
        happenedAt: meeting.scheduledAt.toISOString(),
        href: `/manager-desk/creators/${creatorId}#planner`,
        actionLog: null,
        meeting: serializeMeeting(meeting),
        note: null,
      } satisfies ManagerDeskActivityTimelineItem;
    }),
    ...shareableNotes.map((note) => {
      const creatorId = note.creatorProfileId.toString();
      const creator = creatorIdentityById.get(creatorId);
      if (!creator) return null;

      const assignment = assignmentByCreatorId.get(creatorId) ?? null;

      return {
        id: `shareable-note-${note.id}`,
        sourceType: "SHAREABLE_NOTE",
        assignment: assignment ? serializeManagerAssignment(assignment) : null,
        creator,
        actorLabel: actorLabelFromWalletAddress(
          note.authoredByManagerWalletAddress,
          assignment
        ),
        title: note.title,
        summary: note.aiSummary ?? note.body,
        happenedAt: note.updatedAt.toISOString(),
        href: `/manager-desk/creators/${creatorId}#latest-notes`,
        actionLog: null,
        meeting: null,
        note: serializeManagerNote(note),
      } satisfies ManagerDeskActivityTimelineItem;
    }),
  ];

  const items = rawItems
    .filter((value): value is ManagerDeskActivityTimelineItem => value !== null)
    .filter((item) => {
      if (args.sourceType == null) return true;
      return item.sourceType === args.sourceType;
    })
    .sort(compareActivityTimelineItems)
    .slice(0, Math.max(1, Math.min(limit, 200)));

  return {
    ...emptyResult,
    items,
    summary: {
      totalCount: items.length,
      actionLogCount: items.filter((item) => item.sourceType === "ACTION_LOG")
        .length,
      meetingCount: items.filter((item) => item.sourceType === "MEETING").length,
      shareableNoteCount: items.filter(
        (item) => item.sourceType === "SHAREABLE_NOTE"
      ).length,
      creatorCount: new Set(items.map((item) => item.creator.id)).size,
    },
  };
}

export async function getManagerDeskCreatorDetail(args: {
  creatorProfileId: bigint;
  address: string;
  noteLimit?: number;
  contactLimit?: number;
  logLimit?: number;
}): Promise<ManagerDeskCreatorDetailData | null> {
  const noteLimit = args.noteLimit ?? 5;
  const contactLimit = args.contactLimit ?? 5;
  const logLimit = args.logLimit ?? 10;
  const now = new Date();

  const access = await requireCreatorAccess({
    creatorProfileId: args.creatorProfileId,
    address: args.address,
  });
  if (!access.ok) return null;

  const completedMeetingWindow = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [creator, assignment, projects, contributionRows, notes, contacts, logs, planner, completedMeetings, credibility] =
    await Promise.all([
      prisma.creatorProfile.findUnique({
        where: { id: args.creatorProfileId },
        select: {
          id: true,
          username: true,
          displayName: true,
          profileText: true,
          avatarUrl: true,
          creatorType: true,
          walletAddress: true,
          activeProjectIdJpyc: true,
          activeProjectIdUsdc: true,
        },
      }),
      access.managerAssignmentId
        ? prisma.managerAssignment.findUnique({
            where: { id: access.managerAssignmentId },
          })
        : Promise.resolve(null),
      prisma.project.findMany({
        where: { creatorProfileId: args.creatorProfileId },
        select: {
          id: true,
          creatorProfileId: true,
          title: true,
          status: true,
          currency: true,
          updatedAt: true,
          createdAt: true,
          goal: {
            select: {
              targetAmount: true,
              targetAmountJpyc: true,
              deadline: true,
              achievedAt: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.contribution.groupBy({
        by: ["projectId", "currency"],
        where: {
          project: {
            is: {
              creatorProfileId: args.creatorProfileId,
            },
          },
          status: "CONFIRMED",
        },
        _sum: { amountDecimal: true },
      }),
      prisma.managerNote.findMany({
        where: {
          creatorProfileId: args.creatorProfileId,
          isArchived: false,
        },
        orderBy: [{ followUpDueAt: "asc" }, { createdAt: "desc" }],
        take: noteLimit,
      }),
      prisma.externalContact.findMany({
        where: {
          creatorProfileId: args.creatorProfileId,
          isArchived: false,
        },
        orderBy: [{ nextActionDueAt: "asc" }, { updatedAt: "desc" }],
        take: contactLimit,
      }),
      prisma.actionLog.findMany({
        where: {
          creatorProfileId: args.creatorProfileId,
          ...(access.role === "CREATOR_OWNER"
            ? { visibility: "CREATOR_VISIBLE" }
            : {}),
        },
        orderBy: { occurredAt: "desc" },
        take: logLimit,
      }),
      getPlannerTimeline({
        creatorProfileId: args.creatorProfileId,
        actorMode:
          access.role === "CREATOR_OWNER" ? "CREATOR_HOME" : "MANAGER_DESK",
        limit: 6,
      }),
      prisma.meeting.findMany({
        where: {
          creatorProfileId: args.creatorProfileId,
          status: "COMPLETED",
          scheduledAt: { gte: completedMeetingWindow },
          OR: [
            { decisions: { not: null } },
            { nextActionsSummary: { not: null } },
          ],
        },
        orderBy: { scheduledAt: "desc" },
        take: 5,
      }),
      getCreatorActivityCredibility(args.creatorProfileId),
    ]);

  if (!creator) return null;

  const stage = deriveCreatorStage(credibility);

  const totalsByProject = toProjectTotalsMap(contributionRows as ContributionTotalRow[]);
  const activeProject = toProjectSummary(
    selectPreferredProject(creator, projects),
    totalsByProject
  );

  const latestLog = logs[0] ?? null;
  const latestNote = notes[0] ?? null;
  const nextContact =
    contacts.find((contact) => contact.nextActionDueAt !== null) ??
    contacts[0] ??
    null;
  const latestActionAtDate = maxDate(
    latestLog?.occurredAt ?? null,
    latestNote?.updatedAt ?? null,
    nextContact?.updatedAt ?? null,
    activeProject ? new Date(activeProject.updatedAt) : null
  );

  return {
    creator: serializeCreator(creator),
    assignment: assignment ? serializeManagerAssignment(assignment) : null,
    stage,
    activeProject,
    planner,
    recentCompletedMeetings: completedMeetings.map(serializeMeeting),
    latestManagerNotes: notes.map(serializeManagerNote),
    keyContacts: contacts.map(serializeExternalContact),
    recentActionLogs: logs.map(serializeActionLog),
    summary: {
      latestActionAt: latestActionAtDate?.toISOString() ?? null,
      latestActionTitle:
        latestLog?.title ??
        latestNote?.title ??
        nextContact?.organizationName ??
        activeProject?.title ??
        null,
      riskNoteCount: notes.filter((note) => note.noteType === "RISK").length,
      followUpNoteCount: notes.filter((note) => note.followUpNeeded).length,
      contactActionCount: contacts.filter(
        (contact) => contact.nextActionDueAt !== null
      ).length,
      staleDays: toStaleDays(latestActionAtDate, now),
      nextActionDueAt:
        planner.summary.nextDueAt ??
        nextContact?.nextActionDueAt?.toISOString() ??
        notes.find((note) => note.followUpDueAt !== null)?.followUpDueAt?.toISOString() ??
        null,
    },
    deferred: {
      meeting: "planner_minimum_live",
      tasks: "not_implemented",
    },
    generatedAt: now.toISOString(),
  };
}
