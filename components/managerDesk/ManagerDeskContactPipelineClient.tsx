"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { useAccount } from "wagmi";

import { ManagerDeskAuthRequiredNotice } from "@/components/managerDesk/ManagerDeskAuthRequiredNotice";
import {
  ManagerDeskRefreshingNotice,
  ManagerDeskStaleDataNotice,
} from "@/components/managerDesk/ManagerDeskQueryFeedback";
import { useManagerDeskAccessState } from "@/components/managerDesk/useManagerDeskAccessState";
import { useManagerDeskContactPipeline } from "@/components/managerDesk/useManagerDeskContactPipeline";
import { MyPageShell } from "@/components/mypage/MyPageShell";
import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { EXTERNAL_CONTACT_STATUSES } from "@/lib/managerDesk/contracts";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

const CONTACT_STATUS_LABELS: Record<(typeof EXTERNAL_CONTACT_STATUSES)[number], string> = {
  NEW: "未接触",
  CONTACTED: "接触済",
  REPLIED: "返信あり",
  MEETING_SCHEDULED: "面談予定",
  IN_DISCUSSION: "進行中",
  NEGOTIATING: "交渉中",
  ON_HOLD: "保留",
  WON: "成立",
  LOST: "不成立",
  ONGOING: "継続関係",
};

const TEMPERATURE_LABELS: Record<string, string> = {
  UNKNOWN: "不明",
  COLD: "低い",
  NEUTRAL: "普通",
  WARM: "高い",
  HOT: "非常に高い",
};

const TEMPERATURE_VALUES = ["UNKNOWN", "COLD", "NEUTRAL", "WARM", "HOT"] as const;

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

function dueStateBadgeClass(value: "OVERDUE" | "DUE_SOON" | "NONE"): string {
  if (value === "OVERDUE") return "status-badge status-badge-error";
  if (value === "DUE_SOON") return "status-badge status-badge-warn";
  return "status-badge status-badge-neutral";
}

