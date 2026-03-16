import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import {
  buildSupportProjectView,
  type SupportProjectView,
} from "@/lib/supportProfileView";

export const PUBLIC_CLOSED_PROJECT_STATUSES = new Set<string>([
  "ARCHIVED",
  "BRIDGED",
  "COMPLETED",
  "GOAL_ACHIEVED",
  "READY_TO_BRIDGE",
]);

const ZERO_DECIMAL = new Prisma.Decimal(0);

function decimalToAmountByCurrency(
  currency: "JPYC" | "USDC",
  amountDecimal: Prisma.Decimal | null
): number {
  if (!amountDecimal) return 0;

  if (currency === "USDC") {
    const n = Number(amountDecimal.toString());
    if (!Number.isFinite(n)) return 0;
    return Number(n.toFixed(2));
  }

  const s = amountDecimal.toString();
  const [i] = s.split(".");
  const n = Number(i || "0");
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export async function loadRecruitingProjectViews(args: {
  creatorProfileId: bigint;
  ownerAddress?: string | null;
}): Promise<SupportProjectView[]> {
  const projectWhereOr: Array<
    { creatorProfileId: bigint } | { ownerAddress: string }
  > = [{ creatorProfileId: args.creatorProfileId }];

  if (args.ownerAddress) {
    projectWhereOr.push({ ownerAddress: args.ownerAddress.toLowerCase() });
  }

  const projectRows = await withPrismaRetry(() =>
    prisma.project.findMany({
      where: {
        OR: projectWhereOr,
        status: {
          notIn: Array.from(PUBLIC_CLOSED_PROJECT_STATUSES),
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        currency: true,
        goal: {
          select: {
            targetAmountJpyc: true,
            achievedAt: true,
            deadline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );

  const supportedProjects = projectRows.filter(
    (
      project
    ): project is typeof project & {
      currency: "JPYC" | "USDC";
    } => project.currency === "JPYC" || project.currency === "USDC"
  );

  if (supportedProjects.length === 0) {
    return [];
  }

  const contributionRows = await withPrismaRetry(() =>
    prisma.contribution.groupBy({
      by: ["projectId", "currency"],
      where: {
        projectId: { in: supportedProjects.map((project) => project.id) },
        status: "CONFIRMED",
      },
      _sum: { amountDecimal: true },
    })
  );

  const totalsByProject = new Map<
    string,
    { JPYC: Prisma.Decimal; USDC: Prisma.Decimal }
  >();

  for (const row of contributionRows) {
    if (row.currency !== "JPYC" && row.currency !== "USDC") {
      continue;
    }

    const projectKey = row.projectId.toString();
    const current = totalsByProject.get(projectKey) ?? {
      JPYC: ZERO_DECIMAL,
      USDC: ZERO_DECIMAL,
    };

    current[row.currency] = row._sum.amountDecimal ?? ZERO_DECIMAL;
    totalsByProject.set(projectKey, current);
  }

  return supportedProjects
    .filter((project) => project.goal?.achievedAt == null)
    .map((project) => {
      const currency = project.currency;
      const totals = totalsByProject.get(project.id.toString()) ?? {
        JPYC: ZERO_DECIMAL,
        USDC: ZERO_DECIMAL,
      };
      const confirmedAmount = decimalToAmountByCurrency(
        currency,
        totals[currency]
      );
      const targetAmount = project.goal?.targetAmountJpyc ?? null;
      const progressPct =
        targetAmount && targetAmount > 0
          ? Math.min(100, (confirmedAmount / targetAmount) * 100)
          : 0;

      return buildSupportProjectView({
        projectId: project.id.toString(),
        currency,
        title: project.title,
        description: project.description ?? null,
        targetAmount,
        confirmedAmount,
        progressPct,
        achievedAt: null,
        deadline: project.goal?.deadline?.toISOString() ?? null,
      });
    });
}
