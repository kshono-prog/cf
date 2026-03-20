import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { decimalToAmountByCurrency } from "@/lib/currencyUtils";
import { prisma } from "@/lib/prisma";
import {
  isPrismaUnavailableError,
  withPrismaRetry,
} from "@/lib/prismaRetry";
import {
  PUBLIC_CLOSED_PROJECT_STATUSES,
} from "@/lib/recruitingProjects";
import {
  buildSupportProjectView,
  type SupportProjectView,
} from "@/lib/supportProfileView";

export type DiscoverCreator = {
  username: string;
  displayName: string;
  profile: string | null;
  avatarUrl: string | null;
  recruitingProjects: SupportProjectView[];
};

type CreatorRow = {
  id: bigint;
  username: string;
  displayName: string | null;
  profileText: string | null;
  avatarUrl: string | null;
};

type ProjectRow = {
  id: bigint;
  creatorProfileId: bigint;
  title: string;
  description: string | null;
  currency: "JPYC" | "USDC";
  goal: {
    targetAmount: number | null;
    targetAmountJpyc: number | null;
    achievedAt: Date | null;
    deadline: Date | null;
  } | null;
};

type RawProjectRow = {
  id: bigint;
  creatorProfileId: bigint | null;
  title: string;
  description: string | null;
  currency: string;
  goal: {
    targetAmount: number | null;
    targetAmountJpyc: number | null;
    achievedAt: Date | null;
    deadline: Date | null;
  } | null;
};

type ContributionGroupRow = {
  projectId: bigint;
  currency: "JPYC" | "USDC";
  _sum: { amountDecimal: Prisma.Decimal | null };
};

const ZERO_DECIMAL = new Prisma.Decimal(0);

function toDiscoverCreator(
  row: CreatorRow,
  recruitingProjects: SupportProjectView[]
): DiscoverCreator {
  return {
    username: row.username,
    displayName: row.displayName ?? row.username,
    profile: row.profileText ?? null,
    avatarUrl: row.avatarUrl ?? null,
    recruitingProjects,
  };
}

function buildProjectTotals(
  rows: ContributionGroupRow[]
): Map<string, { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }> {
  const totalsByProject = new Map<
    string,
    { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }
  >();

  for (const row of rows) {
    const projectKey = row.projectId.toString();
    const current = totalsByProject.get(projectKey) ?? {
      JPYC: ZERO_DECIMAL,
      USDC: ZERO_DECIMAL,
    };

    current[row.currency] = row._sum.amountDecimal ?? ZERO_DECIMAL;
    totalsByProject.set(projectKey, current);
  }

  return totalsByProject;
}

async function loadContributionTotalsForProjects(
  projectIds: bigint[]
): Promise<ContributionGroupRow[]> {
  if (projectIds.length === 0) return [];

  const rows = await withPrismaRetry(() =>
    prisma.contribution.groupBy({
      by: ["projectId", "currency"],
      where: {
        projectId: { in: projectIds },
        status: "CONFIRMED",
      },
      _sum: { amountDecimal: true },
    })
  );

  return rows.filter(
    (
      row
    ): row is {
      projectId: bigint;
      currency: "JPYC" | "USDC";
      _sum: { amountDecimal: Prisma.Decimal | null };
    } => row.currency === "JPYC" || row.currency === "USDC"
  );
}

function buildRecruitingProjectsByCreator(
  projectRows: ProjectRow[],
  totalsByProject: Map<string, { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }>
): Map<string, SupportProjectView[]> {
  const projectsByCreator = new Map<string, SupportProjectView[]>();

  for (const project of projectRows) {
    if (project.goal?.achievedAt) continue;

    const projectKey = project.id.toString();
    const creatorKey = project.creatorProfileId.toString();
    const totals = totalsByProject.get(projectKey) ?? {
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

    const current = projectsByCreator.get(creatorKey) ?? [];
    current.push(
      buildSupportProjectView({
        projectId: projectKey,
        currency: project.currency,
        title: project.title,
        description: project.description,
        targetAmount,
        confirmedAmount,
        progressPct,
        achievedAt: null,
        deadline: project.goal?.deadline?.toISOString() ?? null,
      })
    );
    projectsByCreator.set(creatorKey, current);
  }

  return projectsByCreator;
}

function normalizeProjectRows(rows: RawProjectRow[]): ProjectRow[] {
  return rows.filter(
    (row): row is ProjectRow =>
      row.creatorProfileId !== null &&
      (row.currency === "JPYC" || row.currency === "USDC")
  );
}

async function getDiscoverCreatorsUncached(limit: number): Promise<DiscoverCreator[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 30);

  const rows = await withPrismaRetry(() =>
    prisma.creatorProfile.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
      select: {
        id: true,
        username: true,
        displayName: true,
        profileText: true,
        avatarUrl: true,
      },
    })
  );

  if (rows.length === 0) return [];

  try {
    const creatorIds = rows.map((row) => row.id);
    const rawProjectRows = await withPrismaRetry(() =>
      prisma.project.findMany({
        where: {
          creatorProfileId: { in: creatorIds },
          status: { notIn: Array.from(PUBLIC_CLOSED_PROJECT_STATUSES) },
          currency: { in: ["JPYC", "USDC"] },
        },
        select: {
          id: true,
          creatorProfileId: true,
          title: true,
          description: true,
          currency: true,
          goal: {
            select: {
              targetAmount: true,
              targetAmountJpyc: true,
              achievedAt: true,
              deadline: true,
            },
          },
        },
        orderBy: [{ creatorProfileId: "asc" }, { createdAt: "desc" }],
      })
    );

    const projectRows = normalizeProjectRows(rawProjectRows);
    const contributionRows = await loadContributionTotalsForProjects(
      projectRows.map((project) => project.id)
    );

    const totalsByProject = buildProjectTotals(contributionRows);
    const projectsByCreator = buildRecruitingProjectsByCreator(
      projectRows,
      totalsByProject
    );

    return rows.map((row) =>
      toDiscoverCreator(
        row,
        projectsByCreator.get(row.id.toString()) ?? []
      )
    );
  } catch (error) {
    if (!isPrismaUnavailableError(error)) {
      throw error;
    }

    console.warn("Falling back to lightweight discover creator payloads");
    return rows.map((row) => toDiscoverCreator(row, []));
  }
}

const getDiscoverCreatorsCached = unstable_cache(
  async (limit: number) => getDiscoverCreatorsUncached(limit),
  ["discover-creators-v4"],
  { revalidate: 60 }
);

export async function getDiscoverCreators(limit: number): Promise<DiscoverCreator[]> {
  return getDiscoverCreatorsCached(limit);
}
