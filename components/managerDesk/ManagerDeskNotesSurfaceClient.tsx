"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useAccount } from "wagmi";

import { ManagerDeskAuthRequiredNotice } from "@/components/managerDesk/ManagerDeskAuthRequiredNotice";
import {
  ManagerDeskRefreshingNotice,
  ManagerDeskStaleDataNotice,
} from "@/components/managerDesk/ManagerDeskQueryFeedback";
import { useManagerDeskAccessState } from "@/components/managerDesk/useManagerDeskAccessState";
import { useManagerDeskNotesSurface } from "@/components/managerDesk/useManagerDeskNotesSurface";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import {
  MANAGER_NOTE_TYPES,
  NOTE_VISIBILITIES,
} from "@/lib/managerDesk/contracts";

const MANAGER_NOTE_TYPE_LABELS: Record<(typeof MANAGER_NOTE_TYPES)[number], string> = {
  GENERAL: "一般",
  VENUE_SCOUT: "会場下見",
  SALES_MEETING: "営業面談",
  NEGOTIATION: "交渉",
  CREATOR_STATUS: "Creator 状況",
  EVENT_OPERATION: "当日運営",
  RISK: "リスク",
  FOLLOW_UP: "フォローアップ",
};

const NOTE_VISIBILITY_LABELS: Record<(typeof NOTE_VISIBILITIES)[number], string> = {
  MANAGER_ONLY: "Manager Only",
  INTERNAL_TEAM: "Internal Team",
  SHAREABLE_WITH_CREATOR: "Creator 共有可",
};

const secondaryActionClassName = "btn-secondary justify-center text-sm";
const fieldClassName =
  "w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]";

function formatDateTime(value: string | null): string {
  if (!value) return "未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定";
  return date.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryMetric(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {props.value}
      </div>
    </div>
  );
}

