import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export type PurposeImpactItem = {
  purposeLabel: string;
  confirmedAmount: number;
  contributionCount: number;
};

export type GoalAchievementImpact = {
  goalLabel: string;
  achievedAt: string;
  currency: string;
  purposeBreakdown: PurposeImpactItem[];
  totalConfirmedAmount: number;
  totalContributors: number;
  distributionRunCount: number;
  activityPostCount: number;
};

async function buildImpactForGoal(params: {
  creatorProfileId: bigint;
  projectId: bigint;
  projectTitle: string;
  currency: string;
  achievedAt: Date;
  nextAchievedAt: Date | null;
}): Promise<GoalAchievementImpact> {
  const { creatorProfileId, projectId, projectTitle, currency, achievedAt, nextAchievedAt } =
    params;

  const purposes = await prisma.purpose.findMany({
    where: { projectId },
    select: { id: true, label: true },
    orderBy: { orderIndex: "asc" },
  });

  const contributionsByPurpose = await prisma.contribution.groupBy({
    by: ["purposeId"],
    where: { projectId, status: "CONFIRMED" },
    _count: { _all: true },
    _sum: { amountDecimal: true },
  });

  const contributorAggregate = await prisma.contribution.groupBy({
    by: ["fromAddress"],
    where: { projectId, status: "CONFIRMED" },
    _count: { _all: true },
  });

  const distributionRunCount = await prisma.distributionRun.count({ where: { projectId } });

  const activityPostCount = await prisma.post.count({
    where: {
      creatorProfileId,
      status: "PUBLIC",
      createdAt: {
        gte: achievedAt,
        ...(nextAchievedAt ? { lt: nextAchievedAt } : {}),
      },
    },
  });

  const purposeMap = new Map(purposes.map((p) => [p.id, p.label]));

  const purposeBreakdown: PurposeImpactItem[] = [];
  let totalConfirmedAmount = 0;

  for (const c of contributionsByPurpose) {
    const amount = c._sum.amountDecimal ? Number(c._sum.amountDecimal) : 0;
    totalConfirmedAmount += amount;
    if (amount === 0 && c._count._all === 0) continue;
    if (c.purposeId === null) {
      purposeBreakdown.push({
        purposeLabel: "用途未割当て",
        confirmedAmount: amount,
        contributionCount: c._count._all,
      });
    } else {
      purposeBreakdown.push({
        purposeLabel: purposeMap.get(c.purposeId) ?? "その他",
        confirmedAmount: amount,
        contributionCount: c._count._all,
      });
    }
  }

  purposeBreakdown.sort((a, b) => b.confirmedAmount - a.confirmedAmount);

  return {
    goalLabel: projectTitle,
    achievedAt: achievedAt.toISOString(),
    currency,
    purposeBreakdown,
    totalConfirmedAmount,
    totalContributors: contributorAggregate.length,
    distributionRunCount,
    activityPostCount,
  };
}

async function getAllGoalAchievementImpactsUncached(
  creatorProfileId: bigint
): Promise<GoalAchievementImpact[]> {
  const achievedGoals = await prisma.goal.findMany({
    where: {
      project: { creatorProfileId },
      achievedAt: { not: null },
    },
    orderBy: { achievedAt: "desc" },
    select: {
      achievedAt: true,
      projectId: true,
      project: {
        select: { title: true, currency: true },
      },
    },
  });

  if (achievedGoals.length === 0) return [];

  // Process goals sequentially to avoid exhausting the single Prisma connection
  const impacts: GoalAchievementImpact[] = [];
  for (let idx = 0; idx < achievedGoals.length; idx++) {
    const goal = achievedGoals[idx];
    const nextGoal = achievedGoals[idx - 1]; // array is desc, so index-1 is newer
    impacts.push(
      await buildImpactForGoal({
        creatorProfileId,
        projectId: goal.projectId,
        projectTitle: goal.project.title,
        currency: goal.project.currency,
        achievedAt: goal.achievedAt!,
        nextAchievedAt: nextGoal?.achievedAt ?? null,
      })
    );
  }

  return impacts;
}

const _getAllGoalAchievementImpactsCached = unstable_cache(
  (idStr: string) => getAllGoalAchievementImpactsUncached(BigInt(idStr)),
  ["goal-achievement-impacts"],
  { revalidate: 120 }
);

export async function getAllGoalAchievementImpacts(
  creatorProfileId: bigint
): Promise<GoalAchievementImpact[]> {
  return _getAllGoalAchievementImpactsCached(creatorProfileId.toString());
}

/** @deprecated Use getAllGoalAchievementImpacts instead */
export async function getGoalAchievementImpact(
  creatorProfileId: bigint
): Promise<GoalAchievementImpact | null> {
  const all = await getAllGoalAchievementImpacts(creatorProfileId);
  return all[0] ?? null;
}
