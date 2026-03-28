"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";

import { useAccount } from "wagmi";

import { useManagerDeskActivityTimeline } from "@/components/managerDesk/useManagerDeskActivityTimeline";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type {
  ManagerDeskActivityTimelineItem,
  ManagerDeskActivityTimelineSourceType,
} from "@/lib/managerDesk/readModelTypes";

const ACTIVITY_TIMELINE_SOURCE_LABELS: Record<
  ManagerDeskActivityTimelineSourceType,
  string
> = {
  ACTION_LOG: "Action Log",
  MEETING: "Meeting",
  SHAREABLE_NOTE: "Shareable Note",
};

const secondaryActionClassName = "btn-secondary justify-center text-sm";
const compactSecondaryActionClassName = "btn-secondary justify-center text-xs";
const fieldClassName =
  "w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時刻不明";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {props.value}
      </div>
    </div>
  );
}

function sourceBadgeClass(
  sourceType: ManagerDeskActivityTimelineItem["sourceType"]
): string {
  if (sourceType === "MEETING") return "status-badge status-badge-warn";
  if (sourceType === "SHAREABLE_NOTE") return "status-badge status-badge-neutral";
  return "status-badge status-badge-neutral";
}

export function ManagerDeskActivityTimelineClient() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const creatorProfileId = searchParams.get("creatorProfileId");
  const sourceTypeParam = searchParams.get("sourceType");
  const sourceType =
    sourceTypeParam === "ACTION_LOG" ||
    sourceTypeParam === "MEETING" ||
    sourceTypeParam === "SHAREABLE_NOTE"
      ? sourceTypeParam
      : null;

  const { loading, error, data, reload } = useManagerDeskActivityTimeline({
    address,
    isConnected,
    creatorProfileId,
    sourceType,
  });

  function updateFilters(next: {
    creatorProfileId?: string | null;
    sourceType?: ManagerDeskActivityTimelineSourceType | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const nextCreatorProfileId =
      next.creatorProfileId === undefined ? creatorProfileId : next.creatorProfileId;
    const nextSourceType =
      next.sourceType === undefined ? sourceType : next.sourceType;

    if (nextCreatorProfileId) {
      params.set("creatorProfileId", nextCreatorProfileId);
    } else {
      params.delete("creatorProfileId");
    }

    if (nextSourceType) {
      params.set("sourceType", nextSourceType);
    } else {
      params.delete("sourceType");
    }

    const nextUrl = params.toString().length > 0 ? `${pathname}?${params}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  return (
    <MyPageShell headerColor="#0f172a" showPromo={false}>
      <div className="container-narrow space-y-4">
        <section className="surface-card space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                Manager Desk
              </div>
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                Activity Timeline
              </h1>
              <p className="text-sm leading-6 text-[var(--text-subtle)]">
                `Action Log / Meeting / Creator 共有可 note` を 1 本の時系列に重ねて、
                誰が何を進めたかを追う面です。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/manager-desk"
                className={secondaryActionClassName}
              >
                Dashboard に戻る
              </Link>
            </div>
          </div>

          {!isConnected ? (
            <WorkspaceStatusNotice
              tone="info"
              title="ウォレット接続後に Activity Timeline を読み込みます"
              description="assigned creator の履歴だけを安全に表示します。"
            />
          ) : null}

          {loading ? (
            <WorkspaceLoadingCard
              title="Activity Timeline を読み込んでいます"
              description="Action Log、Meeting、shareable note を時系列に整理しています。"
            />
          ) : null}

          {error ? (
            <WorkspaceStatusNotice
              tone="error"
              title="Activity Timeline の取得に失敗しました"
              description="接続状態を確認してから、もう一度試してください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryMetric label="Items" value={String(data.summary.totalCount)} />
                <SummaryMetric
                  label="Action Logs"
                  value={String(data.summary.actionLogCount)}
                />
                <SummaryMetric
                  label="Meetings"
                  value={String(data.summary.meetingCount)}
                />
                <SummaryMetric
                  label="Shareable Notes"
                  value={String(data.summary.shareableNoteCount)}
                />
              </div>

              <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 md:grid-cols-[1fr,1fr]">
                <label className="space-y-2 text-sm text-[var(--text-subtle)]">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                    Creator
                  </span>
                  <select
                    value={creatorProfileId ?? ""}
                    onChange={(event) => {
                      updateFilters({
                        creatorProfileId:
                          event.target.value.length > 0 ? event.target.value : null,
                      });
                    }}
                    className={fieldClassName}
                  >
                    <option value="">すべての Creator</option>
                    {data.availableCreators.map((creator) => (
                      <option key={creator.id} value={creator.id}>
                        {creator.displayName || creator.username}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-[var(--text-subtle)]">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                    Source
                  </span>
                  <select
                    value={sourceType ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      updateFilters({
                        sourceType:
                          value === "ACTION_LOG" ||
                          value === "MEETING" ||
                          value === "SHAREABLE_NOTE"
                            ? value
                            : null,
                      });
                    }}
                    className={fieldClassName}
                  >
                    <option value="">すべての source</option>
                    {Object.entries(ACTIVITY_TIMELINE_SOURCE_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>

              {data.items.length > 0 ? (
                <div className="space-y-3">
                  {data.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-[var(--line)] bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={sourceBadgeClass(item.sourceType)}>
                            {ACTIVITY_TIMELINE_SOURCE_LABELS[item.sourceType]}
                          </span>
                          <span className="status-badge status-badge-neutral">
                            {item.actorLabel}
                          </span>
                          <span className="text-xs text-[var(--text-subtle)]">
                            {item.creator.displayName || item.creator.username}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-subtle)]">
                          {formatDateTime(item.happenedAt)}
                        </div>
                      </div>

                      <div className="mt-3 text-sm font-semibold text-[var(--text)]">
                        {item.title}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
                        {item.summary ?? "詳細サマリーはまだありません。"}
                      </div>

                      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                        <Link
                          href={item.href}
                          className={compactSecondaryActionClassName}
                        >
                          Creator Detail で確認
                        </Link>
                        <Link
                          href={`/${item.creator.username}`}
                          className={compactSecondaryActionClassName}
                        >
                          公開ページを見る
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <WorkspaceEmptyState
                  title="まだ activity は積み上がっていません"
                  description="Action Log、Meeting、shareable note が入ると、この面に時系列で並びます。"
                />
              )}
            </div>
          ) : null}
        </section>
      </div>
    </MyPageShell>
  );
}
