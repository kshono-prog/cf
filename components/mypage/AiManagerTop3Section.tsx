"use client";

import React from "react";
import type { Address } from "viem";
import { AiManagerTop3TaskCard } from "@/components/mypage/AiManagerTop3TaskCard";
import { AiManagerInlineTaskModal } from "@/components/mypage/AiManagerInlineTaskModal";
import { AiManagerInlineProfileEditPanel } from "@/components/mypage/AiManagerInlineProfileEditPanel";
import { AiManagerInlinePostingPanel } from "@/components/mypage/AiManagerInlinePostingPanel";
import type { AiManagerTop3Task, AiManagerInlinePanelKind } from "@/lib/aiManager/taskMeta";

type InlineContext = {
  address: Address | undefined;
  username: string;
  displayName: string;
  profile: string;
  projectId: string | null;
  publicPageUrl: string;
};

type Props = {
  tasks: AiManagerTop3Task[];
  loading: boolean;
  onOpenSettings: () => void;
  inlineContext: InlineContext;
};

type OpenInlineState = {
  panelKind: AiManagerInlinePanelKind;
  taskTitle: string;
};

type CompletionToast = {
  message: string;
  growthLabel: string;
};

export function AiManagerTop3Section({ tasks, loading, onOpenSettings, inlineContext }: Props) {
  const [open, setOpen] = React.useState(false);
  const [openInline, setOpenInline] = React.useState<OpenInlineState | null>(null);
  const [toast, setToast] = React.useState<CompletionToast | null>(null);

  function handleInlineAction(task: AiManagerTop3Task) {
    if (!task.inlinePanelKind) return;
    setOpenInline({ panelKind: task.inlinePanelKind, taskTitle: task.title });
  }

  function handleInlineClose() {
    setOpenInline(null);
  }

  function handleInlineComplete(feedback: { message: string; growthLabel: string }) {
    setOpenInline(null);
    setToast(feedback);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      {/* AI 提案カード — accent-subtle 背景 + 左ボーダー */}
      <div
        className="rounded-xl px-4 py-4"
        style={{
          background: "var(--accent-subtle)",
          borderLeft: "3px solid var(--accent)",
          border: "1px solid var(--accent-muted)",
        }}
      >
        {/* ヘッダー行 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--accent)" }}
            >
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 16, height: 16, color: "#fff" }}>
                <path d="M10 3a7 7 0 1 1 0 14A7 7 0 0 1 10 3z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.5 10.5c.5 1.2 1.5 2 2.5 2s2-.8 2.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7.5" cy="8.5" r="0.75" fill="currentColor" />
                <circle cx="12.5" cy="8.5" r="0.75" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text)]">AIマネージャー</p>
              <p className="text-[11px] text-[var(--accent)] font-semibold">今日の優先タスク</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => setOpen((v) => !v)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              open ? "btn-secondary" : "btn"
            }`}
          >
            {loading ? "読み込み中…" : open ? "閉じる" : "確認する ✦"}
          </button>
        </div>

        {/* 完了トースト */}
        {toast ? (
          <div className="accent-surface-emerald mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <span className="accent-text-emerald text-sm mt-0.5">✓</span>
            <div>
              <div className="text-xs font-semibold accent-text-emerald-strong">{toast.message}</div>
              <div className="text-[11px] accent-text-emerald mt-0.5">{toast.growthLabel}</div>
            </div>
          </div>
        ) : null}

        {/* 展開: Top3 タスクカード */}
        {open && (
          <div className="mt-4 space-y-2.5">
            {tasks.length === 0 ? (
              <div className="rounded-xl bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-subtle)]">
                今すぐ対応が必要なタスクはありません。引き続き活動を続けてください。
              </div>
            ) : (
              <>
                <p className="section-kicker mb-2">今日の優先タスク</p>
                {tasks.map((task, i) => (
                  <AiManagerTop3TaskCard
                    key={task.id}
                    task={task}
                    index={i}
                    onOpenSettings={onOpenSettings}
                    onInlineAction={
                      task.actionKind === "inline"
                        ? () => handleInlineAction(task)
                        : undefined
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* インラインモーダル */}
      {openInline ? (
        <AiManagerInlineTaskModal
          title={openInline.taskTitle}
          onClose={handleInlineClose}
        >
          {openInline.panelKind === "profile-edit" && inlineContext.address ? (
            <AiManagerInlineProfileEditPanel
              address={inlineContext.address}
              username={inlineContext.username}
              displayName={inlineContext.displayName}
              existingProfile={inlineContext.profile}
              onClose={handleInlineClose}
              onComplete={handleInlineComplete}
            />
          ) : openInline.panelKind === "posting-draft" ? (
            <AiManagerInlinePostingPanel
              projectId={inlineContext.projectId}
              displayName={inlineContext.displayName}
              username={inlineContext.username}
              publicPageUrl={inlineContext.publicPageUrl}
              onClose={handleInlineClose}
              onComplete={handleInlineComplete}
            />
          ) : (
            // address が undefined の場合など: フォールバック
            <div className="text-sm text-[var(--text-subtle)] py-4 text-center">
              ウォレットを接続してから操作してください。
            </div>
          )}
        </AiManagerInlineTaskModal>
      ) : null}
    </>
  );
}
