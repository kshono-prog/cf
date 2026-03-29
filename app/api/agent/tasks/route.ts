import { NextRequest, NextResponse } from "next/server";
import { optionsPreflight, withCorsResponse } from "@/app/api/_lib/cors";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
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
import { requiresApprovalByDefault } from "@/lib/agentTaskPolicy";
import { toCreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";
import {
  AiManagerTaskBillingError,
  prepareAiManagerTaskBilling,
  recordBlockedAiManagerTaskBilling,
} from "@/lib/aiManager/billing";

export const dynamic = "force-dynamic";

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

type PostBody = {
  address?: unknown;
  projectId?: unknown;
  taskType?: unknown;
  input?: unknown;
  requiresApproval?: unknown;
  autoPost?: unknown;
  roleId?: unknown;
};

function toRequiresApproval(v: unknown): boolean {
  return v === true;
}

function toAutoPost(v: unknown): boolean {
  return v === true;
}

function toBillingErrorStatus(code: string): number {
  switch (code) {
    case "AI_MANAGER_AUTO_PAY_DISABLED":
    case "AI_MANAGER_BUDGET_REQUIRED":
      return 402;
    case "AI_MANAGER_ACTION_CAP_EXCEEDED":
    case "AI_MANAGER_DAILY_CAP_EXCEEDED":
    case "AI_MANAGER_MONTHLY_CAP_EXCEEDED":
    case "AI_MANAGER_BILLING_PAUSED":
    case "AI_MANAGER_CAPABILITY_DISABLED":
      return 409;
    default:
      return 400;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  let status: ReturnType<typeof toTaskStatus> = null;
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return withCorsResponse(req, ownerSession.response);
    status = toTaskStatus(searchParams.get("status"));
    if (searchParams.get("status") && !status) {
      return err(req, "STATUS_INVALID", 400);
    }

    const creator = await resolveCreatorByAddress(ownerSession.address);
    if (!creator) return err(req, "CREATOR_NOT_FOUND", 404);

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

    return ok(req, {
      tasks: rows.map((row) => serializeAgentTask(row)),
      count: rows.length,
      status: status ?? null,
    });
  } catch (e) {
    if (isPrismaUnavailableError(e)) {
      return ok(req, {
        tasks: [],
        count: 0,
        status: status ?? null,
      });
    }
    console.error("AGENT_TASKS_GET_FAILED", e);
    return err(req, "AGENT_TASKS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return err(req, "INVALID_JSON", 400);
    const body = raw as PostBody;
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return withCorsResponse(req, ownerSession.response);

    const taskType = toTaskType(body.taskType);
    if (!taskType) return err(req, "TASK_TYPE_INVALID", 400);
    const roleId =
      body.roleId == null ? null : toCreatorAiAgentRole(body.roleId);
    if (body.roleId != null && roleId === null) {
      return err(req, "ROLE_ID_INVALID", 400);
    }

    let projectId: bigint | null = null;
    try {
      projectId = toProjectIdOrNull(body.projectId);
    } catch {
      return err(req, "PROJECT_ID_INVALID", 400);
    }

    const creator = await resolveCreatorByAddress(ownerSession.address);
    if (!creator) return err(req, "CREATOR_NOT_FOUND", 404);

    if (projectId) {
      const ownedProject = await prisma.project.findFirst({
        where: { id: projectId, creatorProfileId: creator.id },
        select: { id: true },
      });
      if (!ownedProject) {
        return err(req, "PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
      }
    }

    const validatedInput = validateTaskInput(taskType, body.input);
    if (!validatedInput.ok) return err(req, validatedInput.error, 400);

    // Informational tasks (advice, analysis) complete automatically — no approval needed
    // regardless of what the client sends.
    const requiresApproval = requiresApprovalByDefault(taskType)
      ? toRequiresApproval(body.requiresApproval)
      : false;
    const autoPost = toAutoPost(body.autoPost);

    // Store autoPost flag alongside the task-specific input so approval can read it
    const inputJson = isRecord(validatedInput.value)
      ? { ...validatedInput.value, autoPost }
      : validatedInput.value;

    const aiManagerBilling = await prepareAiManagerTaskBilling({
      creatorProfileId: creator.id,
      projectId,
      taskType,
    });

    if (aiManagerBilling.kind === "blocked") {
      await recordBlockedAiManagerTaskBilling(aiManagerBilling);
      return err(
        req,
        aiManagerBilling.errorCode,
        toBillingErrorStatus(aiManagerBilling.errorCode)
      );
    }

    const row = await createAgentTask({
      creatorProfileId: creator.id,
      projectId,
      taskType,
      inputJson: inputJson as Parameters<typeof createAgentTask>[0]["inputJson"],
      requiresApproval,
      autoPost,
      requestedBy: ownerSession.address,
      roleId,
      aiManagerBilling,
    });

    return ok(req, {
      task: serializeAgentTask(row),
      outputSchema: getTaskOutputSchema(taskType),
    });
  } catch (e) {
    if (e instanceof AiManagerTaskBillingError) {
      return err(req, e.code, toBillingErrorStatus(e.code));
    }
    console.error("AGENT_TASKS_POST_FAILED", e);
    return err(req, "AGENT_TASKS_POST_FAILED", 500);
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
    if (!isRecord(raw)) return err(req, "INVALID_JSON", 400);
    const body = raw as PatchBody;
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return withCorsResponse(req, ownerSession.response);

    const taskId = toNonEmptyString(body.taskId);
    const taskIdsRaw = body.taskIds == null ? null : parseTaskIds(body.taskIds);
    if (body.taskIds != null && !taskIdsRaw) {
      return err(req, "TASK_IDS_INVALID", 400);
    }
    if (taskId && taskIdsRaw && taskIdsRaw.length > 0) {
      return err(req, "TASK_ID_CONFLICT", 400);
    }
    const targetTaskIds = taskId
      ? [taskId]
      : taskIdsRaw && taskIdsRaw.length > 0
      ? Array.from(new Set(taskIdsRaw))
      : [];
    if (targetTaskIds.length === 0) return err(req, "TASK_ID_REQUIRED", 400);
    if (targetTaskIds.length > MAX_BATCH_TASK_IDS) {
      return err(req, "TASK_IDS_TOO_MANY", 400);
    }

    const action = toTaskApprovalAction(body.action);
    if (!action) return err(req, "ACTION_INVALID", 400);
    const note = toNonEmptyString(body.note);
    if (note && note.length > 300) return err(req, "NOTE_TOO_LONG", 400);
    if (action === "REJECT" && !note) {
      return err(req, "NOTE_REQUIRED_FOR_REJECT", 400);
    }

    const creator = await resolveCreatorByAddress(ownerSession.address);
    if (!creator) return err(req, "CREATOR_NOT_FOUND", 404);

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
      if (!only) return err(req, "TASK_NOT_FOUND", 404);
      if (only.status !== "WAITING_APPROVAL") {
        return err(req, "TASK_NOT_WAITING_APPROVAL", 409);
      }
    }

    const waitingTasks = tasks.filter((task) => task.status === "WAITING_APPROVAL");
    if (waitingTasks.length === 0) {
      return err(req, "NO_WAITING_APPROVAL_TASKS", 409);
    }

    if (action === "REJECT") {
      const rejected = await rejectWaitingTasks({
        creatorProfileId: creator.id,
        waitingTasks,
        actorAddress: ownerSession.address,
        note: note ?? null,
      });

      if (targetTaskIds.length === 1) {
        const item = rejected[0];
        return ok(req, {
          task: {
            id: item.id,
            status: item.status,
            approvedBy: item.approvedBy,
            approvedAt: item.approvedAt?.toISOString() ?? null,
            updatedAt: item.updatedAt.toISOString(),
          },
        });
      }

      return ok(req, {
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
      actorAddress: ownerSession.address,
      note: note ?? null,
    });

    if (targetTaskIds.length === 1) {
      const item = approved[0];
      return ok(req, {
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

    return ok(req, {
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
    return err(req, "AGENT_TASKS_PATCH_FAILED", 500);
  }
}
