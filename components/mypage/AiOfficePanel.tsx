"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AiOfficeCreateSection } from "@/components/mypage/AiOfficeCreateSection";
import { AiOfficeStatusNotice } from "@/components/mypage/AiOfficeFeedback";
import { AiOfficeInboxSection } from "@/components/mypage/AiOfficeInboxSection";
import { AiOfficeOverviewSection } from "@/components/mypage/AiOfficeOverviewSection";
import {
  AI_OFFICE_RECENT_COPIED_ROLE_LINKS_STORAGE_KEY,
  AI_OFFICE_RECENT_ROLE_SHORTCUTS_STORAGE_KEY,
  parseAiOfficeRecentCopiedRoleLinks,
  parseAiOfficeRecentRoleShortcuts,
  rememberAiOfficeRecentCopiedRoleLink,
  rememberAiOfficeRecentRoleShortcut,
  type AiOfficeRecentCopiedRoleLink,
  type AiOfficeRecentRoleShortcut,
} from "@/components/mypage/aiOfficeRecentRoleShortcuts";
import {
  buildAiOfficePanelSearchParams,
  parseAiOfficePanelUrlState,
} from "@/components/mypage/aiOfficePanelUrlState";
import {
  parseAiOfficeContentSummary,
  parseAiOfficeMetrics,
  parseAiOfficeMetricTrends,
  parseAiOfficeTasks,
  parseAiOfficeUsefulnessSummary,
} from "@/components/mypage/aiOfficeDashboardParsers";
import {
  buildAiOfficeTaskInput,
  doesAiOfficeTaskMatchRole,
  getAiOfficeRoleChoice,
  getDefaultAiOfficeRole,
  getAiOfficeTaskRoleChoices,
  normalizeAiOfficeTaskDraft,
  validateAiOfficeTaskDraft,
  type AiOfficeTaskDraft,
} from "@/components/mypage/aiOfficeTaskConfig";
import type {
  AgentTaskView,
  AiOfficeContentSummaryView,
  AiOfficeUsefulnessSummaryView,
  AiOfficeView,
  AnnouncementChannel,
  DraftTone,
  MetricSnapshotView,
  MetricTrendDayView,
  SupporterMessagePurpose,
  TaskFilter,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import { getEmptyAiOfficeUsefulnessSummary } from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import {
  getAgentTaskTypeCopy,
  getAiOfficeMessageState,
} from "@/lib/uxCopy";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const DEFAULT_AI_OFFICE_TASK_TYPE: TaskType = "MANAGER_NEXT_ACTIONS";
const DEFAULT_AI_OFFICE_VIEW: AiOfficeView = "OVERVIEW";

export function AiOfficePanel(props: {
  walletAddress: string | null;
  projectId: string | null;
  isConnected: boolean;
}) {
  const { walletAddress, projectId, isConnected } = props;

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
  const [contentSummary, setContentSummary] = useState<AiOfficeContentSummaryView>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    archivedPosts: 0,
    aiGeneratedPosts: 0,
    lastPostAt: null,
    lastPublishedAt: null,
  });
  const [usefulness, setUsefulness] = useState<AiOfficeUsefulnessSummaryView>(
    () => getEmptyAiOfficeUsefulnessSummary()
  );

  const [taskType, setTaskType] = useState<TaskType>(DEFAULT_AI_OFFICE_TASK_TYPE);
  const [selectedRoleId, setSelectedRoleId] = useState<CreatorAiAgentRole>(
    () => getDefaultAiOfficeRole(DEFAULT_AI_OFFICE_TASK_TYPE)
  );
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("ALL");
  const [selectedInboxRoleId, setSelectedInboxRoleId] =
    useState<CreatorAiAgentRole | null>(null);
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
  const [activeView, setActiveView] = useState<AiOfficeView>(DEFAULT_AI_OFFICE_VIEW);
  const [hasHydratedUrlState, setHasHydratedUrlState] = useState<boolean>(false);
  const [recentRoleShortcuts, setRecentRoleShortcuts] = useState<
    AiOfficeRecentRoleShortcut[]
  >([]);
  const [recentCopiedRoleLinks, setRecentCopiedRoleLinks] = useState<
    AiOfficeRecentCopiedRoleLink[]
  >([]);
  const [hasHydratedRecentRoleShortcuts, setHasHydratedRecentRoleShortcuts] =
    useState<boolean>(false);
  const [hasHydratedRecentCopiedRoleLinks, setHasHydratedRecentCopiedRoleLinks] =
    useState<boolean>(false);
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
        .filter(
          (task) =>
            selectedInboxRoleId === null ||
            doesAiOfficeTaskMatchRole(
              task.taskType as TaskType,
              selectedInboxRoleId
            )
        )
        .map((task) => task.id),
    [selectedInboxRoleId, tasks]
  );
  const taskDraft = useMemo<AiOfficeTaskDraft>(
    () => ({
      taskType,
      translationInput,
      translationLang,
      reportingWindowDays,
      draftTone,
      announcementChannel,
      includeMetricsSummary,
      includeSupportSummary,
      supporterMessagePurpose,
    }),
    [
      announcementChannel,
      draftTone,
      includeMetricsSummary,
      includeSupportSummary,
      reportingWindowDays,
      supporterMessagePurpose,
      taskType,
      translationInput,
      translationLang,
    ]
  );
  const normalizedTaskDraft = useMemo(
    () => normalizeAiOfficeTaskDraft(taskDraft),
    [taskDraft]
  );

  const headers = useMemo(() => ({ "Content-Type": "application/json" }), []);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setTasks([]);
      setContentSummary({
        totalPosts: 0,
        publishedPosts: 0,
        draftPosts: 0,
        archivedPosts: 0,
        aiGeneratedPosts: 0,
        lastPostAt: null,
        lastPublishedAt: null,
      });
      setUsefulness(getEmptyAiOfficeUsefulnessSummary());
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const dashboardRes = await ownerAuthFetch({
        address: walletAddress,
        url: `/api/ai-office/dashboard?address=${encodeURIComponent(walletAddress)}${
          projectId ? `&projectId=${encodeURIComponent(projectId)}` : ""
        }&metricLimit=20&trendDays=7&taskLimit=30`,
        init: { cache: "no-store" },
      });
      const dashboardJson: unknown = await dashboardRes.json().catch(() => null);

      if (!dashboardRes.ok || !isRecord(dashboardJson)) {
        setMessage("下書きと承認の状況を取得できませんでした。");
        return;
      }

      setTasks(parseAiOfficeTasks({ tasks: dashboardJson.tasks }));

      const parsedMetrics = parseAiOfficeMetrics(dashboardJson.metrics);
      setMetricsTotals(parsedMetrics.totals);
      setMetricsSnapshots(parsedMetrics.snapshots);
      setMetricTrends(parseAiOfficeMetricTrends(dashboardJson.trends));
      setContentSummary(parseAiOfficeContentSummary(dashboardJson.content));
      setUsefulness(parseAiOfficeUsefulnessSummary(dashboardJson.usefulness));
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
    const matchingRoles = getAiOfficeTaskRoleChoices(taskType);
    if (matchingRoles.some((role) => role.roleId === selectedRoleId)) {
      return;
    }

    setSelectedRoleId(getDefaultAiOfficeRole(taskType));
  }, [selectedRoleId, taskType]);

  useEffect(() => {
    if (normalizedTaskDraft.reportingWindowDays !== reportingWindowDays) {
      setReportingWindowDays(normalizedTaskDraft.reportingWindowDays);
    }
    if (normalizedTaskDraft.announcementChannel !== announcementChannel) {
      setAnnouncementChannel(normalizedTaskDraft.announcementChannel);
    }
    if (
      normalizedTaskDraft.includeMetricsSummary !== includeMetricsSummary
    ) {
      setIncludeMetricsSummary(normalizedTaskDraft.includeMetricsSummary);
    }
    if (
      normalizedTaskDraft.includeSupportSummary !== includeSupportSummary
    ) {
      setIncludeSupportSummary(normalizedTaskDraft.includeSupportSummary);
    }
  }, [
    announcementChannel,
    includeMetricsSummary,
    includeSupportSummary,
    normalizedTaskDraft,
    reportingWindowDays,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const parsedState = parseAiOfficePanelUrlState(
      new URLSearchParams(window.location.search)
    );

    if (parsedState.activeView) {
      setActiveView(parsedState.activeView);
    }

    if (parsedState.selectedRoleId) {
      setSelectedRoleId(parsedState.selectedRoleId);

      const roleChoice = getAiOfficeRoleChoice(parsedState.selectedRoleId);
      const nextTaskType = roleChoice?.taskChoices.some(
        (choice) => choice.taskType === DEFAULT_AI_OFFICE_TASK_TYPE
      )
        ? DEFAULT_AI_OFFICE_TASK_TYPE
        : roleChoice?.featuredTaskType;

      if (nextTaskType) {
        setTaskType(nextTaskType);
      }
    }

    setSelectedInboxRoleId(parsedState.selectedInboxRoleId ?? null);
    setHasHydratedUrlState(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedUrlState || typeof window === "undefined") {
      return;
    }

    const nextSearchParams = buildAiOfficePanelSearchParams(
      new URLSearchParams(window.location.search),
      {
        activeView,
        selectedRoleId,
        selectedInboxRoleId,
      }
    );
    const nextSearch = nextSearchParams.toString();
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ""
    }${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [activeView, hasHydratedUrlState, selectedInboxRoleId, selectedRoleId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(
        AI_OFFICE_RECENT_ROLE_SHORTCUTS_STORAGE_KEY
      );
      const parsedValue: unknown =
        rawValue === null ? [] : JSON.parse(rawValue) as unknown;
      setRecentRoleShortcuts(parseAiOfficeRecentRoleShortcuts(parsedValue));
    } catch {
      setRecentRoleShortcuts([]);
    } finally {
      setHasHydratedRecentRoleShortcuts(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(
        AI_OFFICE_RECENT_COPIED_ROLE_LINKS_STORAGE_KEY
      );
      const parsedValue: unknown =
        rawValue === null ? [] : JSON.parse(rawValue) as unknown;
      setRecentCopiedRoleLinks(parseAiOfficeRecentCopiedRoleLinks(parsedValue));
    } catch {
      setRecentCopiedRoleLinks([]);
    } finally {
      setHasHydratedRecentCopiedRoleLinks(true);
    }
  }, []);

  useEffect(() => {
    if (
      !hasHydratedRecentRoleShortcuts ||
      typeof window === "undefined" ||
      activeView === "OVERVIEW"
    ) {
      return;
    }

    const nextShortcut =
      activeView === "CREATE"
        ? {
            roleId: selectedRoleId,
            activeView: "CREATE" as const,
            lastUsedAt: new Date().toISOString(),
          }
        : selectedInboxRoleId
          ? {
              roleId: selectedInboxRoleId,
              activeView: "INBOX" as const,
              lastUsedAt: new Date().toISOString(),
            }
          : null;

    if (nextShortcut === null) {
      return;
    }

    setRecentRoleShortcuts((current) => {
      const next = rememberAiOfficeRecentRoleShortcut(current, nextShortcut);
      try {
        window.localStorage.setItem(
          AI_OFFICE_RECENT_ROLE_SHORTCUTS_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        return current;
      }
      return next;
    });
  }, [
    activeView,
    hasHydratedRecentRoleShortcuts,
    selectedInboxRoleId,
    selectedRoleId,
  ]);

  async function collectMetrics(): Promise<void> {
    if (!walletAddress) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await ownerAuthFetch({
        address: walletAddress,
        url: "/api/metrics/collect",
        init: {
          method: "POST",
          headers,
          body: JSON.stringify({
            address: walletAddress,
            projectId,
          }),
        },
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code = isRecord(json) && typeof json.error === "string" ? json.error : "METRICS_COLLECT_FAILED";
        setMessage(code);
        return;
      }

      const collected = isRecord(json) && typeof json.collected === "number" ? json.collected : 0;
      setMessage(`Creator Founding の投稿指標を ${collected} 件更新しました。`);
      await refresh();
    } catch {
      setMessage("metrics 収集に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function createTask(): Promise<void> {
    if (!walletAddress) return;

    const validationError = validateAiOfficeTaskDraft(normalizedTaskDraft);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setLoading(true);
    setMessage(null);

    const taskInput = buildAiOfficeTaskInput(normalizedTaskDraft);

    try {
      const res = await ownerAuthFetch({
        address: walletAddress,
        url: "/api/agent/tasks",
        init: {
          method: "POST",
          headers,
          body: JSON.stringify({
            address: walletAddress,
            projectId,
            taskType,
            roleId: selectedRoleId,
            input: taskInput,
            requiresApproval,
          }),
        },
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
      const res = await ownerAuthFetch({
        address: walletAddress,
        url: "/api/agent/tasks",
        init: {
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
        },
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
      const res = await ownerAuthFetch({
        address: walletAddress,
        url: "/api/translation",
        init: {
          method: "POST",
          headers,
          body: JSON.stringify({
            address: walletAddress,
            text,
            to: [translationLang],
          }),
        },
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
      helper: "今日見るべき数値と role ごとの入口を確認する",
    },
    {
      id: "CREATE",
      label: "下書きを作る",
      helper: "role を選んで、内部投稿の指標をもとに下書きを作る",
    },
    {
      id: "INBOX",
      label: "承認待ち",
      helper: "承認待ちや最近の下書きを確認する",
    },
  ];

  const handleTaskTypeChange = useCallback(
    (nextTaskType: TaskType) => {
      setTaskType(nextTaskType);

      const matchingRoles = getAiOfficeTaskRoleChoices(nextTaskType);
      if (matchingRoles.some((role) => role.roleId === selectedRoleId)) {
        return;
      }

      setSelectedRoleId(getDefaultAiOfficeRole(nextTaskType));
    },
    [selectedRoleId]
  );

  const handleRoleChange = useCallback(
    (nextRoleId: CreatorAiAgentRole) => {
      setSelectedRoleId(nextRoleId);

      const roleChoice = getAiOfficeRoleChoice(nextRoleId);
      if (!roleChoice) {
        return;
      }

      const nextTaskType = roleChoice.taskChoices.some(
        (choice) => choice.taskType === taskType
      )
        ? taskType
        : roleChoice.featuredTaskType;

      if (nextTaskType) {
        setTaskType(nextTaskType);
      }
    },
    [taskType]
  );

  const openRoleShortcut = useCallback(
    (roleId: CreatorAiAgentRole, nextView: "CREATE" | "INBOX") => {
      handleRoleChange(roleId);

      if (nextView === "INBOX") {
        setSelectedInboxRoleId(roleId);
        setActiveView("INBOX");
        return;
      }

      setSelectedInboxRoleId(null);
      setActiveView("CREATE");
    },
    [handleRoleChange]
  );

  const rememberCopiedRoleLink = useCallback(
    (roleId: CreatorAiAgentRole, activeView: "CREATE" | "INBOX") => {
      if (
        !hasHydratedRecentCopiedRoleLinks ||
        typeof window === "undefined"
      ) {
        return;
      }

      const copiedLink: AiOfficeRecentCopiedRoleLink = {
        roleId,
        activeView,
        copiedAt: new Date().toISOString(),
      };

      setRecentCopiedRoleLinks((current) => {
        const next = rememberAiOfficeRecentCopiedRoleLink(current, copiedLink);
        try {
          window.localStorage.setItem(
            AI_OFFICE_RECENT_COPIED_ROLE_LINKS_STORAGE_KEY,
            JSON.stringify(next)
          );
        } catch {
          return current;
        }
        return next;
      });
    },
    [hasHydratedRecentCopiedRoleLinks]
  );

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">AI事務所（Role-Based Phase1）</h3>
          <p className="text-xs text-gray-500 mt-1">
            `Manager / Promotion / Finance / Fan Relation` の役割で、下書き作成、承認待ち確認、内部指標の確認をまとめて進めます。
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
                onClick={() => {
                  setSelectedInboxRoleId(null);
                  setActiveView("INBOX");
                }}
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
              contentSummary={contentSummary}
              usefulness={usefulness}
              metricsTotals={metricsTotals}
              metricsSnapshots={metricsSnapshots}
              metricTrends={metricTrends}
              recentRoleShortcuts={recentRoleShortcuts}
              recentCopiedRoleLinks={recentCopiedRoleLinks}
              onOpenCreate={() => setActiveView("CREATE")}
              onOpenCreateForRole={(roleId) => {
                openRoleShortcut(roleId, "CREATE");
              }}
              onOpenInbox={(roleId) => {
                if (roleId) {
                  openRoleShortcut(roleId, "INBOX");
                  return;
                }
                setSelectedInboxRoleId(null);
                setActiveView("INBOX");
              }}
              onCopiedRoleLink={rememberCopiedRoleLink}
              onCollectMetrics={() => void collectMetrics()}
            />
          ) : null}

          {activeView === "CREATE" ? (
            <AiOfficeCreateSection
              loading={loading}
              waitingApprovalCount={waitingApprovalCount}
              contentSummary={contentSummary}
              usefulness={usefulness}
              tasks={tasks}
              selectedRoleId={selectedRoleId}
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
              onRoleChange={handleRoleChange}
              onTaskTypeChange={handleTaskTypeChange}
              onRequiresApprovalChange={setRequiresApproval}
              onTranslationInputChange={setTranslationInput}
              onTranslationLangChange={setTranslationLang}
              onReportingWindowDaysChange={setReportingWindowDays}
              onDraftToneChange={setDraftTone}
              onAnnouncementChannelChange={setAnnouncementChannel}
              onIncludeMetricsSummaryChange={setIncludeMetricsSummary}
              onIncludeSupportSummaryChange={setIncludeSupportSummary}
              onSupporterMessagePurposeChange={setSupporterMessagePurpose}
              onCollectMetrics={() => void collectMetrics()}
              onOpenInbox={(roleId) => {
                setSelectedInboxRoleId(roleId ?? null);
                setActiveView("INBOX");
              }}
              onCreateTask={() => void createTask()}
              onTranslateText={() => void translateText()}
            />
          ) : null}

          {activeView === "INBOX" ? (
            <AiOfficeInboxSection
              loading={loading}
              taskFilter={taskFilter}
              tasks={tasks}
              usefulness={usefulness}
              recentRoleShortcuts={recentRoleShortcuts}
              recentCopiedRoleLinks={recentCopiedRoleLinks}
              selectedRoleId={selectedInboxRoleId}
              waitingApprovalCount={waitingApprovalCount}
              selectedTaskIds={selectedTaskIds}
              approvalNote={approvalNote}
              onOpenCreateForRole={(roleId) => {
                openRoleShortcut(roleId, "CREATE");
              }}
              onOpenShortcut={openRoleShortcut}
              onCopiedRoleLink={rememberCopiedRoleLink}
              onRoleFilterChange={setSelectedInboxRoleId}
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
