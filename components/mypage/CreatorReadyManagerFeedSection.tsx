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

function toneClass(tone: CreatorManagerFeedItem["tone"]): string {
  switch (tone) {
    case "attention":
      return "border-amber-200 bg-amber-50/80";
    case "recommended":
      return "border-emerald-200 bg-emerald-50/80";
    default:
      return "border-slate-200 bg-slate-50/80";
  }
}

function toneLabel(tone: CreatorManagerFeedItem["tone"]): string {
  switch (tone) {
    case "attention":
      return "優先";
    case "recommended":
      return "確認";
    default:
      return "共有";
  }
}

function SummaryChip(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {props.label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{props.value}</div>
    </div>
  );
}

export function CreatorReadyManagerFeedSection(props: Props) {
  const errorNotice = props.error
    ? mapWorkspaceActionError(props.error, "Manager Feed の取得に失敗しました。")
    : null;

  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">Manager Feed</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Manager が共有可能として残した現場メモや進行メモを、Creator 視点で短く確認できます。
          </p>
        </div>
        {props.data ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip label="updates" value={String(props.data.summary.itemCount)} />
            <SummaryChip
              label="follow-up"
              value={String(props.data.summary.followUpCount)}
            />
            <SummaryChip
              label="due soon"
              value={String(props.data.summary.dueSoonCount)}
            />
            <SummaryChip
              label="latest"
              value={formatDateTime(props.data.summary.latestUpdateAt)}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {props.loading ? (
          <WorkspaceLoadingCard
            title="Manager からの共有を整理しています"
            description="shareable note だけを集めて、いま見てほしい順に並べています。"
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
            {props.data.items.map((item) => (
              <article
                key={item.id}
                className={`rounded-2xl border p-4 ${toneClass(item.tone)}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-badge status-badge-neutral">
                    {toneLabel(item.tone)}
                  </span>
                  <span className="status-badge status-badge-neutral">
                    {item.managerLabel}
                  </span>
                  <span className="status-badge status-badge-neutral">
                    {item.noteType}
                  </span>
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-950">
                  {item.title}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-700">
                  {item.summary}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                  {item.projectTitle ? <span>Project: {item.projectTitle}</span> : null}
                  {item.contactLabel ? <span>Contact: {item.contactLabel}</span> : null}
                  {item.meetingLabel ? <span>Meeting: {item.meetingLabel}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>更新 {formatDateTime(item.updatedAt)}</span>
                  {item.followUpNeeded ? (
                    <span>確認期限 {formatDateTime(item.followUpDueAt)}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!props.loading && !errorNotice && (!props.data || props.data.items.length === 0) ? (
          <WorkspaceEmptyState
            title="共有可能な Manager update はまだありません"
            description="Manager が Creator に見せられる note を残すと、この面に共同運営の進捗が並びます。"
          />
        ) : null}
      </div>
    </section>
  );
}
