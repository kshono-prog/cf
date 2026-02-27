/* app/api/projects/[projectId]/summary/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Params = { projectId: string };
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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        goal: true,
        purposes: true,
        bridgeRuns: { orderBy: { createdAt: "desc" }, take: 5 },
        distributionRuns: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    const projectCurrency = toCurrency(project.currency);
    if (!projectCurrency) return errJson("PROJECT_CURRENCY_INVALID", 400);

    const sumByCurrency = await prisma.contribution.groupBy({
      by: ["currency"],
      where: { projectId, status: "CONFIRMED" },
      _sum: { amountDecimal: true },
    });

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

    return okJson({
      project: {
        id: project.id.toString(),
        title: project.title,
        description: project.description ?? null,
        status: project.status,
        currency: project.currency,
        purposeMode: project.purposeMode,
        ownerAddress: project.ownerAddress ?? null,
        creatorProfileId: project.creatorProfileId?.toString() ?? null,
        bridgedAt: project.bridgedAt ? project.bridgedAt.toISOString() : null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      goal: project.goal
        ? {
            id: project.goal.id.toString(),
            projectId: project.goal.projectId.toString(),
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

      // ✅ Project.distributionPlan を追加した場合に使う
      // distributionPlan: project.distributionPlan,

      purposes: project.purposes.map((p) => ({
        id: p.id.toString(),
        projectId: p.projectId.toString(),
        code: p.code,
        label: p.label,
        description: p.description ?? null,
        targetAmount: p.targetAmount ?? null,
        orderIndex: p.orderIndex,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),

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
        planJson: r.planJson,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_SUMMARY_GET_FAILED", e);
    return errJson("PROJECT_SUMMARY_GET_FAILED", 500);
  }
}
