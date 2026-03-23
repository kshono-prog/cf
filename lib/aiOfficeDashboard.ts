import { prisma } from "@/lib/prisma";
import {
  AGENT_TASK_AUDIT_ACTION,
  getTaskFollowThroughAuditAction,
} from "@/lib/agentTaskAudit";
import { serializeAgentTask, toTaskStatus, toTaskType, type TaskStatus } from "@/lib/agentTasks";
import {
  CREATOR_AI_AGENT_ROLE_DEFINITIONS,
  getPrimaryCreatorAiAgentRoleForTaskType,
  toCreatorAiAgentRole,
  type CreatorAiAgentRole,
} from "@/lib/creator-ai/agentRoleRegistry";

export const AI_OFFICE_USEFULNESS_WINDOW_DAYS = 30;
export const AI_OFFICE_USEFULNESS_STALE_HOURS = 72;

type AiOfficeUsefulnessTaskRow = {
  taskType: string;
  status: string;
  createdAt: Date;
  approvedAt: Date | null;
  auditLogs: Array<{
    action: string;
    metaJson?: unknown;
    createdAt: Date;
  }>;
};

type AiOfficeRoleUsefulnessSummary = {
  roleId: CreatorAiAgentRole;
  label: string;
  actionableCount: number;
  trackedReadyCount: number;
  usedCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  ignoredCount: number;
  followThroughRate: number;
  usedRate: number;
};

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}

function toMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return Number(sorted[middle]!.toFixed(2));
  }

  const left = sorted[middle - 1];
  const right = sorted[middle];
  if (left === undefined || right === undefined) return null;
  return Number((((left + right) / 2)).toFixed(2));
}

function hasAuditAction(
  logs: AiOfficeUsefulnessTaskRow["auditLogs"],
  action: string
): boolean {
  return logs.some((log) => log.action === action);
}

function resolveTaskRoleId(row: AiOfficeUsefulnessTaskRow): CreatorAiAgentRole | null {
  const createLog = row.auditLogs.find(
    (log) =>
      log.action === AGENT_TASK_AUDIT_ACTION.CREATED_WAITING_APPROVAL ||
      log.action === AGENT_TASK_AUDIT_ACTION.CREATED_DONE
  );

  if (
    createLog &&
    typeof createLog.metaJson === "object" &&
    createLog.metaJson !== null &&
    "roleId" in createLog.metaJson
  ) {
    const roleId = toCreatorAiAgentRole(createLog.metaJson.roleId);
    if (roleId) return roleId;
  }

  const taskType = toTaskType(row.taskType);
  if (!taskType) return null;
  return getPrimaryCreatorAiAgentRoleForTaskType(taskType);
}

export function buildAiOfficeUsefulnessSummary(
  rows: AiOfficeUsefulnessTaskRow[],
  params?: {
    now?: Date;
    windowDays?: number;
    staleAfterHours?: number;
  }
) {
  const now = params?.now ?? new Date();
  const windowDays = params?.windowDays ?? AI_OFFICE_USEFULNESS_WINDOW_DAYS;
  const staleAfterHours =
    params?.staleAfterHours ?? AI_OFFICE_USEFULNESS_STALE_HOURS;
  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;

  let actionableCount = 0;
  let autoCompletedCount = 0;
  let trackedReadyCount = 0;
  let usedCount = 0;
  let waitingApprovalCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let ignoredCount = 0;
  const decisionHours: number[] = [];

  for (const row of rows) {
    const createdWaitingApproval = hasAuditAction(
      row.auditLogs,
      AGENT_TASK_AUDIT_ACTION.CREATED_WAITING_APPROVAL
    );
    const createdDone = hasAuditAction(
      row.auditLogs,
      AGENT_TASK_AUDIT_ACTION.CREATED_DONE
    );
    const approved = hasAuditAction(
      row.auditLogs,
      AGENT_TASK_AUDIT_ACTION.APPROVED
    );
    const rejected = hasAuditAction(
      row.auditLogs,
      AGENT_TASK_AUDIT_ACTION.REJECTED
    );
    const taskType = toTaskType(row.taskType);
    const followThroughAction = taskType
      ? getTaskFollowThroughAuditAction(taskType)
      : null;

    if (createdDone) {
      autoCompletedCount += 1;
    }

    if (followThroughAction && (createdDone || approved)) {
      trackedReadyCount += 1;
      if (hasAuditAction(row.auditLogs, followThroughAction)) {
        usedCount += 1;
      }
    }

    if (!createdWaitingApproval) {
      continue;
    }

    actionableCount += 1;

    if (approved) {
      approvedCount += 1;
      if (row.approvedAt) {
        const hours = (row.approvedAt.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000);
        if (Number.isFinite(hours) && hours >= 0) {
          decisionHours.push(hours);
        }
      }
      continue;
    }

    if (rejected) {
      rejectedCount += 1;
      if (row.approvedAt) {
        const hours = (row.approvedAt.getTime() - row.createdAt.getTime()) / (60 * 60 * 1000);
        if (Number.isFinite(hours) && hours >= 0) {
          decisionHours.push(hours);
        }
      }
      continue;
    }

    if (row.status === "WAITING_APPROVAL") {
      waitingApprovalCount += 1;
      if (now.getTime() - row.createdAt.getTime() >= staleAfterMs) {
        ignoredCount += 1;
      }
    }
  }

  const followThroughCount = approvedCount + rejectedCount;

  return {
    windowDays,
    staleAfterHours,
    createdCount: rows.length,
    actionableCount,
    autoCompletedCount,
    trackedReadyCount,
    waitingApprovalCount,
    approvedCount,
    rejectedCount,
    ignoredCount,
    followThroughCount,
    followThroughRate: toRate(followThroughCount, actionableCount),
    usedCount,
    usedRate: toRate(usedCount, trackedReadyCount),
    approvalRate: toRate(approvedCount, actionableCount),
    rejectionRate: toRate(rejectedCount, actionableCount),
    medianDecisionHours: toMedian(decisionHours),
  };
}

