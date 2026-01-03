"use client";

import React from "react";

export function ProjectCreateCard(props: {
  enabled: boolean;

  // ★ optional にする（初回作成では null/undefined でOK）
  shownProjectId?: string | null;

  projectTitle: string;
  projectDescription: string;
  projectPurposeMode: string;
  projectCreating: boolean;
  projectCreateMsg: string | null;
  onChangeTitle: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onChangePurposeMode: (v: string) => void;
  onSubmit: () => void;
}) {
  const {
    enabled,
    shownProjectId,
    projectTitle,
    projectDescription,
    projectPurposeMode,
    projectCreating,
    projectCreateMsg,
    onChangeTitle,
    onChangeDescription,
    onChangePurposeMode,
    onSubmit,
  } = props;

  if (!enabled) return null;

  const canCreate = projectTitle.trim().length > 0 && !projectCreating;

  return (
    <div className="card p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Project 作成</h2>

        {shownProjectId ? (
          <span className="text-[11px] text-gray-500">
            現在の projectId:{" "}
            <span className="font-mono">{shownProjectId}</span>
          </span>
        ) : (
          <span className="text-[11px] text-gray-500">Project 未作成</span>
        )}
      </div>

      <p className="text-xs text-gray-600">
        L1 設定・ブリッジ機能を使うには Project が必要です。ここで Project
        を作成できます。
      </p>

      {projectCreateMsg && (
        <div className="text-[11px] text-green-700">{projectCreateMsg}</div>
      )}

      <div className="space-y-2">
        <div>
          <label className="block text-[11px] text-gray-600 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="例）新しいイベント支援プロジェクト"
            value={projectTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            disabled={projectCreating}
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">説明</label>
          <textarea
            className="input min-h-[70px]"
            placeholder="例）このプロジェクトの目的、背景、使い方など"
            value={projectDescription}
            onChange={(e) => onChangeDescription(e.target.value)}
            disabled={projectCreating}
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">
            purposeMode
          </label>
          <select
            className="input"
            value={projectPurposeMode}
            onChange={(e) => onChangePurposeMode(e.target.value)}
            disabled={projectCreating}
          >
            <option value="OPTIONAL">OPTIONAL（内訳は任意）</option>
            <option value="REQUIRED">REQUIRED（内訳が必須）</option>
            <option value="NONE">NONE（内訳なし）</option>
          </select>

          <p className="text-[10px] text-gray-500 mt-1">
            現状は schema が string 運用のため、値は文字列として保存されます。
          </p>
        </div>
      </div>

      <button
        type="button"
        className="btn w-full"
        onClick={onSubmit}
        disabled={!canCreate}
      >
        {projectCreating ? "作成中..." : "Project を作成する"}
      </button>

      {shownProjectId ? (
        <div className="text-[10px] text-gray-500">
          作成直後に projectId
          をこのページに即時反映しています（リロード不要）。
        </div>
      ) : null}
    </div>
  );
}
