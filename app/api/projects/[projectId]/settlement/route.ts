import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import {
  ensureProjectSettlement,
  recomputeProjectSettlement,
} from "@/lib/projectSettlement";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

type Body = {
  action?: unknown;
};

function toAction(v: unknown): "RECOMPUTE" | null {
  return v === "RECOMPUTE" ? "RECOMPUTE" : null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const data = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        goal: {
          select: {
            id: true,
            achievedAt: true,
            targetAmountJpyc: true,
          },
        },
        settlementState: true,
        bridgeSteps: {
          orderBy: { createdAt: "asc" },
        },
        distributionEntries: {
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        },
        distributionExecutions: {
          orderBy: { startedAt: "desc" },
          take: 5,
          include: {
            items: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!data) return errJson("PROJECT_NOT_FOUND", 404);

    const settlement = data.settlementState
      ? data.settlementState
      : await prisma.$transaction(async (tx) => {
          await ensureProjectSettlement(tx, projectId);
          return recomputeProjectSettlement(tx, projectId);
        });

    return okJson({
      project: {
        id: data.id.toString(),
        title: data.title,
        status: data.status,
      },
      goal: data.goal
        ? {
            id: data.goal.id.toString(),
            achievedAt: data.goal.achievedAt?.toISOString() ?? null,
            targetAmountJpyc: data.goal.targetAmountJpyc,
          }
        : null,
      settlement: {
        id: settlement.id,
        status: settlement.status,
        bridgedTotalAtomic: settlement.bridgedTotalAtomic.toString(),
        distributedTotalAtomic: settlement.distributedTotalAtomic.toString(),
        readyAt: settlement.readyAt?.toISOString() ?? null,
        distributedAt: settlement.distributedAt?.toISOString() ?? null,
        updatedAt: settlement.updatedAt.toISOString(),
      },
      bridgeSteps: data.bridgeSteps.map((s) => ({
        id: s.id,
        sourceChain: s.sourceChain,
        destinationChain: s.destinationChain,
        token: s.token,
        status: s.status,
        bridgedAmountAtomic: s.bridgedAmountAtomic.toString(),
        txHash: s.txHash,
        completedAt: s.completedAt?.toISOString() ?? null,
        recordedByWallet: s.recordedByWallet,
        memo: s.memo,
        createdAt: s.createdAt.toISOString(),
      })),
      distributionEntries: data.distributionEntries.map((e) => ({
        id: e.id,
        recipientAddressChecksum: e.recipientAddressChecksum,
        token: e.token,
        amountAtomic: e.amountAtomic.toString(),
        memo: e.memo,
        status: e.status,
        sentAt: e.sentAt?.toISOString() ?? null,
        txHash: e.txHash,
        orderIndex: e.orderIndex,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      recentExecutions: data.distributionExecutions.map((x) => ({
        id: x.id,
        initiatedByWallet: x.initiatedByWallet,
        startedAt: x.startedAt.toISOString(),
        finishedAt: x.finishedAt?.toISOString() ?? null,
        result: x.result,
        note: x.note,
        items: x.items.map((i) => ({
          id: i.id,
          distributionEntryId: i.distributionEntryId,
          status: i.status,
          txHash: i.txHash,
          errorReason: i.errorReason,
          createdAt: i.createdAt.toISOString(),
        })),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_SETTLEMENT_GET_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_GET_FAILED", 500);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const raw: unknown = await req.json().catch(() => null);
    const action = raw && typeof raw === "object" ? toAction((raw as Body).action) : null;

    if (!action) return errJson("ACTION_INVALID", 400);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const settlement = await prisma.$transaction(async (tx) => {
      await ensureProjectSettlement(tx, projectId);
      return recomputeProjectSettlement(tx, projectId);
    });

    return okJson({
      settlement: {
        id: settlement.id,
        status: settlement.status,
        bridgedTotalAtomic: settlement.bridgedTotalAtomic.toString(),
        distributedTotalAtomic: settlement.distributedTotalAtomic.toString(),
        readyAt: settlement.readyAt?.toISOString() ?? null,
        distributedAt: settlement.distributedAt?.toISOString() ?? null,
        updatedAt: settlement.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_SETTLEMENT_PUT_FAILED", e);
    return errJson("PROJECT_SETTLEMENT_PUT_FAILED", 500);
  }
}
