// app/api/projects/[projectId]/distribution/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toBigIntOrThrow,
  lowerOrNull,
} from "@/lib/api/guards";
import { toCurrency } from "@/lib/currencyUtils";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import type { DistributionPlanJson } from "@/types/distribution";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

type PutBody = {
  address?: unknown; // ownerチェック
  plan?: unknown; // JSON object or array only
};

function isJsonObjectOrArray(
  v: unknown
): v is Record<string, unknown> | unknown[] {
  if (Array.isArray(v)) return true;
  return typeof v === "object" && v !== null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr, "PROJECT_ID_INVALID");

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, status: true, ownerAddress: true, currency: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    const projectCurrency = toCurrency(project.currency);
    if (!projectCurrency) return errJson("PROJECT_CURRENCY_INVALID", 400);

    if (!project.ownerAddress) return errJson("FORBIDDEN_NOT_OWNER", 403);

    const ownerSession = await requireOwnerSession(req, project.ownerAddress);
    if (!ownerSession.ok) return ownerSession.response;

    // ✅ 最新の PLAN_ONLY を取得（あればそれが plan）
    const latestPlan = await prisma.distributionRun.findFirst({
      where: { projectId, mode: "PLAN_ONLY", currency: projectCurrency },
      orderBy: { createdAt: "desc" },
      select: { id: true, planJson: true, createdAt: true },
    });

    return okJson({
      projectId: project.id.toString(),
      status: project.status,
      plan: latestPlan ? latestPlan.planJson : null,
      planMeta: latestPlan
        ? {
            distributionRunId: latestPlan.id,
            currency: projectCurrency,
            savedAt: latestPlan.createdAt.toISOString(),
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "PROJECT_CURRENCY_INVALID") {
      return errJson("PROJECT_CURRENCY_INVALID", 400);
    }
    console.error("DISTRIBUTION_PLAN_GET_FAILED", e);
    return errJson("DISTRIBUTION_PLAN_GET_FAILED", 500);
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
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const addr = toAddressOrNull((raw as PutBody).address);
    if (!addr) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, addr);
    if (!ownerSession.ok) return ownerSession.response;

    if (!("plan" in raw)) return errJson("PLAN_REQUIRED", 400);
    const plan = (raw as PutBody).plan;
    if (!isJsonObjectOrArray(plan)) return errJson("PLAN_INVALID", 400);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerAddress: true, id: true, currency: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const owner = lowerOrNull(project.ownerAddress);
    if (!owner || owner !== addr.toLowerCase()) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }
    const projectCurrency = toCurrency(project.currency);
    if (!projectCurrency) {
      return errJson("PROJECT_CURRENCY_INVALID", 400);
    }

    // ✅ Projectに保存しない。DistributionRun(mode=PLAN_ONLY)で保存する
    const saved = await prisma.distributionRun.create({
      data: {
        projectId,
        mode: "PLAN_ONLY",
        chainId: 0, // plan保存段階では未確定でも良いので 0
        currency: projectCurrency,
        planJson: plan as DistributionPlanJson as Prisma.InputJsonValue,
        txHashes: [] as Prisma.InputJsonValue,
        dryRun: true,
        note: "plan saved",
      },
      select: { id: true, createdAt: true, planJson: true },
    });

    return okJson({
      saved: true,
      projectId: project.id.toString(),
      plan: saved.planJson,
      distributionRunId: saved.id,
      savedAt: saved.createdAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "PROJECT_CURRENCY_INVALID") {
      return errJson("PROJECT_CURRENCY_INVALID", 400);
    }
    console.error("DISTRIBUTION_PLAN_PUT_FAILED", e);
    return errJson("DISTRIBUTION_PLAN_PUT_FAILED", 500);
  }
}
