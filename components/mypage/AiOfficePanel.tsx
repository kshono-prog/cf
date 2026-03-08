"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AgentTaskOutput } from "@/components/mypage/AgentTaskOutputViews";
import type { TaskType } from "@/lib/agentTaskParsers";

type Platform = "YOUTUBE" | "X" | "INSTAGRAM" | "TIKTOK";
type TaskFilter = "ALL" | "WAITING_APPROVAL";
type TranslationLang = "ja" | "en" | "ko" | "zh";
type DraftTone = "warm" | "formal" | "casual";
type AnnouncementChannel = "SUPPORTERS" | "GENERAL";
type SupporterMessagePurpose = "THANK_YOU" | "REENGAGEMENT";

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

function buildTaskInput(params: {
  taskType: TaskType;
  translationInput: string;
  translationLang: TranslationLang;
  reportingWindowDays: number;
  draftTone: DraftTone;
  announcementChannel: AnnouncementChannel;
  includeMetricsSummary: boolean;
  includeSupportSummary: boolean;
  supporterMessagePurpose: SupporterMessagePurpose;
}): Record<string, unknown> {
  const common = {
    source: "mypage",
    requestedAt: new Date().toISOString(),
  };

  switch (params.taskType) {
    case "TRANSLATE":
      return {
        ...common,
        text: params.translationInput.trim(),
        from: "auto",
        to: [params.translationLang],
      };
    case "WEEKLY_REPORT":
      return {
        ...common,
        reportingWindowDays: params.reportingWindowDays,
      };
    case "ANNOUNCEMENT_DRAFT":
      return {
        ...common,
        channel: params.announcementChannel,
        tone: params.draftTone,
        reportingWindowDays: params.reportingWindowDays,
        includeMetricsSummary: params.includeMetricsSummary,
        includeSupportSummary: params.includeSupportSummary,
      };
    case "SUPPORTER_MESSAGE_DRAFT":
      return {
        ...common,
        purpose: params.supporterMessagePurpose,
        tone: params.draftTone,
        reportingWindowDays: params.reportingWindowDays,
        includeMetricsSummary: params.includeMetricsSummary,
        includeSupportSummary: params.includeSupportSummary,
      };
    default:
      return common;
  }
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
  const [translationLang, setTranslationLang] = useState<TranslationLang>("en");
  const [reportingWindowDays, setReportingWindowDays] = useState<number>(7);
  const [draftTone, setDraftTone] = useState<DraftTone>("warm");
  const [announcementChannel, setAnnouncementChannel] =
    useState<AnnouncementChannel>("SUPPORTERS");
  const [includeMetricsSummary, setIncludeMetricsSummary] =
    useState<boolean>(true);
  const [includeSupportSummary, setIncludeSupportSummary] =
    useState<boolean>(true);
  const [supporterMessagePurpose, setSupporterMessagePurpose] =
    useState<SupporterMessagePurpose>("THANK_YOU");
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
      const dashboardRes = await fetch(
        `/api/ai-office/dashboard?address=${encodeURIComponent(walletAddress)}${
          projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""
        }${
          taskFilter === "WAITING_APPROVAL" ? "&status=WAITING_APPROVAL" : ""
        }&metricLimit=20&trendDays=7&taskLimit=30`,
        { cache: "no-store" }
      );
      const dashboardJson: unknown = await dashboardRes.json().catch(() => null);

      if (!dashboardRes.ok || !isRecord(dashboardJson)) {
        setMessage("AI事務所データの取得に失敗しました。");
        return;
      }

      setConnections(parseConnections({ connections: dashboardJson.connections }));
      setTasks(parseTasks({ tasks: dashboardJson.tasks }));

      const parsedMetrics = parseMetrics(dashboardJson.metrics);
      setMetricsTotals(parsedMetrics.totals);
      setMetricsSnapshots(parsedMetrics.snapshots);
      setMetricTrends(parseMetricTrends(dashboardJson.trends));
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

  useEffect(() => {
    if (taskType === "WEEKLY_REPORT" && reportingWindowDays !== 7) {
      setReportingWindowDays(7);
    }
    if (taskType === "ANNOUNCEMENT_DRAFT") {
      if (reportingWindowDays !== 7) setReportingWindowDays(7);
      if (announcementChannel !== "SUPPORTERS") setAnnouncementChannel("SUPPORTERS");
      if (!includeMetricsSummary) setIncludeMetricsSummary(true);
      if (!includeSupportSummary) setIncludeSupportSummary(true);
    }
    if (taskType === "SUPPORTER_MESSAGE_DRAFT") {
      if (reportingWindowDays !== 30) setReportingWindowDays(30);
      if (includeMetricsSummary) setIncludeMetricsSummary(false);
      if (!includeSupportSummary) setIncludeSupportSummary(true);
    }
  }, [
    announcementChannel,
    includeMetricsSummary,
    includeSupportSummary,
    reportingWindowDays,
    taskType,
  ]);

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

    const taskInput = buildTaskInput({
      taskType,
      translationInput,
      translationLang,
      reportingWindowDays,
      draftTone,
      announcementChannel,
      includeMetricsSummary,
      includeSupportSummary,
      supporterMessagePurpose,
    });

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
              <option value="WEEKLY_REPORT">WEEKLY_REPORT</option>
              <option value="ANNOUNCEMENT_DRAFT">ANNOUNCEMENT_DRAFT</option>
              <option value="SUPPORTER_MESSAGE_DRAFT">SUPPORTER_MESSAGE_DRAFT</option>
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
          <div className="rounded border p-3 space-y-3">
            <div className="text-xs text-gray-500">Task Input</div>
            {taskType === "TRANSLATE" ? (
              <>
                <textarea
                  className="w-full rounded border px-2 py-2 text-sm"
                  value={translationInput}
                  onChange={(e) => setTranslationInput(e.target.value)}
                  placeholder="翻訳したい文章"
                  disabled={loading}
                />
                <select
                  className="rounded border px-2 py-2 text-sm"
                  value={translationLang}
                  onChange={(e) => setTranslationLang(e.target.value as TranslationLang)}
                  disabled={loading}
                >
                  <option value="ja">ja</option>
                  <option value="en">en</option>
                  <option value="ko">ko</option>
                  <option value="zh">zh</option>
                </select>
              </>
            ) : null}
            {taskType === "WEEKLY_REPORT" ? (
              <label className="grid gap-1 text-xs text-gray-700">
                <span>reporting window days</span>
                <input
                  className="rounded border px-2 py-2 text-sm"
                  type="number"
                  min={1}
                  max={31}
                  value={reportingWindowDays}
                  onChange={(e) =>
                    setReportingWindowDays(Math.max(1, Math.min(31, Number(e.target.value) || 7)))
                  }
                  disabled={loading}
                />
              </label>
            ) : null}
            {taskType === "ANNOUNCEMENT_DRAFT" ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-gray-700">
                  <span>channel</span>
                  <select
                    className="rounded border px-2 py-2 text-sm"
                    value={announcementChannel}
                    onChange={(e) =>
                      setAnnouncementChannel(e.target.value as AnnouncementChannel)
                    }
                    disabled={loading}
                  >
                    <option value="SUPPORTERS">SUPPORTERS</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-gray-700">
                  <span>tone</span>
                  <select
                    className="rounded border px-2 py-2 text-sm"
                    value={draftTone}
                    onChange={(e) => setDraftTone(e.target.value as DraftTone)}
                    disabled={loading}
                  >
                    <option value="warm">warm</option>
                    <option value="formal">formal</option>
                    <option value="casual">casual</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-gray-700">
                  <span>reporting window days</span>
                  <input
                    className="rounded border px-2 py-2 text-sm"
                    type="number"
                    min={1}
                    max={31}
                    value={reportingWindowDays}
                    onChange={(e) =>
                      setReportingWindowDays(Math.max(1, Math.min(31, Number(e.target.value) || 7)))
                    }
                    disabled={loading}
                  />
                </label>
                <div className="flex flex-col justify-end gap-2 text-xs text-gray-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeMetricsSummary}
                      onChange={(e) => setIncludeMetricsSummary(e.target.checked)}
                      disabled={loading}
                    />
                    include metrics summary
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeSupportSummary}
                      onChange={(e) => setIncludeSupportSummary(e.target.checked)}
                      disabled={loading}
                    />
                    include support summary
                  </label>
                </div>
              </div>
            ) : null}
            {taskType === "SUPPORTER_MESSAGE_DRAFT" ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="grid gap-1 text-xs text-gray-700">
                  <span>purpose</span>
                  <select
                    className="rounded border px-2 py-2 text-sm"
                    value={supporterMessagePurpose}
                    onChange={(e) =>
                      setSupporterMessagePurpose(
                        e.target.value as SupporterMessagePurpose
                      )
                    }
                    disabled={loading}
                  >
                    <option value="THANK_YOU">THANK_YOU</option>
                    <option value="REENGAGEMENT">REENGAGEMENT</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-gray-700">
                  <span>tone</span>
                  <select
                    className="rounded border px-2 py-2 text-sm"
                    value={draftTone}
                    onChange={(e) => setDraftTone(e.target.value as DraftTone)}
                    disabled={loading}
                  >
                    <option value="warm">warm</option>
                    <option value="formal">formal</option>
                    <option value="casual">casual</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-gray-700">
                  <span>reporting window days</span>
                  <input
                    className="rounded border px-2 py-2 text-sm"
                    type="number"
                    min={1}
                    max={90}
                    value={reportingWindowDays}
                    onChange={(e) =>
                      setReportingWindowDays(Math.max(1, Math.min(90, Number(e.target.value) || 30)))
                    }
                    disabled={loading}
                  />
                </label>
                <div className="flex flex-col justify-end gap-2 text-xs text-gray-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeMetricsSummary}
                      onChange={(e) => setIncludeMetricsSummary(e.target.checked)}
                      disabled={loading}
                    />
                    include metrics summary
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeSupportSummary}
                      onChange={(e) => setIncludeSupportSummary(e.target.checked)}
                      disabled={loading}
                    />
                    include support summary
                  </label>
                </div>
              </div>
            ) : null}
            {taskType === "ANALYZE" || taskType === "PROPOSE" ? (
              <div className="text-xs text-gray-600">
                この task は現在の project / metrics コンテキストを使って自動生成します。
              </div>
            ) : null}
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
                  setTranslationLang(e.target.value as TranslationLang)
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
                      <AgentTaskOutput taskType={task.taskType} output={task.output} />
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
