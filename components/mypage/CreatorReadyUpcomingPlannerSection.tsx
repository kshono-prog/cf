"use client";

import Link from "next/link";

import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
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
  if (owner === "CREATOR") return "Creator";
  if (owner === "MANAGER") return "Manager";
  return "Shared";
}

function sourceLabel(source: PlannerTimelineItem["sourceType"]): string {
  switch (source) {
    case "MEETING":
      return "Meeting";
    case "MANAGER_NOTE_FOLLOW_UP":
      return "Follow-up";
    case "EXTERNAL_CONTACT_NEXT_ACTION":
      return "Contact";
    case "PROJECT_DEADLINE":
      return "Goal deadline";
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

export function CreatorReadyUpcomingPlannerSection(props: Props) {
  const { agendaCreateHref } = props;
  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-950">Upcoming / Planner</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            会議、goal 期限、共有フォローアップを時間軸で見て、次の準備へつなげます。
          </p>
        </div>
        {props.data ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip
              label="overdue"
              value={String(props.data.summary.overdueCount)}
            />
            <SummaryChip
              label="due soon"
              value={String(props.data.summary.dueSoonCount)}
            />
            <SummaryChip
              label="meetings"
              value={String(props.data.summary.meetingCount)}
            />
            <SummaryChip
              label="next"
              value={formatDateTime(props.data.summary.nextDueAt)}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {props.loading ? (
          <WorkspaceLoadingCard
            title="今週の予定と follow-up を整理しています"
            description="Meeting と goal deadline をまとめています。"
          />
        ) : null}

        {!props.loading && props.error ? (
          <WorkspaceStatusNotice
            tone="info"
            title="Planner は次の読み込みで更新されます"
            description="接続状態を確認すると、会議と期限の一覧をこの面に戻せます。"
          />
        ) : null}

        {!props.loading && !props.error && props.data?.items.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {props.data.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
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
                <div className="mt-3 text-sm font-semibold text-slate-950">
                  {item.title}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {item.description}
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  期限 {formatDateTime(item.dueAt)}
                </div>
                {item.sourceType === "MEETING" && agendaCreateHref ? (
                  <div className="mt-3">
                    <Link
                      href={agendaCreateHref}
                      className="text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-950"
                    >
                      アジェンダを作る →
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {!props.loading && !props.error && (!props.data || props.data.items.length === 0) ? (
          <WorkspaceEmptyState
            title="直近の予定はまだありません"
            description="Meeting や共有 follow-up が記録されると、この面に時系列で並びます。"
          />
        ) : null}
      </div>
    </section>
  );
}
