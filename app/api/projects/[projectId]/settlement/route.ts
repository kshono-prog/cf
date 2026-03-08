import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import {
  ensureProjectSettlement,
  isSettlementSchemaMissingError,
  recomputeProjectSettlement,
} from "@/lib/projectSettlement";
import {
  buildFallbackSettlement,
  getProjectSettlementView,
} from "@/lib/projectSettlementView";

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
    const data = await getProjectSettlementView(projectId);
    if (!data) return errJson("PROJECT_NOT_FOUND", 404);
    return okJson(data);
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

    const settlement = await (async () => {
      await ensureProjectSettlement(prisma, projectId);
      return recomputeProjectSettlement(prisma, projectId);
    })().catch((e) => {
      if (isSettlementSchemaMissingError(e)) return null;
      throw e;
    });

    if (!settlement) {
      return okJson({
        settlement: buildFallbackSettlement({ achievedAt: undefined }),
        warning: "SETTLEMENT_SCHEMA_NOT_MIGRATED",
      });
    }

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
