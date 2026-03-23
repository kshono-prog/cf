import { NextRequest, NextResponse } from "next/server";

import { optionsPreflight, withCorsResponse } from "@/app/api/_lib/cors";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toNonEmptyString } from "@/lib/api/guards";
import {
  buildFollowThroughAuditMeta,
  getTaskFollowThroughAuditAction,
  getTaskFollowThroughUsageKind,
  toFollowThroughAuditAction,
} from "@/lib/agentTaskAudit";
import { resolveCreatorByAddress, toTaskType } from "@/lib/agentTasks";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PostBody = {
  address?: unknown;
  taskId?: unknown;
  action?: unknown;
};

function ok<T extends Record<string, unknown>>(
  req: NextRequest,
  data: T,
  status?: number
): NextResponse<{ ok: true } & T> {
  return withCorsResponse(req, okJson(data, status));
}

function err(
  req: NextRequest,
  code: string,
  status: number,
  detail?: string
): NextResponse {
  return withCorsResponse(req, errJson(code, status, detail));
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return err(req, "INVALID_JSON", 400);

    const body = raw as PostBody;
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return withCorsResponse(req, ownerSession.response);

    const taskId = toNonEmptyString(body.taskId);
    if (!taskId) return err(req, "TASK_ID_REQUIRED", 400);

    const action = toFollowThroughAuditAction(body.action);
    if (!action) return err(req, "ACTION_INVALID", 400);

    const creator = await resolveCreatorByAddress(ownerSession.address);
    if (!creator) return err(req, "CREATOR_NOT_FOUND", 404);

    const task = await prisma.agentTask.findFirst({
      where: {
        id: taskId,
        creatorProfileId: creator.id,
      },
      select: {
        id: true,
        projectId: true,
        taskType: true,
      },
    });
    if (!task) return err(req, "TASK_NOT_FOUND", 404);

    const taskType = toTaskType(task.taskType);
    if (!taskType) return err(req, "TASK_TYPE_INVALID", 500);

    const expectedAction = getTaskFollowThroughAuditAction(taskType);
    const usageKind = getTaskFollowThroughUsageKind(taskType);
    if (!expectedAction || !usageKind || expectedAction !== action) {
      return err(req, "ACTION_NOT_SUPPORTED_FOR_TASK", 409);
    }

    const existingLog = await prisma.agentTaskAuditLog.findFirst({
      where: {
        agentTaskId: task.id,
        action,
      },
      select: { id: true },
    });

    if (existingLog) {
      return ok(req, {
        taskId: task.id,
        action,
        recorded: false,
      });
    }

    await prisma.agentTaskAuditLog.create({
      data: {
        agentTaskId: task.id,
        creatorProfileId: creator.id,
        projectId: task.projectId,
        action,
        actorAddress: ownerSession.address,
        metaJson: buildFollowThroughAuditMeta({
          taskType,
          usageKind,
        }),
      },
      select: { id: true },
    });

    return ok(req, {
      taskId: task.id,
      action,
      recorded: true,
    });
  } catch (error) {
    console.error("AGENT_TASK_FOLLOW_THROUGH_POST_FAILED", error);
    return err(req, "AGENT_TASK_FOLLOW_THROUGH_POST_FAILED", 500);
  }
}
