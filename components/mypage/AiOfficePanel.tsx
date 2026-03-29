"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AiOfficeCreateSection } from "@/components/mypage/AiOfficeCreateSection";
import { AiOfficeStatusNotice } from "@/components/mypage/AiOfficeFeedback";
import { AiOfficeInboxSection } from "@/components/mypage/AiOfficeInboxSection";
import { AiOfficeOverviewSection } from "@/components/mypage/AiOfficeOverviewSection";
import { useCreatorAiManagerAccount } from "@/components/mypage/useCreatorAiManagerAccount";
import {
  buildAiOfficePanelSearchParams,
  parseAiOfficePanelUrlState,
} from "@/components/mypage/aiOfficePanelUrlState";
import {
  parseAiOfficeContentSummary,
  parseAiOfficeTasks,
  parseAiOfficeUsefulnessSummary,
} from "@/components/mypage/aiOfficeDashboardParsers";
import {
  buildAiOfficeTaskInput,
  doesAiOfficeTaskMatchRole,
  getAiOfficeRoleChoice,
  getAiOfficeRoleChoices,
  getAiOfficeRoleGuidance,
  getAiOfficeRoleUsefulness,
  getDefaultAiOfficeRole,
  getAiOfficeTaskRoleChoices,
  normalizeAiOfficeTaskDraft,
  sortAiOfficeTaskChoicesByUsefulness,
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
  SupporterMessagePurpose,
  TaskFilter,
  TranslationLang,
} from "@/components/mypage/aiOfficeTypes";
import { getEmptyAiOfficeUsefulnessSummary } from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import {
  isInformationalTask,
  requiresApprovalByDefault,
} from "@/lib/agentTaskPolicy";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import {
  AI_OFFICE_LABEL,
  getAiOfficeMessageState,
} from "@/lib/uxCopy";
import { isRecord, toAddressOrNull } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

const DEFAULT_AI_OFFICE_TASK_TYPE: TaskType = "MANAGER_NEXT_ACTIONS";
const DEFAULT_AI_OFFICE_VIEW: AiOfficeView = "OVERVIEW";

