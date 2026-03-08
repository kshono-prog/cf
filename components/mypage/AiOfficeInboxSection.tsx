"use client";

import React from "react";

import {
  AiOfficeEmptyState,
  AiOfficeStatusNotice,
} from "@/components/mypage/AiOfficeFeedback";
import { AgentTaskOutput } from "@/components/mypage/AgentTaskOutputViews";
import type {
  AgentTaskView,
  TaskFilter,
} from "@/components/mypage/aiOfficeTypes";
import {
  getAgentTaskAuditActionLabel,
  getAgentTaskStatusCopy,
  getAgentTaskTypeCopy,
} from "@/lib/uxCopy";

type Props = {
  loading: boolean;
  taskFilter: TaskFilter;
  tasks: AgentTaskView[];
  waitingApprovalCount: number;
  selectedTaskIds: string[];
  approvalNote: string;
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

  return (
    <details className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-gray-900">
              {getAgentTaskTypeCopy(task.taskType).label}
            </div>
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
        <AgentTaskOutput taskType={task.taskType} output={task.output} />
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
  const waitingTasks = props.tasks.filter(
    (task) => task.status === "WAITING_APPROVAL"
  );
  const historyTasks = props.tasks.filter(
    (task) => task.status !== "WAITING_APPROVAL"
  );
  const historyVisible = props.taskFilter === "ALL";
  const hasSelectedTasks = props.selectedTaskIds.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">Inbox</div>
            <div className="mt-1 text-xs text-gray-500">
              まず承認待ちを処理し、その後に最近の履歴を確認する流れに整理しています。
            </div>
          </div>
          <div className="grid min-w-[240px] gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[11px] font-medium text-amber-900">
                今すぐ確認する
              </div>
              <div className="mt-1 text-2xl font-semibold text-amber-950">
                {waitingTasks.length}
              </div>
              <div className="text-[11px] text-amber-800">承認待ちのタスク</div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-medium text-gray-700">
                最近の履歴
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {historyTasks.length}
              </div>
              <div className="text-[11px] text-gray-600">
                完了または却下済みのタスク
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              承認待ちキュー
            </div>
            <div className="mt-1 text-xs text-gray-500">
              まずここで、いま判断が必要な AI タスクだけを確認します。
            </div>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-800">
            {waitingTasks.length}件
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {waitingTasks.length === 0 ? (
            <AiOfficeEmptyState
              title="今は承認待ちのタスクはありません"
              description="新しい下書きが承認待ちになると、ここに優先して表示されます。"
            />
          ) : (
            waitingTasks.map((task) => (
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
        {waitingTasks.length > 0 ? (
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
              {props.waitingApprovalCount}
            </span>
            <button
              type="button"
              className="rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
              onClick={props.onSelectAllWaitingTasks}
              disabled={props.loading || props.waitingApprovalCount === 0}
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
          ) : historyTasks.length === 0 ? (
            <AiOfficeEmptyState
              title="まだ履歴はありません"
              description="承認や却下を行うと、ここに最近の履歴が残ります。"
            />
          ) : (
            historyTasks.map((task) => (
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
