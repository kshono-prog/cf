"use client";

import type { RewardTierView } from "@/lib/apiGuards/rewardTiers";
import { RewardTierProductionBadge } from "./RewardTierProductionBadge";

type Props = {
  tier: RewardTierView;
  quantity: number;
  onClear?: () => void;
  onChangeQuantity?: (next: number) => void;
  quantityLoading?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
};

function formatJpyc(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${safe.toLocaleString("en-US")} JPYC`;
}

export function SelectedTierSummaryCard({
  tier,
  quantity,
  onClear,
  onChangeQuantity,
  quantityLoading,
  minQuantity,
  maxQuantity,
}: Props) {
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const subtotal = tier.priceJpyc * qty;
  const min = typeof minQuantity === "number" && minQuantity > 0 ? minQuantity : 1;
  const effectiveMax = (() => {
    if (typeof maxQuantity === "number" && maxQuantity > 0) return maxQuantity;
    if (tier.quantityLimit !== null) {
      return Math.max(min, tier.quantityLimit - tier.soldCount);
    }
    return 99;
  })();

  const canDecrement = Boolean(onChangeQuantity) && qty > min && !quantityLoading;
  const canIncrement =
    Boolean(onChangeQuantity) && qty < effectiveMax && !quantityLoading;

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
      {onChangeQuantity ? (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-subtle)]">数量</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeQuantity(qty - 1)}
              disabled={!canDecrement}
              className="h-7 w-7 rounded-full border border-[var(--line)] bg-white text-sm font-bold disabled:opacity-40"
              aria-label="数量を減らす"
            >
              −
            </button>
            <span className="min-w-[28px] text-center text-sm font-semibold text-[var(--text-strong)]">
              {quantityLoading ? "…" : qty}
            </span>
            <button
              type="button"
              onClick={() => onChangeQuantity(qty + 1)}
              disabled={!canIncrement}
              className="h-7 w-7 rounded-full border border-[var(--line)] bg-white text-sm font-bold disabled:opacity-40"
              aria-label="数量を増やす"
            >
              ＋
            </button>
          </div>
        </div>
      ) : null}
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
