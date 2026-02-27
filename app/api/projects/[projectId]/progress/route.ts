/* app/api/projects/[projectId]/progress/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";

import {
  getSupportedViemChains,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chainConfig";
import { getTokenOnChain } from "@/lib/tokenRegistry";

export const dynamic = "force-dynamic";

type Currency = "JPYC" | "USDC";
type Params = { projectId: string };

function toCurrency(v: string): Currency | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function decToString(d: Prisma.Decimal | null | undefined): string | null {
  if (d == null) return null;
  return d.toString();
}

function bigToString(v: bigint | null | undefined): string | null {
  if (v == null) return null;
  return v.toString();
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

function getSupportedChainIdsForCurrency(currency: Currency): SupportedChainId[] {
  const chains = getSupportedViemChains();
  const ids = chains.map((c) => c.id).filter((id) => isSupportedChainId(id));
  return ids.filter((id) => getTokenOnChain(currency, id) != null);
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
      },
    });

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    const projectCurrency = toCurrency(project.currency);
    if (!projectCurrency) return errJson("PROJECT_CURRENCY_INVALID", 400);

    const supportedChainIds = getSupportedChainIdsForCurrency(projectCurrency);

    // ---- totals（参考：全チェーンの CONFIRMED 合算）----
    const sumByCurrencyAllChains = await prisma.contribution.groupBy({
      by: ["currency"],
      where: { projectId, status: "CONFIRMED" },
      _sum: { amountDecimal: true },
    });

    const totalsAllChains: Record<Currency, Prisma.Decimal> = {
      JPYC: new Prisma.Decimal(0),
      USDC: new Prisma.Decimal(0),
    };

    for (const row of sumByCurrencyAllChains) {
      const cur = row.currency as Currency;
      const s = row._sum.amountDecimal ?? new Prisma.Decimal(0);
      if (cur === "JPYC" || cur === "USDC") totalsAllChains[cur] = s;
    }

    // ---- goal 用：JPYC / USDC（対応チェーンのみ）CONFIRMED 合算 ----
    const sumSupported = await prisma.contribution.aggregate({
      where: {
        projectId,
        status: "CONFIRMED",
        currency: projectCurrency,
        chainId: { in: supportedChainIds },
      },
      _sum: { amountDecimal: true },
    });
    const confirmedCurrencyInt = decimalToAmountByCurrency(
      projectCurrency,
      sumSupported._sum.amountDecimal ?? null
    );

    // ---- チェーン別内訳（JPYC / USDC / 対応チェーン / CONFIRMED）----
    const sumByChain = await prisma.contribution.groupBy({
      by: ["chainId"],
      where: {
        projectId,
        status: "CONFIRMED",
        currency: projectCurrency,
        chainId: { in: supportedChainIds },
      },
      _sum: { amountDecimal: true },
    });
    const byChain = sumByChain
      .map((r) => ({
        chainId: r.chainId,
        confirmedAmountDecimal: decToString(r._sum.amountDecimal ?? null),
        confirmedAmountJpyc: decimalToAmountByCurrency(
          projectCurrency,
          r._sum.amountDecimal ?? null
        ),
      }))
      .sort((a, b) => b.confirmedAmountJpyc - a.confirmedAmountJpyc);

    // ---- purpose別（JPYCのみ / 対応チェーンのみ / CONFIRMED）----
    const sumByPurpose = await prisma.contribution.groupBy({
      by: ["purposeId"],
      where: {
        projectId,
        status: "CONFIRMED",
        currency: projectCurrency,
        chainId: { in: supportedChainIds },
      },
      _sum: { amountDecimal: true },
    });

    const purposeMeta = new Map<
      string,
      { id: bigint; code: string; label: string; description: string | null }
    >();

    for (const p of project.purposes) {
      purposeMeta.set(p.id.toString(), {
        id: p.id,
        code: p.code,
        label: p.label,
        description: p.description ?? null,
      });
    }

    const perPurpose = sumByPurpose
      .filter((r) => r.purposeId != null)
      .map((r) => {
        const pid = r.purposeId as bigint;
        const meta = purposeMeta.get(pid.toString());
        return {
          purposeId: pid.toString(),
          code: meta?.code ?? null,
          label: meta?.label ?? null,
          description: meta?.description ?? null,
          confirmedAmountDecimal: decToString(r._sum.amountDecimal ?? null),
          confirmedAmountJpyc: decimalToAmountByCurrency(
            projectCurrency,
            r._sum.amountDecimal ?? null
          ),
        };
      });

    // ---- purposeId=null（JPYCのみ / 対応チェーンのみ / CONFIRMED）----
    const sumNoPurpose = await prisma.contribution.aggregate({
      where: {
        projectId,
        status: "CONFIRMED",
        currency: projectCurrency,
        purposeId: null,
        chainId: { in: supportedChainIds },
      },
      _sum: { amountDecimal: true },
    });

    const noPurposeJpyc = decimalToAmountByCurrency(
      projectCurrency,
      sumNoPurpose._sum.amountDecimal ?? null
    );

    // ---- goal進捗（JPYC+USDC / 対応チェーン合算を正とする）----
    const goal = project.goal;
    const targetJpyc = goal?.targetAmountJpyc ?? null;

    const confirmedJpycInt = confirmedCurrencyInt;
    const progressPct =
      targetJpyc && targetJpyc > 0
        ? Math.min(100, (confirmedJpycInt / targetJpyc) * 100)
        : 0;

    return okJson({
      project: {
        id: project.id.toString(),
        status: project.status,
        title: project.title,
        description: project.description ?? null,
        purposeMode: project.purposeMode,
        creatorProfileId: bigToString(project.creatorProfileId),
        ownerAddress: project.ownerAddress ?? null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      goal: goal
        ? {
            id: goal.id.toString(),
            projectId: goal.projectId.toString(),
            unitCurrency: projectCurrency,
            targetAmount: goal.targetAmountJpyc,
            targetAmountJpyc: goal.targetAmountJpyc,
            deadline: goal.deadline ? goal.deadline.toISOString() : null,
            achievedAt: goal.achievedAt ? goal.achievedAt.toISOString() : null,
            settlementPolicy: goal.settlementPolicy,
            createdAt: goal.createdAt.toISOString(),
            updatedAt: goal.updatedAt.toISOString(),
          }
        : null,
      progress: {
        currency: projectCurrency,
        confirmedJpyc: confirmedJpycInt,
        confirmedTotal: confirmedJpycInt,
        confirmedByCurrency: {
          JPYC: projectCurrency === "JPYC" ? confirmedJpycInt : 0,
          USDC: projectCurrency === "USDC" ? confirmedJpycInt : 0,
        },
        targetAmount: targetJpyc,
        targetJpyc,
        progressPct,

        // 透明性（「どのチェーンを合算対象にしているか」）
        supportedChainIds,
        supportedJpycChainIds: supportedChainIds,
        supportedChainIdsByCurrency: {
          JPYC: projectCurrency === "JPYC" ? supportedChainIds : [],
          USDC: projectCurrency === "USDC" ? supportedChainIds : [],
        },

        // 合算 + 内訳（project currency / 対応チェーン / CONFIRMED）
        byChain,
        byChainByCurrency: {
          JPYC: projectCurrency === "JPYC" ? byChain : [],
          USDC: projectCurrency === "USDC" ? byChain : [],
        },

        // 参考情報：全チェーン合算（表示するなら「参考」と明記推奨）
        totalsAllChains: {
          JPYC: decToString(totalsAllChains.JPYC),
          USDC: decToString(totalsAllChains.USDC),
        },

        // purpose 集計（JPYC / 対応チェーン / CONFIRMED）
        perPurpose,
        noPurposeConfirmedJpyc: noPurposeJpyc,
      },
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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);

    console.error("PROJECT_PROGRESS_GET_FAILED", e);
    return errJson("PROJECT_PROGRESS_GET_FAILED", 500);
  }
}
