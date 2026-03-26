import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  GrowthCompletedItem,
  GrowthImprovementItem,
  GrowthOngoingItem,
  GrowthReflectionData,
} from "@/lib/operations/growthReflectionTypes";

const COMPLETED_ACTION_TYPES = new Set([
  "GOAL_ACHIEVED",
  "MEETING_COMPLETED",
  "TASK_COMPLETED",
  "AI_SUGGESTION_ACCEPTED",
]);

function labelForActionType(actionType: string): string {
  switch (actionType) {
    case "GOAL_ACHIEVED":
      return "目標達成";
    case "MEETING_COMPLETED":
      return "ミーティング完了";
    case "TASK_COMPLETED":
      return "タスク完了";
    case "AI_SUGGESTION_ACCEPTED":
      return "AI提案を採用";
    default:
      return actionType;
  }
}

function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function getGrowthReflection(args: {
  creatorProfileId: bigint;
}): Promise<GrowthReflectionData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);

  const [actionLogs, postCount, projects, meetingCount] = await Promise.all([
    prisma.actionLog.findMany({
      where: {
        creatorProfileId: args.creatorProfileId,
        occurredAt: { gte: monthStart },
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    prisma.post.count({
      where: {
        creatorProfileId: args.creatorProfileId,
        createdAt: { gte: monthStart },
        status: "PUBLISHED",
      },
    }),
    prisma.project.findMany({
      where: {
        creatorProfileId: args.creatorProfileId,
        status: { not: "ARCHIVED" },
      },
      include: {
        goal: true,
      },
    }),
    prisma.meeting.count({
      where: {
        creatorProfileId: args.creatorProfileId,
        scheduledAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  // Aggregate confirmed contributions per project
  const projectIds = projects.map((p) => p.id);
  const contributionSums =
    projectIds.length > 0
      ? await prisma.contribution.groupBy({
          by: ["projectId"],
          where: { projectId: { in: projectIds }, status: "CONFIRMED" },
          _sum: { amountDecimal: true },
        })
      : [];

  const confirmedByProjectId = new Map<bigint, Prisma.Decimal>();
  for (const row of contributionSums) {
    confirmedByProjectId.set(
      row.projectId,
      row._sum.amountDecimal ?? new Prisma.Decimal(0)
    );
  }

  function progressPctForProject(project: (typeof projects)[number]): number | null {
    const goal = project.goal;
    if (!goal) return null;
    const target = goal.targetAmount ?? goal.targetAmountJpyc;
    if (!target || target <= 0) return null;
    const confirmed = confirmedByProjectId.get(project.id) ?? new Prisma.Decimal(0);
    return Math.min(100, confirmed.toNumber() / target * 100);
  }

  // --- ongoing items ---
  const ongoing: GrowthOngoingItem[] = [];

  ongoing.push({
    label: "今月の投稿",
    value: `${postCount}件`,
    note: postCount > 0 ? "継続できています" : "今月はまだ投稿がありません",
  });

  const activeProjects = projects.filter((p) => p.goal !== null);
  if (activeProjects.length > 0) {
    const pcts = activeProjects
      .map((p) => progressPctForProject(p))
      .filter((v): v is number => v !== null);
    if (pcts.length > 0) {
      const avgPct = Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
      ongoing.push({
        label: "支援進捗 (平均)",
        value: `${avgPct}%`,
        note: avgPct >= 50 ? "折り返しを超えました" : "引き続き告知・拡散を",
      });
    }
  }

  if (meetingCount > 0) {
    ongoing.push({
      label: "直近30日のミーティング",
      value: `${meetingCount}回`,
      note: "チームとの連携が続いています",
    });
  }

  // --- completed items ---
  const completed: GrowthCompletedItem[] = actionLogs
    .filter((log) => COMPLETED_ACTION_TYPES.has(log.actionType))
    .slice(0, 6)
    .map((log) => ({
      label: labelForActionType(log.actionType),
      occurredAt: log.occurredAt.toISOString(),
      summary: log.summary ?? log.title ?? null,
    }));

  // --- improvements ---
  const improvements: GrowthImprovementItem[] = [];

  if (postCount === 0) {
    improvements.push({
      label: "今月の投稿を始める",
      reason:
        "今月はまだ公開投稿がありません。週1投稿を目安にファンへの発信を続けましょう。",
    });
  }

  if (activeProjects.length > 0) {
    const lowPctCount = activeProjects.filter((p) => {
      const pct = progressPctForProject(p);
      return pct !== null && pct < 10;
    }).length;
    if (lowPctCount > 0) {
      improvements.push({
        label: "支援告知を強化する",
        reason:
          "進捗が低い目標があります。SNS告知や支援ストーリーを活用して拡散しましょう。",
      });
    }
  }

  if (meetingCount === 0) {
    improvements.push({
      label: "定期振り返りを設定する",
      reason:
        "直近30日でミーティングの記録がありません。Manager との定期確認があると運営が安定します。",
    });
  }

  // --- stats ---
  let goalProgressPct: number | null = null;
  if (activeProjects.length > 0) {
    const pcts = activeProjects
      .map((p) => progressPctForProject(p))
      .filter((v): v is number => v !== null);
    if (pcts.length > 0) {
      goalProgressPct = Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length);
    }
  }

  const completedActionCount = actionLogs.filter((log) =>
    COMPLETED_ACTION_TYPES.has(log.actionType)
  ).length;
  const activeActionCount = actionLogs.filter(
    (log) => !COMPLETED_ACTION_TYPES.has(log.actionType)
  ).length;

  return {
    creatorProfileId: args.creatorProfileId.toString(),
    month: monthKey(now),
    ongoing,
    completed,
    improvements,
    stats: {
      postCountThisMonth: postCount,
      goalProgressPct,
      completedActionCount,
      activeActionCount,
    },
    generatedAt: now.toISOString(),
  };
}
