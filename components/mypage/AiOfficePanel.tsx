"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AiOfficeCreateSection } from "@/components/mypage/AiOfficeCreateSection";
import { AiOfficeStatusNotice } from "@/components/mypage/AiOfficeFeedback";
import { AiOfficeInboxSection } from "@/components/mypage/AiOfficeInboxSection";
import { AiOfficeOverviewSection } from "@/components/mypage/AiOfficeOverviewSection";
import type {
  AgentTaskView,
  AiOfficeView,
  AnnouncementChannel,
  DraftTone,
  MetricSnapshotView,
  MetricTrendDayView,
  Platform,
  SocialConnectionView,
  SupporterMessagePurpose,
  TaskFilter,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import {
  getAgentTaskTypeCopy,
  getAiOfficeMessageState,
} from "@/lib/uxCopy";

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
  const [activeView, setActiveView] = useState<AiOfficeView>("OVERVIEW");
  const BULK_CONFIRM_THRESHOLD = 5;

  const canUse = isConnected && !!walletAddress;
  const currentTaskTypeCopy = useMemo(
    () => getAgentTaskTypeCopy(taskType),
    [taskType]
  );
  const visibleMessage = useMemo(
    () => getAiOfficeMessageState(message),
    [message]
  );
  const waitingApprovalCount = useMemo(
    () => tasks.filter((task) => task.status === "WAITING_APPROVAL").length,
    [tasks]
  );
  const waitingTaskIds = useMemo(
    () =>
      tasks
        .filter((task) => task.status === "WAITING_APPROVAL")
        .map((task) => task.id),
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
        }&metricLimit=20&trendDays=7&taskLimit=30`,
        { cache: "no-store" }
      );
      const dashboardJson: unknown = await dashboardRes.json().catch(() => null);

      if (!dashboardRes.ok || !isRecord(dashboardJson)) {
        setMessage("下書きと承認の状況を取得できませんでした。");
        return;
      }

      setConnections(parseConnections({ connections: dashboardJson.connections }));
      setTasks(parseTasks({ tasks: dashboardJson.tasks }));

      const parsedMetrics = parseMetrics(dashboardJson.metrics);
      setMetricsTotals(parsedMetrics.totals);
      setMetricsSnapshots(parsedMetrics.snapshots);
      setMetricTrends(parseMetricTrends(dashboardJson.trends));
    } catch {
      setMessage("下書きと承認の状況を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, projectId]);

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

  const aiOfficeViews: Array<{
    id: AiOfficeView;
    label: string;
    helper: string;
  }> = [
    {
      id: "OVERVIEW",
      label: "状況",
      helper: "今日見るべき数値と承認待ちを確認する",
    },
    {
      id: "CREATE",
      label: "下書きを作る",
      helper: "SNS 連携、指標更新、下書き作成を進める",
    },
    {
      id: "INBOX",
      label: "承認待ち",
      helper: "承認待ちや最近の下書きを確認する",
    },
  ];

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">下書きと承認</h3>
          <p className="text-xs text-gray-500 mt-1">
            告知やお礼の下書き作成、承認待ちの確認、指標の確認をここでまとめて進めます。
          </p>
        </div>
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

      {!canUse ? (
        <p className="text-sm text-gray-600">ウォレット接続後に利用できます。</p>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-3">
            {aiOfficeViews.map((view) => (
              <button
                key={view.id}
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  activeView === view.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-gray-200 bg-white text-gray-900"
                }`}
                onClick={() => setActiveView(view.id)}
                disabled={loading}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{view.label}</span>
                  {view.id === "INBOX" && waitingApprovalCount > 0 ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        activeView === view.id
                          ? "bg-white/15 text-white"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {waitingApprovalCount}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`mt-1 text-xs ${
                    activeView === view.id ? "text-white/80" : "text-gray-500"
                  }`}
                >
                  {view.helper}
                </div>
              </button>
            ))}
          </div>

          {visibleMessage ? (
            <AiOfficeStatusNotice
              tone={visibleMessage.tone}
              title={visibleMessage.title}
              description={visibleMessage.description}
            />
          ) : null}

          {waitingApprovalCount > 0 && activeView !== "INBOX" ? (
            <AiOfficeStatusNotice
              tone="attention"
              title={`承認待ちの下書きが ${waitingApprovalCount} 件あります`}
              description="新しい下書きを増やす前に、承認待ちで内容を確認すると運営が止まりません。"
            >
              <button
                type="button"
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-40"
                onClick={() => setActiveView("INBOX")}
                disabled={loading}
              >
                承認待ちを開く
              </button>
            </AiOfficeStatusNotice>
          ) : null}

          {activeView === "OVERVIEW" ? (
            <AiOfficeOverviewSection
              loading={loading}
              waitingApprovalCount={waitingApprovalCount}
              tasks={tasks}
              connections={connections}
              metricsTotals={metricsTotals}
              metricsSnapshots={metricsSnapshots}
              metricTrends={metricTrends}
              onOpenCreate={() => setActiveView("CREATE")}
              onOpenInbox={() => setActiveView("INBOX")}
              onCollectMetrics={() => void collectMetrics()}
            />
          ) : null}

          {activeView === "CREATE" ? (
            <AiOfficeCreateSection
              loading={loading}
              waitingApprovalCount={waitingApprovalCount}
              platform={platform}
              accountHandle={accountHandle}
              taskType={taskType}
              taskTypeCopy={currentTaskTypeCopy}
              requiresApproval={requiresApproval}
              translationInput={translationInput}
              translationLang={translationLang}
              reportingWindowDays={reportingWindowDays}
              draftTone={draftTone}
              announcementChannel={announcementChannel}
              includeMetricsSummary={includeMetricsSummary}
              includeSupportSummary={includeSupportSummary}
              supporterMessagePurpose={supporterMessagePurpose}
              translationResult={translationResult}
              onPlatformChange={setPlatform}
              onAccountHandleChange={setAccountHandle}
              onTaskTypeChange={setTaskType}
              onRequiresApprovalChange={setRequiresApproval}
              onTranslationInputChange={setTranslationInput}
              onTranslationLangChange={setTranslationLang}
              onReportingWindowDaysChange={setReportingWindowDays}
              onDraftToneChange={setDraftTone}
              onAnnouncementChannelChange={setAnnouncementChannel}
              onIncludeMetricsSummaryChange={setIncludeMetricsSummary}
              onIncludeSupportSummaryChange={setIncludeSupportSummary}
              onSupporterMessagePurposeChange={setSupporterMessagePurpose}
              onAddConnection={() => void addConnection()}
              onCollectMetrics={() => void collectMetrics()}
              onOpenInbox={() => setActiveView("INBOX")}
              onCreateTask={() => void createTask()}
              onTranslateText={() => void translateText()}
            />
          ) : null}

          {activeView === "INBOX" ? (
            <AiOfficeInboxSection
              loading={loading}
              taskFilter={taskFilter}
              tasks={tasks}
              waitingApprovalCount={waitingApprovalCount}
              selectedTaskIds={selectedTaskIds}
              approvalNote={approvalNote}
              onTaskFilterChange={setTaskFilter}
              onApprovalNoteChange={setApprovalNote}
              onSelectAllWaitingTasks={selectAllWaitingTasks}
              onClearSelectedTasks={clearSelectedTasks}
              onApproveSelectedTasks={() =>
                void approveTasks(selectedTaskIds, "APPROVE")
              }
              onRejectSelectedTasks={() =>
                void approveTasks(selectedTaskIds, "REJECT")
              }
              onToggleTaskSelection={toggleTaskSelection}
              onApproveOne={(taskId) => void approveTasks([taskId], "APPROVE")}
              onRejectOne={(taskId) => void approveTasks([taskId], "REJECT")}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
