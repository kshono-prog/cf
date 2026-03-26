import { Prisma } from "@prisma/client";

import type {
  CreatorDailyBriefingData,
  CreatorDailyBriefingItem,
} from "@/lib/operations/dailyBriefingTypes";
import { getPlannerTimeline } from "@/lib/operations/plannerTimeline";
import { prisma } from "@/lib/prisma";

type SupportedCurrency = "JPYC" | "USDC";

type ProjectRow = {
  id: bigint;
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

type ActiveProjectSignal = {
  title: string;
  progressPct: number;
  achievedAt: string | null;
};

const ZERO_DECIMAL = new Prisma.Decimal(0);

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

function selectPreferredProject(
  creator: {
    activeProjectIdJpyc: bigint | null;
    activeProjectIdUsdc: bigint | null;
  },
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
      (project) => project.goal?.achievedAt == null && project.status !== "ARCHIVED"
    ) ?? null;

  return openProject ?? projects[0] ?? null;
}

function toActiveProjectSignal(
  project: ProjectRow | null,
  totalsByProject: Map<string, ProjectContributionTotals>
): ActiveProjectSignal | null {
  if (!project || !isSupportedCurrency(project.currency)) return null;

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
    title: project.title,
    progressPct: Number(progressPct.toFixed(2)),
    achievedAt: project.goal?.achievedAt?.toISOString() ?? null,
  };
}

function buildFocusTheme(args: {
  overdueCount: number;
  dueSoonCount: number;
  shareableFollowUpCount: number;
  managerSideActive: boolean;
  activeProject: ActiveProjectSignal | null;
}): string {
  if (args.overdueCount > 0) {
    return "期限を過ぎた予定があるので、まず shared timeline を開いて順番に整える日です。";
  }
  if (args.dueSoonCount > 0) {
    return "今週の会議と期限が近いので、先に予定を確認してから発信や準備に入る日です。";
  }
  if (args.shareableFollowUpCount > 0) {
    return "Manager から共有できる確認事項があるので、会議前に一度目を通しておく日です。";
  }
  if (args.activeProject?.achievedAt) {
    return "達成後の報告と次の準備を整える日です。";
  }
  if (args.managerSideActive) {
    return "裏側の進行も動いているので、今日は共有事項の整理を優先する日です。";
  }
  if (!args.activeProject) {
    return "次の project と日々の運営リズムを整える日です。";
  }
  if (args.activeProject.progressPct >= 70) {
    return "達成に向けた最後の後押しをつくる日です。";
  }
  if (args.activeProject.progressPct >= 30) {
    return "進捗共有と次の会議準備を重ねる日です。";
  }
  return "支援の理由と近況共有を整えて流れをつくる日です。";
}

function pushBriefingItem(
  items: CreatorDailyBriefingItem[],
  item: CreatorDailyBriefingItem
): void {
  if (items.some((current) => current.id === item.id)) return;
  items.push(item);
}