export function AiOfficePanel(props: {
  walletAddress: string | null;
  projectId: string | null;
  isConnected: boolean;
  initialUrlState?: Partial<ReturnType<typeof parseAiOfficePanelUrlState>>;
}) {
  const {
    walletAddress,
    projectId,
    isConnected,
    initialUrlState = undefined,
  } = props;
  const initialSelectedRoleId =
    initialUrlState?.selectedRoleId ?? getDefaultAiOfficeRole(DEFAULT_AI_OFFICE_TASK_TYPE);
  const initialTaskType =
    initialUrlState?.openCreateTaskType ??
    getAiOfficeRoleChoice(initialSelectedRoleId)?.featuredTaskType ??
    DEFAULT_AI_OFFICE_TASK_TYPE;
  const hasInitialUrlState = Boolean(
    initialUrlState &&
      (initialUrlState.activeView !== undefined ||
        initialUrlState.selectedRoleId !== undefined ||
        initialUrlState.selectedInboxRoleId !== null ||
        initialUrlState.openLatestTaskType !== null ||
        initialUrlState.openCreateTaskType != null)
  );

  const [tasks, setTasks] = useState<AgentTaskView[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
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

  const [taskType, setTaskType] = useState<TaskType>(initialTaskType);
  const [selectedRoleId, setSelectedRoleId] =
    useState<CreatorAiAgentRole>(initialSelectedRoleId);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("ALL");
  const [selectedInboxRoleId, setSelectedInboxRoleId] =
    useState<CreatorAiAgentRole | null>(
      initialUrlState?.selectedInboxRoleId ?? null
    );
  const [openLatestTaskType, setOpenLatestTaskType] =
    useState<TaskType | null>(initialUrlState?.openLatestTaskType ?? null);
  const [requiresApproval, setRequiresApproval] = useState<boolean>(true);
  const [autoPost, setAutoPost] = useState<boolean>(false);
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
  const [activeView, setActiveView] = useState<AiOfficeView>(
    initialUrlState?.activeView ?? DEFAULT_AI_OFFICE_VIEW
  );
  const [hasHydratedUrlState, setHasHydratedUrlState] =
    useState<boolean>(hasInitialUrlState);
  const BULK_CONFIRM_THRESHOLD = 5;

  const canUse = isConnected && !!walletAddress;
  const ownerAddress = useMemo(
    () => (walletAddress ? toAddressOrNull(walletAddress) ?? undefined : undefined),
    [walletAddress]
  );
  const aiManagerAccount = useCreatorAiManagerAccount({
    address: ownerAddress,
    isConnected,
  });
  const visibleMessage = useMemo(
    () => getAiOfficeMessageState(message),
    [message]
  );
  const roleChoices = useMemo(() => getAiOfficeRoleChoices(), []);
  const createRoleGuidance = useMemo(
    () => getAiOfficeRoleGuidance(roleChoices, usefulness.roleBreakdown),
    [roleChoices, usefulness.roleBreakdown]
  );
  const selectedRoleUsefulness = useMemo(
    () => getAiOfficeRoleUsefulness(selectedRoleId, usefulness.roleBreakdown) ?? null,
    [selectedRoleId, usefulness.roleBreakdown]
  );
  const selectedCreateRoleChoice = useMemo(
    () => getAiOfficeRoleChoice(selectedRoleId),
    [selectedRoleId]
  );
  const createTaskChoices = useMemo(() => {
    if (!selectedCreateRoleChoice) {
      return [];
    }

    return sortAiOfficeTaskChoicesByUsefulness(
      selectedCreateRoleChoice.taskChoices,
      tasks
    );
  }, [selectedCreateRoleChoice, tasks]);
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

  const getPreferredTaskTypeForRole = useCallback(
    (roleId: CreatorAiAgentRole, currentTaskType?: TaskType): TaskType | null => {
      const roleChoice = getAiOfficeRoleChoice(roleId);
      if (!roleChoice) {
        return null;
      }

      if (
        currentTaskType &&
        roleChoice.taskChoices.some((choice) => choice.taskType === currentTaskType)
      ) {
        return currentTaskType;
      }

      const sortedTaskChoices = sortAiOfficeTaskChoicesByUsefulness(
        roleChoice.taskChoices,
        tasks
      );
      return (
        sortedTaskChoices[0]?.taskType ??
        roleChoice.featuredTaskType ??
        null
      );
    },
    [tasks]
  );

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
        setMessage("AIの提案状況を取得できませんでした。");
        return;
      }

      setTasks(parseAiOfficeTasks({ tasks: dashboardJson.tasks }));

      setContentSummary(parseAiOfficeContentSummary(dashboardJson.content));
      setUsefulness(parseAiOfficeUsefulnessSummary(dashboardJson.usefulness));
    } catch {
      setMessage("AIの提案状況を取得できませんでした。");
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
    if (hasHydratedUrlState || typeof window === "undefined") return;

    const parsedState = parseAiOfficePanelUrlState(
      new URLSearchParams(window.location.search)
    );

    if (parsedState.activeView) {
      setActiveView(parsedState.activeView);
    }

    if (parsedState.selectedRoleId) {
      setSelectedRoleId(parsedState.selectedRoleId);

      const nextTaskType = getPreferredTaskTypeForRole(
        parsedState.selectedRoleId,
        DEFAULT_AI_OFFICE_TASK_TYPE
      );

      if (nextTaskType) {
        setTaskType(nextTaskType);
      }
    }

    setSelectedInboxRoleId(parsedState.selectedInboxRoleId ?? null);
    setOpenLatestTaskType(parsedState.openLatestTaskType ?? null);
    setHasHydratedUrlState(true);
  }, [getPreferredTaskTypeForRole, hasHydratedUrlState]);

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
        openLatestTaskType,
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
  }, [
    activeView,
    hasHydratedUrlState,
    openLatestTaskType,
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
      setMessage(`投稿の指標を ${collected} 件更新しました。`);
      await refresh();
    } catch {
      setMessage("指標の取得に失敗しました。");
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
            autoPost,
          }),
        },
      });

      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const code = isRecord(json) && typeof json.error === "string" ? json.error : "AGENT_TASK_CREATE_FAILED";
        setMessage(code);
        return;
      }

      await refresh();
      setSelectedInboxRoleId(selectedRoleId);
      setOpenLatestTaskType(taskType);
      setActiveView("INBOX");
      if (autoPost && !requiresApproval) {
        setMessage(
          "AIが下書きを作成し、そのまま投稿しました。履歴から内容を確認できます。"
        );
      } else if (requiresApprovalByDefault(taskType) && requiresApproval) {
        setMessage(
          "AIが下書きを作成しました。必要なら確認してから使えます。"
        );
      } else if (isInformationalTask(taskType)) {
        setMessage("AIが結果を作成しました。履歴からすぐに確認できます。");
      } else {
        setMessage(
          "AIが下書きを作成しました。履歴からすぐに確認できます。"
        );
      }
    } catch {
      setMessage("下書きの作成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function approveTasks(taskIds: string[], action: "APPROVE" | "REJECT", inlineNote?: string): Promise<void> {
    if (!walletAddress) return;
    if (taskIds.length === 0) {
      setMessage("処理する提案を選択してください。");
      return;
    }
    // bulk threshold confirmation
    if (taskIds.length > BULK_CONFIRM_THRESHOLD) {
      const label = action === "APPROVE" ? "承認" : "却下";
      const ok = window.confirm(
        `${taskIds.length}件を一括${label}します。実行しますか？`
      );
      if (!ok) return;
    }

    // note: for inline single-task rejects, use inlineNote; for bulk, use global approvalNote
    const noteToUse = inlineNote !== undefined ? inlineNote : approvalNote.trim();

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
            note: noteToUse || null,
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
          ? `提案を承認しました（${updatedCount}件）。`
          : `提案を却下しました（${updatedCount}件）。`
      );
      setApprovalNote("");
      setSelectedTaskIds([]);
      await refresh();
    } catch {
      setMessage("処理に失敗しました。");
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
      setMessage("翻訳に失敗しました。");
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
      label: "ホーム",
      helper: "AIアシスタントの状況と最近の作成履歴をまとめて確認できます",
    },
    {
      id: "CREATE",
      label: "作成",
      helper: "何を作るか選ぶと、AIがプロジェクトの状況をもとに下書きを作ります",
    },
    {
      id: "INBOX",
      label: "受信トレイ",
      helper: "AIが作った下書きをここで確認・承認・却下できます",
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

      const nextTaskType = getPreferredTaskTypeForRole(nextRoleId, taskType);

      if (nextTaskType) {
        setTaskType(nextTaskType);
      }
    },
    [getPreferredTaskTypeForRole, taskType]
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

  return (
    <div className="card p-4 space-y-4" id="ai-office">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="section-title">{AI_OFFICE_LABEL}</h3>
          <p className="caption-text mt-0.5">
            告知・お礼・週報など、AIが下書きを作るのでホームで確認・承認するだけで使えます。
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={() => void refresh()}
          disabled={loading || !canUse}
        >
          再読み込み
        </button>
      </div>

      {!canUse ? (
        <p className="body-text text-[var(--text-subtle)]">ウォレット接続後に利用できます。</p>
      ) : (
        <>
          <div className="border-b border-[var(--line)]">
            <div className="flex overflow-x-auto">
              {aiOfficeViews.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-40 ${
                    activeView === view.id
                      ? "border-[var(--text)] text-[var(--text)]"
                      : "border-transparent text-[var(--text-subtle)] hover:border-[var(--line)] hover:text-[var(--text)]"
                  }`}
                  onClick={() => setActiveView(view.id)}
                  disabled={loading}
                >
                  {view.label}
                  {view.id === "INBOX" && waitingApprovalCount > 0 ? (
                    <span className="status-badge status-badge-warn">
                      {waitingApprovalCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          <p className="caption-text mt-1">
            {aiOfficeViews.find((v) => v.id === activeView)?.helper}
          </p>

          {visibleMessage ? (
            <AiOfficeStatusNotice
              tone={visibleMessage.tone}
              title={visibleMessage.title}
              description={visibleMessage.description}
              onRetry={visibleMessage.tone === "error" ? () => void refresh() : undefined}
            />
          ) : null}

          {waitingApprovalCount > 0 && activeView !== "INBOX" ? (
            <AiOfficeStatusNotice
              tone="attention"
              title={`確認待ちの下書きが ${waitingApprovalCount} 件あります`}
              description="受信トレイで確認・承認・却下できます。"
            >
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setSelectedInboxRoleId(null);
                  setActiveView("INBOX");
                }}
                disabled={loading}
              >
                受信トレイを見る →
              </button>
            </AiOfficeStatusNotice>
          ) : null}

          {activeView === "OVERVIEW" && tasks.length === 0 && contentSummary.totalPosts === 0 ? (
            <AiOfficeStatusNotice
              tone="info"
              title="まずはここから始めましょう"
              description="「作成」タブで何を作るか選ぶと、AIがプロジェクトの状況をもとに告知・お礼などの下書きを作ります。"
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveView("CREATE")}
              >
                作成タブへ →
              </button>
            </AiOfficeStatusNotice>
          ) : null}

          {activeView === "OVERVIEW" ? (
            <AiOfficeOverviewSection
              loading={loading}
              waitingApprovalCount={waitingApprovalCount}
              tasks={tasks}
              usefulness={usefulness}
              aiManagerAccount={aiManagerAccount.account}
              aiManagerLoading={aiManagerAccount.loading}
              aiManagerError={aiManagerAccount.error}
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
              onOpenTaskInInbox={(taskType) => {
                setOpenLatestTaskType(taskType as TaskType);
                setSelectedInboxRoleId(null);
                setActiveView("INBOX");
              }}
              onCollectMetrics={() => void collectMetrics()}
            />
          ) : null}

          {activeView === "CREATE" ? (
            <AiOfficeCreateSection
              loading={loading}
              roleChoices={roleChoices}
              taskChoices={createTaskChoices}
              selectedRoleId={selectedRoleId}
              selectedRoleUsefulness={selectedRoleUsefulness}
              roleGuidance={createRoleGuidance}
              taskType={taskType}
              requiresApproval={requiresApproval}
              autoPost={autoPost}
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
              onAutoPostChange={setAutoPost}
              onTranslationInputChange={setTranslationInput}
              onTranslationLangChange={setTranslationLang}
              onReportingWindowDaysChange={setReportingWindowDays}
              onDraftToneChange={setDraftTone}
              onAnnouncementChannelChange={setAnnouncementChannel}
              onIncludeMetricsSummaryChange={setIncludeMetricsSummary}
              onIncludeSupportSummaryChange={setIncludeSupportSummary}
              onSupporterMessagePurposeChange={setSupporterMessagePurpose}
              onCreateTask={() => void createTask()}
              onOpenInboxForRole={(roleId) => {
                openRoleShortcut(roleId, "INBOX");
              }}
              onTranslateText={() => void translateText()}
            />
          ) : null}

          {activeView === "INBOX" ? (
            <AiOfficeInboxSection
              loading={loading}
              taskFilter={taskFilter}
              tasks={tasks}
              usefulness={usefulness}
              walletAddress={walletAddress}
              selectedRoleId={selectedInboxRoleId}
              waitingApprovalCount={waitingApprovalCount}
              selectedTaskIds={selectedTaskIds}
              approvalNote={approvalNote}
              openLatestTaskType={openLatestTaskType}
              onOpenCreateForRole={(roleId) => {
                openRoleShortcut(roleId, "CREATE");
              }}
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
              onRejectOne={(taskId, note) => void approveTasks([taskId], "REJECT", note)}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
