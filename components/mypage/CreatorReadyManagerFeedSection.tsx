"use client";

import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { mapWorkspaceActionError } from "@/lib/mypage/workspaceActionCopy";
import type {
  CreatorManagerFeedData,
  CreatorManagerFeedItem,
} from "@/lib/operations/managerFeedTypes";

type Props = {
  loading: boolean;
  error: string | null;
  data: CreatorManagerFeedData | null;
};

function formatDateTime(value: string | null): string {
  if (!value) return "時刻未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時刻未設定";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toneStyle(tone: CreatorManagerFeedItem["tone"]): {
  border: string;
  background: string;
  labelBg: string;
  labelColor: string;
  label: string;
} {
  switch (tone) {
    case "attention":
      return {
        border: "border-amber-200",
        background: "bg-amber-50/70",
        labelBg: "bg-amber-100",
        labelColor: "text-amber-800",
        label: "優先",
      };
    case "recommended":
      return {
        border: "border-emerald-200",
        background: "bg-emerald-50/70",
        labelBg: "bg-emerald-100",
        labelColor: "text-emerald-800",
        label: "確認",
      };
    default:
      return {
        border: "border-[var(--line)]",
        background: "bg-[var(--surface-subtle)]",
        labelBg: "bg-[var(--surface-muted)]",
        labelColor: "text-[var(--text-subtle)]",
        label: "共有",
      };
  }
}

function noteTypeLabel(noteType: string): string {
  const map: Record<string, string> = {
    progress: "進捗",
    meeting: "ミーティング",
    decision: "決定事項",
    task: "タスク",
    memo: "メモ",
  };
  return map[noteType] ?? noteType;
}

export function CreatorReadyManagerFeedSection(props: Props) {
  const errorNotice = props.error
    ? mapWorkspaceActionError(props.error, "マネージャー共有情報の取得に失敗しました。")
    : null;

  return (
    <section className="card p-0 overflow-hidden">
      {/* ヘッダー */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 border-b border-[var(--line)]">
        <div>
          <p className="text-sm font-bold text-[var(--text)]">マネージャーからの共有</p>
          <p className="mt-0.5 text-xs leading-5 text-[var(--text-subtle)]">
            Manager が共有可能として残したメモや進行状況を確認できます。
          </p>
        </div>
        {props.data ? (
          <div className="flex flex-wrap gap-3 text-xs text-[var(--text-subtle)]">
            <span>
              <span className="font-semibold text-[var(--text)]">{props.data.summary.itemCount}</span>
              {" "}件の共有
            </span>
            {props.data.summary.followUpCount > 0 ? (
              <span>
                要フォロー{" "}
                <span className="font-semibold text-[var(--warning)]">
                  {props.data.summary.followUpCount}
                </span>
                件
              </span>
            ) : null}
            {props.data.summary.dueSoonCount > 0 ? (
              <span>
                期限近{" "}
                <span className="font-semibold text-[var(--danger)]">
                  {props.data.summary.dueSoonCount}
                </span>
                件
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* コンテンツ */}
      <div className="p-4">
        {props.loading ? (
          <WorkspaceLoadingCard
            title="マネージャーからの共有を整理しています"
            description="共有可能なメモだけを集めて、優先度順に並べています。"
          />
        ) : null}

        {!props.loading && errorNotice ? (
          <WorkspaceStatusNotice
            tone={errorNotice.tone}
            title={errorNotice.title}
            description={errorNotice.description}
          />
        ) : null}

        {!props.loading && !errorNotice && props.data?.items.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {props.data.items.map((item) => {
              const style = toneStyle(item.tone);
              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 ${style.border} ${style.background}`}
                >
                  {/* バッジ行 */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.labelBg} ${style.labelColor}`}
                    >
                      {style.label}
                    </span>
                    <span className="rounded-full bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--text-subtle)]">
                      {item.managerLabel}
                    </span>
                    <span className="rounded-full bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--text-subtle)]">
                      {noteTypeLabel(item.noteType)}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[var(--text)]">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">{item.summary}</p>

                  {/* メタ情報 */}
                  {(item.projectTitle || item.contactLabel || item.meetingLabel) ? (
                    <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
                      {item.projectTitle ? <span>プロジェクト: {item.projectTitle}</span> : null}
                      {item.contactLabel ? <span>担当: {item.contactLabel}</span> : null}
                      {item.meetingLabel ? <span>MTG: {item.meetingLabel}</span> : null}
                    </div>
                  ) : null}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
                    <span>更新 {formatDateTime(item.updatedAt)}</span>
                    {item.followUpNeeded ? (
                      <span className="text-[var(--warning)]">
                        期限 {formatDateTime(item.followUpDueAt)}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!props.loading && !errorNotice && (!props.data || props.data.items.length === 0) ? (
          <WorkspaceEmptyState
            title="共有可能な情報はまだありません"
            description="Manager が Creator に見せられるメモを残すと、共同運営の進捗がここに表示されます。"
          />
        ) : null}
      </div>
    </section>
  );
}
