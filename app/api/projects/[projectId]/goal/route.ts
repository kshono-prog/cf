// app/api/projects/[projectId]/goal/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { toCurrency, type CurrencyCode } from "@/lib/currencyUtils";

export const dynamic = "force-dynamic";

type Currency = CurrencyCode;

type GoalPayload = {
  id: string;
  projectId: string;
  unitCurrency: Currency;
  targetAmount: number;
  targetAmountJpyc?: number;
  deadline: string | null;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toOptionalNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function lower(v: string): string {
  return v.toLowerCase();
}

type Params = { projectId: string };

function serializeGoal(goal: {
  id: bigint;
  projectId: bigint;
  targetAmount: number;
  targetAmountJpyc: number;
  deadline: Date | null;
  achievedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}, unitCurrency: Currency): GoalPayload {
  return {
    id: goal.id.toString(),
    projectId: goal.projectId.toString(),
    unitCurrency,
    targetAmount: goal.targetAmount,
    targetAmountJpyc: goal.targetAmount,
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
    achievedAt: goal.achievedAt ? goal.achievedAt.toISOString() : null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");
    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, currency: true },
    });
    if (!project) {
      return errJson("PROJECT_NOT_FOUND", 404);
    }
    const unitCurrency = toCurrency(project.currency);
    if (!unitCurrency) {
      return errJson("PROJECT_CURRENCY_INVALID", 400);
    }

    const goal = await prisma.goal.findUnique({
      where: { projectId: pid },
      select: {
        id: true,
        projectId: true,
        targetAmount: true,
        targetAmountJpyc: true,
        deadline: true,
        achievedAt: true,
        settlementPolicy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return okJson({ goal: goal ? serializeGoal(goal, unitCurrency) : null });
  } catch {
    return errJson("GOAL_GET_FAILED", 500);
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) {
      return errJson("BODY_INVALID", 400);
    }

    const address = toNonEmptyString(body.address);
    const targetAmount =
      toOptionalNumber(body.targetAmount) ??
      toOptionalNumber(body.targetAmountJpyc);
    const deadline = toNonEmptyString(body.deadline); // ISO string or null

    if (!address) {
      return errJson("ADDRESS_REQUIRED", 400);
    }
    const ownerSession = await requireOwnerSession(req, address);
    if (!ownerSession.ok) return ownerSession.response;
    if (targetAmount == null || targetAmount <= 0) {
      return errJson("TARGET_INVALID", 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, ownerAddress: true, currency: true },
    });
    if (!project) {
      return errJson("PROJECT_NOT_FOUND", 404);
    }

    const owner = project.ownerAddress ? lower(project.ownerAddress) : null;
    if (!owner || owner !== lower(address)) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }
    const unitCurrency = toCurrency(project.currency);
    if (!unitCurrency) {
      return errJson("PROJECT_CURRENCY_INVALID", 400);
    }

    const deadlineDate =
      deadline && typeof deadline === "string" ? new Date(deadline) : null;

    const saved = await prisma.goal.upsert({
      where: { projectId: pid },
      create: {
        projectId: pid,
        targetAmount: Math.floor(targetAmount),
        targetAmountJpyc: Math.floor(targetAmount),
        deadline: deadlineDate,
        settlementPolicy: {},
      },
      update: {
        targetAmount: Math.floor(targetAmount),
        targetAmountJpyc: Math.floor(targetAmount),
        deadline: deadlineDate,
      },
      select: {
        id: true,
        projectId: true,
        targetAmount: true,
        targetAmountJpyc: true,
        deadline: true,
        achievedAt: true,
        settlementPolicy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return okJson({ goal: serializeGoal(saved, unitCurrency) });
  } catch {
    return errJson("GOAL_SAVE_FAILED", 500);
  }
}
