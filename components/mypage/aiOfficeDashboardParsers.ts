import type {
  AgentTaskView,
  MetricSnapshotView,
  MetricTrendDayView,
  SocialConnectionView,
} from "@/components/mypage/aiOfficeTypes";

export type AiOfficeMetricsParseResult = {
  totals: { views: number; likes: number; comments: number; shares: number };
  snapshots: MetricSnapshotView[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

export function parseAiOfficeConnections(json: unknown): SocialConnectionView[] {
  if (!isRecord(json)) return [];
  const rows = asArray(json.connections);
  const out: SocialConnectionView[] = [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = asStringOrNull(row.id);
    const platform = asStringOrNull(row.platform);
    const accountHandle = asStringOrNull(row.accountHandle);
    const status = asStringOrNull(row.status);
    const createdAt = asStringOrNull(row.createdAt);
    if (!id || !platform || !accountHandle || !status || !createdAt) continue;
    out.push({ id, platform, accountHandle, status, createdAt });
  }

  return out;
}

export function parseAiOfficeTasks(json: unknown): AgentTaskView[] {
  if (!isRecord(json)) return [];
  const rows = asArray(json.tasks);
  const out: AgentTaskView[] = [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = asStringOrNull(row.id);
    const projectId = asStringOrNull(row.projectId);
    const taskType = asStringOrNull(row.taskType);
    const status = asStringOrNull(row.status);
    const approvedBy = asStringOrNull(row.approvedBy);
    const approvedAt = asStringOrNull(row.approvedAt);
    const createdAt = asStringOrNull(row.createdAt);
    if (!id || !taskType || !status || !createdAt) continue;

    const auditLogs = asArray(row.auditLogs)
      .map((log) => {
        if (!isRecord(log)) return null;
        const logId = asStringOrNull(log.id);
        const action = asStringOrNull(log.action);
        const actorAddress = asStringOrNull(log.actorAddress);
        const logCreatedAt = asStringOrNull(log.createdAt);
        const meta = isRecord(log.meta) ? log.meta : null;
        const note = meta ? asStringOrNull(meta.note) : null;
        if (!logId || !action || !logCreatedAt) return null;
        return {
          id: logId,
          action,
          actorAddress,
          createdAt: logCreatedAt,
          note,
        };
      })
      .filter(
        (
          log
        ): log is {
          id: string;
          action: string;
          actorAddress: string | null;
          createdAt: string;
          note: string | null;
        } => log !== null
      );

    out.push({
      id,
      projectId,
      taskType,
      status,
      approvedBy,
      approvedAt,
      createdAt,
      output: row.output,
      auditLogs,
    });
  }

  return out;
}

export function parseAiOfficeMetrics(json: unknown): AiOfficeMetricsParseResult {
  const empty = {
    totals: { views: 0, likes: 0, comments: 0, shares: 0 },
    snapshots: [] as MetricSnapshotView[],
  };
  if (!isRecord(json)) return empty;

  const totalsRaw = isRecord(json.totals) ? json.totals : {};
  const totals = {
    views: asNumberOrNull(totalsRaw.views) ?? 0,
    likes: asNumberOrNull(totalsRaw.likes) ?? 0,
    comments: asNumberOrNull(totalsRaw.comments) ?? 0,
    shares: asNumberOrNull(totalsRaw.shares) ?? 0,
  };

  const rows = asArray(json.snapshots);
  const snapshots: MetricSnapshotView[] = [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = asStringOrNull(row.id);
    const platform = asStringOrNull(row.platform);
    const capturedAt = asStringOrNull(row.capturedAt);
    if (!id || !platform || !capturedAt) continue;
    snapshots.push({
      id,
      platform,
      capturedAt,
      views: asNumberOrNull(row.views),
      likes: asNumberOrNull(row.likes),
      comments: asNumberOrNull(row.comments),
      shares: asNumberOrNull(row.shares),
    });
  }

  return { totals, snapshots };
}

export function parseAiOfficeMetricTrends(
  json: unknown
): MetricTrendDayView[] {
  if (!isRecord(json)) return [];
  const rows = asArray(json.daily);
  const out: MetricTrendDayView[] = [];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const date = asStringOrNull(row.date);
    if (!date) continue;
    const topRaw = isRecord(row.topPlatform) ? row.topPlatform : null;
    const topPlatform =
      topRaw && asStringOrNull(topRaw.platform)
        ? {
            platform: asStringOrNull(topRaw.platform) ?? "",
            rate: asNumberOrNull(topRaw.rate) ?? 0,
            count: asNumberOrNull(topRaw.count) ?? 0,
          }
        : null;

    out.push({
      date,
      views: asNumberOrNull(row.views) ?? 0,
      likes: asNumberOrNull(row.likes) ?? 0,
      comments: asNumberOrNull(row.comments) ?? 0,
      shares: asNumberOrNull(row.shares) ?? 0,
      interactionRate: asNumberOrNull(row.interactionRate) ?? 0,
      topPlatform,
    });
  }

  return out;
}
