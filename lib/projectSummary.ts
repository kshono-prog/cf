import { Prisma } from "@prisma/client";

import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import {
  toCurrency,
  decToString,
  decimalToAmountByCurrency,
  type CurrencyCode,
} from "@/lib/currencyUtils";

type Currency = CurrencyCode;

export async function getProjectSummaryView(
  projectId: bigint
): Promise<SummaryViewData | null> {
  const [project, sumByCurrency] = await Promise.all([
    withPrismaRetry(() =>
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          goal: true,
          purposes: true,
          bridgeRuns: { orderBy: { createdAt: "desc" }, take: 5 },
          distributionRuns: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      })
    ),
    withPrismaRetry(() =>
      prisma.contribution.groupBy({
        by: ["currency"],
        where: { projectId, status: "CONFIRMED" },
        _sum: { amountDecimal: true },
      })
    ),
  ]);

  if (!project) return null;

  const projectCurrency = toCurrency(project.currency);
  if (!projectCurrency) {
    throw new Error("PROJECT_CURRENCY_INVALID");
  }

  const totalConfirmed: Record<Currency, Prisma.Decimal> = {
    JPYC: new Prisma.Decimal(0),
    USDC: new Prisma.Decimal(0),
  };

  for (const row of sumByCurrency) {
    const cur = row.currency as Currency;
    const s = row._sum.amountDecimal ?? new Prisma.Decimal(0);
    if (cur === "JPYC" || cur === "USDC") totalConfirmed[cur] = s;
  }

  const confirmedCurrencyInt = decimalToAmountByCurrency(
    projectCurrency,
    totalConfirmed[projectCurrency]
  );
  const targetAmount =
    project.goal?.targetAmount ?? project.goal?.targetAmountJpyc ?? null;

  const progressPct =
    targetAmount && targetAmount > 0
      ? Math.min(100, (confirmedCurrencyInt / targetAmount) * 100)
      : 0;

  return {
    project: {
      id: project.id.toString(),
      title: project.title,
      description: project.description ?? null,
      status: project.status,
      currency: project.currency === "USDC" ? "USDC" : "JPYC",
      purposeMode: project.purposeMode,
      ownerAddress: project.ownerAddress ?? null,
      creatorProfileId: project.creatorProfileId?.toString() ?? null,
      bridgedAt: project.bridgedAt ? project.bridgedAt.toISOString() : null,
      distributedAt: null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    goal: project.goal
      ? {
          id: project.goal.id.toString(),
          unitCurrency: projectCurrency,
          targetAmount: project.goal.targetAmount ?? project.goal.targetAmountJpyc,
          targetAmountJpyc:
            project.goal.targetAmount ?? project.goal.targetAmountJpyc,
          achievedAt: project.goal.achievedAt
            ? project.goal.achievedAt.toISOString()
            : null,
          deadline: project.goal.deadline
            ? project.goal.deadline.toISOString()
            : null,
        }
      : null,
    progress: {
      currency: projectCurrency,
      confirmedAmount: confirmedCurrencyInt,
      confirmedJpyc: confirmedCurrencyInt,
      confirmedTotal: confirmedCurrencyInt,
      confirmedByCurrency: {
        JPYC: projectCurrency === "JPYC" ? confirmedCurrencyInt : 0,
        USDC: projectCurrency === "USDC" ? confirmedCurrencyInt : 0,
      },
      targetAmount,
      targetJpyc: targetAmount,
      progressPct,
      totals: {
        JPYC: decToString(totalConfirmed.JPYC),
        USDC: decToString(totalConfirmed.USDC),
      },
    },
    distributionPlan: project.distributionPlan,
    lastBridgeRuns: project.bridgeRuns.map((r) => ({
      id: r.id.toString(),
      mode: r.mode,
      currency: r.currency,
      dryRun: r.dryRun,
      force: r.force,
      createdAt: r.createdAt.toISOString(),
      dbConfirmedTotalAmountDecimal: r.dbConfirmedTotalAmountDecimal ?? null,
    })),
    lastDistributionRuns: project.distributionRuns.map((r) => ({
      id: r.id.toString(),
      mode: r.mode,
      chainId: r.chainId,
      currency: r.currency,
      dryRun: r.dryRun,
      createdAt: r.createdAt.toISOString(),
      txHashes: r.txHashes,
    })),
  };
}
