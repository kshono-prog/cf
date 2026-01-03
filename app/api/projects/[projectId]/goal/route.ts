// app/api/projects/[projectId]/goal/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

function lower(v: string): string {
  return v.toLowerCase();
}

type Params = { projectId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");

    const goal = await prisma.goal.findUnique({
      where: { projectId: pid },
      select: {
        id: true,
        projectId: true,
        targetAmountJpyc: true,
        deadline: true,
        achievedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, goal: goal ?? null });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "GOAL_GET_FAILED" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, ctx: { params: Promise<Params> }) {
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
    const targetAmountJpyc = toOptionalNumber(body.targetAmountJpyc);
    const deadline = toOptionalString(body.deadline); // ISO string or null

    if (!address) {
      return NextResponse.json(
        { ok: false, error: "ADDRESS_REQUIRED" },
        { status: 400 }
      );
    }
    if (targetAmountJpyc == null || targetAmountJpyc <= 0) {
      return NextResponse.json(
        { ok: false, error: "TARGET_INVALID" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, ownerAddress: true },
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

    const deadlineDate =
      deadline && typeof deadline === "string" ? new Date(deadline) : null;

    const saved = await prisma.goal.upsert({
      where: { projectId: pid },
      create: {
        projectId: pid,
        targetAmountJpyc: Math.floor(targetAmountJpyc),
        deadline: deadlineDate,
        settlementPolicy: {},
      },
      update: {
        targetAmountJpyc: Math.floor(targetAmountJpyc),
        deadline: deadlineDate,
      },
      select: {
        id: true,
        projectId: true,
        targetAmountJpyc: true,
        deadline: true,
        achievedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, goal: saved });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "GOAL_SAVE_FAILED" },
      { status: 500 }
    );
  }
}
