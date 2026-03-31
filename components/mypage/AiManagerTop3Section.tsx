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
      <div className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-sm">
        {/* CTA ボタン行 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">
              AIマネージャーを呼ぶ
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-subtle)]">
              今すぐ動ける優先タスク Top3 を表示します
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => setOpen((v) => !v)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              open
                ? "bg-[var(--line)] text-[var(--text-subtle)]"
                : "bg-[var(--text)] text-[var(--bg)] hover:opacity-90"
            }`}
          >
            {loading ? "読み込み中..." : open ? "閉じる" : "呼ぶ ✦"}
          </button>
        </div>

        {/* 完了トースト */}
        {toast ? (
          <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 flex items-start gap-2">
            <span className="text-emerald-500 text-sm mt-0.5">✓</span>
            <div>
              <div className="text-xs font-semibold text-emerald-800">{toast.message}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">{toast.growthLabel}</div>
            </div>
          </div>
        ) : null}

        {/* 展開: Top3 タスクカード */}
        {open && (
          <div className="mt-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--text-subtle)]">
                今すぐ対応が必要なタスクはありません。引き続き活動を続けてください。
              </div>
            ) : (
              <>
                <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                  今日の優先タスク
                </div>
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
