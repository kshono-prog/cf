"use client";

import type { RewardTierView } from "@/lib/apiGuards/rewardTiers";
import { RewardTierCard } from "./RewardTierCard";

type Props = {
  items: RewardTierView[];
  selectedTierId: string | null;
  onSelectTier?: (tierId: string) => void;
  headerColor?: string;
  loading?: boolean;
  emptyLabel?: string;
  heading?: string;
};

export function RewardTierGrid({
  items,
  selectedTierId,
  onSelectTier,
  headerColor,
  loading,
  emptyLabel,
  heading,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        支援メニューを読み込み中…
      </div>
    );
  }
  if (items.length === 0) {
    if (!emptyLabel) return null;
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <section className="space-y-2">
      {heading ? (
        <h3 className="text-[13px] font-semibold text-[var(--text-strong)]">
          {heading}
        </h3>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((tier) => (
          <RewardTierCard
            key={tier.id}
            tier={tier}
            selected={selectedTierId === tier.id}
            onSelect={onSelectTier}
            headerColor={headerColor}
          />
        ))}
      </div>
    </section>
  );
}
