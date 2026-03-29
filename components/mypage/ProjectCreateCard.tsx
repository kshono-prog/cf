"use client";

import React, { useEffect, useState } from "react";
import { createMyPageProject } from "@/lib/api/project";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

type DefaultValues = {
  title?: string;
  description?: string;
  purposeMode?: string;
};

type Props = {
  onCreated: (projectId: string) => void;
  defaultValues?: DefaultValues;
  ownerAddress: string;
  currency?: CurrencyCode;
  shownProjectId?: string | null;
};

export function ProjectCreateCard({
  onCreated,
  defaultValues,
  ownerAddress,
  currency = "JPYC",
  shownProjectId,
}: Props) {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [purposeMode, setPurposeMode] = useState(
    defaultValues?.purposeMode ?? "OPTIONAL"
  );
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  useEffect(() => {
    setTitle(defaultValues?.title ?? "");
    setDescription(defaultValues?.description ?? "");
    setPurposeMode(defaultValues?.purposeMode ?? "OPTIONAL");
  }, [
    defaultValues?.description,
    defaultValues?.purposeMode,
    defaultValues?.title,
  ]);

  const canCreate = title.trim().length > 0 && !creating;

  async function handleSubmit() {
    if (!canCreate) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const result = await createMyPageProject({
        ownerAddress,
        title,
        description: description.trim().length > 0 ? description : null,
        purposeMode,
        currency,
      });
      if (!result.ok) {
        setCreateMsg(result.error);
        return;
      }
      setCreateMsg("Project を作成しました。");
      setTitle("");
      setDescription("");
      setPurposeMode("OPTIONAL");
      onCreated(result.projectId);
    } catch {
      setCreateMsg("PROJECT_CREATE_FAILED");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="card p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">最初の Project</h2>

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
        公開ページで最初に支援してもらう単位です。何を前に進めたいのかが一言で伝わるタイトルがおすすめです。
      </p>

      {createMsg && (
        <div className="text-[11px] text-green-700">{createMsg}</div>
      )}

      <div className="space-y-2">
        <div>
          <label className="block text-[11px] text-gray-600 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="例）ライブ活動を広げる最初の Project"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">説明</label>
          <textarea
            className="input min-h-[70px]"
            placeholder="例）このプロジェクトの目的、背景、使い方など"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={creating}
          />
        </div>

        <div>
          <label className="block text-[11px] text-gray-600 mb-1">
            purposeMode
          </label>
          <select
            className="input"
            value={purposeMode}
            onChange={(e) => setPurposeMode(e.target.value)}
            disabled={creating}
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
        onClick={() => void handleSubmit()}
        disabled={!canCreate}
      >
        {creating ? "作成中..." : "Project を作成する"}
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
