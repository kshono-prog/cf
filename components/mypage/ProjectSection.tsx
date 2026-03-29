"use client";

import React from "react";
import { ProjectCreateCard } from "@/components/mypage/ProjectCreateCard";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import type { SummaryProject } from "@/lib/mypage/accountPageTypes";
import { useProjectSection } from "@/components/mypage/useProjectSection";

export function ProjectSection(props: {
  ownerAddress: string; // walletAddress (lower 0x..)
  activeProjectId: string | null;
  initialProject?: SummaryProject | null;
  currency?: "JPYC" | "USDC";
  featureHideSummaryActions?: boolean; // feature flag
  onActiveProjectIdChange?: (projectId: string, currency: "JPYC" | "USDC") => void;
  integratedGoalPanel?: React.ReactNode;
}) {
  const workspace = useCreatorReadyWorkspace();
  const {
    ownerAddress,
    activeProjectId,
    initialProject = null,
    currency = "JPYC",
    onActiveProjectIdChange,
    featureHideSummaryActions,
    integratedGoalPanel,
  } = props;
  const {
    hasActive,
    mode,
    setMode,
    project,
    loading,
    msg,
    handleCreated,
    editDraft,
  } = useProjectSection({
    ownerAddress,
    activeProjectId,
    initialProject,
    currency,
    onActiveProjectIdChange,
  });
  const handleProjectCreated = React.useCallback(
    (projectId: string) => {
      handleCreated(projectId);
      workspace.reportGrowthEvent({
        event: "project_created",
        projectId,
        metadata: {
          currency,
        },
      });
    },
    [currency, handleCreated, workspace]
  );
  const aiDefaultValues =
    workspace.aiSetupDraft.projectTitle.trim().length > 0 ||
    workspace.aiSetupDraft.projectDescription.trim().length > 0
      ? {
          title: workspace.aiSetupDraft.projectTitle,
          description: workspace.aiSetupDraft.projectDescription,
        }
      : undefined;

  return (
    <div className="card p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">公開向け Project</h2>
        {hasActive ? (
          <span className="text-[11px] text-gray-500">
            projectId: <span className="font-mono">{activeProjectId}</span>
          </span>
        ) : (
          <span className="text-[11px] text-gray-500">Project 未作成</span>
        )}
      </div>

      {msg ? <div className="text-[11px] text-gray-700">{msg}</div> : null}

      {/* A) activeあり → VIEW/EDIT/CREATE切替 */}
      {hasActive ? (
        <>
          {/* VIEW */}
          {mode === "VIEW" && (
            <>
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-sm font-semibold text-gray-900">
                  {project?.title ?? (loading ? "読み込み中…" : "(untitled)")}
                </div>

                {project?.description ? (
                  <div className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                    {project.description}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
                  <span className="px-2 py-1 rounded bg-gray-100">
                    purposeMode: {project?.purposeMode ?? "-"}
                  </span>
                  <span className="px-2 py-1 rounded bg-gray-100">
                    status: {project?.status ?? "-"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setMode("EDIT")}
                >
                  Project を編集
                </button>
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => setMode("CREATE")}
                >
                  新しい Project を作る（切り替え）
                </button>
              </div>

              <p className="text-[11px] text-gray-500">
                Project は分配・ブリッジ等の対象単位です。Goal は Project
                ごとに設定されます。
              </p>

              {/* Summary / Actions（feature flagで非表示） */}
              {!featureHideSummaryActions ? (
                <div className="rounded-xl border border-gray-200 p-3 text-[11px] text-gray-600">
                  Summary / Actions（ここは featureHideSummaryActions
                  で消せます）
                </div>
              ) : null}
            </>
          )}

          {/* EDIT */}
          {mode === "EDIT" && (
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                編集対象：active の Project のみ
              </div>

              <label className="block text-[11px] text-gray-600">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                value={editDraft.title}
                onChange={(e) => editDraft.setTitle(e.target.value)}
                disabled={editDraft.saving}
              />

              <label className="block text-[11px] text-gray-600">説明</label>
              <textarea
                className="input min-h-[70px]"
                value={editDraft.description}
                onChange={(e) => editDraft.setDescription(e.target.value)}
                disabled={editDraft.saving}
              />

              <label className="block text-[11px] text-gray-600">
                purposeMode
              </label>
              <select
                className="input"
                value={editDraft.purposeMode}
                onChange={(e) => editDraft.setPurposeMode(e.target.value)}
                disabled={editDraft.saving}
              >
                <option value="OPTIONAL">OPTIONAL（内訳は任意）</option>
                <option value="REQUIRED">REQUIRED（内訳が必須）</option>
                <option value="NONE">NONE（内訳なし）</option>
              </select>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => setMode("VIEW")}
                  disabled={editDraft.saving}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => {
                    void editDraft.onSave();
                  }}
                  disabled={
                    editDraft.saving || editDraft.title.trim().length === 0
                  }
                >
                  {editDraft.saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          )}

          {/* CREATE（activeありでもここでは"切替作成"として出す） */}
          {mode === "CREATE" && (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                新しい Project を作成して active を切り替えます。Goal は Project
                ごとです。
                新ProjectはGoal未設定（旧Goalは旧Projectに残ります）。
              </div>

              <ProjectCreateCard
                ownerAddress={ownerAddress}
                currency={currency}
                defaultValues={aiDefaultValues}
                shownProjectId={activeProjectId}
                onCreated={handleProjectCreated}
              />

              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => setMode("VIEW")}
              >
                戻る
              </button>
            </>
          )}
        </>
      ) : (
        // B) activeなし → 初回作成フォームだけ
        <ProjectCreateCard
          ownerAddress={ownerAddress}
          currency={currency}
          defaultValues={aiDefaultValues}
          onCreated={handleProjectCreated}
        />
      )}

      {integratedGoalPanel ? (
        <div className="mt-2 border-t border-gray-200 pt-3">
          {integratedGoalPanel}
        </div>
      ) : null}
    </div>
  );
}
