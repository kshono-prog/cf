"use client";

import React from "react";

import {
  WorkspaceEmptyState,
  WorkspaceLoadingCard,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type { SupporterCrmData, SupporterCrmItem } from "@/lib/operations/supporterCrmTypes";

function abbrevAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function SupporterRow(props: { item: SupporterCrmItem; rank: number }) {
  const { item, rank } = props;
  const isVip = item.totalCount >= 3;
  const currencyLabel = item.currencies
    .map(
      (c) =>
        `${Number(c.amount).toLocaleString("ja-JP", { maximumFractionDigits: 0 })} ${c.currency}`
    )
    .join(" / ");

  return (
    <div className="grid grid-cols-[2rem_1fr_auto] items-start gap-x-3 border-b border-[var(--line)] py-2.5 last:border-b-0">
      <div className="mt-0.5 text-right text-xs font-semibold text-[var(--text-subtle)]">
        {rank}
      </div>
      <div className="space-y-0.5 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-sm text-[var(--text)]">
            {abbrevAddress(item.fromAddress)}
          </span>
          {isVip ? (
            <span className="accent-badge-amber shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
              VIP
            </span>
          ) : null}
        </div>
        <div className="text-xs text-[var(--text-subtle)]">{currencyLabel}</div>
        <div className="text-xs text-[var(--text-subtle)]">
          初回 {formatDate(item.firstSupportAt)}　最終 {formatDate(item.lastSupportAt)}
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
  loading: boolean;
  error: string | null;
  data: SupporterCrmData | null;
  onReload: () => void;
};

export function ManagerDeskSupporterCrmSection(props: Props) {
  const { loading, error, data, onReload } = props;
  const [showAll, setShowAll] = React.useState(false);

  if (loading) {
    return <WorkspaceLoadingCard title="Supporter CRM を読み込んでいます" />;
  }

  if (error) {
    return (
      <WorkspaceStatusNotice
        tone="error"
        title="Supporter CRM の取得に失敗しました"
        onRetry={onReload}
      />
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <WorkspaceEmptyState
        title="支援者はまだいません"
        description="支援が確認されると、ここに支援者リストが表示されます。"
      />
    );
  }

  const vipCount = data.items.filter((it) => it.totalCount >= 3).length;
  const displayed = showAll ? data.items : data.items.slice(0, 5);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-subtle)]">
            Supporter CRM
          </div>
          <div className="mt-0.5 text-sm text-[var(--text-subtle)]">
            累計{data.totalSupporterCount}名
            {vipCount > 0 ? ` / VIP（3回以上）${vipCount.toString()}名` : ""}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold text-[var(--text)]">
            {data.totalSupporterCount}
          </div>
          <div className="text-xs text-[var(--text-subtle)]">累計支援者</div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2">
        {displayed.map((item, index) => (
          <SupporterRow key={item.fromAddress} item={item} rank={index + 1} />
        ))}
      </div>

      {!showAll && data.items.length > 5 ? (
        <button
          type="button"
          className="btn-secondary w-full text-xs"
          onClick={() => setShowAll(true)}
        >
          すべて表示（{data.items.length}件）
        </button>
      ) : null}
    </section>
  );
}
