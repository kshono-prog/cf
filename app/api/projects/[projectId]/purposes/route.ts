/* app/api/projects/[projectId]/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Project, Goal, Purpose } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function toBigIntOrThrow(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error("PROJECT_ID_INVALID");
  }
}

function decToString(d: Prisma.Decimal | null): string | null {
  return d ? d.toString() : null;
}

function serializeProject(p: Project) {
  return {
    ...p,
    id: p.id.toString(),
    creatorProfileId: p.creatorProfileId ? p.creatorProfileId.toString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeGoal(g: Goal) {
  return {
    ...g,
    id: g.id.toString(),
    projectId: g.projectId.toString(),
    deadline: g.deadline ? g.deadline.toISOString() : null,
    achievedAt: g.achievedAt ? g.achievedAt.toISOString() : null,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

function serializePurpose(p: Purpose) {
  return {
    ...p,
    id: p.id.toString(),
    projectId: p.projectId.toString(),
    targetAmount: p.targetAmount ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { projectId: projectIdStr } = await ctx.params;
    const projectId = toBigIntOrThrow(projectIdStr);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { goal: true, purposes: true },
    });

    if (!project) {
      return NextResponse.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      project: serializeProject(project),
      goal: project.goal ? serializeGoal(project.goal) : null,
      purposes: project.purposes.map(serializePurpose),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") {
      return NextResponse.json(
        { error: "PROJECT_ID_INVALID" },
        { status: 400 }
      );
    }
    console.error("PROJECT_GET_FAILED", e);
    return NextResponse.json({ error: "PROJECT_GET_FAILED" }, { status: 500 });
  }
}