export function buildAiOfficeRoleUsefulnessSummary(
  rows: AiOfficeUsefulnessTaskRow[],
  params?: {
    now?: Date;
    staleAfterHours?: number;
  }
): AiOfficeRoleUsefulnessSummary[] {
  const grouped = new Map<CreatorAiAgentRole, AiOfficeUsefulnessTaskRow[]>();

  for (const row of rows) {
    const roleId = resolveTaskRoleId(row);
    if (!roleId) continue;
    const current = grouped.get(roleId) ?? [];
    current.push(row);
    grouped.set(roleId, current);
  }

  return CREATOR_AI_AGENT_ROLE_DEFINITIONS.map((definition) => {
    const roleRows = grouped.get(definition.id);
    if (!roleRows || roleRows.length === 0) return null;

    const summary = buildAiOfficeUsefulnessSummary(roleRows, {
      now: params?.now,
      staleAfterHours: params?.staleAfterHours,
    });
    if (
      summary.actionableCount === 0 &&
      summary.autoCompletedCount === 0 &&
      summary.trackedReadyCount === 0
    ) {
      return null;
    }

    return {
      roleId: definition.id,
      label: definition.label,
      actionableCount: summary.actionableCount,
      trackedReadyCount: summary.trackedReadyCount,
      usedCount: summary.usedCount,
      waitingApprovalCount: summary.waitingApprovalCount,
      approvedCount: summary.approvedCount,
      rejectedCount: summary.rejectedCount,
      ignoredCount: summary.ignoredCount,
      followThroughRate: summary.followThroughRate,
      usedRate: summary.usedRate,
    };
  }).filter((item): item is AiOfficeRoleUsefulnessSummary => item !== null);
}

function sumInt(values: Array<number | null>): number {
  let total = 0;
  for (const value of values) {
    if (typeof value !== "number") continue;
    if (!Number.isFinite(value)) continue;
    total += Math.max(0, Math.trunc(value));
  }
  return total;
}

function toSafeInt(v: number | null): number {
  if (typeof v !== "number") return 0;
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.trunc(v));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function aggregateDaily(
  rows: Array<{
    platform: string;
    capturedAt: Date;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
  }>
) {
  const daily = new Map<
    string,
    {
      views: number;
      likes: number;
      comments: number;
      shares: number;
      count: number;
      byPlatform: Map<string, { views: number; interactions: number; count: number }>;
    }
  >();

  for (const row of rows) {
    const key = dayKey(row.capturedAt);
    const item = daily.get(key) ?? {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      count: 0,
      byPlatform: new Map<string, { views: number; interactions: number; count: number }>(),
    };

    const views = toSafeInt(row.views);
    const likes = toSafeInt(row.likes);
    const comments = toSafeInt(row.comments);
    const shares = toSafeInt(row.shares);

    item.views += views;
    item.likes += likes;
    item.comments += comments;
    item.shares += shares;
    item.count += 1;

    const platformStat = item.byPlatform.get(row.platform) ?? {
      views: 0,
      interactions: 0,
      count: 0,
    };
    platformStat.views += views;
    platformStat.interactions += likes + comments + shares;
    platformStat.count += 1;
    item.byPlatform.set(row.platform, platformStat);

    daily.set(key, item);
  }

  const sortedKeys = Array.from(daily.keys()).sort((a, b) => a.localeCompare(b));

  return sortedKeys.map((key) => {
    const item = daily.get(key)!;
    const interactions = item.likes + item.comments + item.shares;
    const interactionRate = item.views > 0 ? interactions / item.views : 0;

    const topPlatform =
      Array.from(item.byPlatform.entries())
        .map(([platform, stat]) => ({
          platform,
          count: stat.count,
          rate: stat.views > 0 ? stat.interactions / stat.views : 0,
        }))
        .sort((a, b) => b.rate - a.rate)[0] ?? null;

    return {
      date: key,
      count: item.count,
      views: item.views,
      likes: item.likes,
      comments: item.comments,
      shares: item.shares,
      interactionRate,
      topPlatform: topPlatform
        ? {
            platform: topPlatform.platform,
            rate: topPlatform.rate,
            count: topPlatform.count,
          }
        : null,
    };
  });
}