function dueStateLabel(value: "OVERDUE" | "DUE_SOON" | "NONE"): string {
  if (value === "OVERDUE") return "期限超過";
  if (value === "DUE_SOON") return "近日対応";
  return "通常";
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

type ContactLocalOverride = {
  status?: (typeof EXTERNAL_CONTACT_STATUSES)[number];
  temperature?: (typeof TEMPERATURE_VALUES)[number];
  contractStatus?: string | null;
};

function isContractRenewalNeeded(contractStartAt: string | null): boolean {
  if (!contractStartAt) return false;
  const start = new Date(contractStartAt);
  if (Number.isNaN(start.getTime())) return false;
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  return start < twelveMonthsAgo;
}

export function ManagerDeskContactPipelineClient() {
  const { address, isConnected } = useAccount();
  const access = useManagerDeskAccessState({ isConnected });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFilterPending, startFilterTransition] = useTransition();

  const [localOverrides, setLocalOverrides] = useState<Record<string, ContactLocalOverride>>({});
  const [updatingContact, setUpdatingContact] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<(typeof EXTERNAL_CONTACT_STATUSES)[number]>("CONTACTED");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const creatorProfileId = searchParams.get("creatorProfileId");
  const status = searchParams.get("status");
  const overdueOnly = searchParams.get("overdue") === "1";

  const { loading, error, data, reload } = useManagerDeskContactPipeline({
    address,
    isConnected: access.canReadProtectedData,
    creatorProfileId,
    status,
    overdueOnly,
  });

  function updateFilters(next: {
    creatorProfileId?: string | null;
    status?: string | null;
    overdueOnly?: boolean;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const nextCreatorProfileId =
      next.creatorProfileId === undefined ? creatorProfileId : next.creatorProfileId;
    const nextStatus = next.status === undefined ? status : next.status;
    const nextOverdueOnly =
      next.overdueOnly === undefined ? overdueOnly : next.overdueOnly;

    if (nextCreatorProfileId) {
      params.set("creatorProfileId", nextCreatorProfileId);
    } else {
      params.delete("creatorProfileId");
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    } else {
      params.delete("status");
    }

    if (nextOverdueOnly) {
      params.set("overdue", "1");
    } else {
      params.delete("overdue");
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

  function toggleSelected(contactId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      if (ids.every((id) => prev.has(id))) {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...ids]);
    });
  }

  async function applyBulkStatus(): Promise<void> {
    if (!address || selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = [...selectedIds];
    const updates = ids.map((contactId) =>
      ownerAuthFetch({
        address,
        url: `/api/external-contacts/${contactId}`,
        init: {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, status: bulkStatus }),
        },
      }).then(() => {
        setLocalOverrides((prev) => ({
          ...prev,
          [contactId]: { ...prev[contactId], status: bulkStatus },
        }));
      })
    );
    await Promise.allSettled(updates);
    setSelectedIds(new Set());
    setBulkUpdating(false);
  }

  async function patchContact(
    contactId: string,
    patch: { status?: (typeof EXTERNAL_CONTACT_STATUSES)[number]; temperature?: (typeof TEMPERATURE_VALUES)[number]; contractStatus?: string | null }
  ): Promise<void> {
    if (!address) return;
    setLocalOverrides((prev) => ({ ...prev, [contactId]: { ...prev[contactId], ...patch } }));
    setUpdatingContact((prev) => ({ ...prev, [contactId]: true }));
    try {
      await ownerAuthFetch({
        address,
        url: `/api/external-contacts/${contactId}`,
        init: {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, ...patch }),
        },
      });
    } catch {
      // revert on failure
      setLocalOverrides((prev) => {
        const next = { ...prev };
        delete next[contactId];
        return next;
      });
    } finally {
      setUpdatingContact((prev) => ({ ...prev, [contactId]: false }));
    }
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
                Contact Pipeline
              </h1>
              <p className="text-sm leading-6 text-[var(--text-subtle)]">
                対外接点を `status / temperature / next action` で追い、期限超過や
                近日対応を先に拾うための軽量 CRM 面です。
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
              title="ウォレット接続後に Contact Pipeline を読み込みます"
              description="active assignment に紐づく Creator の contact だけを表示します。"
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
              title="Contact Pipeline を読み込んでいます"
              description="対外接点、期限、温度感、認証状態を整理しています。"
            />
          ) : null}

          {isRefreshing ? (
            <ManagerDeskRefreshingNotice
              title="フィルタ条件を反映しています"
              description="前回の一覧を残したまま、Creator・status・期限条件を更新しています。"
            />
          ) : null}

          {hasBlockingError ? (
            <WorkspaceStatusNotice
              tone="error"
              title="Contact Pipeline の取得に失敗しました"
              description="接続状態を確認してから、もう一度試してください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {hasStaleError ? (
            <ManagerDeskStaleDataNotice
              title="最新の Contact Pipeline を更新できませんでした"
              description="前回の一覧を表示しています。時間をおいて再読み込みしてください。"
              onRetry={() => {
                void reload();
              }}
            />
          ) : null}

          {data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <SummaryMetric
                  label="連絡先"
                  value={String(data.summary.totalCount)}
                />
                <SummaryMetric
                  label="期限超過"
                  value={String(data.summary.overdueCount)}
                />
                <SummaryMetric
                  label="近日対応"
                  value={String(data.summary.dueSoonCount)}
                />
                <SummaryMetric
                  label="温度感高め"
                  value={String(data.summary.warmContactCount)}
                />
              </div>

              <div className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 md:grid-cols-[1fr,1fr,auto]">
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
                    Status
                  </span>
                  <select
                    value={status ?? ""}
                    onChange={(event) => {
                      updateFilters({
                        status:
                          event.target.value.length > 0 ? event.target.value : null,
                      });
                    }}
                    className={fieldClassName}
                  >
                    <option value="">すべての status</option>
                    {EXTERNAL_CONTACT_STATUSES.map((statusValue) => (
                      <option key={statusValue} value={statusValue}>
                        {CONTACT_STATUS_LABELS[statusValue]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)]">
                  <input
                    type="checkbox"
                    checked={overdueOnly}
                    onChange={(event) => {
                      updateFilters({ overdueOnly: event.target.checked });
                    }}
                  />
                  期限超過のみ
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-subtle)]">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.items.length > 0 && data.items.every((i) => selectedIds.has(i.contact.id))}
                    onChange={() => toggleSelectAll(data.items.map((i) => i.contact.id))}
                    className="h-4 w-4 rounded border-[var(--line)] accent-[var(--accent)]"
                  />
                  <span>全選択</span>
                </label>
                <div>更新時刻 {formatDateTime(data.generatedAt)}</div>
              </div>

              {data.items.length > 0 && selectedIds.size > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-3">
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {selectedIds.size} 件選択中
                  </span>
                  <select
                    value={bulkStatus}
                    disabled={bulkUpdating}
                    onChange={(e) => setBulkStatus(e.target.value as (typeof EXTERNAL_CONTACT_STATUSES)[number])}
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)] disabled:opacity-50"
                  >
                    {EXTERNAL_CONTACT_STATUSES.map((s) => (
                      <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={bulkUpdating}
                    onClick={() => { void applyBulkStatus(); }}
                    className="btn-raised btn-raised-sm disabled:opacity-50"
                  >
                    {bulkUpdating ? "更新中…" : "一括更新"}
                  </button>
                  <button
                    type="button"
                    disabled={bulkUpdating}
                    onClick={() => setSelectedIds(new Set())}
                    className={`${secondaryActionClassName} disabled:opacity-50`}
                  >
                    選択解除
                  </button>
                </div>
              ) : null}

              {data.items.length > 0 ? (
                <div className="space-y-3">
                  {data.items.map((item) => {
                    const overrides = localOverrides[item.contact.id] ?? {};
                    const currentStatus = overrides.status ?? item.contact.status;
                    const currentTemperature = overrides.temperature ?? item.contact.temperature;
                    const currentContractStatus = "contractStatus" in overrides ? overrides.contractStatus : item.contact.contractStatus;
                    const isUpdating = updatingContact[item.contact.id] ?? false;
                    const isSelected = selectedIds.has(item.contact.id);
                    const contractRenewalNeeded = isContractRenewalNeeded(item.contact.contractStartAt);
                    return (
                    <article
                      key={item.contact.id}
                      className={`surface-card space-y-4 p-5 sm:p-6 ${isSelected ? "ring-2 ring-[var(--accent)]" : ""}`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelected(item.contact.id)}
                              className="h-4 w-4 rounded border-[var(--line)] accent-[var(--accent)]"
                              aria-label={`${item.contact.organizationName} を選択`}
                            />
                            <span className={dueStateBadgeClass(item.dueState)}>
                              {dueStateLabel(item.dueState)}
                            </span>
                            {item.financialOpsRisk.level === "ALERT" ? (
                              <span className="status-badge status-badge-error">
                                決済停止
                              </span>
                            ) : item.financialOpsRisk.level === "WARNING" ? (
                              <span className="status-badge status-badge-warn">
                                AI Manager 停止中
                              </span>
                            ) : null}
                            <select
                              value={currentStatus}
                              disabled={isUpdating}
                              onChange={(e) => {
                                void patchContact(item.contact.id, {
                                  status: e.target.value as (typeof EXTERNAL_CONTACT_STATUSES)[number],
                                });
                              }}
                              className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text)] disabled:opacity-50"
                            >
                              {EXTERNAL_CONTACT_STATUSES.map((s) => (
                                <option key={s} value={s}>{CONTACT_STATUS_LABELS[s]}</option>
                              ))}
                            </select>
                            <select
                              value={currentTemperature}
                              disabled={isUpdating}
                              onChange={(e) => {
                                void patchContact(item.contact.id, {
                                  temperature: e.target.value as (typeof TEMPERATURE_VALUES)[number],
                                });
                              }}
                              className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text)] disabled:opacity-50"
                            >
                              {TEMPERATURE_VALUES.map((t) => (
                                <option key={t} value={t}>温度感 {TEMPERATURE_LABELS[t]}</option>
                              ))}
                            </select>
                          </div>
                          <h2 className="text-lg font-semibold text-[var(--text)]">
                            {item.contact.organizationName}
                          </h2>
                          <div className="text-sm text-[var(--text-subtle)]">
                            {item.creator.displayName || item.creator.username} / @
                            {item.creator.username}
                          </div>
                        </div>

                        <div className="text-right text-xs text-[var(--text-subtle)]">
                          <div>次アクション期限 {formatDateTime(item.contact.nextActionDueAt)}</div>
                          <div className="mt-1">
                            最終接点 {formatDateTime(item.contact.lastContactAt)}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr]">
                        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                            Next Action
                          </div>
                          <div className="mt-2 text-sm leading-6 text-[var(--text)]">
                            {item.contact.nextAction ??
                              "次アクションはまだ設定されていません。"}
                          </div>
                          {item.contact.notes ? (
                            <div className="mt-2 text-sm leading-6 text-[var(--text-subtle)]">
                              {item.contact.notes}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                            Contact Snapshot
                          </div>
                          <div className="mt-2 space-y-2 text-sm text-[var(--text-subtle)]">
                            <div>
                              窓口 {item.contact.personName ?? "未設定"}
                              {item.contact.roleTitle ? ` / ${item.contact.roleTitle}` : ""}
                            </div>
                            <div>停滞 {item.staleDays == null ? "不明" : `${item.staleDays}日`}</div>
                            <div>
                              担当{" "}
                              {item.assignment == null
                                ? "未設定"
                                : item.assignment.roleType === "PRIMARY"
                                  ? "主担当"
                                  : "副担当"}
                            </div>
                            <div className="pt-1 space-y-1">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">
                                契約ステータス
                              </div>
                              <div className="flex items-center gap-1.5">
                                <input
                                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] w-28 disabled:opacity-50"
                                  value={currentContractStatus ?? ""}
                                  placeholder="例: ACTIVE"
                                  disabled={isUpdating}
                                  onChange={(e) => {
                                    setLocalOverrides((prev) => ({
                                      ...prev,
                                      [item.contact.id]: {
                                        ...prev[item.contact.id],
                                        contractStatus: e.target.value || null,
                                      },
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim() || null;
                                    void patchContact(item.contact.id, { contractStatus: val });
                                  }}
                                />
                                {item.contact.contractStartAt ? (
                                  <span className="text-[11px] text-[var(--text-subtle)]">
                                    {new Date(item.contact.contractStartAt).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })} 〜
                                  </span>
                                ) : null}
                              </div>
                              {contractRenewalNeeded ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                                  契約開始から12ヶ月以上経過 — 更新確認を推奨
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      {item.latestNote ? (
                        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
                              最新ノート
                            </span>
                            <span className="text-[10px] text-[var(--text-subtle)]">
                              {formatDateTime(item.latestNote.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1.5 text-xs font-medium text-[var(--text)]">
                            {item.latestNote.title}
                          </div>
                          {item.latestNote.bodySnippet ? (
                            <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-[var(--text-subtle)]">
                              {item.latestNote.bodySnippet}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="grid gap-2 sm:flex sm:flex-wrap">
                        <Link
                          href={`/manager-desk/creators/${item.creator.id}`}
                          className="btn-raised btn-raised-sm"
                        >
                          Creator Detail
                        </Link>
                        <Link
                          href={`/manager-desk/creators/${item.creator.id}#key-contacts`}
                          className={secondaryActionClassName}
                        >
                          Key Contacts に戻る
                        </Link>
                        <Link
                          href={`/${item.creator.username}`}
                          className={secondaryActionClassName}
                        >
                          公開ページを見る
                        </Link>
                      </div>
                    </article>
                  );
                  })}
                </div>
              ) : (
                <WorkspaceEmptyState
                  title="条件に合う contact はまだありません"
                  description="creator、status、期限超過フィルタを見直すか、External Contact の登録を進めてください。"
                />
              )}
            </div>
          ) : null}
        </section>
      </div>
    </MyPageShell>
  );
}
