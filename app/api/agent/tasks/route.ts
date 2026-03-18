import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  approveWaitingTasks,
  createAgentTask,
  getTaskOutputSchema,
  parseTaskIds,
  rejectWaitingTasks,
  resolveCreatorByAddress,
  serializeAgentTask,
  toProjectIdOrNull,
  toTaskApprovalAction,
  toTaskStatus,
  toTaskType,
  validateTaskInput,
} from "@/lib/agentTasks";
import { toCreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

type PostBody = {
  address?: unknown;
  projectId?: unknown;
  taskType?: unknown;
  input?: unknown;
  requiresApproval?: unknown;
  roleId?: unknown;
};

function toRequiresApproval(v: unknown): boolean {
  return v === true;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const addressRaw = searchParams.get("address");
    const ownerSession = await requireOwnerSession(req, addressRaw ?? undefined);
    if (!ownerSession.ok) return ownerSession.response;
    const address = toAddressOrNull(ownerSession.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);
    const status = toTaskStatus(searchParams.get("status"));
    if (searchParams.get("status") && !status) {
      return errJson("STATUS_INVALID", 400);
    }

    const creator = await resolveCreatorByAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const rows = await prisma.agentTask.findMany({
      where: {
        creatorProfileId: creator.id,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        projectId: true,
        taskType: true,
        status: true,
        requestedBy: true,
        approvedBy: true,
        approvedAt: true,
        inputJson: true,
        outputJson: true,
        createdAt: true,
        updatedAt: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            action: true,
            actorAddress: true,
            metaJson: true,
            createdAt: true,
          },
        },
      },
    });

    return okJson({
      tasks: rows.map((row) => serializeAgentTask(row)),
      count: rows.length,
      status: status ?? null,
    });
  } catch (e) {
    console.error("AGENT_TASKS_GET_FAILED", e);
    return errJson("AGENT_TASKS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;

    const address = toAddressOrNull(body.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, address);
    if (!ownerSession.ok) return ownerSession.response;

    const taskType = toTaskType(body.taskType);
    if (!taskType) return errJson("TASK_TYPE_INVALID", 400);
    const roleId =
      body.roleId == null ? null : toCreatorAiAgentRole(body.roleId);
    if (body.roleId != null && roleId === null) {
      return errJson("ROLE_ID_INVALID", 400);
    }

    let projectId: bigint | null = null;
    try {
      projectId = toProjectIdOrNull(body.projectId);
    } catch {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    const creator = await resolveCreatorByAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    if (projectId) {
      const ownedProject = await prisma.project.findFirst({
        where: { id: projectId, creatorProfileId: creator.id },
        select: { id: true },
      });
      if (!ownedProject) return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const validatedInput = validateTaskInput(taskType, body.input);
    if (!validatedInput.ok) return errJson(validatedInput.error, 400);

    const inputJson = validatedInput.value;
    const requiresApproval = toRequiresApproval(body.requiresApproval);
    const row = await createAgentTask({
      creatorProfileId: creator.id,
      projectId,
      taskType,
      inputJson,
      requiresApproval,
      requestedBy: address,
      roleId,
    });

    return okJson({
      task: serializeAgentTask(row),
      outputSchema: getTaskOutputSchema(taskType),
    });
  } catch (e) {
    console.error("AGENT_TASKS_POST_FAILED", e);
    return errJson("AGENT_TASKS_POST_FAILED", 500);
  }
}

type PatchBody = {
  address?: unknown;
  taskId?: unknown;
  taskIds?: unknown;
  action?: unknown;
  note?: unknown;
};
const MAX_BATCH_TASK_IDS = 50;

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PatchBody;
    const address = toAddressOrNull(body.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, address);
    if (!ownerSession.ok) return ownerSession.response;

    const taskId = toNonEmptyString(body.taskId);
    const taskIdsRaw = body.taskIds == null ? null : parseTaskIds(body.taskIds);
    if (body.taskIds != null && !taskIdsRaw) return errJson("TASK_IDS_INVALID", 400);
    if (taskId && taskIdsRaw && taskIdsRaw.length > 0) {
      return errJson("TASK_ID_CONFLICT", 400);
    }
    const targetTaskIds = taskId
      ? [taskId]
      : taskIdsRaw && taskIdsRaw.length > 0
      ? Array.from(new Set(taskIdsRaw))
      : [];
    if (targetTaskIds.length === 0) return errJson("TASK_ID_REQUIRED", 400);
    if (targetTaskIds.length > MAX_BATCH_TASK_IDS) {
      return errJson("TASK_IDS_TOO_MANY", 400);
    }

    const action = toTaskApprovalAction(body.action);
    if (!action) return errJson("ACTION_INVALID", 400);
    const note = toNonEmptyString(body.note);
    if (note && note.length > 300) return errJson("NOTE_TOO_LONG", 400);
    if (action === "REJECT" && !note) return errJson("NOTE_REQUIRED_FOR_REJECT", 400);

    const creator = await resolveCreatorByAddress(address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const tasks = await prisma.agentTask.findMany({
      where: {
        id: { in: targetTaskIds },
        creatorProfileId: creator.id,
      },
      select: {
        id: true,
        projectId: true,
        taskType: true,
        status: true,
        inputJson: true,
      },
    });

    if (targetTaskIds.length === 1) {
      const only = tasks[0];
      if (!only) return errJson("TASK_NOT_FOUND", 404);
      if (only.status !== "WAITING_APPROVAL") {
        return errJson("TASK_NOT_WAITING_APPROVAL", 409);
      }
    }

    const waitingTasks = tasks.filter((task) => task.status === "WAITING_APPROVAL");
    if (waitingTasks.length === 0) return errJson("NO_WAITING_APPROVAL_TASKS", 409);

    if (action === "REJECT") {
      const rejected = await rejectWaitingTasks({
        creatorProfileId: creator.id,
        waitingTasks,
        actorAddress: address,
        note: note ?? null,
      });

      if (targetTaskIds.length === 1) {
        const item = rejected[0];
        return okJson({
          task: {
            id: item.id,
            status: item.status,
            approvedBy: item.approvedBy,
            approvedAt: item.approvedAt?.toISOString() ?? null,
            updatedAt: item.updatedAt.toISOString(),
          },
        });
      }

      return okJson({
        batch: true,
        action,
        requested: targetTaskIds.length,
        updatedCount: rejected.length,
        updatedTaskIds: rejected.map((item) => item.id),
        skippedTaskIds: targetTaskIds.filter(
          (id) => !rejected.some((item) => item.id === id)
        ),
      });
    }

    const approved = await approveWaitingTasks({
      creatorProfileId: creator.id,
      waitingTasks,
      actorAddress: address,
      note: note ?? null,
    });

    if (targetTaskIds.length === 1) {
      const item = approved[0];
      return okJson({
        task: {
          id: item.id,
          status: item.status,
          approvedBy: item.approvedBy,
          approvedAt: item.approvedAt?.toISOString() ?? null,
          output: item.outputJson,
          updatedAt: item.updatedAt.toISOString(),
        },
      });
    }

    return okJson({
      batch: true,
      action,
      requested: targetTaskIds.length,
      updatedCount: approved.length,
      updatedTaskIds: approved.map((item) => item.id),
      skippedTaskIds: targetTaskIds.filter(
        (id) => !approved.some((item) => item.id === id)
      ),
    });
  } catch (e) {
    console.error("AGENT_TASKS_PATCH_FAILED", e);
    return errJson("AGENT_TASKS_PATCH_FAILED", 500);
  }
}
