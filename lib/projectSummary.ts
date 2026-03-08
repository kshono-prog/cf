import { Prisma } from "@prisma/client";

import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";

type Currency = "JPYC" | "USDC";

function toCurrency(v: string): Currency | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function decToString(d: Prisma.Decimal | null | undefined): string | null {
  if (d == null) return null;
  return d.toString();
}

function decimalToAmountByCurrency(
  currency: Currency,
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

export async function getProjectSummaryView(
  projectId: bigint
): Promise<SummaryViewData | null> {
  const project = await withPrismaRetry(() =>
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        goal: true,
        purposes: true,
        bridgeRuns: { orderBy: { createdAt: "desc" }, take: 5 },
        distributionRuns: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    })
  );

  if (!project) return null;

  const projectCurrency = toCurrency(project.currency);
  if (!projectCurrency) {
    throw new Error("PROJECT_CURRENCY_INVALID");
  }

  const sumByCurrency = await withPrismaRetry(() =>
    prisma.contribution.groupBy({
      by: ["currency"],
      where: { projectId, status: "CONFIRMED" },
      _sum: { amountDecimal: true },
    })
  );

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
  const targetJpyc = project.goal?.targetAmountJpyc ?? null;

  const progressPct =
    targetJpyc && targetJpyc > 0
      ? Math.min(100, (confirmedCurrencyInt / targetJpyc) * 100)
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
          targetAmount: project.goal.targetAmountJpyc,
          targetAmountJpyc: project.goal.targetAmountJpyc,
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
      confirmedJpyc: confirmedCurrencyInt,
      confirmedTotal: confirmedCurrencyInt,
      confirmedByCurrency: {
        JPYC: projectCurrency === "JPYC" ? confirmedCurrencyInt : 0,
        USDC: projectCurrency === "USDC" ? confirmedCurrencyInt : 0,
      },
      targetAmount: targetJpyc,
      targetJpyc,
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
