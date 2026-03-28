import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";

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

type AchievedGoalRow = {
  achievedAt: Date | null;
  projectId: bigint;
  project: {
    title: string;
    currency: string;
  };
};

type PurposeRow = {
  id: bigint;
  projectId: bigint;
  label: string;
};

type ContributionByPurposeRow = {
  projectId: bigint;
  purposeId: bigint | null;
  _count: { _all: number };
  _sum: { amountDecimal: Prisma.Decimal | null };
};

type ContributorAggregateRow = {
  projectId: bigint;
  fromAddress: string;
  _count: { _all: number };
};

type DistributionRunAggregateRow = {
  projectId: bigint;
  _count: { _all: number };
};

function buildPurposeLabelsByProject(
  purposes: PurposeRow[]
): Map<string, Map<string, string>> {
  const purposeLabelsByProject = new Map<string, Map<string, string>>();

  for (const purpose of purposes) {
    const projectKey = purpose.projectId.toString();
    const current = purposeLabelsByProject.get(projectKey) ?? new Map<string, string>();
    current.set(purpose.id.toString(), purpose.label);
    purposeLabelsByProject.set(projectKey, current);
  }

  return purposeLabelsByProject;
}

function buildPurposeBreakdownByProject(
  rows: ContributionByPurposeRow[],
  purposeLabelsByProject: Map<string, Map<string, string>>
): Map<string, { purposeBreakdown: PurposeImpactItem[]; totalConfirmedAmount: number }> {
  const breakdownByProject = new Map<
    string,
    { purposeBreakdown: PurposeImpactItem[]; totalConfirmedAmount: number }
  >();

  for (const row of rows) {
    const projectKey = row.projectId.toString();
    const amount = row._sum.amountDecimal ? Number(row._sum.amountDecimal) : 0;
    if (amount === 0 && row._count._all === 0) continue;

    const current = breakdownByProject.get(projectKey) ?? {
      purposeBreakdown: [],
      totalConfirmedAmount: 0,
    };

    const purposeLabel =
      row.purposeId === null
        ? "用途未割当て"
        : purposeLabelsByProject.get(projectKey)?.get(row.purposeId.toString()) ?? "その他";

    current.purposeBreakdown.push({
      purposeLabel,
      confirmedAmount: amount,
      contributionCount: row._count._all,
    });
    current.totalConfirmedAmount += amount;
    breakdownByProject.set(projectKey, current);
  }

  for (const entry of breakdownByProject.values()) {
    entry.purposeBreakdown.sort((a, b) => b.confirmedAmount - a.confirmedAmount);
  }

  return breakdownByProject;
}

function buildContributorCountByProject(
  rows: ContributorAggregateRow[]
): Map<string, number> {
  const contributorCountByProject = new Map<string, number>();

  for (const row of rows) {
    const projectKey = row.projectId.toString();
    contributorCountByProject.set(
      projectKey,
      (contributorCountByProject.get(projectKey) ?? 0) + 1
    );
  }

  return contributorCountByProject;
}

function buildDistributionRunCountByProject(
  rows: DistributionRunAggregateRow[]
): Map<string, number> {
  const distributionRunCountByProject = new Map<string, number>();

  for (const row of rows) {
    distributionRunCountByProject.set(row.projectId.toString(), row._count._all);
  }

  return distributionRunCountByProject;
}

function countPostsInWindow(
  postDates: Date[],
  achievedAt: Date,
  nextAchievedAt: Date | null
): number {
  let count = 0;

  for (const postDate of postDates) {
    if (postDate < achievedAt) {
      continue;
    }

    if (nextAchievedAt && postDate >= nextAchievedAt) {
      break;
    }

    count += 1;
  }

  return count;
}

async function getAllGoalAchievementImpactsUncached(
  creatorProfileId: bigint
): Promise<GoalAchievementImpact[]> {
  try {
    const achievedGoals: AchievedGoalRow[] = await withPrismaRetry(() =>
      prisma.goal.findMany({
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
      })
    );

    if (achievedGoals.length === 0) return [];

    const projectIds = achievedGoals.map((goal) => goal.projectId);
    const [purposes, contributionsByPurpose, contributorAggregate, distributionRuns, posts] =
      await withPrismaRetry(() =>
        prisma.$transaction([
          prisma.purpose.findMany({
            where: { projectId: { in: projectIds } },
            select: { id: true, projectId: true, label: true },
            orderBy: [{ projectId: "asc" }, { orderIndex: "asc" }],
          }),
          prisma.contribution.groupBy({
            by: ["projectId", "purposeId"],
            where: { projectId: { in: projectIds }, status: "CONFIRMED" },
            _count: { _all: true },
            _sum: { amountDecimal: true },
          }),
          prisma.contribution.groupBy({
            by: ["projectId", "fromAddress"],
            where: { projectId: { in: projectIds }, status: "CONFIRMED" },
            _count: { _all: true },
          }),
          prisma.distributionRun.groupBy({
            by: ["projectId"],
            where: { projectId: { in: projectIds } },
            _count: { _all: true },
          }),
          prisma.post.findMany({
            where: { creatorProfileId, status: "PUBLIC" },
            select: { createdAt: true },
            orderBy: { createdAt: "asc" },
          }),
        ])
      );

    const purposeLabelsByProject = buildPurposeLabelsByProject(purposes);
    const purposeBreakdownByProject = buildPurposeBreakdownByProject(
      contributionsByPurpose,
      purposeLabelsByProject
    );
    const contributorCountByProject = buildContributorCountByProject(
      contributorAggregate
    );
    const distributionRunCountByProject = buildDistributionRunCountByProject(
      distributionRuns
    );
    const postDates = posts.map((post) => post.createdAt);

    const impacts: GoalAchievementImpact[] = [];
    for (let idx = 0; idx < achievedGoals.length; idx++) {
      const goal = achievedGoals[idx];
      const nextGoal = achievedGoals[idx - 1];
      if (!goal.achievedAt) continue;

      const projectKey = goal.projectId.toString();
      const purposeData = purposeBreakdownByProject.get(projectKey);

      impacts.push({
        goalLabel: goal.project.title,
        achievedAt: goal.achievedAt.toISOString(),
        currency: goal.project.currency,
        purposeBreakdown: purposeData?.purposeBreakdown ?? [],
        totalConfirmedAmount: purposeData?.totalConfirmedAmount ?? 0,
        totalContributors: contributorCountByProject.get(projectKey) ?? 0,
        distributionRunCount: distributionRunCountByProject.get(projectKey) ?? 0,
        activityPostCount: countPostsInWindow(
          postDates,
          goal.achievedAt,
          nextGoal?.achievedAt ?? null
        ),
      });
    }

    return impacts;
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return [];
    }
    throw error;
  }
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
