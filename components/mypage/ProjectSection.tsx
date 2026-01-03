"use client";

import React, { useEffect, useState } from "react";
import { ProjectCreateCard } from "@/components/mypage/ProjectCreateCard";

type Mode = "VIEW" | "EDIT" | "CREATE";

type ProjectCard = {
  id: string;
  title: string;
  description: string | null;
  purposeMode: string;
  status: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function toUiErrorMessage(json: unknown, fallback: string): string {
  if (!isRecord(json)) return fallback;
  const e = json.error;
  const d = json.detail;
  if (typeof e === "string" && e.length > 0) return e;
  if (typeof d === "string" && d.length > 0) return d;
  return fallback;
}

export function ProjectSection(props: {
  ownerAddress: string; // walletAddress (lower 0x..)
  activeProjectId: string | null;
  featureHideSummaryActions?: boolean; // feature flag
  onActiveProjectIdChange?: (projectId: string) => void;
}) {
  const {
    ownerAddress,
    activeProjectId,
    onActiveProjectIdChange,
    featureHideSummaryActions,
  } = props;

  // initial mode (activeあり→VIEW, なし→CREATE)
  const [mode, setMode] = useState<Mode>(activeProjectId ? "VIEW" : "CREATE");

  // activeProjectId が外から変わったら mode を同期（安全側）
  useEffect(() => {
    setMode(activeProjectId ? "VIEW" : "CREATE");
  }, [activeProjectId]);

  const [project, setProject] = useState<ProjectCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // CREATEフォーム状態（既存流用）
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purposeMode, setPurposeMode] = useState("OPTIONAL");
  const [creating, setCreating] = useState(false);

  // EDITフォーム状態（VIEWの値から初期化）
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPurposeMode, setEditPurposeMode] = useState("OPTIONAL");
  const [saving, setSaving] = useState(false);

  async function fetchActiveProjectSafe(pid: string): Promise<void> {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(pid)}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        setProject(null);
        setMsg(`Project の取得に失敗しました (${res.status})`);
        return;
      }

      const json: unknown = await res.json().catch(() => null);

      // 期待: { ok:true, project:{...} }
      if (!isRecord(json) || json.ok !== true || !isRecord(json.project)) {
        setProject(null);
        setMsg("Project のレスポンス形式が不正です");
        return;
      }

      const p = json.project as Record<string, unknown>;

      const next: ProjectCard = {
        id: asNonEmptyString(p.id) ?? pid,
        title: asNonEmptyString(p.title) ?? "(untitled)",
        description: asStringOrNull(p.description),
        purposeMode: asNonEmptyString(p.purposeMode) ?? "OPTIONAL",
        status: asNonEmptyString(p.status) ?? "DRAFT",
      };

      setProject(next);

      // EDITフォームも同期
      setEditTitle(next.title);
      setEditDescription(next.description ?? "");
      setEditPurposeMode(next.purposeMode);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeProjectId) {
      setProject(null);
      return;
    }
    void fetchActiveProjectSafe(activeProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  async function onCreate(): Promise<void> {
    if (creating) return;

    setCreating(true);
    setMsg(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          ownerAddress, // route.ts は ownerAddress 優先で parse してる
          title,
          description: description.trim().length > 0 ? description : null,
          purposeMode,
        }),
      });

      const json: unknown = await res.json().catch(() => null);

      // ✅ あなたの POST /api/projects は { id: "..." } を返す (ok は返さない)
      if (!res.ok || !isRecord(json)) {
        setMsg(toUiErrorMessage(json, `作成に失敗しました (${res.status})`));
        return;
      }

      const newId = asNonEmptyString(json.id);
      if (!newId) {
        setMsg("作成は成功しましたが projectId(id) が返りませんでした");
        return;
      }

      // 親へ通知（mypage側の creator.activeProjectId state を更新）
      onActiveProjectIdChange?.(newId);

      // 注意メッセージ（仕様）
      setMsg(
        "新しい Project に切り替えました。Goal は Project ごとで、新ProjectはGoal未設定です（旧Goalは旧Projectに残ります）。"
      );

      // 入力リセット
      setTitle("");
      setDescription("");
      setPurposeMode("OPTIONAL");

      // mode は activeProjectId 反映後に VIEW へ同期される
    } finally {
      setCreating(false);
    }
  }

  async function onSaveEdit(): Promise<void> {
    if (!activeProjectId || saving) return;

    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(activeProjectId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            title: editTitle,
            description:
              editDescription.trim().length > 0 ? editDescription : null,
            purposeMode: editPurposeMode,
          }),
        }
      );

      const json: unknown = await res.json().catch(() => null);

      // 期待: { ok:true, project:{...} }
      if (
        !res.ok ||
        !isRecord(json) ||
        json.ok !== true ||
        !isRecord(json.project)
      ) {
        setMsg(toUiErrorMessage(json, `更新に失敗しました (${res.status})`));
        return;
      }

      const p = json.project as Record<string, unknown>;
      const next: ProjectCard = {
        id: asNonEmptyString(p.id) ?? activeProjectId,
        title: asNonEmptyString(p.title) ?? "(untitled)",
        description: asStringOrNull(p.description),
        purposeMode: asNonEmptyString(p.purposeMode) ?? "OPTIONAL",
        status: asNonEmptyString(p.status) ?? "DRAFT",
      };

      setProject(next);
      setMode("VIEW");
      setMsg("更新しました");
    } finally {
      setSaving(false);
    }
  }

  const hasActive = !!activeProjectId;

  return (
    <div className="card p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Project</h2>
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
                  {/* ここに Summary / Actions を置く想定。今は非表示が目的なのでプレースホルダでOK */}
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
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={saving}
              />

              <label className="block text-[11px] text-gray-600">説明</label>
              <textarea
                className="input min-h-[70px]"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={saving}
              />

              <label className="block text-[11px] text-gray-600">
                purposeMode
              </label>
              <select
                className="input"
                value={editPurposeMode}
                onChange={(e) => setEditPurposeMode(e.target.value)}
                disabled={saving}
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
                  disabled={saving}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn flex-1"
                  onClick={() => {
                    void onSaveEdit();
                  }}
                  disabled={saving || editTitle.trim().length === 0}
                >
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            </div>
          )}

          {/* CREATE（activeありでもここでは“切替作成”として出す） */}
          {mode === "CREATE" && (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                新しい Project を作成して active を切り替えます。Goal は Project
                ごとです。
                新ProjectはGoal未設定（旧Goalは旧Projectに残ります）。
              </div>

              <ProjectCreateCard
                enabled={true}
                // ★ shownProjectId は ProjectCreateCard の props に無いなら渡さない（型エラー回避）
                projectTitle={title}
                projectDescription={description}
                projectPurposeMode={purposeMode}
                projectCreating={creating}
                projectCreateMsg={null}
                onChangeTitle={setTitle}
                onChangeDescription={setDescription}
                onChangePurposeMode={setPurposeMode}
                onSubmit={() => {
                  void onCreate();
                }}
              />

              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => setMode("VIEW")}
                disabled={creating}
              >
                戻る
              </button>
            </>
          )}
        </>
      ) : (
        // B) activeなし → 初回作成フォームだけ
        <ProjectCreateCard
          enabled={true}
          projectTitle={title}
          projectDescription={description}
          projectPurposeMode={purposeMode}
          projectCreating={creating}
          projectCreateMsg={null}
          onChangeTitle={setTitle}
          onChangeDescription={setDescription}
          onChangePurposeMode={setPurposeMode}
          onSubmit={() => {
            void onCreate();
          }}
        />
      )}
    </div>
  );
}
