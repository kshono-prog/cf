import { Prisma } from "@prisma/client";

import { decimalToAmountByCurrency } from "@/lib/currencyUtils";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import type { PublicSummaryLite } from "@/lib/publicSummary";
import { PUBLIC_CLOSED_PROJECT_STATUSES } from "@/lib/recruitingProjects";
import {
  buildSupportProjectView,
  type SupportProfileView,
  type SupportProjectView,
} from "@/lib/supportProfileView";
import type { CreatorProfile } from "@/types/creator";

type PublicProfileProjectData = {
  projectId: string | null;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  publicSummary: PublicSummaryLite | null;
  supportProfileView: SupportProfileView;
  recruitingProjects: SupportProjectView[];
};

type ProjectRow = {
  id: bigint;
  creatorProfileId: bigint | null;
  title: string;
  description: string | null;
  currency: "JPYC" | "USDC";
  status: string;
  createdAt: Date;
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
  status: string;
  createdAt: Date;
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

function normalizeProjectRows(rows: RawProjectRow[]): ProjectRow[] {
  return rows.filter(
    (row): row is ProjectRow =>
      row.creatorProfileId !== null &&
      (row.currency === "JPYC" || row.currency === "USDC")
  );
}

function selectProjectByCurrency(args: {
  projects: ProjectRow[];
  preferredId: string | null;
  currency: "JPYC" | "USDC";
}): ProjectRow | null {
  const projectsForCurrency = args.projects.filter(
    (project) => project.currency === args.currency
  );
  if (projectsForCurrency.length === 0) return null;

  if (args.preferredId) {
    const preferred = projectsForCurrency.find(
      (project) => project.id.toString() === args.preferredId
    );
    if (preferred) return preferred;
  }

  return projectsForCurrency[0] ?? null;
}

function buildContributionTotals(
  rows: ContributionGroupRow[]
): Map<string, { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }> {
  const totals = new Map<string, { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }>();

  for (const row of rows) {
    const key = row.projectId.toString();
    const current = totals.get(key) ?? {
      JPYC: ZERO_DECIMAL,
      USDC: ZERO_DECIMAL,
    };
    current[row.currency] = row._sum.amountDecimal ?? ZERO_DECIMAL;
    totals.set(key, current);
  }

  return totals;
}

async function loadContributionTotals(
  projectIds: bigint[]
): Promise<Map<string, { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }>> {
  if (projectIds.length === 0) return new Map();

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

  const supportedRows = rows.filter(
    (
      row
    ): row is {
      projectId: bigint;
      currency: "JPYC" | "USDC";
      _sum: { amountDecimal: Prisma.Decimal | null };
    } => row.currency === "JPYC" || row.currency === "USDC"
  );

  return buildContributionTotals(supportedRows);
}

function buildProjectView(
  project: ProjectRow,
  totals: Map<string, { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }>
): SupportProjectView {
  const projectTotals = totals.get(project.id.toString()) ?? {
    JPYC: ZERO_DECIMAL,
    USDC: ZERO_DECIMAL,
  };
  const confirmedAmount = decimalToAmountByCurrency(
    project.currency,
    projectTotals[project.currency]
  );
  const targetAmount =
    project.goal?.targetAmount ?? project.goal?.targetAmountJpyc ?? null;
  const progressPct =
    targetAmount && targetAmount > 0
      ? Math.min(100, (confirmedAmount / targetAmount) * 100)
      : 0;

  return buildSupportProjectView({
    projectId: project.id.toString(),
    currency: project.currency,
    title: project.title,
    description: project.description,
    targetAmount,
    confirmedAmount,
    progressPct,
    achievedAt: project.goal?.achievedAt?.toISOString() ?? null,
    deadline: project.goal?.deadline?.toISOString() ?? null,
  });
}

function buildSupportProfile(args: {
  creator: Pick<CreatorProfile, "displayName" | "profile">;
  primaryProjectId: string | null;
  projectsByCurrency: { JPYC: SupportProjectView | null; USDC: SupportProjectView | null };
}): SupportProfileView {
  const readyCurrencies = (["JPYC", "USDC"] as const).filter(
    (currency) => args.projectsByCurrency[currency] !== null
  );

  if (readyCurrencies.length > 0) {
    const activeCurrency =
      (["JPYC", "USDC"] as const).find(
        (currency) =>
          args.projectsByCurrency[currency]?.projectId === args.primaryProjectId
      ) ?? readyCurrencies[0];

    return {
      mode: "ready",
      activeCurrency,
      activeProjectId: args.projectsByCurrency[activeCurrency]?.projectId ?? null,
      projectsByCurrency: args.projectsByCurrency,
      draft: null,
    };
  }

  if (
    typeof args.creator.displayName === "string" ||
    typeof args.creator.profile === "string"
  ) {
    return {
      mode: "draft",
      activeCurrency: null,
      activeProjectId: null,
      projectsByCurrency: args.projectsByCurrency,
      draft: {
        title: args.creator.displayName
          ? `${args.creator.displayName}の公開ページは準備中です`
          : null,
        description: args.creator.profile ?? null,
      },
    };
  }

  return {
    mode: "unavailable",
    activeCurrency: null,
    activeProjectId: null,
    projectsByCurrency: args.projectsByCurrency,
    draft: null,
  };
}

function buildPublicSummary(project: SupportProjectView | null): PublicSummaryLite | null {
  if (!project) return null;

  return {
    goal:
      project.targetAmount != null || project.achievedAt || project.deadline
        ? {
            targetAmount: project.targetAmount ?? 0,
            achievedAt: project.achievedAt,
            deadline: project.deadline,
          }
        : null,
    progress: {
      confirmedAmount: project.confirmedAmount,
      targetAmount: project.targetAmount,
      progressPct: project.progressPct,
    },
  };
}

export async function loadPublicProfileProjectData(args: {
  creatorProfileId: bigint;
  activeProjectIdJpyc: string | null;
  activeProjectIdUsdc: string | null;
  creator: Pick<CreatorProfile, "displayName" | "profile">;
}): Promise<PublicProfileProjectData> {
  const rawProjects = await withPrismaRetry(() =>
    prisma.project.findMany({
      where: {
        creatorProfileId: args.creatorProfileId,
        currency: { in: ["JPYC", "USDC"] },
      },
      select: {
        id: true,
        creatorProfileId: true,
        title: true,
        description: true,
        currency: true,
        status: true,
        createdAt: true,
        goal: {
          select: {
            targetAmount: true,
            targetAmountJpyc: true,
            achievedAt: true,
            deadline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );

  const projects = normalizeProjectRows(rawProjects);
  const totals = await loadContributionTotals(projects.map((project) => project.id));

  const selectedJpyc = selectProjectByCurrency({
    projects,
    preferredId: args.activeProjectIdJpyc,
    currency: "JPYC",
  });
  const selectedUsdc = selectProjectByCurrency({
    projects,
    preferredId: args.activeProjectIdUsdc,
    currency: "USDC",
  });

  const projectsByCurrency = {
    JPYC: selectedJpyc ? buildProjectView(selectedJpyc, totals) : null,
    USDC: selectedUsdc ? buildProjectView(selectedUsdc, totals) : null,
  };
  const projectIdsByCurrency = {
    JPYC: selectedJpyc?.id.toString() ?? null,
    USDC: selectedUsdc?.id.toString() ?? null,
  };
  const projectId = projectIdsByCurrency.JPYC ?? projectIdsByCurrency.USDC ?? null;
  const activeProject =
    (projectId && projectsByCurrency.JPYC?.projectId === projectId
      ? projectsByCurrency.JPYC
      : null) ??
    (projectId && projectsByCurrency.USDC?.projectId === projectId
      ? projectsByCurrency.USDC
      : null);

  const recruitingProjects = projects
    .filter(
      (project) =>
        !PUBLIC_CLOSED_PROJECT_STATUSES.has(project.status) &&
        project.goal?.achievedAt == null
    )
    .map((project) => buildProjectView(project, totals));

  return {
    projectId,
    projectIdsByCurrency,
    publicSummary: buildPublicSummary(activeProject),
    supportProfileView: buildSupportProfile({
      creator: args.creator,
      primaryProjectId: projectId,
      projectsByCurrency,
    }),
    recruitingProjects,
  };
}
