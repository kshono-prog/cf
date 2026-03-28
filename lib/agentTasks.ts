import { prisma } from "@/lib/prisma";

export {
  isJsonValueForStorage,
  parseTaskIds,
  toProjectIdOrNull,
  toTaskApprovalAction,
  toTaskStatus,
  toTaskType,
  type TaskApprovalAction,
  type TaskStatus,
  type TaskType,
} from "@/lib/agentTaskParsers";
export {
  approveWaitingTasks,
  buildTaskOutput,
  createAgentTask,
  getTaskOutputSchema,
  rejectWaitingTasks,
  validateTaskInput,
} from "@/lib/agentTaskExecutors";

export async function resolveCreatorByAddress(
  address: string
): Promise<{ id: bigint } | null> {
  return prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });
}

type SerializableAuditLog = {
  id: string;
  action: string;
  actorAddress: string | null;
  metaJson: unknown;
  createdAt: Date;
};

type SerializableTask = {
  id: string;
  projectId: bigint | null;
  taskType: string;
  status: string;
  requestedBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectReason?: string | null;
  inputJson: unknown;
  outputJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  auditLogs?: SerializableAuditLog[];
};

export function serializeAgentTask(row: SerializableTask) {
  return {
    id: row.id,
    projectId: row.projectId?.toString() ?? null,
    taskType: row.taskType,
    status: row.status,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectReason: row.rejectReason ?? null,
    input: row.inputJson,
    output: row.outputJson,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.auditLogs
      ? {
          auditLogs: row.auditLogs.map((log) => ({
            id: log.id,
            action: log.action,
            actorAddress: log.actorAddress,
            meta: log.metaJson,
            createdAt: log.createdAt.toISOString(),
          })),
        }
      : {}),
  };
}
