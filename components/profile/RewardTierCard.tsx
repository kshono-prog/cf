"use client";

import type { RewardTierView } from "@/lib/apiGuards/rewardTiers";
import { RewardTierProductionBadge } from "./RewardTierProductionBadge";

type Props = {
  tier: RewardTierView;
  selected: boolean;
  onSelect?: (tierId: string) => void;
  headerColor?: string;
  disabled?: boolean;
};

function formatJpyc(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${safe.toLocaleString("en-US")} JPYC`;
}

export function RewardTierCard({
  tier,
  selected,
  onSelect,
  headerColor,
  disabled,
}: Props) {
  const closed =
    tier.productionStatus === "CANCELED" ||
    tier.productionStatus === "COMPLETED";
  const clickable = !closed && !disabled && Boolean(onSelect);

  const pct = Math.min(100, Math.max(0, tier.progressToStartPct));
  const showProgress = tier.hasThreshold;

  return (
    <button
      type="button"
      onClick={() => clickable && onSelect?.(tier.id)}
      disabled={!clickable}
      aria-pressed={selected}
      className={`flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-[color:var(--accent,#2563eb)] bg-[color:var(--accent-soft,#eef2ff)]"
          : "border-[var(--line)] bg-[var(--surface)] hover:border-slate-400"
      } ${clickable ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
      style={selected && headerColor ? { borderColor: headerColor } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--text-strong)]">
            {tier.title}
          </div>
          {tier.description ? (
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-subtle)]">
              {tier.description}
            </p>
          ) : null}
        </div>
        <RewardTierProductionBadge status={tier.productionStatus} />
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-lg font-bold text-[var(--text-strong)]">
          {formatJpyc(tier.priceJpyc)}
        </span>
        {tier.quantityLimit !== null ? (
          <span className="text-[11px] text-[var(--text-subtle)]">
            残り {Math.max(0, tier.quantityLimit - tier.soldCount)} 枠
          </span>
        ) : null}
      </div>

      {showProgress ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-subtle)]">
            <span>
              {tier.startThresholdType === "COUNT"
                ? `${tier.confirmedSupportCount} / ${tier.startThresholdValue ?? "?"} 支援`
                : `${formatJpyc(tier.confirmedSupportAmountJpyc)} / ${formatJpyc(
                    tier.startThresholdValue ?? 0
                  )}`}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {tier.progressLabel ? (
            <div className="text-[11px] font-medium text-[var(--text-strong)]">
              {tier.progressLabel}
            </div>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