export async function resolveCreatorIdByAddress(
  address: string
): Promise<bigint | null> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });
  return creator?.id ?? null;
}

export async function getAiOfficeDashboard(params: {
  address: string;
  projectId: bigint | null;
  taskStatus: TaskStatus | null;
  metricLimit: number;
  trendDays: number;
  taskLimit: number;
}) {
  const creatorId = await resolveCreatorIdByAddress(params.address);
  if (!creatorId) return null;

  const dashboardNow = new Date();
  const since = new Date(
    dashboardNow.getTime() - params.trendDays * 24 * 60 * 60 * 1000
  );
  const usefulnessSince = new Date(
    dashboardNow.getTime() -
      AI_OFFICE_USEFULNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [
    tasks,
    usefulnessRows,
    snapshotRows,
    trendRows,
    totalPostCount,
    publishedPostCount,
    draftPostCount,
    archivedPostCount,
    aiGeneratedPostCount,
    latestPost,
    latestPublishedPost,
  ] = await Promise.all([
    prisma.agentTask.findMany({
      where: {
        creatorProfileId: creatorId,
        ...(params.taskStatus ? { status: params.taskStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.taskLimit,
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
    }),
    prisma.agentTask.findMany({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        createdAt: { gte: usefulnessSince },
      },
      select: {
        taskType: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        auditLogs: {
          select: {
            action: true,
            metaJson: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.contentMetricSnapshot.findMany({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
      },
      orderBy: { capturedAt: "desc" },
      take: params.metricLimit,
      select: {
        id: true,
        projectId: true,
        platform: true,
        contentExternalId: true,
        contentUrl: true,
        postedAt: true,
        capturedAt: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
      },
    }),
    prisma.contentMetricSnapshot.findMany({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: "asc" },
      select: {
        platform: true,
        capturedAt: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
      },
    }),
    prisma.post.count({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
      },
    }),
    prisma.post.count({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        status: "PUBLISHED",
      },
    }),
    prisma.post.count({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        status: "DRAFT",
      },
    }),
    prisma.post.count({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        status: "ARCHIVED",
      },
    }),
    prisma.post.count({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        aiGenerated: true,
      },
    }),
    prisma.post.findFirst({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.post.findFirst({
      where: {
        creatorProfileId: creatorId,
        ...(params.projectId ? { projectId: params.projectId } : {}),
        status: "PUBLISHED",
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    creatorId: creatorId.toString(),
    tasks: tasks.map((row) => serializeAgentTask(row)),
    usefulness: {
      ...buildAiOfficeUsefulnessSummary(usefulnessRows, {
        now: dashboardNow,
        windowDays: AI_OFFICE_USEFULNESS_WINDOW_DAYS,
        staleAfterHours: AI_OFFICE_USEFULNESS_STALE_HOURS,
      }),
      roleBreakdown: buildAiOfficeRoleUsefulnessSummary(usefulnessRows, {
        now: dashboardNow,
        staleAfterHours: AI_OFFICE_USEFULNESS_STALE_HOURS,
      }),
    },
    metrics: {
      count: snapshotRows.length,
      limit: params.metricLimit,
      projectId: params.projectId?.toString() ?? null,
      totals: {
        views: sumInt(snapshotRows.map((row) => row.views)),
        likes: sumInt(snapshotRows.map((row) => row.likes)),
        comments: sumInt(snapshotRows.map((row) => row.comments)),
        shares: sumInt(snapshotRows.map((row) => row.shares)),
      },
      snapshots: snapshotRows.map((row) => ({
        id: row.id,
        projectId: row.projectId?.toString() ?? null,
        platform: row.platform,
        contentExternalId: row.contentExternalId,
        contentUrl: row.contentUrl,
        postedAt: row.postedAt?.toISOString() ?? null,
        capturedAt: row.capturedAt.toISOString(),
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
      })),
    },
    content: {
      totalPosts: totalPostCount,
      publishedPosts: publishedPostCount,
      draftPosts: draftPostCount,
      archivedPosts: archivedPostCount,
      aiGeneratedPosts: aiGeneratedPostCount,
      lastPostAt: latestPost?.createdAt.toISOString() ?? null,
      lastPublishedAt: latestPublishedPost?.createdAt.toISOString() ?? null,
    },
    trends: {
      days: params.trendDays,
      from: since.toISOString(),
      to: dashboardNow.toISOString(),
      count: trendRows.length,
      projectId: params.projectId?.toString() ?? null,
      daily: aggregateDaily(trendRows),
    },
    taskStatus: params.taskStatus,
  };
}

export function toAiOfficeTaskStatus(v: unknown): TaskStatus | null {
  return toTaskStatus(v);
}
