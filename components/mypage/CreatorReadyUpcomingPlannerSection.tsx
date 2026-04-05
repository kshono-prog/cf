"use client";

import Link from "next/link";

import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { mapWorkspaceActionError } from "@/lib/mypage/workspaceActionCopy";
import type {
  PlannerTimelineData,
  PlannerTimelineItem,
} from "@/lib/operations/plannerTypes";

type Props = {
  loading: boolean;
  error: string | null;
  data: PlannerTimelineData | null;
  /** href to AI Office Create (MEETING_AGENDA_DRAFT). Shown on MEETING items when provided. */
  agendaCreateHref?: string;
};

function formatDateTime(value: string | null): string {
  if (!value) return "期限未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "期限未設定";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: PlannerTimelineItem["status"]): string {
  if (status === "OVERDUE") return "status-badge status-badge-error";
  if (status === "DUE_SOON") return "status-badge status-badge-warn";
  return "status-badge status-badge-neutral";
}

function statusLabel(status: PlannerTimelineItem["status"]): string {
  if (status === "OVERDUE") return "期限超過";
  if (status === "DUE_SOON") return "近日中";
  return "予定";
}

function ownerLabel(owner: PlannerTimelineItem["owner"]): string {
  if (owner === "CREATOR") return "自分";
  if (owner === "MANAGER") return "マネージャー";
  return "共同";
}

function sourceLabel(source: PlannerTimelineItem["sourceType"]): string {
  switch (source) {
    case "MEETING":
      return "ミーティング";
    case "MANAGER_NOTE_FOLLOW_UP":
      return "フォローアップ";
    case "EXTERNAL_CONTACT_NEXT_ACTION":
      return "連絡先";
    case "PROJECT_DEADLINE":
      return "Goal 期限";
  }
}

function SummaryChip(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
        {props.label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--text)]">{props.value}</div>
    </div>
  );
}

export function CreatorReadyUpcomingPlannerSection(props: Props) {
  const { agendaCreateHref } = props;
  const errorNotice = props.error
    ? mapWorkspaceActionError(props.error, "予定データの取得に失敗しました。")
    : null;
  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">予定・プランナー</div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
            会議、goal 期限、共有フォローアップを時間軸で見て、次の準備へつなげます。
          </p>
        </div>
        {props.data ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip
              label="期限超過"
              value={String(props.data.summary.overdueCount)}
            />
            <SummaryChip
              label="近日中"
              value={String(props.data.summary.dueSoonCount)}
            />
            <SummaryChip
              label="会議"
              value={String(props.data.summary.meetingCount)}
            />
            <SummaryChip
              label="直近"
              value={formatDateTime(props.data.summary.nextDueAt)}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {props.loading ? (
          <WorkspaceLoadingCard
            title="今週の予定とフォローアップを整理しています"
            description="ミーティングと Goal 期限をまとめています。"
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
                className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={statusBadgeClass(item.status)}>
                    {statusLabel(item.status)}
                  </span>
                  <span className="status-badge status-badge-neutral">
                    {sourceLabel(item.sourceType)}
                  </span>
                  <span className="status-badge status-badge-neutral">
                    {ownerLabel(item.owner)}
                  </span>
                </div>
                <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                  {item.title}
                </div>
                <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
                  {item.description}
                </div>
                <div className="mt-3 text-xs text-[var(--muted)]">
                  期限 {formatDateTime(item.dueAt)}
                </div>
                {item.sourceType === "MEETING" && agendaCreateHref ? (
                  <div className="mt-3">
                    <Link
                      href={agendaCreateHref}
                      className="text-xs font-medium text-[var(--text-subtle)] underline underline-offset-2 hover:text-[var(--text)]"
                    >
                      アジェンダを作る →
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {!props.loading && !errorNotice && (!props.data || props.data.items.length === 0) ? (
          <WorkspaceEmptyState
            title="直近の予定はまだありません"
            description="ミーティングや共有フォローアップが記録されると、この面に時系列で並びます。"
          />
        ) : null}
      </div>
    </section>
  );
}
