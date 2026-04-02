"use client";

import React from "react";
import type { RecoveryPeriodBreakdown, SerializedAiManagerX402RecoverySummary } from "@/lib/aiManager/x402RecoverySummary";

type Period = "7d" | "30d";

type Props = {
  summary: SerializedAiManagerX402RecoverySummary;
};

function SourceBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-20 shrink-0 text-[var(--text-subtle)]">{label}</div>
      <div className="flex flex-1 items-center gap-1.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className={`h-full rounded-full ${colorClass} transition-all duration-300`}
            style={{ width: `${pct.toString()}%` }}
          />
        </div>
        <div className="w-6 text-right font-semibold text-[var(--text)]">{count}</div>
      </div>
    </div>
  );
}

function PeriodBreakdownView({ breakdown }: { breakdown: RecoveryPeriodBreakdown }) {
  if (breakdown.total === 0) {
    return (
      <div className="mt-2 text-xs text-[var(--text-subtle)]">
        この期間の recovery はありません。
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <SourceBar
        label="x402 connector"
        count={breakdown.connectorCount}
        total={breakdown.total}
        colorClass="bg-blue-400"
      />
      <SourceBar
        label="owner review"
        count={breakdown.ownerReviewCount}
        total={breakdown.total}
        colorClass="bg-emerald-400"
      />
      {breakdown.billingSystemCount > 0 && (
        <SourceBar
          label="billing system"
          count={breakdown.billingSystemCount}
          total={breakdown.total}
          colorClass="bg-slate-400"
        />
      )}
    </div>
  );
}

export function AiManagerRecoveryTrendChart({ summary }: Props) {
  const [period, setPeriod] = React.useState<Period>("7d");

  const breakdown = period === "7d" ? summary.last7d : summary.last30d;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
          recovery trend
        </div>
        <div className="flex gap-1">
          {(["7d", "30d"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                period === p ? "segment-active" : "segment-inactive"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-[var(--text)]">
          {breakdown.total}
        </span>
        <span className="text-xs text-[var(--text-subtle)]">
          件 / 直近{period === "7d" ? "7日" : "30日"}
        </span>
        {summary.recentTrend === "increasing" && period === "7d" && (
          <span className="status-badge status-badge-warning ml-1">直近24h 増加中</span>
        )}
      </div>

      <PeriodBreakdownView breakdown={breakdown} />
    </div>
  );
}
