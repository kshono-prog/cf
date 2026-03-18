"use client";

import React from "react";

import {
  AiOfficeEmptyState,
  AiOfficeStatusNotice,
} from "@/components/mypage/AiOfficeFeedback";
import {
  formatAiOfficeRecentRoleShortcutTime,
  sortAiOfficeRecentCopiedRoleLinksByRecency,
  sortAiOfficeRecentRoleShortcutsByPriority,
  type AiOfficeRecentCopiedRoleLink,
  type AiOfficeRecentRoleShortcut,
} from "@/components/mypage/aiOfficeRecentRoleShortcuts";
import { buildAiOfficePanelHref } from "@/components/mypage/aiOfficePanelUrlState";
import { AgentTaskOutput } from "@/components/mypage/AgentTaskOutputViews";
import {
  getAiOfficeRoleChoice,
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
  recentRoleShortcuts: AiOfficeRecentRoleShortcut[];
  recentCopiedRoleLinks: AiOfficeRecentCopiedRoleLink[];
  selectedRoleId: CreatorAiAgentRole | null;
  waitingApprovalCount: number;
  selectedTaskIds: string[];
  approvalNote: string;
  onOpenCreateForRole: (roleId: CreatorAiAgentRole) => void;
  onOpenShortcut: (
    roleId: CreatorAiAgentRole,
    activeView: "CREATE" | "INBOX"
  ) => void;
  onCopiedRoleLink: (
    roleId: CreatorAiAgentRole,
    activeView: "CREATE" | "INBOX"
  ) => void;
  onRoleFilterChange: (roleId: CreatorAiAgentRole | null) => void;
  onTaskFilterChange: (value: TaskFilter) => void;
  onApprovalNoteChange: (value: string) => void;
  onSelectAllWaitingTasks: () => void;
  onClearSelectedTasks: () => void;
  onApproveSelectedTasks: () => void;
  onRejectSelectedTasks: () => void;
  onToggleTaskSelection: (taskId: string) => void;
  onApproveOne: (taskId: string) => void;
  onRejectOne: (taskId: string) => void;
};