export function ManagerDeskNotesSurfaceClient() {
  const { address, isConnected } = useAccount();
  const access = useManagerDeskAccessState({ isConnected });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFilterPending, startFilterTransition] = useTransition();

  const creatorProfileId = searchParams.get("creatorProfileId");
  const noteType = searchParams.get("noteType");
  const visibility = searchParams.get("visibility");
  const followUpOnly = searchParams.get("followUpOnly") === "1";
  const q = searchParams.get("q");
  const [query, setQuery] = useState(q ?? "");

  useEffect(() => {
    setQuery(q ?? "");
  }, [q]);

  const { loading, error, data, reload } = useManagerDeskNotesSurface({
    address,
    isConnected: access.canReadProtectedData,
    creatorProfileId,
    noteType,
    visibility,
    followUpOnly,
    q,
  });

  function updateFilters(next: {
    creatorProfileId?: string | null;
    noteType?: string | null;
    visibility?: string | null;
    followUpOnly?: boolean;
    q?: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const nextCreatorProfileId =
      next.creatorProfileId === undefined ? creatorProfileId : next.creatorProfileId;
    const nextNoteType = next.noteType === undefined ? noteType : next.noteType;
    const nextVisibility =
      next.visibility === undefined ? visibility : next.visibility;
    const nextFollowUpOnly =
      next.followUpOnly === undefined ? followUpOnly : next.followUpOnly;
    const nextQuery = next.q === undefined ? q : next.q;

    if (nextCreatorProfileId) {
      params.set("creatorProfileId", nextCreatorProfileId);
    } else {
      params.delete("creatorProfileId");
    }

    if (nextNoteType) {
      params.set("noteType", nextNoteType);
    } else {
      params.delete("noteType");
    }

    if (nextVisibility) {
      params.set("visibility", nextVisibility);
    } else {
      params.delete("visibility");
    }

    if (nextFollowUpOnly) {
      params.set("followUpOnly", "1");
    } else {
      params.delete("followUpOnly");
    }

    if (nextQuery && nextQuery.trim().length > 0) {
      params.set("q", nextQuery.trim());
    } else {
      params.delete("q");
    }

    const nextUrl = params.toString().length > 0 ? `${pathname}?${params}` : pathname;
    startFilterTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }

  const isInitialLoading = access.authChecking || (loading && !data);
  const isRefreshing =
    !access.authChecking && Boolean(data) && (loading || isFilterPending);
  const hasBlockingError = Boolean(error && !data);
  const hasStaleError = Boolean(error && data);

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
                Notes Surface
              </h1>
              <p className="text-sm leading-6 text-[var(--text-subtle)]">
                creator をまたいで Manager Note を読み、`noteType / visibility /
                follow-up` を軸に次の会議や判断材料を拾う面です。
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
              title="ウォレット接続後に Notes Surface を読み込みます"
              description="assigned creator の note だけを安全に表示します。"
            />
          ) : null}

          {access.authRequired ? (
            <ManagerDeskAuthRequiredNotice
              authenticating={access.authChecking}
              onAuthenticate={access.authenticate}
            />
          ) : null}

          {isInitialLoading ? (
            <WorkspaceLoadingCard
              title="Notes Surface を読み込んでいます"
              description="Manager Note の一覧、フィルタ、認証状態を準備しています。"
            />
          ) : null}

          {isRefreshing ? (
            <ManagerDeskRefreshingNotice
              title="フィルタ条件を反映しています"
              description="前回の note 一覧を残したまま、Creator・種別・公開範囲・検索条件を更新しています。"
            />
          ) : null}

          {hasBlockingError ? (
            <WorkspaceStatusNotice
              tone="error"
              title="Notes Surface の取得に失敗しました"
              description="接続状態を確認してから、もう一度試してください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {hasStaleError ? (
            <ManagerDeskStaleDataNotice
              title="最新の Notes Surface を更新できませんでした"
              description="前回の一覧を表示しています。検索条件を見直すか、時間をおいて再読み込みしてください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryMetric label="ノート" value={String(data.summary.totalCount)} />
                <SummaryMetric
                  label="フォローアップ"
                  value={String(data.summary.followUpCount)}
                />
                <SummaryMetric
                  label="期限超過"
                  value={String(data.summary.overdueCount)}
                />
                <SummaryMetric
                  label="クリエイター共有可"
                  value={String(data.summary.shareableCount)}
                />
              </div>

              <form
                className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 lg:grid-cols-[1fr,1fr,1fr,1fr,auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  updateFilters({ q: query });
                }}
              >
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
                    Note Type
                  </span>
                  <select
                    value={noteType ?? ""}
                    onChange={(event) => {
                      updateFilters({
                        noteType:
                          event.target.value.length > 0 ? event.target.value : null,
                      });
                    }}
                    className={fieldClassName}
                  >
                    <option value="">すべての noteType</option>
                    {MANAGER_NOTE_TYPES.map((noteTypeValue) => (
                      <option key={noteTypeValue} value={noteTypeValue}>
                        {MANAGER_NOTE_TYPE_LABELS[noteTypeValue]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-[var(--text-subtle)]">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                    Visibility
                  </span>
                  <select
                    value={visibility ?? ""}
                    onChange={(event) => {
                      updateFilters({
                        visibility:
                          event.target.value.length > 0 ? event.target.value : null,
                      });
                    }}
                    className={fieldClassName}
                  >
                    <option value="">すべての visibility</option>
                    {NOTE_VISIBILITIES.map((visibilityValue) => (
                      <option key={visibilityValue} value={visibilityValue}>
                        {NOTE_VISIBILITY_LABELS[visibilityValue]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-[var(--text-subtle)]">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em]">
                    Search
                  </span>
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                    }}
                    placeholder="タイトル / 本文 / AI summary"
                    className={fieldClassName}
                  />
                </label>

                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
                    <input
                      type="checkbox"
                      checked={followUpOnly}
                      onChange={(event) => {
                        updateFilters({ followUpOnly: event.target.checked });
                      }}
                    />
                    follow-up のみ
                  </label>
                  <button
                    type="submit"
                    className={secondaryActionClassName}
                  >
                    検索
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-subtle)]">
                <div>
                  manager-only と creator-shareable を分けて表示します。creator detail
                  と行き来しながら文脈を確認できます。
                </div>
                <div>更新時刻 {formatDateTime(data.generatedAt)}</div>
              </div>

              {data.items.length > 0 ? (
                <div className="space-y-3">
                  {data.items.map((item) => (
                    <article
                      key={item.note.id}
                      className="surface-card space-y-4 p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="status-badge status-badge-neutral">
                              {MANAGER_NOTE_TYPE_LABELS[item.note.noteType]}
                            </span>
                            <span className="status-badge status-badge-neutral">
                              {NOTE_VISIBILITY_LABELS[item.note.visibility]}
                            </span>
                            {item.note.followUpNeeded ? (
                              <span className="status-badge status-badge-warn">
                                follow-up
                              </span>
                            ) : null}
                          </div>
                          <h2 className="text-lg font-semibold text-[var(--text)]">
                            {item.note.title}
                          </h2>
                          <div className="text-sm text-[var(--text-subtle)]">
                            {item.creator.displayName || item.creator.username} / @
                            {item.creator.username}
                          </div>
                        </div>

                        <div className="text-right text-xs text-[var(--text-subtle)]">
                          <div>更新 {formatDateTime(item.note.updatedAt)}</div>
                          <div className="mt-1">
                            期限 {formatDateTime(item.note.followUpDueAt)}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                        <div className="text-sm leading-6 text-[var(--text)]">
                          {item.note.aiSummary ?? item.note.body}
                        </div>
                        {item.note.aiTags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.note.aiTags.map((tag) => (
                              <span
                                key={`${item.note.id}-${tag}`}
                                className="status-badge status-badge-neutral"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr,auto]">
                        <div className="text-sm text-[var(--text-subtle)]">
                          停滞 {item.staleDays == null ? "不明" : `${item.staleDays}日`} / 担当{" "}
                          {item.assignment == null
                            ? "未設定"
                            : item.assignment.roleType === "PRIMARY"
                              ? "主担当"
                              : "副担当"}
                        </div>
                        <div className="grid gap-2 sm:flex sm:flex-wrap">
                          <Link
                            href={`/manager-desk/creators/${item.creator.id}#latest-notes`}
                            className="btn-raised btn-raised-sm"
                          >
                            Creator Detail
                          </Link>
                          {item.note.externalContactId ? (
                            <Link
                              href={`/manager-desk/contacts?creatorProfileId=${item.creator.id}`}
                              className={secondaryActionClassName}
                            >
                              Contact Pipeline
                            </Link>
                          ) : null}
                          <Link
                            href={`/${item.creator.username}`}
                            className={secondaryActionClassName}
                          >
                            公開ページを見る
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <WorkspaceEmptyState
                  title="条件に合う note はまだありません"
                  description="creator、noteType、visibility、follow-up、検索条件を見直してみてください。"
                />
              )}
            </div>
          ) : null}
        </section>
      </div>
    </MyPageShell>
  );
}
