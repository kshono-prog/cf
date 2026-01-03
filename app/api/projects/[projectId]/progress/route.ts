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

function decToString(d: Prisma.Decimal | null | undefined): string | null {
  if (d == null) return null;
  return d.toString();
}

function bigToString(v: bigint | null | undefined): string | null {
  if (v == null) return null;
  return v.toString();
}

// Decimal(38,18) を「円（floor）」として扱う
function decimalToJpycIntFloor(amountDecimal: Prisma.Decimal | null): number {
  if (!amountDecimal) return 0;
  const s = amountDecimal.toString();
  const [i] = s.split(".");
  const n = Number(i || "0");
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** JPYC が設定されている対応チェーンのみ（目標合算の対象） */
function getSupportedJpycChainIds(): SupportedChainId[] {
  const chains = getSupportedViemChains();
  const ids = chains.map((c) => c.id).filter((id) => isSupportedChainId(id));
  return ids.filter((id) => getTokenOnChain("JPYC", id) != null);
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

    const supportedJpycChainIds = getSupportedJpycChainIds();

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

    // ---- goal 用：JPYC（対応チェーンのみ）CONFIRMED 合算 ----
    const sumJpycSupported = await prisma.contribution.aggregate({
      where: {
        projectId,
        status: "CONFIRMED",
        currency: "JPYC",
        chainId: { in: supportedJpycChainIds },
      },
      _sum: { amountDecimal: true },
    });

    const confirmedJpycSupportedInt = decimalToJpycIntFloor(
      sumJpycSupported._sum.amountDecimal ?? null
    );

    // ---- チェーン別内訳（JPYC / 対応チェーン / CONFIRMED）----
    const sumByChainJpyc = await prisma.contribution.groupBy({
      by: ["chainId"],
      where: {
        projectId,
        status: "CONFIRMED",
        currency: "JPYC",
        chainId: { in: supportedJpycChainIds },
      },
      _sum: { amountDecimal: true },
    });

    const byChain = sumByChainJpyc
      .map((r) => ({
        chainId: r.chainId,
        confirmedAmountDecimal: decToString(r._sum.amountDecimal ?? null),
        confirmedAmountJpyc: decimalToJpycIntFloor(
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
        currency: "JPYC",
        chainId: { in: supportedJpycChainIds },
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
          confirmedAmountJpyc: decimalToJpycIntFloor(
            r._sum.amountDecimal ?? null
          ),
        };
      });

    // ---- purposeId=null（JPYCのみ / 対応チェーンのみ / CONFIRMED）----
    const sumNoPurpose = await prisma.contribution.aggregate({
      where: {
        projectId,
        status: "CONFIRMED",
        currency: "JPYC",
        purposeId: null,
        chainId: { in: supportedJpycChainIds },
      },
      _sum: { amountDecimal: true },
    });

    const noPurposeJpyc = decimalToJpycIntFloor(
      sumNoPurpose._sum.amountDecimal ?? null
    );

    // ---- goal進捗（JPYC / 対応チェーン合算を正とする）----
    const goal = project.goal;
    const targetJpyc = goal?.targetAmountJpyc ?? null;

    const confirmedJpycInt = confirmedJpycSupportedInt;
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
            targetAmountJpyc: goal.targetAmountJpyc,
            deadline: goal.deadline ? goal.deadline.toISOString() : null,
            achievedAt: goal.achievedAt ? goal.achievedAt.toISOString() : null,
            settlementPolicy: goal.settlementPolicy,
            createdAt: goal.createdAt.toISOString(),
            updatedAt: goal.updatedAt.toISOString(),
          }
        : null,
      progress: {
        confirmedJpyc: confirmedJpycInt,
        targetJpyc,
        progressPct,

        // 透明性（「どのチェーンを合算対象にしているか」）
        supportedJpycChainIds,

        // 合算 + 内訳（JPYC / 対応チェーン / CONFIRMED）
        byChain,

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
