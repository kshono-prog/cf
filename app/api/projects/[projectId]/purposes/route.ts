/* app/api/projects/[projectId]/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Project, Goal, Purpose } from "@prisma/client";
import { errJson, okJson } from "@/lib/api/responses";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

type Params = { projectId: string };

function toBigIntOrThrow(v: string): bigint {
  try {
    return BigInt(v);
  } catch {
    throw new Error("PROJECT_ID_INVALID");
  }
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
  req: NextRequest,
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
      return errJson("PROJECT_NOT_FOUND", 404);
    }

    if (!project.ownerAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const ownerSession = await requireOwnerSession(req, project.ownerAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    return okJson({
      project: serializeProject(project),
      goal: project.goal ? serializeGoal(project.goal) : null,
      purposes: project.purposes.map(serializePurpose),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    console.error("PROJECT_GET_FAILED", e);
    return errJson("PROJECT_GET_FAILED", 500);
  }
}
