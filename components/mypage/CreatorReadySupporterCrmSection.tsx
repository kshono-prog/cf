"use client";

import React from "react";

import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { mapWorkspaceActionError } from "@/lib/mypage/workspaceActionCopy";
import type { SupporterCrmItem } from "@/lib/operations/supporterCrmTypes";
import type { SupporterCrmData } from "@/lib/operations/supporterCrmTypes";

type SortKey = "recent" | "count" | "trust";

function abbrevAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
}

function TrustBadge(props: { consecutive: number; totalCount: number }) {
  const { consecutive, totalCount } = props;
  if (consecutive >= 3 || totalCount >= 5) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        継続
      </span>
    );
  }
  if (consecutive >= 2 || totalCount >= 3) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        VIP
      </span>
    );
  }
  return null;
}

function SupporterRow(props: { item: SupporterCrmItem; rank: number }) {
  const { item, rank } = props;
  const currencyLabel = item.currencies
    .map((c) => `${Number(c.amount).toLocaleString("ja-JP", { maximumFractionDigits: 0 })} ${c.currency}`)
    .join(" / ");

  return (
    <div className="grid grid-cols-[2rem_1fr_auto] items-start gap-x-3 border-b border-[var(--line)] py-3 last:border-b-0">
      <div className="mt-0.5 text-right text-xs font-semibold text-[var(--text-subtle)]">
        {rank}
      </div>
      <div className="space-y-0.5 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-sm text-[var(--text)]">
            {abbrevAddress(item.fromAddress)}
          </span>
          <TrustBadge consecutive={item.consecutiveSupportMonths} totalCount={item.totalCount} />
        </div>
        <div className="text-xs text-[var(--text-subtle)]">
          {currencyLabel}
        </div>
        <div className="text-xs text-[var(--text-subtle)]">
          初回 {formatDate(item.firstSupportAt)}　最終 {formatDate(item.lastSupportAt)}
          {item.consecutiveSupportMonths >= 2 ? (
            <span className="ml-1.5 text-emerald-600">{item.consecutiveSupportMonths}ヶ月連続</span>
          ) : null}
        </div>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold text-[var(--text)]">{item.totalCount}</span>
        <span className="ml-0.5 text-xs text-[var(--text-subtle)]">回</span>
      </div>
    </div>
  );
}

type Props = {
  data: SupporterCrmData | null;
  error?: string | null;
};

export function CreatorReadySupporterCrmSection(props: Props) {
  const { data, error = null } = props;
  const [sortKey, setSortKey] = React.useState<SortKey>("recent");

  if (!data && error) {
    const notice = mapWorkspaceActionError(
      error,
      "支援者リストの取得に失敗しました。"
    );
    return (
      <section className="surface-card space-y-4 p-5 sm:p-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            Supporter CRM
          </div>
          <h2 className="mt-1 text-base font-semibold text-[var(--text)]">
            支援者リスト
          </h2>
        </div>
        <WorkspaceStatusNotice
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
        />
      </section>
    );
  }

  if (!data || data.items.length === 0) return null;

  const sorted = [...data.items].sort((a, b) => {
    if (sortKey === "count") {
      return b.totalCount - a.totalCount;
    }
    if (sortKey === "trust") {
      return b.trustScore - a.trustScore;
    }
    // recent: default order (already sorted by lastSupportAt desc from server)
    const aTime = a.lastSupportAt ? new Date(a.lastSupportAt).getTime() : 0;
    const bTime = b.lastSupportAt ? new Date(b.lastSupportAt).getTime() : 0;
    return bTime - aTime;
  });

  const loyalCount = data.items.filter((it) => it.consecutiveSupportMonths >= 3 || it.totalCount >= 5).length;
  const vipCount = data.items.filter((it) => !( it.consecutiveSupportMonths >= 3 || it.totalCount >= 5) && (it.consecutiveSupportMonths >= 2 || it.totalCount >= 3)).length;

  return (
    <section className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
            Supporter CRM
          </div>
          <h2 className="mt-1 text-base font-semibold text-[var(--text)]">
            支援者リスト
          </h2>
          <p className="mt-1 text-xs text-[var(--text-subtle)]">
            累計支援回数と通貨別金額を表示しています。
            {loyalCount > 0 ? ` 継続（3ヶ月以上）: ${loyalCount.toString()}名。` : ""}
            {vipCount > 0 ? ` VIP: ${vipCount.toString()}名。` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold text-[var(--text)]">
            {data.totalSupporterCount}
          </div>
          <div className="text-xs text-[var(--text-subtle)]">累計支援者</div>
        </div>
      </div>

      <div className="flex gap-1">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            sortKey === "recent" ? "segment-active" : "segment-inactive"
          }`}
          onClick={() => setSortKey("recent")}
        >
          直近の支援順
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            sortKey === "count" ? "segment-active" : "segment-inactive"
          }`}
          onClick={() => setSortKey("count")}
        >
          支援回数が多い順
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            sortKey === "trust" ? "segment-active" : "segment-inactive"
          }`}
          onClick={() => setSortKey("trust")}
        >
          信頼度順
        </button>
      </div>

      <div>
        {sorted.map((item, index) => (
          <SupporterRow key={item.fromAddress} item={item} rank={index + 1} />
        ))}
      </div>

      {data.totalSupporterCount > data.items.length ? (
        <div className="text-center text-xs text-[var(--text-subtle)]">
          上位 {data.items.length} 件を表示（全{data.totalSupporterCount}名）
        </div>
      ) : null}
    </section>
  );
}
