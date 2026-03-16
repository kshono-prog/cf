// app/api/projects/[projectId]/goal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

type Currency = "JPYC" | "USDC";

type GoalPayload = {
  id: string;
  projectId: string;
  unitCurrency: Currency;
  targetAmount: number;
  targetAmountJpyc: number;
  deadline: string | null;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toBigIntOrThrow(v: string, code: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error(code);
  }
}

function toOptionalString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toOptionalNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function toCurrency(v: string): Currency | null {
  return v === "JPYC" || v === "USDC" ? v : null;
}

function lower(v: string): string {
  return v.toLowerCase();
}

type Params = { projectId: string };

function serializeGoal(goal: {
  id: bigint;
  projectId: bigint;
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
    targetAmount: goal.targetAmountJpyc,
    targetAmountJpyc: goal.targetAmountJpyc,
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
      return NextResponse.json(
        { ok: false, error: "PROJECT_NOT_FOUND" },
        { status: 404 }
      );
    }
    const unitCurrency = toCurrency(project.currency);
    if (!unitCurrency) {
      return NextResponse.json(
        { ok: false, error: "PROJECT_CURRENCY_INVALID" },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.findUnique({
      where: { projectId: pid },
      select: {
        id: true,
        projectId: true,
        targetAmountJpyc: true,
        deadline: true,
        achievedAt: true,
        settlementPolicy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      goal: goal ? serializeGoal(goal, unitCurrency) : null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "GOAL_GET_FAILED" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) {
      return NextResponse.json(
        { ok: false, error: "BODY_INVALID" },
        { status: 400 }
      );
    }

    const address = toOptionalString(body.address);
    const targetAmount =
      toOptionalNumber(body.targetAmount) ??
      toOptionalNumber(body.targetAmountJpyc);
    const deadline = toOptionalString(body.deadline); // ISO string or null

    if (!address) {
      return NextResponse.json(
        { ok: false, error: "ADDRESS_REQUIRED" },
        { status: 400 }
      );
    }
    const ownerSession = await requireOwnerSession(req, address);
    if (!ownerSession.ok) return ownerSession.response;
    if (targetAmount == null || targetAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "TARGET_INVALID" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, ownerAddress: true, currency: true },
    });
    if (!project) {
      return NextResponse.json(
        { ok: false, error: "PROJECT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const owner = project.ownerAddress ? lower(project.ownerAddress) : null;
    if (!owner || owner !== lower(address)) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN_NOT_OWNER" },
        { status: 403 }
      );
    }
    const unitCurrency = toCurrency(project.currency);
    if (!unitCurrency) {
      return NextResponse.json(
        { ok: false, error: "PROJECT_CURRENCY_INVALID" },
        { status: 400 }
      );
    }

    const deadlineDate =
      deadline && typeof deadline === "string" ? new Date(deadline) : null;

    const saved = await prisma.goal.upsert({
      where: { projectId: pid },
      create: {
        projectId: pid,
        targetAmountJpyc: Math.floor(targetAmount),
        deadline: deadlineDate,
        settlementPolicy: {},
      },
      update: {
        targetAmountJpyc: Math.floor(targetAmount),
        deadline: deadlineDate,
      },
      select: {
        id: true,
        projectId: true,
        targetAmountJpyc: true,
        deadline: true,
        achievedAt: true,
        settlementPolicy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, goal: serializeGoal(saved, unitCurrency) });
  } catch {
    return NextResponse.json(
      { ok: false, error: "GOAL_SAVE_FAILED" },
      { status: 500 }
    );
  }
}
