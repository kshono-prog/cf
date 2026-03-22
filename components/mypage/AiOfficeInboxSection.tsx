"use client";

import React from "react";

import {
  AiOfficeEmptyState,
  AiOfficeStatusNotice,
} from "@/components/mypage/AiOfficeFeedback";
import { AgentTaskOutput } from "@/components/mypage/AgentTaskOutputViews";
import {
  doesAiOfficeTaskMatchRole,
  getAiOfficeTaskRoleChoices,
} from "@/components/mypage/aiOfficeTaskConfig";
import type {
  AiOfficeUsefulnessSummaryView,
  AgentTaskView,
  TaskFilter,
} from "@/components/mypage/aiOfficeTypes";
import type { TaskType } from "@/lib/agentTaskParsers";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import {
  getAgentTaskAuditActionLabel,
  getAgentTaskStatusCopy,
  getAgentTaskTypeCopy,
} from "@/lib/uxCopy";

type Props = {
  loading: boolean;
  taskFilter: TaskFilter;
  tasks: AgentTaskView[];
  usefulness: AiOfficeUsefulnessSummaryView;
  selectedRoleId: CreatorAiAgentRole | null;
  waitingApprovalCount: number;
  selectedTaskIds: string[];
  approvalNote: string;
  onOpenCreateForRole: (roleId: CreatorAiAgentRole) => void;
  onRoleFilterChange: (roleId: CreatorAiAgentRole | null) => void;
  onTaskFilterChange: (value: TaskFilter) => void;
  onApprovalNoteChange: (value: string) => void;
  onSelectAllWaitingTasks: () => void;
  onClearSelectedTasks: () => void;
  onApproveSelectedTasks: () => void;
  onRejectSelectedTasks: () => void;
  onToggleTaskSelection: (taskId: string) => void;
  onApproveOne: (taskId: string) => void;
  onRejectOne: (taskId: string, note?: string) => void;
};

function extractTaskOutputPreview(output: unknown, maxChars = 140): string | null {
  if (typeof output !== "object" || output === null) return null;
  const rec = output as Record<string, unknown>;
  // Content tasks: body field
  if (typeof rec.body === "string" && rec.body.trim()) {
    return rec.body.trim().slice(0, maxChars);
  }
  // Translation tasks: text field
  if (typeof rec.text === "string" && rec.text.trim()) {
    return rec.text.trim().slice(0, maxChars);
  }
  // Analysis / propose / manager: summary field
  if (typeof rec.summary === "string" && rec.summary.trim()) {
    return rec.summary.trim().slice(0, maxChars);
  }
  // Propose tasks: first proposal
  if (Array.isArray(rec.proposals) && typeof rec.proposals[0] === "string") {
    return (rec.proposals[0] as string).trim().slice(0, maxChars);
  }
  // Manager tasks: first suggested action title
  if (Array.isArray(rec.suggestedActions)) {
    const first = rec.suggestedActions[0];
    if (first && typeof first === "object" && "title" in first && typeof (first as Record<string, unknown>).title === "string") {
      return ((first as Record<string, unknown>).title as string).trim().slice(0, maxChars);
    }
  }
  return null;
}

function getApprovalResultLabel(taskType: string): string {
  const contentTypes = [
    "ANNOUNCE_POST_DRAFT",
    "THANK_YOU_POST_DRAFT",
    "SUPPORT_STORY_POST_DRAFT",
    "PROPOSE_NEXT_POST",
    "TRANSLATE_POST",
  ];
  if (contentTypes.includes(taskType)) {
    return "承認すると → 投稿の下書きに追加されます";
  }
  if (taskType === "DISTRIBUTION_PLAN_DRAFT") {
    return "承認すると → 精算プランに反映されます";
  }
  return "承認すると → 提案として記録されます";
}

