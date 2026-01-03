/* app/api/projects/[projectId]/goal/target/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Goal, Project } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function toBigIntOrThrow(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error("PROJECT_ID_INVALID");
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// 強めガード：未知キーを許さない（事故防止）
const ALLOWED_KEYS = new Set(["targetAmountJpyc"]);

function assertNoUnknownKeys(raw: Record<string, unknown>): void {
  for (const k of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(k)) throw new Error("UNKNOWN_FIELD");
  }
}

function parseTargetAmountJpyc(v: unknown): number {
  // JSON number 以外拒否（文字列で来たら 400）
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error("TARGET_AMOUNT_INVALID");
  }
  const n = Math.trunc(v);
  if (n < 0) throw new Error("TARGET_AMOUNT_NEGATIVE");
  // 極端な値でDB/表示が壊れるのを防止（必要なら調整）
  if (n > 1_000_000_000) throw new Error("TARGET_AMOUNT_TOO_LARGE");
  return n;
}

// status の解釈：いまは DRAFT 限定で更新許可
function isDraftStatus(status: string): boolean {
  return status === "DRAFT";
}

function serializeGoal(goal: Goal) {
  return {
    id: goal.id.toString(),
    projectId: goal.projectId.toString(),
    targetAmountJpyc: goal.targetAmountJpyc,
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
    achievedAt: goal.achievedAt ? goal.achievedAt.toISOString() : null,
    settlementPolicy: goal.settlementPolicy,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

function serializeProject(project: Project) {
  return {
    id: project.id.toString(),
    status: project.status,
    title: project.title,
    description: project.description ?? null,
    purposeMode: project.purposeMode,
    creatorProfileId: project.creatorProfileId?.toString?.() ?? null,
    ownerAddress: project.ownerAddress ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr);

    const raw = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(raw)) {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    // 未知キー拒否（強ガード）
    try {
      assertNoUnknownKeys(raw);
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : "UNKNOWN_FIELD";
      return NextResponse.json({ error: code }, { status: 400 });
    }

    if (!("targetAmountJpyc" in raw)) {
      return NextResponse.json(
        { error: "TARGET_AMOUNT_REQUIRED" },
        { status: 400 }
      );
    }

    // project existence + DRAFT 限定
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    }

    if (!isDraftStatus(project.status)) {
      return NextResponse.json(
        { error: "PROJECT_STATUS_NOT_DRAFT", status: project.status },
        { status: 400 }
      );
    }

    // goal existence required（明示的に goal/route.ts で作る前提）
    const goal = await prisma.goal.findFirst({
      where: { projectId },
    });

    if (!goal) {
      return NextResponse.json({ error: "GOAL_NOT_FOUND" }, { status: 400 });
    }

    // 既に達成済みなら更新拒否（事故防止）
    if (goal.achievedAt) {
      return NextResponse.json(
        { error: "GOAL_ALREADY_ACHIEVED" },
        { status: 400 }
      );
    }

    let targetAmountJpyc: number;
    try {
      targetAmountJpyc = parseTargetAmountJpyc(raw.targetAmountJpyc);
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : "TARGET_AMOUNT_INVALID";
      return NextResponse.json({ error: code }, { status: 400 });
    }

    const now = new Date();

    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: {
        targetAmountJpyc,
        updatedAt: now,
      },
    });

    return NextResponse.json({
      ok: true,
      project: serializeProject(project),
      goal: serializeGoal(updated),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg === "PROJECT_ID_INVALID") {
      return NextResponse.json(
        { error: "PROJECT_ID_INVALID" },
        { status: 400 }
      );
    }

    console.error("PROJECT_GOAL_TARGET_PATCH_FAILED", e);
    return NextResponse.json(
      { error: "PROJECT_GOAL_TARGET_PATCH_FAILED" },
      { status: 500 }
    );
  }
}
