"use client";

import type { SupporterCrmItem } from "@/lib/operations/supporterCrmTypes";
import type { SupporterCrmData } from "@/lib/operations/supporterCrmTypes";

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
        <div className="truncate font-mono text-sm text-[var(--text)]">
          {abbrevAddress(item.fromAddress)}
        </div>
        <div className="text-xs text-[var(--text-subtle)]">
          {currencyLabel}
        </div>
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
  data: SupporterCrmData | null;
};

export function CreatorReadySupporterCrmSection(props: Props) {
  const { data } = props;
  if (!data || data.items.length === 0) return null;

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
            直近の支援順・最大20件。累計支援回数と通貨別金額を表示しています。
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold text-[var(--text)]">
            {data.totalSupporterCount}
          </div>
          <div className="text-xs text-[var(--text-subtle)]">累計支援者</div>
        </div>
      </div>

      <div>
        {data.items.map((item, index) => (
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
