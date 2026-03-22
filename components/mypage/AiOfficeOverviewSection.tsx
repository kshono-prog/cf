"use client";

import React from "react";

import type {
  AgentTaskView,
} from "@/components/mypage/aiOfficeTypes";
import { getAiOfficeRoleChoices } from "@/components/mypage/aiOfficeTaskConfig";
import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";
import {
  getAgentTaskStatusCopy,
  getAgentTaskTypeCopy,
} from "@/lib/uxCopy";

type Props = {
  loading: boolean;
  waitingApprovalCount: number;
  tasks: AgentTaskView[];
  onOpenCreate: () => void;
  onOpenCreateForRole: (roleId: CreatorAiAgentRole) => void;
  onOpenInbox: (roleId?: CreatorAiAgentRole) => void;
  onCollectMetrics: () => void;
};

export function AiOfficeOverviewSection(props: Props) {
  const roleChoices = React.useMemo(() => getAiOfficeRoleChoices(), []);
  const recentTasks = React.useMemo(() => props.tasks.slice(0, 5), [props.tasks]);

  return (
    <div className="space-y-4">
      {/* ── Area 1: Status ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="section-label">現在の状況</div>
            {props.waitingApprovalCount > 0 ? (
              <>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-amber-500">{props.waitingApprovalCount}</span>
                  <span className="body-text">件の承認待ちがあります</span>
                </div>
                <p className="mt-1 caption-text">AIが作成した下書きの確認が必要です。</p>
              </>
            ) : (
              <>
                <div className="mt-1 text-lg font-semibold text-[var(--support)]">問題ありません</div>
                <p className="mt-1 caption-text">承認待ちはありません。新しい下書きを作ってみましょう。</p>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {props.waitingApprovalCount > 0 ? (
              <button
                type="button"
                className="btn"
                onClick={() => props.onOpenInbox()}
                disabled={props.loading}
              >
                承認待ちを確認する ({props.waitingApprovalCount}件)
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={props.onOpenCreate}
                disabled={props.loading}
              >
                新しく作成する →
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={props.onCollectMetrics}
              disabled={props.loading}
            >
              {props.loading ? "更新中..." : "指標を更新する"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Area 2: 最近の作成履歴 ── */}
      <div className="card">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <div>
            <div className="section-title">最近の作成履歴</div>
            <p className="caption-text mt-0.5">AIが作成した下書きの一覧です。</p>
          </div>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {recentTasks.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="body-text text-[var(--text-subtle)]">まだ下書きが作成されていません</p>
              <p className="caption-text mt-1">「新しく作成する」から最初の下書きを作ってみてください。</p>
              <button
                type="button"
                className="btn mt-3"
                onClick={props.onOpenCreate}
                disabled={props.loading}
              >
                下書きを作る →
              </button>
            </div>
          ) : (
            recentTasks.map((task) => {
              const statusCopy = getAgentTaskStatusCopy(task.status);
              return (
                <div key={task.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[var(--text)] truncate">
                      {getAgentTaskTypeCopy(task.taskType).label}
                    </div>
                    <div className="caption-text mt-0.5">{task.createdAt}</div>
                  </div>
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
              );
            })
          )}
        </div>
        {recentTasks.length > 0 ? (
          <div className="px-4 py-3 border-t border-[var(--line)]">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => props.onOpenInbox()}
              disabled={props.loading}
            >
              すべての履歴を見る →
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Area 3: AIの担当一覧 ── */}
      <div className="card overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--line)]">
          <div className="section-title">AIの担当一覧</div>
          <p className="caption-text mt-0.5">担当を選んで下書きを作れます。</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {roleChoices.map((role) => (
            <div key={role.roleId} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text)]">{role.label}</span>
                  <span className="status-badge status-badge-neutral">{role.taskChoices.length}種類</span>
                </div>
                <div className="caption-text mt-0.5">{role.roleHelper}</div>
              </div>
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => props.onOpenCreateForRole(role.roleId)}
                disabled={props.loading}
              >
                下書きを作る
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
