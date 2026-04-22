"use client";

import { useCallback, useEffect, useState } from "react";

import {
  parseRewardTierListResponse,
  type RewardTierView,
} from "@/lib/apiGuards/rewardTiers";
import { RewardTierGrid } from "./RewardTierGrid";
import { SelectedTierSummaryCard } from "./SelectedTierSummaryCard";

type Props = {
  projectId: string | null;
  headerColor?: string;
  onRequestSupport?: (tier: RewardTierView) => void;
};

export function RewardTierPublicSection({
  projectId,
  headerColor,
  onRequestSupport,
}: Props) {
  const [tiers, setTiers] = useState<RewardTierView[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setTiers([]);
      setSelectedTierId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/projects/${encodeURIComponent(projectId)}/reward-tiers?publishedOnly=true`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        if (!res.ok) return [] as RewardTierView[];
        const json = (await res.json().catch(() => null)) as unknown;
        return parseRewardTierListResponse(json);
      })
      .then((items) => {
        if (cancelled) return;
        setTiers(items);
      })
      .catch(() => {
        if (cancelled) return;
        setTiers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleSelect = useCallback(
    (tierId: string) => {
      const tier = tiers.find((t) => t.id === tierId);
      if (!tier) return;
      setSelectedTierId(tierId);
      onRequestSupport?.(tier);
    },
    [tiers, onRequestSupport]
  );

  const handleClear = useCallback(() => setSelectedTierId(null), []);

  if (!projectId) return null;
  if (!loading && tiers.length === 0) return null;

  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? null;

  return (
    <section className="panel-card space-y-3 px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="space-y-0.5">
        <h2 className="text-[13px] font-semibold text-[var(--text-strong)]">
          支援メニュー
        </h2>
        <p className="text-[11px] text-[var(--text-subtle)]">
          受注生産型のメニューです。一定の支援件数または金額に到達すると制作開始可能になります。
        </p>
      </div>
      <RewardTierGrid
        items={tiers}
        selectedTierId={selectedTierId}
        onSelectTier={handleSelect}
        headerColor={headerColor}
        loading={loading}
      />
      {selectedTier ? (
        <SelectedTierSummaryCard
          tier={selectedTier}
          quantity={1}
          onClear={handleClear}
        />
      ) : null}
    </section>
  );
}
