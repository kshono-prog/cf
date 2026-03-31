"use client";

import type { GrowthMeterScores } from "@/lib/gamification/growthMeter";

type Props = {
  scores: GrowthMeterScores;
};

type AxisConfig = {
  key: keyof GrowthMeterScores;
  label: string;
  barClass: string;
};

const AXES: AxisConfig[] = [
  { key: "creatorSkill", label: "発信力",       barClass: "bg-violet-400" },
  { key: "pageGrowth",   label: "ページ充実度",  barClass: "bg-blue-400"   },
  { key: "trust",        label: "信頼",          barClass: "bg-emerald-400"},
  { key: "fanEnergy",    label: "ファン熱量",    barClass: "bg-amber-400"  },
  { key: "opportunity",  label: "チャンス",      barClass: "bg-rose-400"   },
];

export function GrowthMeterDisplay({ scores }: Props) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/90 px-4 py-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-[var(--text)]">成長メーター</div>
      <div className="space-y-2.5">
        {AXES.map(({ key, label, barClass }) => {
          const score = scores[key];
          return (
            <div key={key}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-xs text-[var(--text-subtle)]">{label}</span>
                <span className="text-xs font-medium tabular-nums text-[var(--text)]">
                  {score}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barClass}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
