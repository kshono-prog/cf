"use client";

import type { FanEngagementHeatmapCell } from "@/lib/fanEngagement/engagementTimeline";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type Props = {
  heatmap: FanEngagementHeatmapCell[] | null;
  peakWeekday: number | null;
};

export function FanEngagementHeatmapCard({ heatmap, peakWeekday }: Props) {
  if (!heatmap) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-[var(--text)]">応援パターン</div>
        <div className="text-xs text-[var(--text-subtle)]">
          応援が 7 件以上集まると曜日別パターンが表示されます。
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...heatmap.map((c) => c.count), 1);

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-[var(--text)]">応援パターン（曜日別）</div>
        {peakWeekday !== null ? (
          <div className="text-[11px] text-[var(--text-subtle)]">
            ピーク: {WEEKDAY_LABELS[peakWeekday]}曜日
          </div>
        ) : null}
      </div>

      <div className="flex items-end gap-1.5">
        {heatmap.map((cell) => {
          const heightPct = maxCount > 0 ? (cell.count / maxCount) * 100 : 0;
          const isPeak = cell.weekday === peakWeekday && cell.count > 0;
          return (
            <div
              key={cell.weekday}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative flex h-16 w-full items-end">
                <div
                  className={`w-full rounded-t transition-all duration-700 ${
                    isPeak ? "bg-amber-400" : "bg-amber-200"
                  }`}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
              </div>
              <span className="text-[10px] text-[var(--text-subtle)]">
                {WEEKDAY_LABELS[cell.weekday]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