function AgentTaskCard(props: {
  task: AgentTaskView;
  loading: boolean;
  selected: boolean;
  selectable: boolean;
  onToggleTaskSelection: (taskId: string) => void;
  onApproveOne: (taskId: string) => void;
  onRejectOne: (taskId: string) => void;
}) {
  const { task } = props;
  const statusCopy = getAgentTaskStatusCopy(task.status);
  const taskRoles = getAiOfficeTaskRoleChoices(task.taskType as TaskType);

  return (
    <details className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {getAgentTaskTypeCopy(task.taskType).label}
            </div>
            {taskRoles.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {taskRoles.map((role) => (
                  <span
                    key={role.roleId}
                    className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700"
                  >
                    {role.label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-1 text-[11px] text-gray-600">
              {statusCopy.label}
              {statusCopy.helper ? ` / ${statusCopy.helper}` : ""}
            </div>
          </div>
          <div className="text-[11px] text-gray-500">{task.createdAt}</div>
        </div>
      </summary>

      {props.selectable ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-[11px] text-gray-700">
            <input
              type="checkbox"
              checked={props.selected}
              onChange={() => props.onToggleTaskSelection(task.id)}
              disabled={props.loading}
            />
            このタスクを選択
          </label>
          <button
            type="button"
            className="rounded-full border px-3 py-1.5 text-[11px] font-medium disabled:opacity-40"
            onClick={() => props.onApproveOne(task.id)}
            disabled={props.loading}
          >
            承認
          </button>
          <button
            type="button"
            className="rounded-full border px-3 py-1.5 text-[11px] font-medium disabled:opacity-40"
            onClick={() => props.onRejectOne(task.id)}
            disabled={props.loading}
          >
            却下
          </button>
        </div>
      ) : null}

      <div className="mt-3">
        <AgentTaskOutput
          taskType={task.taskType}
          output={task.output}
          projectId={task.projectId}
        />
      </div>

      {task.auditLogs.length > 0 ? (
        <div className="mt-3 rounded-xl bg-white p-3">
          <div className="text-[11px] font-medium text-gray-700">操作履歴</div>
          <div className="mt-2 space-y-1 text-[11px] text-gray-600">
            {task.auditLogs.map((log) => (
              <div key={log.id}>
                {getAgentTaskAuditActionLabel(log.action)}
                {log.note ? ` / ${log.note}` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </details>
  );
}

export function AiOfficeInboxSection(props: Props) {
  const [copiedLinkKey, setCopiedLinkKey] = React.useState<string | null>(null);
  const { onCopiedRoleLink } = props;
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
  const recentRoleShortcuts = React.useMemo(
    () =>
      sortAiOfficeRecentRoleShortcutsByPriority(
        props.recentRoleShortcuts.map((shortcut) => {
        const roleChoice = getAiOfficeRoleChoice(shortcut.roleId);
        const roleBreakdown =
          props.usefulness.roleBreakdown.find(
            (role) => role.roleId === shortcut.roleId
          ) ?? null;
        return {
          ...shortcut,
          label: roleChoice?.label ?? shortcut.roleId,
          waitingApprovalCount: roleBreakdown?.waitingApprovalCount ?? 0,
          ignoredCount: roleBreakdown?.ignoredCount ?? 0,
          lastUsedLabel: formatAiOfficeRecentRoleShortcutTime(shortcut.lastUsedAt),
        };
      })
      ),
    [props.recentRoleShortcuts, props.usefulness.roleBreakdown]
  );
  const recentCopiedRoleLinkCards = React.useMemo(
    () =>
      sortAiOfficeRecentCopiedRoleLinksByRecency(
        props.recentCopiedRoleLinks.map((link) => {
          const roleChoice = getAiOfficeRoleChoice(link.roleId);
          return {
            ...link,
            label: roleChoice?.label ?? link.roleId,
            copiedLabel: formatAiOfficeRecentRoleShortcutTime(link.copiedAt),
          };
        })
      ),
    [props.recentCopiedRoleLinks]
  );

  React.useEffect(() => {
    if (copiedLinkKey === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedLinkKey((current) =>
        current === copiedLinkKey ? null : current
      );
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copiedLinkKey]);

  const copyRoleLink = React.useCallback(
    async (
      roleId: CreatorAiAgentRole,
      activeView: "CREATE" | "INBOX",
      key: string
    ) => {
      if (
        typeof window === "undefined" ||
        typeof window.navigator.clipboard?.writeText !== "function"
      ) {
        return;
      }

      const href = buildAiOfficePanelHref({
        pathname: window.location.pathname,
        hash: window.location.hash || "#ai-office-phase1",
        currentSearchParams: new URLSearchParams(window.location.search),
        state: {
          activeView,
          selectedRoleId: roleId,
          selectedInboxRoleId: activeView === "INBOX" ? roleId : null,
        },
      });

      try {
        await window.navigator.clipboard.writeText(
          `${window.location.origin}${href}`
        );
        onCopiedRoleLink(roleId, activeView);
        setCopiedLinkKey(key);
      } catch {
        return;
      }
    },
    [onCopiedRoleLink]
  );
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
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">承認待ち</div>
            <div className="mt-1 text-xs text-gray-500">
              AIが作成した提案を確認して、承認または却下できます。
            </div>
          </div>
          <div className="grid min-w-[240px] gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[11px] font-medium text-amber-900">
                今すぐ確認する
              </div>
              <div className="mt-1 text-2xl font-semibold text-amber-950">
                {filteredWaitingTasks.length}
              </div>
              <div className="text-[11px] text-amber-800">承認待ちのタスク</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-medium text-gray-700">
                最近の履歴
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {filteredHistoryTasks.length}
              </div>
              <div className="text-[11px] text-gray-600">
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
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
            onClick={() => props.onRoleFilterChange(prioritizedRoleNotice.roleId)}
            disabled={props.loading}
          >
            この担当で絞る
          </button>
        </AiOfficeStatusNotice>
      ) : null}

      {recentRoleShortcuts.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">
            最近使った担当
          </div>
          <div className="mt-1 text-xs text-gray-500">
            さっき開いていた担当の下書きや承認待ちに、そのまま戻れます。
          </div>
          <div className="mt-3 space-y-2">
            {recentRoleShortcuts.map((shortcut, index) => (
              <div
                key={`${shortcut.roleId}:${shortcut.activeView}`}
                className="rounded-xl bg-gray-50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-gray-900">
                      {shortcut.label}
                    </div>
                    {index === 0 &&
                    (shortcut.ignoredCount > 0 ||
                      shortcut.waitingApprovalCount > 0) ? (
                      <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-900">
                        先に確認
                      </span>
                    ) : null}
                  </div>
                  <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">
                    {shortcut.activeView === "INBOX" ? "承認待ち" : "下書き"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                    最終利用: {shortcut.lastUsedLabel}
                  </span>
                  {shortcut.waitingApprovalCount > 0 ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">
                      承認待ち {shortcut.waitingApprovalCount} 件
                    </span>
                  ) : null}
                  {shortcut.ignoredCount > 0 ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                      保留が長い {shortcut.ignoredCount} 件
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-full border bg-white px-3 py-1.5 text-[11px] font-medium disabled:opacity-40 ${
                      shortcut.ignoredCount > 0 ||
                      shortcut.waitingApprovalCount > 0
                        ? "border-amber-300 text-amber-900"
                        : "border-gray-300 text-gray-800"
                    }`}
                    onClick={() =>
                      props.onOpenShortcut(shortcut.roleId, "INBOX")
                    }
                    disabled={props.loading}
                  >
                    この担当の承認待ちを開く
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800 disabled:opacity-40"
                    onClick={() =>
                      props.onOpenShortcut(shortcut.roleId, "CREATE")
                    }
                    disabled={props.loading}
                  >
                    この担当で下書きを作る
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                    onClick={() =>
                      void copyRoleLink(
                        shortcut.roleId,
                        "INBOX",
                        `${shortcut.roleId}:INBOX:recent`
                      )
                    }
                    disabled={props.loading}
                  >
                    {copiedLinkKey === `${shortcut.roleId}:INBOX:recent`
                      ? "承認待ちリンクをコピー済み"
                      : "承認待ちリンクをコピー"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                    onClick={() =>
                      void copyRoleLink(
                        shortcut.roleId,
                        "CREATE",
                        `${shortcut.roleId}:CREATE:recent`
                      )
                    }
                    disabled={props.loading}
                  >
                    {copiedLinkKey === `${shortcut.roleId}:CREATE:recent`
                      ? "下書きリンクをコピー済み"
                      : "下書きリンクをコピー"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {recentCopiedRoleLinkCards.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-900">
            コピーしたリンク履歴
          </div>
          <div className="mt-1 text-xs text-gray-500">
            共有や運用メモで使った承認待ち・下書きのリンクを、ここから再コピーできます。
          </div>
          <div className="mt-3 space-y-2">
            {recentCopiedRoleLinkCards.map((link) => (
              <div
                key={`${link.roleId}:${link.activeView}`}
                className="rounded-xl bg-gray-50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-gray-900">
                    {link.label}
                  </div>
                  <span className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">
                    {link.activeView === "INBOX" ? "承認待ち" : "下書き"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-1">
                    コピー: {link.copiedLabel}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800 disabled:opacity-40"
                    onClick={() =>
                      props.onOpenShortcut(link.roleId, link.activeView)
                    }
                    disabled={props.loading}
                  >
                    {link.activeView === "INBOX"
                      ? "承認待ちを開く"
                      : "下書きを作る"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 disabled:opacity-40"
                    onClick={() =>
                      void copyRoleLink(
                        link.roleId,
                        link.activeView,
                        `${link.roleId}:${link.activeView}:copied`
                      )
                    }
                    disabled={props.loading}
                  >
                    {copiedLinkKey === `${link.roleId}:${link.activeView}:copied`
                      ? "リンクをコピー済み"
                      : "もう一度コピー"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              承認待ちキュー
            </div>
            <div className="mt-1 text-xs text-gray-500">
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
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
              props.selectedRoleId === null
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-gray-300 bg-white text-gray-800"
            }`}
            onClick={() => props.onRoleFilterChange(null)}
            disabled={props.loading}
          >
            すべての担当
          </button>
          {props.usefulness.roleBreakdown.map((role) => (
            <button
              key={role.roleId}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                props.selectedRoleId === role.roleId
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-gray-300 bg-white text-gray-800"
              }`}
              onClick={() => props.onRoleFilterChange(role.roleId)}
              disabled={props.loading}
            >
              {role.label}
              {role.waitingApprovalCount > 0
                ? ` / 承認待ち ${role.waitingApprovalCount}`
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
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
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
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-40"
                onClick={props.onSelectAllWaitingTasks}
                disabled={props.loading}
              >
                承認待ちを全選択
              </button>
            ) : null}
          </AiOfficeStatusNotice>
        ) : null}

        <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">一括操作</div>
            <div className="mt-1 text-xs text-gray-500">承認メモ</div>
            <div className="mt-1 text-xs text-gray-600">
              承認や却下の理由を残したいときに使います。却下時は入力必須です。
            </div>
          </div>
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={props.approvalNote}
            onChange={(e) => props.onApprovalNoteChange(e.target.value)}
            maxLength={300}
            placeholder="例: 今週の共有文としてそのまま使えるため承認"
            disabled={props.loading}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600">
              選択中: {props.selectedTaskIds.length} / 承認待ち:{" "}
              {filteredWaitingTasks.length}
            </span>
            <button
              type="button"
              className="rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              onClick={props.onSelectAllWaitingTasks}
              disabled={props.loading || filteredWaitingTasks.length === 0}
            >
              承認待ちを全選択
            </button>
            <button
              type="button"
              className="rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              onClick={props.onClearSelectedTasks}
              disabled={props.loading || props.selectedTaskIds.length === 0}
            >
              選択解除
            </button>
            <button
              type="button"
              className="rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              onClick={props.onApproveSelectedTasks}
              disabled={props.loading || props.selectedTaskIds.length === 0}
            >
              選択を一括承認
            </button>
            <button
              type="button"
              className="rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              onClick={props.onRejectSelectedTasks}
              disabled={props.loading || props.selectedTaskIds.length === 0}
            >
              選択を一括却下
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">最近の履歴</div>
            <div className="mt-1 text-xs text-gray-500">
              すでに処理したタスクや、結果を見返したい下書きを確認できます。
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                props.taskFilter === "ALL" ? "bg-gray-100" : ""
              }`}
              onClick={() => props.onTaskFilterChange("ALL")}
              disabled={props.loading}
            >
              履歴も見る
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                props.taskFilter === "WAITING_APPROVAL" ? "bg-gray-100" : ""
              }`}
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
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 disabled:opacity-40"
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
