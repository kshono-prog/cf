// app/api/projects/[projectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

type PurposeMode = "OPTIONAL" | "REQUIRED" | "NONE";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function asNullableString(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function asPurposeMode(v: unknown): PurposeMode | null {
  if (v === "OPTIONAL" || v === "REQUIRED" || v === "NONE") return v;
  return null;
}

/** PATCH/PUT payload の「フィールドが送られたか」を判定する */
function hasKey(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
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
        purposes: { orderBy: { orderIndex: "asc" } },
        budgetItems: { orderBy: { orderIndex: "asc" } },
        bridgeRuns: { orderBy: { createdAt: "desc" }, take: 5 },
        distributionRuns: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    return okJson({
      project: {
        id: project.id.toString(),
        title: project.title,
        description: project.description ?? null,
        status: project.status,
        purposeMode: project.purposeMode,
        ownerAddress: project.ownerAddress ?? null,
        creatorProfileId: project.creatorProfileId
          ? project.creatorProfileId.toString()
          : null,
        bridgedAt: project.bridgedAt ? project.bridgedAt.toISOString() : null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      goal: project.goal
        ? {
            id: project.goal.id.toString(),
            targetAmountJpyc: project.goal.targetAmountJpyc,
            achievedAt: project.goal.achievedAt
              ? project.goal.achievedAt.toISOString()
              : null,
            deadline: project.goal.deadline
              ? project.goal.deadline.toISOString()
              : null,
          }
        : null,
      purposes: project.purposes.map((p) => ({
        id: p.id.toString(),
        code: p.code,
        label: p.label,
        description: p.description ?? null,
        targetAmount: p.targetAmount ?? null,
        orderIndex: p.orderIndex,
      })),
      budgetItems: project.budgetItems.map((b) => ({
        id: b.id.toString(),
        label: b.label,
        amountJpyc: b.amountJpyc,
        orderIndex: b.orderIndex,
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
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_GET_FAILED", e);
    return errJson("PROJECT_GET_FAILED", 500);
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const bodyUnknown: unknown = await req.json().catch(() => null);
    if (!isRecord(bodyUnknown)) {
      return errJson("INVALID_JSON", 400);
    }

    // 送られたフィールドだけ更新（未送信は維持）
    const data: {
      title?: string;
      description?: string | null;
      purposeMode?: PurposeMode;
    } = {};

    if (hasKey(bodyUnknown, "title")) {
      const t = asNonEmptyString(bodyUnknown.title);
      if (!t) return errJson("TITLE_REQUIRED", 400);
      data.title = t;
    }

    if (hasKey(bodyUnknown, "description")) {
      // 空文字は null として扱う（UI側の消去に強い）
      const d = asNullableString(bodyUnknown.description);
      data.description = d;
    }

    if (hasKey(bodyUnknown, "purposeMode")) {
      const pm = asPurposeMode(bodyUnknown.purposeMode);
      if (!pm) return errJson("PURPOSE_MODE_INVALID", 400);
      data.purposeMode = pm;
    }

    if (Object.keys(data).length === 0) {
      return errJson("NO_FIELDS_TO_UPDATE", 400);
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        purposeMode: true,
        updatedAt: true,
      },
    });

    return okJson({
      project: {
        id: updated.id.toString(),
        title: updated.title,
        description: updated.description ?? null,
        status: updated.status,
        purposeMode: updated.purposeMode,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PROJECT_PUT_FAILED", e);
    return errJson("PROJECT_PUT_FAILED", 500);
  }
}
