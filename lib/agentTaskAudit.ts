import { Prisma } from "@prisma/client";

import type { TaskType } from "@/lib/agentTaskParsers";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";

export const AGENT_TASK_AUDIT_ACTION = {
  CREATED_DONE: "TASK_CREATED_DONE",
  CREATED_WAITING_APPROVAL: "TASK_CREATED_WAITING_APPROVAL",
  APPROVED: "TASK_APPROVED",
  REJECTED: "TASK_REJECTED",
  POSTING_COMPOSE_OPENED: "TASK_POSTING_COMPOSE_OPENED",
  SETTLEMENT_DRAFT_APPLIED: "TASK_SETTLEMENT_DRAFT_APPLIED",
  OUTPUT_COPIED: "TASK_OUTPUT_COPIED",
} as const;

export type AgentTaskUsageKind =
  | "POSTING_COMPOSE"
  | "SETTLEMENT_DRAFT"
  | "OUTPUT_COPY";

export type AgentTaskFollowThroughAuditAction =
  | typeof AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED
  | typeof AGENT_TASK_AUDIT_ACTION.SETTLEMENT_DRAFT_APPLIED
  | typeof AGENT_TASK_AUDIT_ACTION.OUTPUT_COPIED;

export function getCreateAuditAction(requiresApproval: boolean): string {
  return requiresApproval
    ? AGENT_TASK_AUDIT_ACTION.CREATED_WAITING_APPROVAL
    : AGENT_TASK_AUDIT_ACTION.CREATED_DONE;
}

export function buildCreateAuditMeta(params: {
  taskType: TaskType;
  requiresApproval: boolean;
  roleId: CreatorAiAgentRole | null;
}): Prisma.InputJsonValue {
  return {
    taskType: params.taskType,
    requiresApproval: params.requiresApproval,
    roleId: params.roleId,
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

export function toFollowThroughAuditAction(
  value: unknown
): AgentTaskFollowThroughAuditAction | null {
  if (value === AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED) {
    return value;
  }
  if (value === AGENT_TASK_AUDIT_ACTION.SETTLEMENT_DRAFT_APPLIED) {
    return value;
  }
  if (value === AGENT_TASK_AUDIT_ACTION.OUTPUT_COPIED) {
    return value;
  }
  return null;
}

export function getTaskFollowThroughUsageKind(
  taskType: TaskType
): AgentTaskUsageKind | null {
  if (
    taskType === "ANNOUNCEMENT_DRAFT" ||
    taskType === "PROPOSE" ||
    taskType === "SUPPORT_STORY_DRAFT" ||
    taskType === "TRANSLATE"
  ) {
    return "POSTING_COMPOSE";
  }

  if (taskType === "DISTRIBUTION_PLAN_DRAFT") {
    return "SETTLEMENT_DRAFT";
  }

  if (taskType === "SUPPORTER_MESSAGE_DRAFT") {
    return "OUTPUT_COPY";
  }

  return null;
}

export function getTaskFollowThroughAuditAction(
  taskType: TaskType
): AgentTaskFollowThroughAuditAction | null {
  const usageKind = getTaskFollowThroughUsageKind(taskType);
  if (usageKind === "POSTING_COMPOSE") {
    return AGENT_TASK_AUDIT_ACTION.POSTING_COMPOSE_OPENED;
  }
  if (usageKind === "SETTLEMENT_DRAFT") {
    return AGENT_TASK_AUDIT_ACTION.SETTLEMENT_DRAFT_APPLIED;
  }
  if (usageKind === "OUTPUT_COPY") {
    return AGENT_TASK_AUDIT_ACTION.OUTPUT_COPIED;
  }
  return null;
}

export function buildFollowThroughAuditMeta(params: {
  taskType: TaskType;
  usageKind: AgentTaskUsageKind;
}): Prisma.InputJsonValue {
  return {
    taskType: params.taskType,
    usageKind: params.usageKind,
  } as Prisma.InputJsonValue;
}
