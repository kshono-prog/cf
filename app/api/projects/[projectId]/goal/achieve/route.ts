/* app/api/projects/[projectId]/goal/achieve/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toBigIntOrThrow,
  lowerOrNull,
} from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

type Body = {
  address?: unknown; // ownerチェック用（接続アドレス）
};

function decimalToJpycIntFloor(amountDecimal: Prisma.Decimal | null): number {
  if (!amountDecimal) return 0;
  const s = amountDecimal.toString();
  const [i] = s.split(".");
  const n = Number(i || "0");
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const raw: unknown = await req.json().catch(() => null);
    const addr = isRecord(raw) ? toAddressOrNull(raw.address) : null;
    if (!addr) return errJson("ADDRESS_REQUIRED", 400);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { goal: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== addr.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    if (!project.goal) return errJson("GOAL_NOT_SET", 400);

    if (project.goal.achievedAt) {
      // 冪等
      return okJson({
        achieved: true,
        achievedAt: project.goal.achievedAt.toISOString(),
      });
    }

    const sum = await prisma.contribution.aggregate({
      where: { projectId, status: "CONFIRMED", currency: "JPYC" },
      _sum: { amountDecimal: true },
    });

    const confirmedJpycFloor = decimalToJpycIntFloor(
      sum._sum.amountDecimal ?? null
    );

    const target = project.goal.targetAmountJpyc;
    if (confirmedJpycFloor < target) {
      return errJson("GOAL_NOT_REACHED", 400);
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const g = await tx.goal.update({
        where: { projectId },
        data: { achievedAt: now, updatedAt: now },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: "GOAL_ACHIEVED", updatedAt: now },
      });

      return g;
    });

    return okJson({
      achieved: true,
      achievedAt: updated.achievedAt ? updated.achievedAt.toISOString() : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_GOAL_ACHIEVE_FAILED", e);
    return errJson("PROJECT_GOAL_ACHIEVE_FAILED", 500);
  }
}
