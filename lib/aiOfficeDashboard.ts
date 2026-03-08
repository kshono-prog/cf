import { prisma } from "@/lib/prisma";
import { serializeAgentTask, toTaskStatus, type TaskStatus } from "@/lib/agentTasks";

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

function serializeConnection(row: {
  id: string;
  platform: string;
  accountHandle: string;
  accountId: string | null;
  status: string;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    platform: row.platform,
    accountHandle: row.accountHandle,
    accountId: row.accountId,
    status: row.status,
    tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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

  const since = new Date(Date.now() - params.trendDays * 24 * 60 * 60 * 1000);

  const [connections, tasks, snapshotRows, trendRows] = await Promise.all([
    prisma.socialConnection.findMany({
      where: { creatorProfileId: creatorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        accountHandle: true,
        accountId: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
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
  ]);

  return {
    creatorId: creatorId.toString(),
    connections: connections.map(serializeConnection),
    tasks: tasks.map((row) => serializeAgentTask(row)),
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
    trends: {
      days: params.trendDays,
      from: since.toISOString(),
      to: new Date().toISOString(),
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
