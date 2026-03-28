import type {
  AiOfficeContentSummaryView,
  AiOfficeRoleUsefulnessView,
  AiOfficeUsefulnessSummaryView,
  AgentTaskView,
  MetricSnapshotView,
  MetricTrendDayView,
} from "@/components/mypage/aiOfficeTypes";
import { getEmptyAiOfficeUsefulnessSummary } from "@/components/mypage/aiOfficeTypes";
import { isRecord } from "@/lib/api/guards";
import { toCreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";

export type AiOfficeMetricsParseResult = {
  totals: { views: number; likes: number; comments: number; shares: number };
  snapshots: MetricSnapshotView[];
};

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

function asNonNegativeNumber(v: unknown): number | null {
  const parsed = asNumberOrNull(v);
  if (parsed === null) return null;
  return parsed >= 0 ? parsed : 0;
}

export function parseAiOfficeContentSummary(
  json: unknown
): AiOfficeContentSummaryView {
  return {
    totalPosts:
      isRecord(json) ? asNumberOrNull(json.totalPosts) ?? 0 : 0,
    publishedPosts:
      isRecord(json) ? asNumberOrNull(json.publishedPosts) ?? 0 : 0,
    draftPosts:
      isRecord(json) ? asNumberOrNull(json.draftPosts) ?? 0 : 0,
    archivedPosts:
      isRecord(json) ? asNumberOrNull(json.archivedPosts) ?? 0 : 0,
    aiGeneratedPosts:
      isRecord(json) ? asNumberOrNull(json.aiGeneratedPosts) ?? 0 : 0,
    lastPostAt:
      isRecord(json) && json.lastPostAt !== null
        ? asStringOrNull(json.lastPostAt)
        : null,
    lastPublishedAt:
      isRecord(json) && json.lastPublishedAt !== null
        ? asStringOrNull(json.lastPublishedAt)
        : null,
  };
}

export function parseAiOfficeUsefulnessSummary(
  json: unknown
): AiOfficeUsefulnessSummaryView {
  const empty = getEmptyAiOfficeUsefulnessSummary();
  if (!isRecord(json)) return empty;

  const roleBreakdown: AiOfficeRoleUsefulnessView[] = asArray(json.roleBreakdown)
    .map((row) => {
      if (!isRecord(row)) return null;
      const roleId = toCreatorAiAgentRole(row.roleId);
      const label = asStringOrNull(row.label);
      if (!roleId || !label) return null;

      return {
        roleId,
        label,
        actionableCount:
          asNonNegativeNumber(row.actionableCount) ?? 0,
        trackedReadyCount:
          asNonNegativeNumber(row.trackedReadyCount) ?? 0,
        usedCount: asNonNegativeNumber(row.usedCount) ?? 0,
        waitingApprovalCount:
          asNonNegativeNumber(row.waitingApprovalCount) ?? 0,
        approvedCount: asNonNegativeNumber(row.approvedCount) ?? 0,
        rejectedCount: asNonNegativeNumber(row.rejectedCount) ?? 0,
        ignoredCount: asNonNegativeNumber(row.ignoredCount) ?? 0,
        followThroughRate:
          asNonNegativeNumber(row.followThroughRate) ?? 0,
        usedRate: asNonNegativeNumber(row.usedRate) ?? 0,
      };
    })
    .filter(
      (row): row is AiOfficeRoleUsefulnessView => row !== null
    );

  return {
    windowDays: asNonNegativeNumber(json.windowDays) ?? empty.windowDays,
    staleAfterHours:
      asNonNegativeNumber(json.staleAfterHours) ?? empty.staleAfterHours,
    createdCount: asNonNegativeNumber(json.createdCount) ?? empty.createdCount,
    actionableCount:
      asNonNegativeNumber(json.actionableCount) ?? empty.actionableCount,
    autoCompletedCount:
      asNonNegativeNumber(json.autoCompletedCount) ??
      empty.autoCompletedCount,
    trackedReadyCount:
      asNonNegativeNumber(json.trackedReadyCount) ?? empty.trackedReadyCount,
    waitingApprovalCount:
      asNonNegativeNumber(json.waitingApprovalCount) ??
      empty.waitingApprovalCount,
    approvedCount:
      asNonNegativeNumber(json.approvedCount) ?? empty.approvedCount,
    rejectedCount:
      asNonNegativeNumber(json.rejectedCount) ?? empty.rejectedCount,
    ignoredCount: asNonNegativeNumber(json.ignoredCount) ?? empty.ignoredCount,
    followThroughCount:
      asNonNegativeNumber(json.followThroughCount) ??
      empty.followThroughCount,
    followThroughRate:
      asNonNegativeNumber(json.followThroughRate) ?? empty.followThroughRate,
    usedCount: asNonNegativeNumber(json.usedCount) ?? empty.usedCount,
    usedRate: asNonNegativeNumber(json.usedRate) ?? empty.usedRate,
    approvalRate:
      asNonNegativeNumber(json.approvalRate) ?? empty.approvalRate,
    rejectionRate:
      asNonNegativeNumber(json.rejectionRate) ?? empty.rejectionRate,
    medianDecisionHours:
      json.medianDecisionHours === null
        ? null
        : asNonNegativeNumber(json.medianDecisionHours),
    roleBreakdown,
  };
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

    const rejectReason = asStringOrNull(row.rejectReason);

    out.push({
      id,
      projectId,
      taskType,
      status,
      approvedBy,
      approvedAt,
      rejectReason,
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