function AgentTaskCard(props: {
  task: AgentTaskView;
  loading: boolean;
  selected: boolean;
  selectable: boolean;
  onToggleTaskSelection: (taskId: string) => void;
  onApproveOne: (taskId: string) => void;
  onRejectOne: (taskId: string, note?: string) => void;
}) {
  const { task } = props;
  const [open, setOpen] = React.useState(false);
  const [rejectMode, setRejectMode] = React.useState(false);
  const [localRejectNote, setLocalRejectNote] = React.useState("");
  const statusCopy = getAgentTaskStatusCopy(task.status);
  const taskRoles = getAiOfficeTaskRoleChoices(task.taskType as TaskType);
  const isWaiting = task.status === "WAITING_APPROVAL";
  const previewText = extractTaskOutputPreview(task.output);

  function handleRejectConfirm() {
    props.onRejectOne(task.id, localRejectNote.trim() || undefined);
    setRejectMode(false);
    setLocalRejectNote("");
  }

  return (
    <div className="card overflow-hidden">
      {/* ── Header ── */}
      <div className="p-4">
        {/* Row 1: role chips + time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {taskRoles.map((role) => (
              <span
                key={role.roleId}
                className="status-badge status-badge-neutral"
              >
                {role.label}
              </span>
            ))}
          </div>
          <span className="shrink-0 caption-text">{task.createdAt}</span>
        </div>

        {/* Row 2: task type label + status badge */}
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="section-title">{getAgentTaskTypeCopy(task.taskType).label}</div>
          <span
            className={`shrink-0 status-badge ${
              task.status === "WAITING_APPROVAL"
                ? "status-badge-warn"
                : task.status === "APPROVED"
                  ? "status-badge-ok"
                  : task.status === "REJECTED"
                    ? "status-badge-error"
                    : "status-badge-neutral"
            }`}
          >
            {statusCopy.label}
          </span>
        </div>

        {/* Row 3: content preview (always visible) */}
        {previewText ? (
          <div className="mt-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] px-3 py-2.5">
            <p className="text-sm leading-relaxed text-[var(--text)] line-clamp-3">
              {previewText}
              {previewText.length >= 140 ? "…" : ""}
            </p>
          </div>
        ) : null}

        {/* Row 4: what happens after approval */}
        {isWaiting ? (
          <p className="mt-2 caption-text">
            {getApprovalResultLabel(task.taskType)}
          </p>
        ) : null}

        {/* Row 5: expand/collapse full output */}
        <button
          type="button"
          className="mt-2 text-xs font-medium text-[var(--accent)] hover:opacity-75 transition-opacity"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "閉じる ↑" : "全文を見る ↓"}
        </button>
      </div>

      {/* ── Full output (expandable) ── */}
      {open ? (
        <div className="border-t border-[var(--line)] px-4 pb-4 pt-3">
          <AgentTaskOutput
            taskType={task.taskType}
            output={task.output}
            projectId={task.projectId}
          />
          {task.auditLogs.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer caption-text hover:text-[var(--text)]">
                操作履歴 ({task.auditLogs.length}件)
              </summary>
              <div className="mt-2 space-y-1 rounded-xl bg-[var(--surface-subtle)] p-3 caption-text">
                {task.auditLogs.map((log) => (
                  <div key={log.id}>
                    {getAgentTaskAuditActionLabel(log.action)}
                    {log.note ? ` — ${log.note}` : ""}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {/* ── Action bar — always visible for WAITING_APPROVAL ── */}
      {props.selectable && isWaiting && !rejectMode ? (
        <div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
          <label className="inline-flex shrink-0 items-center gap-1.5 caption-text cursor-pointer">
            <input
              type="checkbox"
              checked={props.selected}
              onChange={() => props.onToggleTaskSelection(task.id)}
              disabled={props.loading}
              className="accent-slate-700"
            />
            一括に含める
          </label>
          <span className="flex-1" />
          <button
            type="button"
            className="btn"
            onClick={() => props.onApproveOne(task.id)}
            disabled={props.loading}
          >
            {props.loading ? "処理中..." : "✓ 承認する"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setRejectMode(true)}
            disabled={props.loading}
          >
            却下
          </button>
        </div>
      ) : null}

      {/* ── Inline reject ── */}
      {props.selectable && isWaiting && rejectMode ? (
        <div className="border-t border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 space-y-2">
          <div className="text-xs font-semibold text-[var(--danger)]">却下の理由（任意）</div>
          <input
            type="text"
            className="input text-sm"
            value={localRejectNote}
            onChange={(e) => setLocalRejectNote(e.target.value)}
            placeholder="理由を入力（省略できます）"
            disabled={props.loading}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-danger"
              onClick={handleRejectConfirm}
              disabled={props.loading}
            >
              {props.loading ? "処理中..." : "却下を確定"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setRejectMode(false); setLocalRejectNote(""); }}
              disabled={props.loading}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AiOfficeInboxSection(props: Props) {
  const matchesSelectedRole = React.useCallback(
    (task: AgentTaskView) =>
      props.selectedRoleId === null ||
      doesAiOfficeTaskMatchRole(
        task.taskType as TaskType,
        props.selectedRoleId
      ),
    [props.selectedRoleId]
  );
  const waitingTasks = props.tasks.filter(
    (task) => task.status === "WAITING_APPROVAL"
  );
  const filteredWaitingTasks = waitingTasks.filter(matchesSelectedRole);
  const historyTasks = props.tasks.filter(
    (task) => task.status !== "WAITING_APPROVAL"
  );
  const filteredHistoryTasks = historyTasks.filter(matchesSelectedRole);
  const historyVisible = props.taskFilter === "ALL";
  const hasSelectedTasks = props.selectedTaskIds.length > 0;
  const selectedRoleBreakdown =
    props.selectedRoleId === null
      ? null
      : props.usefulness.roleBreakdown.find(
          (role) => role.roleId === props.selectedRoleId
        ) ?? null;

  const prioritizedRoleNotice = React.useMemo(() => {
    const staleRole = [...props.usefulness.roleBreakdown]
      .filter((role) => role.ignoredCount > 0)
      .sort(
        (left, right) =>
          right.ignoredCount - left.ignoredCount ||
          right.waitingApprovalCount - left.waitingApprovalCount
      )[0];

    if (staleRole) {
      return {
        tone: "attention" as const,
        title: `${staleRole.label} に保留が長い提案があります`,
        description: `承認待ち ${staleRole.waitingApprovalCount} 件のうち、${staleRole.ignoredCount} 件は長く止まっています。先にこの担当の提案を確認すると詰まりが減ります。`,
        roleId: staleRole.roleId,
      };
    }

    const waitingRole = [...props.usefulness.roleBreakdown]
      .filter((role) => role.waitingApprovalCount > 0)
      .sort(
        (left, right) =>
          right.waitingApprovalCount - left.waitingApprovalCount ||
          right.actionableCount - left.actionableCount
      )[0];

    if (!waitingRole) {
      return null;
    }

    return {
      tone: "info" as const,
      title: `${waitingRole.label} の承認待ちが先頭です`,
      description: `この担当では承認待ちが ${waitingRole.waitingApprovalCount} 件あります。先に承認待ちを減らしてから、新しい下書きに進めます。`,
      roleId: waitingRole.roleId,
    };
  }, [props.usefulness.roleBreakdown]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-title">承認待ち</div>
            <div className="mt-1 caption-text">
              AIが作成した提案を確認して、承認または却下できます。
            </div>
          </div>
          <div className="grid min-w-[240px] gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[11px] font-medium text-amber-800">
                今すぐ確認する
              </div>
              <div className="mt-1 text-2xl font-semibold text-amber-700">
                {filteredWaitingTasks.length}
              </div>
              <div className="text-[11px] text-amber-700">承認待ちのタスク</div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3">
              <div className="text-[11px] font-medium text-[var(--text)]">
                最近の履歴
              </div>
              <div className="mt-1 text-2xl font-semibold text-[var(--text)]">
                {filteredHistoryTasks.length}
              </div>
              <div className="caption-text">
                完了または却下済みのタスク
              </div>
            </div>
          </div>
        </div>
      </div>

      {prioritizedRoleNotice ? (
        <AiOfficeStatusNotice
          tone={prioritizedRoleNotice.tone}
          title={prioritizedRoleNotice.title}
          description={prioritizedRoleNotice.description}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={() => props.onRoleFilterChange(prioritizedRoleNotice.roleId)}
            disabled={props.loading}
          >
            この担当で絞る
          </button>
        </AiOfficeStatusNotice>
      ) : null}

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-title">
              承認待ちキュー
            </div>
            <div className="mt-1 caption-text">
              各担当から上がっている承認待ちの提案を確認します。
            </div>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-800">
            {filteredWaitingTasks.length}件
            {selectedRoleBreakdown ? ` / ${selectedRoleBreakdown.label}` : ""}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={props.selectedRoleId === null ? "action-pill-active" : "action-pill"}
            onClick={() => props.onRoleFilterChange(null)}
            disabled={props.loading}
          >
            すべての担当
          </button>
          {props.usefulness.roleBreakdown.map((role) => (
            <button
              key={role.roleId}
              type="button"
              className={props.selectedRoleId === role.roleId ? "action-pill-active" : "action-pill"}
              onClick={() => props.onRoleFilterChange(role.roleId)}
              disabled={props.loading}
            >
              {role.label}
              {role.waitingApprovalCount > 0
                ? ` (${role.waitingApprovalCount})`
                : ""}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          {filteredWaitingTasks.length === 0 ? (
            <AiOfficeEmptyState
              title={
                selectedRoleBreakdown
                  ? `${selectedRoleBreakdown.label} の承認待ちはありません`
                  : "今は承認待ちのタスクはありません"
              }
              description={
                selectedRoleBreakdown
                  ? "別の担当に切り替えるか、新しい下書きが承認待ちになるとここに表示されます。"
                  : "新しい下書きが承認待ちになると、ここに優先して表示されます。"
              }
            >
              {selectedRoleBreakdown ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    props.onOpenCreateForRole(selectedRoleBreakdown.roleId)
                  }
                  disabled={props.loading}
                >
                  この担当で下書きを作る
                </button>
              ) : null}
            </AiOfficeEmptyState>
          ) : (
            filteredWaitingTasks.map((task) => (
              <AgentTaskCard
                key={task.id}
                task={task}
                loading={props.loading}
                selected={props.selectedTaskIds.includes(task.id)}
                selectable
                onToggleTaskSelection={props.onToggleTaskSelection}
                onApproveOne={props.onApproveOne}
                onRejectOne={props.onRejectOne}
              />
            ))
          )}
        </div>
      </div>

      <div className="card p-4">
        {filteredWaitingTasks.length > 0 ? (
          <AiOfficeStatusNotice
            tone="attention"
            title={
              hasSelectedTasks
                ? `${props.selectedTaskIds.length}件を選択中です`
                : "まずは承認待ちから確認します"
            }
            description={
              hasSelectedTasks
                ? "メモを残したい場合は入力してから、一括承認または一括却下に進めます。"
                : "1件ずつ確認するか、承認待ちを全選択してまとめて処理できます。"
            }
          >
            {!hasSelectedTasks ? (
              <button
                type="button"
                className="btn"
                onClick={props.onSelectAllWaitingTasks}
                disabled={props.loading}
              >
                承認待ちを全選択
              </button>
            ) : null}
          </AiOfficeStatusNotice>
        ) : null}

        <div className="card p-4 space-y-3">
          <div>
            <div className="section-title">一括操作</div>
            <div className="mt-1 caption-text">承認メモ</div>
            <div className="mt-1 caption-text">
              承認や却下の理由を残したいときに使います。却下時は入力必須です。
            </div>
          </div>
          <input
            className="input w-full"
            value={props.approvalNote}
            onChange={(e) => props.onApprovalNoteChange(e.target.value)}
            maxLength={300}
            placeholder="例: 今週の共有文としてそのまま使えるため承認"
            disabled={props.loading}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="caption-text">
              選択中: {props.selectedTaskIds.length} / 承認待ち:{" "}
              {filteredWaitingTasks.length}
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={props.onSelectAllWaitingTasks}
              disabled={props.loading || filteredWaitingTasks.length === 0}
            >
              全選択
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={props.onClearSelectedTasks}
              disabled={props.loading || props.selectedTaskIds.length === 0}
            >
              解除
            </button>
            <button
              type="button"
              className="btn"
              onClick={props.onApproveSelectedTasks}
              disabled={props.loading || props.selectedTaskIds.length === 0}
            >
              {props.loading ? "処理中..." : "一括承認"}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={props.onRejectSelectedTasks}
              disabled={props.loading || props.selectedTaskIds.length === 0}
            >
              {props.loading ? "処理中..." : "一括却下"}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-title">最近の履歴</div>
            <div className="mt-1 caption-text">
              すでに処理したタスクや、結果を見返したい下書きを確認できます。
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={props.taskFilter === "ALL" ? "action-pill-active" : "action-pill"}
              onClick={() => props.onTaskFilterChange("ALL")}
              disabled={props.loading}
            >
              履歴も見る
            </button>
            <button
              type="button"
              className={props.taskFilter === "WAITING_APPROVAL" ? "action-pill-active" : "action-pill"}
              onClick={() => props.onTaskFilterChange("WAITING_APPROVAL")}
              disabled={props.loading}
            >
              承認待ちに集中
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {!historyVisible ? (
            <AiOfficeEmptyState
              title="いまは承認待ちに集中する表示です"
              description="履歴を見返すときは「履歴も見る」に切り替えてください。"
            />
          ) : filteredHistoryTasks.length === 0 ? (
            <AiOfficeEmptyState
              title={
                selectedRoleBreakdown
                  ? `${selectedRoleBreakdown.label} の履歴はまだありません`
                  : "まだ履歴はありません"
              }
              description={
                selectedRoleBreakdown
                  ? "担当を切り替えるか、この担当の提案を承認または却下するとここに履歴が残ります。"
                  : "承認や却下を行うと、ここに最近の履歴が残ります。"
              }
            >
              {selectedRoleBreakdown ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    props.onOpenCreateForRole(selectedRoleBreakdown.roleId)
                  }
                  disabled={props.loading}
                >
                  この担当で最初の下書きを作る
                </button>
              ) : null}
            </AiOfficeEmptyState>
          ) : (
            filteredHistoryTasks.map((task) => (
              <AgentTaskCard
                key={task.id}
                task={task}
                loading={props.loading}
                selected={false}
                selectable={false}
                onToggleTaskSelection={props.onToggleTaskSelection}
                onApproveOne={props.onApproveOne}
                onRejectOne={props.onRejectOne}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
