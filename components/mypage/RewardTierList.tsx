"use client";

import type { RewardTierView } from "@/lib/apiGuards/rewardTiers";
import { RewardTierProductionBadge } from "./RewardTierProductionBadge";

type Props = {
  items: RewardTierView[];
  loading: boolean;
  busyTierId: string | null;
  onEdit: (tier: RewardTierView) => void;
  onTogglePublish: (tier: RewardTierView) => void;
  onStartProduction: (tier: RewardTierView) => void;
  onCompleteProduction: (tier: RewardTierView) => void;
  onCancelTier?: (tier: RewardTierView) => void;
};

function formatJpyc(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${safe.toLocaleString("en-US")} JPYC`;
}

export function RewardTierList({
  items,
  loading,
  busyTierId,
  onEdit,
  onTogglePublish,
  onStartProduction,
  onCompleteProduction,
  onCancelTier,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        支援メニューを読み込み中…
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        まだ支援メニューがありません。下のフォームから追加してください。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((tier) => {
        const busy = busyTierId === tier.id;
        return (
          <article
            key={tier.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-strong)]">
                    {tier.title}
                  </span>
                  <RewardTierProductionBadge status={tier.productionStatus} />
                  {tier.isPublished ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      公開中
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      非公開
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-[var(--text-subtle)]">
                  {formatJpyc(tier.priceJpyc)}
                  {tier.quantityLimit !== null
                    ? ` / 上限 ${tier.quantityLimit} 件`
                    : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onEdit(tier)}
                  className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[11px]"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePublish(tier)}
                  disabled={busy}
                  className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[11px] disabled:opacity-60"
                >
                  {tier.isPublished ? "非公開にする" : "公開する"}
                </button>
                <button
                  type="button"
                  onClick={() => onStartProduction(tier)}
                  disabled={!tier.canStartProduction || busy}
                  className="rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  制作開始
                </button>
                <button
                  type="button"
                  onClick={() => onCompleteProduction(tier)}
                  disabled={!tier.canCompleteProduction || busy}
                  className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  完了
                </button>
                {onCancelTier ? (
                  <button
                    type="button"
                    onClick={() => onCancelTier(tier)}
                    disabled={
                      busy ||
                      tier.productionStatus === "IN_PROGRESS" ||
                      tier.productionStatus === "COMPLETED" ||
                      tier.productionStatus === "CANCELED"
                    }
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      tier.productionStatus === "IN_PROGRESS" ||
                      tier.productionStatus === "COMPLETED"
                        ? "進行中/完了のメニューは受付終了できません"
                        : "この支援メニューの受付を終了します"
                    }
                  >
                    受付終了
                  </button>
                ) : null}
              </div>
            </header>

            {tier.description ? (
              <p className="mt-2 text-[12px] text-[var(--text-subtle)]">
                {tier.description}
              </p>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[var(--text-subtle)] sm:grid-cols-4">
              <div>
                <div className="text-[10px] uppercase tracking-wide">
                  入金確認済み
                </div>
                <div className="text-sm font-semibold text-[var(--text-strong)]">
                  {tier.confirmedSupportCount} 件
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide">
                  入金額合計
                </div>
                <div className="text-sm font-semibold text-[var(--text-strong)]">
                  {formatJpyc(tier.confirmedSupportAmountJpyc)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide">
                  開始条件
                </div>
                <div className="text-sm text-[var(--text-strong)]">
                  {tier.thresholdLabel ?? "なし"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide">達成率</div>
                <div className="text-sm text-[var(--text-strong)]">
                  {tier.hasThreshold ? `${tier.progressToStartPct}%` : "—"}
                </div>
              </div>
            </div>

            {tier.progressLabel ? (
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-[var(--text-subtle)]">
                {tier.progressLabel}
              </div>
            ) : null}

            {tier.productionStartedAt ? (
              <div className="mt-2 text-[10px] text-[var(--text-subtle)]">
                制作開始: {new Date(tier.productionStartedAt).toLocaleString()}
              </div>
            ) : null}
            {tier.productionCompletedAt ? (
              <div className="text-[10px] text-[var(--text-subtle)]">
                完了: {new Date(tier.productionCompletedAt).toLocaleString()}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
