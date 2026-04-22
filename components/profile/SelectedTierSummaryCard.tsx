"use client";

import type { RewardTierView } from "@/lib/apiGuards/rewardTiers";
import { RewardTierProductionBadge } from "./RewardTierProductionBadge";

type Props = {
  tier: RewardTierView;
  quantity: number;
  onClear?: () => void;
};

function formatJpyc(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${safe.toLocaleString("en-US")} JPYC`;
}

export function SelectedTierSummaryCard({ tier, quantity, onClear }: Props) {
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const subtotal = tier.priceJpyc * qty;
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
            選択中の支援メニュー
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text-strong)]">
            {tier.title}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
            {formatJpyc(tier.priceJpyc)} × {qty} 件
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RewardTierProductionBadge status={tier.productionStatus} />
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-[var(--text-subtle)] underline"
            >
              選択を解除
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[11px] text-[var(--text-subtle)]">合計</span>
        <span className="text-base font-bold text-[var(--text-strong)]">
          {formatJpyc(subtotal)}
        </span>
      </div>
      {tier.progressLabel ? (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-[var(--text-subtle)]">
          {tier.progressLabel}
        </div>
      ) : null}
    </section>
  );
}
