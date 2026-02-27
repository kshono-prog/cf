"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type Platform = "YOUTUBE" | "X" | "INSTAGRAM" | "TIKTOK";
type TaskType = "ANALYZE" | "PROPOSE" | "TRANSLATE";
type TaskFilter = "ALL" | "WAITING_APPROVAL";

type SocialConnectionView = {
  id: string;
  platform: string;
  accountHandle: string;
  status: string;
  createdAt: string;
};

type AgentTaskView = {
  id: string;
  projectId: string | null;
  taskType: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  output: unknown;
  auditLogs: Array<{
    id: string;
    action: string;
    actorAddress: string | null;
    createdAt: string;
    note: string | null;
  }>;
};

type MetricSnapshotView = {
  id: string;
  platform: string;
  capturedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
};

type MetricTrendDayView = {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  interactionRate: number;
  topPlatform: { platform: string; rate: number; count: number } | null;
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

function parseConnections(json: unknown): SocialConnectionView[] {
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

function parseTasks(json: unknown): AgentTaskView[] {
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
    const auditLogsRaw = asArray(row.auditLogs);
    const auditLogs: Array<{
      id: string;
      action: string;
      actorAddress: string | null;
      createdAt: string;
      note: string | null;
    }> = [];
    for (const log of auditLogsRaw) {
      if (!isRecord(log)) continue;
      const logId = asStringOrNull(log.id);
      const action = asStringOrNull(log.action);
      const actorAddress = asStringOrNull(log.actorAddress);
      const logCreatedAt = asStringOrNull(log.createdAt);
      const meta = isRecord(log.meta) ? log.meta : null;
      const note = meta ? asStringOrNull(meta.note) : null;
      if (!logId || !action || !logCreatedAt) continue;
      auditLogs.push({
        id: logId,
        action,
        actorAddress,
        createdAt: logCreatedAt,
        note,
      });
    }
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

function asNumberOrNull(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

function parseMetrics(json: unknown): {
  totals: { views: number; likes: number; comments: number; shares: number };
  snapshots: MetricSnapshotView[];
} {
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

function parseMetricTrends(json: unknown): MetricTrendDayView[] {
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

function stringifyOutput(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "{}";
  }
}

type AnalyzeOutputView = {
  summary: string;
  keyInsights: string[];
  nextActions: string[];
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  } | null;
  topPlatform: string | null;
  topRateText: string | null;
  trendPoints: Array<{
    date: string;
    views: number;
    interactionRate: number;
  }>;
  viewsDeltaPct: number | null;
  rateDeltaPct: number | null;
};

function parseAnalyzeOutput(v: unknown): AnalyzeOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const keyInsights = asArray(v.keyInsights)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  const nextActions = asArray(v.nextActions)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);

  const metrics = isRecord(v.metrics) ? v.metrics : null;
  const totalsRaw = metrics && isRecord(metrics.totals) ? metrics.totals : null;
  const totals = totalsRaw
    ? {
        views: asNumberOrNull(totalsRaw.views) ?? 0,
        likes: asNumberOrNull(totalsRaw.likes) ?? 0,
        comments: asNumberOrNull(totalsRaw.comments) ?? 0,
        shares: asNumberOrNull(totalsRaw.shares) ?? 0,
      }
    : null;

  const byPlatform = metrics ? asArray(metrics.byPlatform) : [];
  let topPlatform: string | null = null;
  let topRateText: string | null = null;
  const first = byPlatform[0];
  if (isRecord(first)) {
    topPlatform = asStringOrNull(first.platform);
    const rate = asNumberOrNull(first.interactionRate);
    if (typeof rate === "number") {
      topRateText = `${(rate * 100).toFixed(2)}%`;
    }
  }

  const trendRaw = metrics && isRecord(metrics.trend) ? metrics.trend : null;
  const trendPointsRaw = trendRaw ? asArray(trendRaw.points) : [];
  const trendPoints: Array<{
    date: string;
    views: number;
    interactionRate: number;
  }> = [];
  for (const point of trendPointsRaw) {
    if (!isRecord(point)) continue;
    const date = asStringOrNull(point.date);
    if (!date) continue;
    trendPoints.push({
      date,
      views: asNumberOrNull(point.views) ?? 0,
      interactionRate: asNumberOrNull(point.interactionRate) ?? 0,
    });
  }
  const viewsDeltaPct = trendRaw ? asNumberOrNull(trendRaw.viewsDeltaPct) : null;
  const rateDeltaPct = trendRaw ? asNumberOrNull(trendRaw.rateDeltaPct) : null;

  return {
    summary,
    keyInsights,
    nextActions,
    totals,
    topPlatform,
    topRateText,
    trendPoints,
    viewsDeltaPct,
    rateDeltaPct,
  };
}

function AnalyzeOutputCard(props: { output: AnalyzeOutputView }) {
  const { output } = props;
  const points = output.trendPoints.slice(-5);
  const viewsDeltaText =
    output.viewsDeltaPct == null
      ? null
      : `${output.viewsDeltaPct >= 0 ? "+" : ""}${(
          output.viewsDeltaPct * 100
        ).toFixed(1)}%`;
  const rateDeltaText =
    output.rateDeltaPct == null
      ? null
      : `${output.rateDeltaPct >= 0 ? "+" : ""}${(
          output.rateDeltaPct * 100
        ).toFixed(1)}%`;
  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      {output.totals ? (
        <div className="grid grid-cols-2 gap-1">
          <div>views: {output.totals.views}</div>
          <div>likes: {output.totals.likes}</div>
          <div>comments: {output.totals.comments}</div>
          <div>shares: {output.totals.shares}</div>
        </div>
      ) : null}
      {output.topPlatform ? (
        <div>
          top: {output.topPlatform}
          {output.topRateText ? ` (${output.topRateText})` : ""}
        </div>
      ) : null}
      {viewsDeltaText || rateDeltaText ? (
        <div>
          delta
          {viewsDeltaText ? ` views:${viewsDeltaText}` : ""}
          {rateDeltaText ? ` rate:${rateDeltaText}` : ""}
        </div>
      ) : null}
      {points.length > 0 ? (
        <div className="rounded border bg-white p-1">
          {points.map((point) => (
            <div key={point.date} className="text-[10px] text-gray-700">
              {point.date} v:{point.views} r:{(point.interactionRate * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      ) : null}
      {output.keyInsights.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.keyInsights.slice(0, 2).map((insight, idx) => (
            <li key={`${insight}:${idx.toString()}`}>{insight}</li>
          ))}
        </ul>
      ) : null}
      {output.nextActions.length > 0 ? (
        <ul className="list-disc pl-4">
          {output.nextActions.slice(0, 2).map((action, idx) => (
            <li key={`${action}:${idx.toString()}`}>{action}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type ProposeOutputView = {
  summary: string;
  proposals: string[];
  metricsHint: Array<{
    platform: string;
    posts: number;
    interactionRate: number;
    interactions: number;
    views: number;
  }>;
};

function parseProposeOutput(v: unknown): ProposeOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;
  const proposals = asArray(v.proposals)
    .map(asStringOrNull)
    .filter((x): x is string => !!x);
  if (proposals.length === 0) return null;
  const hintRows = asArray(v.metricsHint);
  const metricsHint: Array<{
    platform: string;
    posts: number;
    interactionRate: number;
    interactions: number;
    views: number;
  }> = [];
  for (const row of hintRows) {
    if (!isRecord(row)) continue;
    const platform = asStringOrNull(row.platform);
    if (!platform) continue;
    metricsHint.push({
      platform,
      posts: asNumberOrNull(row.posts) ?? 0,
      interactionRate: asNumberOrNull(row.interactionRate) ?? 0,
      interactions: asNumberOrNull(row.interactions) ?? 0,
      views: asNumberOrNull(row.views) ?? 0,
    });
  }
  return { summary, proposals, metricsHint };
}

function ProposeOutputCard(props: { output: ProposeOutputView }) {
  const { output } = props;
  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      {output.metricsHint.length > 0 ? (
        <div className="rounded border bg-white p-1">
          {output.metricsHint.slice(0, 3).map((item) => (
            <div
              key={item.platform}
              className="text-[10px] text-gray-700"
            >
              {item.platform} posts:{item.posts} rate:
              {(item.interactionRate * 100).toFixed(1)}% (
              {item.interactions}/{item.views})
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid gap-1">
        {output.proposals.slice(0, 3).map((proposal, idx) => (
          <div
            key={`${proposal}:${idx.toString()}`}
            className="rounded border bg-white px-2 py-1 text-gray-800"
          >
            {idx + 1}. {proposal}
          </div>
        ))}
      </div>
    </div>
  );
}

type TranslateOutputView = {
  summary: string;
  translations: Array<{
    lang: string;
    text: string;
  }>;
};

function parseTranslateOutput(v: unknown): TranslateOutputView | null {
  if (!isRecord(v)) return null;
  const summary = asStringOrNull(v.summary);
  if (!summary) return null;

  const rows = asArray(v.translations);
  const translations: Array<{ lang: string; text: string }> = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const lang = asStringOrNull(row.lang);
    const text = asStringOrNull(row.text);
    if (!lang || !text) continue;
    translations.push({ lang, text });
  }
  if (translations.length === 0) return null;
  return { summary, translations };
}

function TranslateOutputCard(props: { output: TranslateOutputView }) {
  const { output } = props;
  return (
    <div className="mt-1 rounded bg-gray-50 p-2 text-[11px] space-y-2">
      <div className="font-medium text-gray-800">{output.summary}</div>
      <div className="grid gap-1">
        {output.translations.slice(0, 4).map((item, idx) => (
          <div
            key={`${item.lang}:${idx.toString()}`}
            className="rounded border bg-white px-2 py-1 text-gray-800"
          >
            <div className="text-[10px] text-gray-500">{item.lang}</div>
            <div className="whitespace-pre-wrap">{item.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiOfficePanel(props: {
  walletAddress: string | null;
  projectId: string | null;
  isConnected: boolean;
}) {
  const { walletAddress, projectId, isConnected } = props;

  const [connections, setConnections] = useState<SocialConnectionView[]>([]);
  const [tasks, setTasks] = useState<AgentTaskView[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [metricsTotals, setMetricsTotals] = useState<{
    views: number;
    likes: number;
    comments: number;
    shares: number;
  }>({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  });
  const [metricsSnapshots, setMetricsSnapshots] = useState<MetricSnapshotView[]>(
    []
  );
  const [metricTrends, setMetricTrends] = useState<MetricTrendDayView[]>([]);

  const [platform, setPlatform] = useState<Platform>("YOUTUBE");
  const [accountHandle, setAccountHandle] = useState<string>("");
  const [taskType, setTaskType] = useState<TaskType>("PROPOSE");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("ALL");
  const [requiresApproval, setRequiresApproval] = useState<boolean>(true);
  const [translationInput, setTranslationInput] = useState<string>("");
  const [translationLang, setTranslationLang] = useState<"ja" | "en" | "ko" | "zh">("en");
  const [translationResult, setTranslationResult] = useState<string>("");
  const [approvalNote, setApprovalNote] = useState<string>("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const BULK_CONFIRM_THRESHOLD = 5;

  const canUse = isConnected && !!walletAddress;
  const waitingApprovalCount = useMemo(
    () => tasks.filter((task) => task.status === "WAITING_APPROVAL").length,
    [tasks]
  );
  const waitingTaskIds = useMemo(
    () => tasks.filter((task) => task.status === "WAITING_APPROVAL").map((task) => task.id),
    [tasks]
  );

  const headers = useMemo(() => ({ "Content-Type": "application/json" }), []);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setConnections([]);
      setTasks([]);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const [connRes, taskRes] = await Promise.all([
        fetch(`/api/social/connections?address=${encodeURIComponent(walletAddress)}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/agent/tasks?address=${encodeURIComponent(walletAddress)}${
            taskFilter === "WAITING_APPROVAL" ? "&status=WAITING_APPROVAL" : ""
          }`,
          { cache: "no-store" }
        ),
      ]);
      const metricsRes = await fetch(
        `/api/metrics/snapshots?address=${encodeURIComponent(walletAddress)}${
          projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""
        }&limit=20`,
        { cache: "no-store" }
      );
      const trendsRes = await fetch(
        `/api/metrics/trends?address=${encodeURIComponent(walletAddress)}${
          projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""
        }&days=7`,
        { cache: "no-store" }
      );

      const connJson: unknown = await connRes.json().catch(() => null);
      const taskJson: unknown = await taskRes.json().catch(() => null);
      const metricsJson: unknown = await metricsRes.json().catch(() => null);
      const trendsJson: unknown = await trendsRes.json().catch(() => null);

      if (connRes.ok) setConnections(parseConnections(connJson));
      if (taskRes.ok) setTasks(parseTasks(taskJson));
      if (metricsRes.ok) {
        const parsed = parseMetrics(metricsJson);
        setMetricsTotals(parsed.totals);
        setMetricsSnapshots(parsed.snapshots);
      }
      if (trendsRes.ok) {
        setMetricTrends(parseMetricTrends(trendsJson));
      }

      if (!connRes.ok || !taskRes.ok || !metricsRes.ok || !trendsRes.ok) {
        setMessage("一部データの取得に失敗しました。");
      }
    } catch {
      setMessage("AI事務所データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, taskFilter, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setSelectedTaskIds((prev) => prev.filter((id) => waitingTaskIds.includes(id)));
  }, [waitingTaskIds]);

  async function addConnection(): Promise<void> {
    if (!walletAddress) return;

    const handle = accountHandle.trim();
    if (!handle) {
      setMessage("アカウントIDを入力してください。");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/social/connections", {
        method: "POST",
        headers,
        body: JSON.stringify({
          address: walletAddress,
          platform,
          accountHandle: handle,
        }),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code = isRecord(json) && typeof json.error === "string" ? json.error : "SOCIAL_CONNECTION_CREATE_FAILED";
        setMessage(code);
        return;
      }

      setAccountHandle("");
      setMessage("SNS連携を保存しました。");
      await refresh();
    } catch {
      setMessage("SNS連携の保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function collectMetrics(): Promise<void> {
    if (!walletAddress) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/metrics/collect", {
        method: "POST",
        headers,
        body: JSON.stringify({
          address: walletAddress,
          projectId,
        }),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code = isRecord(json) && typeof json.error === "string" ? json.error : "METRICS_COLLECT_FAILED";
        setMessage(code);
        return;
      }

      const collected = isRecord(json) && typeof json.collected === "number" ? json.collected : 0;
      setMessage(`metrics を ${collected} 件収集しました。`);
    } catch {
      setMessage("metrics 収集に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function createTask(): Promise<void> {
    if (!walletAddress) return;

    setLoading(true);
    setMessage(null);

    const taskInput: Record<string, unknown> =
      taskType === "TRANSLATE"
        ? {
            text: translationInput.trim(),
            from: "auto",
            to: [translationLang],
          }
        : {
            source: "mypage",
            requestedAt: new Date().toISOString(),
          };

    if (
      taskType === "TRANSLATE" &&
      (typeof taskInput.text !== "string" || taskInput.text.length === 0)
    ) {
      setMessage("TRANSLATE タスクには翻訳テキストが必要です。");
      return;
    }

    try {
      const res = await fetch("/api/agent/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({
          address: walletAddress,
          projectId,
          taskType,
          input: taskInput,
          requiresApproval,
        }),
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code = isRecord(json) && typeof json.error === "string" ? json.error : "AGENT_TASK_CREATE_FAILED";
        setMessage(code);
        return;
      }

      setMessage("AIタスクを作成しました。");
      await refresh();
    } catch {
      setMessage("AIタスク作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function approveTasks(taskIds: string[], action: "APPROVE" | "REJECT"): Promise<void> {
    if (!walletAddress) return;
    if (taskIds.length === 0) {
      setMessage("対象タスクを選択してください。");
      return;
    }
    if (action === "REJECT" && approvalNote.trim().length === 0) {
      setMessage("却下時は承認メモを入力してください。");
      return;
    }
    if (taskIds.length > BULK_CONFIRM_THRESHOLD) {
      const label = action === "APPROVE" ? "承認" : "却下";
      const ok = window.confirm(
        `${taskIds.length}件を一括${label}します。実行しますか？`
      );
      if (!ok) return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/agent/tasks", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          address: walletAddress,
          ...(taskIds.length === 1
            ? { taskId: taskIds[0] }
            : { taskIds }),
          action,
          note: approvalNote.trim() || null,
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : "AGENT_TASK_APPROVAL_FAILED";
        setMessage(code);
        return;
      }

      const updatedCount =
        isRecord(json) && typeof json.updatedCount === "number"
          ? json.updatedCount
          : 1;
      setMessage(
        action === "APPROVE"
          ? `タスクを承認しました (${updatedCount}件)。`
          : `タスクを却下しました (${updatedCount}件)。`
      );
      setApprovalNote("");
      setSelectedTaskIds([]);
      await refresh();
    } catch {
      setMessage("タスク承認処理に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function toggleTaskSelection(taskId: string): void {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  function selectAllWaitingTasks(): void {
    setSelectedTaskIds(waitingTaskIds);
  }

  function clearSelectedTasks(): void {
    setSelectedTaskIds([]);
  }

  async function translateText(): Promise<void> {
    if (!walletAddress) return;
    const text = translationInput.trim();
    if (!text) {
      setMessage("翻訳するテキストを入力してください。");
      return;
    }

    setLoading(true);
    setMessage(null);
    setTranslationResult("");

    try {
      const res = await fetch("/api/translation", {
        method: "POST",
        headers,
        body: JSON.stringify({
          address: walletAddress,
          text,
          to: [translationLang],
        }),
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : "TRANSLATION_FAILED";
        setMessage(code);
        return;
      }

      if (!isRecord(json) || !Array.isArray(json.translations)) {
        setMessage("TRANSLATION_RESPONSE_INVALID");
        return;
      }
      const first = json.translations[0];
      if (!isRecord(first) || typeof first.text !== "string") {
        setMessage("TRANSLATION_RESPONSE_INVALID");
        return;
      }
      setTranslationResult(first.text);
    } catch {
      setMessage("翻訳API呼び出しに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">AI事務所（Phase1）</h3>
        <div className="flex items-center gap-2">
          <span className="rounded border px-2 py-1 text-[11px] text-gray-700">
            承認待ち: {waitingApprovalCount}
          </span>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs disabled:opacity-40"
            onClick={() => void refresh()}
            disabled={loading || !canUse}
          >
            更新
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`rounded border px-2 py-1 text-xs ${
            taskFilter === "ALL" ? "bg-gray-100" : ""
          }`}
          onClick={() => setTaskFilter("ALL")}
          disabled={loading}
        >
          全件
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 text-xs ${
            taskFilter === "WAITING_APPROVAL" ? "bg-gray-100" : ""
          }`}
          onClick={() => setTaskFilter("WAITING_APPROVAL")}
          disabled={loading}
        >
          承認待ち
        </button>
      </div>

      {!canUse ? (
        <p className="text-sm text-gray-600">ウォレット接続後に利用できます。</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              className="rounded border px-2 py-2 text-sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              disabled={loading}
            >
              <option value="YOUTUBE">YOUTUBE</option>
              <option value="X">X</option>
              <option value="INSTAGRAM">INSTAGRAM</option>
              <option value="TIKTOK">TIKTOK</option>
            </select>
            <input
              className="rounded border px-2 py-2 text-sm"
              value={accountHandle}
              onChange={(e) => setAccountHandle(e.target.value)}
              placeholder="account handle"
              disabled={loading}
            />
            <button
              type="button"
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
              onClick={() => void addConnection()}
              disabled={loading}
            >
              SNS連携を保存
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm disabled:opacity-40"
              onClick={() => void collectMetrics()}
              disabled={loading}
            >
              metrics収集
            </button>
            <select
              className="rounded border px-2 py-2 text-sm"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType)}
              disabled={loading}
            >
              <option value="PROPOSE">PROPOSE</option>
              <option value="ANALYZE">ANALYZE</option>
              <option value="TRANSLATE">TRANSLATE</option>
            </select>
            <label className="inline-flex items-center gap-1 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                disabled={loading}
              />
              承認必要
            </label>
            <button
              type="button"
              className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-40"
              onClick={() => void createTask()}
              disabled={loading}
            >
              AIタスク作成
            </button>
          </div>
          <div className="rounded border p-3 space-y-2">
            <div className="text-xs text-gray-500">承認メモ（承認/却下時に監査ログへ保存）</div>
            <input
              className="w-full rounded border px-2 py-2 text-sm"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              maxLength={300}
              placeholder="例: 数値が安定しているため承認"
              disabled={loading}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600">
                選択中: {selectedTaskIds.length} / 承認待ち: {waitingApprovalCount}
              </span>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                onClick={selectAllWaitingTasks}
                disabled={loading || waitingTaskIds.length === 0}
              >
                承認待ちを全選択
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                onClick={clearSelectedTasks}
                disabled={loading || selectedTaskIds.length === 0}
              >
                選択解除
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => void approveTasks(selectedTaskIds, "APPROVE")}
                disabled={loading || selectedTaskIds.length === 0}
              >
                選択を一括承認
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs disabled:opacity-40"
                onClick={() => void approveTasks(selectedTaskIds, "REJECT")}
                disabled={loading || selectedTaskIds.length === 0}
              >
                選択を一括却下
              </button>
            </div>
          </div>
          <div className="rounded border p-3 space-y-2">
            <div className="text-xs text-gray-500">翻訳APIテスト</div>
            <textarea
              className="w-full rounded border px-2 py-2 text-sm"
              value={translationInput}
              onChange={(e) => setTranslationInput(e.target.value)}
              placeholder="翻訳したい文章"
              disabled={loading}
            />
            <div className="flex items-center gap-2">
              <select
                className="rounded border px-2 py-2 text-sm"
                value={translationLang}
                onChange={(e) =>
                  setTranslationLang(e.target.value as "ja" | "en" | "ko" | "zh")
                }
                disabled={loading}
              >
                <option value="ja">ja</option>
                <option value="en">en</option>
                <option value="ko">ko</option>
                <option value="zh">zh</option>
              </select>
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm disabled:opacity-40"
                onClick={() => void translateText()}
                disabled={loading}
              >
                翻訳
              </button>
            </div>
            {translationResult ? (
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">
                {translationResult}
              </pre>
            ) : null}
          </div>

          {message ? <p className="text-xs text-gray-700">{message}</p> : null}

          <div className="rounded border p-3">
            <div className="text-xs text-gray-500 mb-2">Metrics Summary</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded bg-gray-50 p-2">views: {metricsTotals.views}</div>
              <div className="rounded bg-gray-50 p-2">likes: {metricsTotals.likes}</div>
              <div className="rounded bg-gray-50 p-2">comments: {metricsTotals.comments}</div>
              <div className="rounded bg-gray-50 p-2">shares: {metricsTotals.shares}</div>
            </div>
            <div className="mt-2 space-y-1 max-h-32 overflow-auto text-[11px] text-gray-700">
              {metricsSnapshots.length === 0 ? (
                <div>snapshots なし</div>
              ) : (
                metricsSnapshots.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded bg-gray-50 px-2 py-1">
                    {item.platform} v:{item.views ?? 0} l:{item.likes ?? 0} c:{item.comments ?? 0}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="rounded border p-3">
            <div className="text-xs text-gray-500 mb-2">Metrics Trend (7 days)</div>
            <div className="max-h-36 overflow-auto text-[11px] text-gray-700 space-y-1">
              {metricTrends.length === 0 ? (
                <div>trend なし</div>
              ) : (
                metricTrends.map((day) => (
                  <div key={day.date} className="rounded bg-gray-50 px-2 py-1">
                    {day.date} v:{day.views} i:
                    {day.likes + day.comments + day.shares} rate:
                    {(day.interactionRate * 100).toFixed(2)}%
                    {day.topPlatform
                      ? ` top:${day.topPlatform.platform}(${(
                          day.topPlatform.rate * 100
                        ).toFixed(1)}%)`
                      : ""}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded border p-3">
              <div className="text-xs text-gray-500 mb-2">SNS Connections</div>
              <div className="space-y-1 max-h-40 overflow-auto">
                {connections.length === 0 ? (
                  <p className="text-sm text-gray-600">未登録</p>
                ) : (
                  connections.map((conn) => (
                    <div key={conn.id} className="text-xs text-gray-700">
                      {conn.platform} / @{conn.accountHandle} ({conn.status})
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded border p-3">
              <div className="text-xs text-gray-500 mb-2">Latest AI Tasks</div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {tasks.length === 0 ? (
                  <p className="text-sm text-gray-600">タスクなし</p>
                ) : (
                  tasks.slice(0, 5).map((task) => (
                    <details key={task.id} className="text-xs text-gray-700">
                      <summary>{task.taskType} / {task.status}</summary>
                      {task.status === "WAITING_APPROVAL" ? (
                        <div className="mt-1 flex items-center gap-2">
                          <label className="inline-flex items-center gap-1 text-[11px]">
                            <input
                              type="checkbox"
                              checked={selectedTaskIds.includes(task.id)}
                              onChange={() => toggleTaskSelection(task.id)}
                              disabled={loading}
                            />
                            選択
                          </label>
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-[11px] disabled:opacity-40"
                            onClick={() => void approveTasks([task.id], "APPROVE")}
                            disabled={loading}
                          >
                            承認
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-1 text-[11px] disabled:opacity-40"
                            onClick={() => void approveTasks([task.id], "REJECT")}
                            disabled={loading}
                          >
                            却下
                          </button>
                        </div>
                      ) : null}
                      {(() => {
                        const analyze = task.taskType === "ANALYZE"
                          ? parseAnalyzeOutput(task.output)
                          : null;
                        if (analyze) {
                          return <AnalyzeOutputCard output={analyze} />;
                        }
                        const propose = task.taskType === "PROPOSE"
                          ? parseProposeOutput(task.output)
                          : null;
                        if (propose) {
                          return <ProposeOutputCard output={propose} />;
                        }
                        const translate = task.taskType === "TRANSLATE"
                          ? parseTranslateOutput(task.output)
                          : null;
                        if (translate) {
                          return <TranslateOutputCard output={translate} />;
                        }
                        return (
                          <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-[11px]">
                            {stringifyOutput(task.output)}
                          </pre>
                        );
                      })()}
                      {task.auditLogs.length > 0 ? (
                        <div className="mt-1 rounded bg-gray-50 p-2 text-[11px]">
                          {task.auditLogs.map((log) => (
                            <div key={log.id}>
                              {log.action}
                              {log.actorAddress ? ` (${log.actorAddress})` : ""}
                              {log.note ? ` - ${log.note}` : ""}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </details>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
