import { Prisma } from "@prisma/client";

import type { TaskType } from "@/lib/agentTaskParsers";

export const AGENT_TASK_AUDIT_ACTION = {
  CREATED_DONE: "TASK_CREATED_DONE",
  CREATED_WAITING_APPROVAL: "TASK_CREATED_WAITING_APPROVAL",
  APPROVED: "TASK_APPROVED",
  REJECTED: "TASK_REJECTED",
} as const;

export function getCreateAuditAction(requiresApproval: boolean): string {
  return requiresApproval
    ? AGENT_TASK_AUDIT_ACTION.CREATED_WAITING_APPROVAL
    : AGENT_TASK_AUDIT_ACTION.CREATED_DONE;
}

export function buildCreateAuditMeta(params: {
  taskType: TaskType;
  requiresApproval: boolean;
}): Prisma.InputJsonValue {
  return {
    taskType: params.taskType,
    requiresApproval: params.requiresApproval,
  } as Prisma.InputJsonValue;
}

export function buildDecisionAuditMeta(params: {
  taskType: string;
  note: string | null;
}): Prisma.InputJsonValue {
  return {
    taskType: params.taskType,
    note: params.note,
  } as Prisma.InputJsonValue;
}