function buildAttentionItems(args: {
  plannerOverdueCount: number;
  plannerDueSoonCount: number;
  shareableFollowUpCount: number;
  riskNoteCount: number;
  managerSideActive: boolean;
  activeProject: ActiveProjectSignal | null;
}): CreatorDailyBriefingItem[] {
  const items: CreatorDailyBriefingItem[] = [];

  if (args.plannerOverdueCount > 0) {
    pushBriefingItem(items, {
      id: "planner-overdue",
      title: "期限を過ぎた予定から整える",
      body: "shared timeline に overdue が残っています。今日の最初に確認すると後の判断が軽くなります。",
      tone: "attention",
      actionKind: "PLANNER",
    });
  }

  if (args.plannerDueSoonCount > 0) {
    pushBriefingItem(items, {
      id: "planner-due-soon",
      title: "今週の会議と期限を先に確認する",
      body: "近日中の予定があるので、先に timeline を見て段取りをそろえるのが安全です。",
      tone: "recommended",
      actionKind: "PLANNER",
    });
  }

  if (args.shareableFollowUpCount > 0) {
    pushBriefingItem(items, {
      id: "shareable-follow-up",
      title: "Manager からの共有事項を確認する",
      body: "共有可能な follow-up が残っています。会議前に目を通すと判断が早くなります。",
      tone: "recommended",
      actionKind: "PLANNER",
    });
  }

  if (args.activeProject?.achievedAt) {
    pushBriefingItem(items, {
      id: "project-achieved",
      title: "達成後の報告と次の準備を進める",
      body: "goal 達成後の整理フェーズです。報告や次の project 準備を並行して進めましょう。",
      tone: "recommended",
      actionKind: "PROJECT",
    });
  } else if (args.activeProject && args.activeProject.progressPct >= 70) {
    pushBriefingItem(items, {
      id: "project-last-push",
      title: "最後の後押しをつくる",
      body: `${args.activeProject.title} は達成が見えてきています。告知と会議準備を先に整える価値があります。`,
      tone: "recommended",
      actionKind: "PROJECT",
    });
  } else if (args.activeProject && args.activeProject.progressPct > 0) {
    pushBriefingItem(items, {
      id: "project-progress-share",
      title: "進捗と使い道を短く共有する",
      body: `${args.activeProject.title} の進み方をひと言で伝えると、次の支援や会議が進めやすくなります。`,
      tone: "neutral",
      actionKind: "AI_OFFICE",
    });
  }

  if (args.riskNoteCount > 0 && items.length < 3) {
    pushBriefingItem(items, {
      id: "shareable-risk",
      title: "共有済みの注意点を先に確認する",
      body: "会議や進行に関わる注意点が共有されています。先に把握しておくと今日の判断が安定します。",
      tone: "attention",
      actionKind: "PLANNER",
    });
  }

  if (args.managerSideActive && items.length < 3) {
    pushBriefingItem(items, {
      id: "manager-side-active",
      title: "共有事項を AI 事務所で整理する",
      body: "裏側の進行も動いています。今日の会議や共有事項を短くまとめておくと噛み合いやすくなります。",
      tone: "neutral",
      actionKind: "AI_OFFICE",
    });
  }

  if (items.length === 0) {
    pushBriefingItem(items, {
      id: "ai-office-next-step",
      title: "AI事務所で今日の一手を決める",
      body: "強いアラートはありません。次の一手を短く整理して、進めるものを 1 つ決めましょう。",
      tone: "neutral",
      actionKind: "AI_OFFICE",
    });
  }

  return items.slice(0, 3);
}

export async function getCreatorDailyBriefing(args: {
  creatorProfileId: bigint;
}): Promise<CreatorDailyBriefingData | null> {
  const now = new Date();

  const [creator, projects, contributionRows, planner, shareableFollowUpCount, riskNoteCount, contactActionCount] =
    await Promise.all([
      prisma.creatorProfile.findUnique({
        where: { id: args.creatorProfileId },
        select: {
          id: true,
          activeProjectIdJpyc: true,
          activeProjectIdUsdc: true,
        },
      }),
      prisma.project.findMany({
        where: {
          creatorProfileId: args.creatorProfileId,
        },
        select: {
          id: true,
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
      getPlannerTimeline({
        creatorProfileId: args.creatorProfileId,
        actorMode: "CREATOR_HOME",
        limit: 6,
      }),
      prisma.managerNote.count({
        where: {
          creatorProfileId: args.creatorProfileId,
          isArchived: false,
          visibility: "SHAREABLE_WITH_CREATOR",
          followUpNeeded: true,
        },
      }),
      prisma.managerNote.count({
        where: {
          creatorProfileId: args.creatorProfileId,
          isArchived: false,
          visibility: "SHAREABLE_WITH_CREATOR",
          noteType: "RISK",
        },
      }),
      prisma.externalContact.count({
        where: {
          creatorProfileId: args.creatorProfileId,
          isArchived: false,
          OR: [{ nextAction: { not: null } }, { nextActionDueAt: { not: null } }],
        },
      }),
    ]);

  if (!creator) return null;

  const totalsByProject = toProjectTotalsMap(contributionRows as ContributionTotalRow[]);
  const activeProject = toActiveProjectSignal(
    selectPreferredProject(creator, projects as ProjectRow[]),
    totalsByProject
  );
  const managerSideActive = contactActionCount > 0;
  const focusTheme = buildFocusTheme({
    overdueCount: planner.summary.overdueCount,
    dueSoonCount: planner.summary.dueSoonCount,
    shareableFollowUpCount,
    managerSideActive,
    activeProject,
  });
  const attentionItems = buildAttentionItems({
    plannerOverdueCount: planner.summary.overdueCount,
    plannerDueSoonCount: planner.summary.dueSoonCount,
    shareableFollowUpCount,
    riskNoteCount,
    managerSideActive,
    activeProject,
  });

  return {
    creatorProfileId: creator.id.toString(),
    focusTheme,
    summaryLine:
      attentionItems[0]?.body ??
      "大きなアラートはありません。shared timeline と進捗を見て今日の一手を決めましょう。",
    attentionItems,
    signals: {
      overdueCount: planner.summary.overdueCount,
      dueSoonCount: planner.summary.dueSoonCount,
      shareableFollowUpCount,
      riskNoteCount,
      contactActionCount,
      managerSideActive,
    },
    generatedAt: now.toISOString(),
  };
}
