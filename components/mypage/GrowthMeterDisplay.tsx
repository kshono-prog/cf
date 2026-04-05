"use client";

import type { GrowthMeterScores } from "@/lib/gamification/growthMeter";

type Props = {
  scores: GrowthMeterScores;
};

type AxisConfig = {
  key: keyof GrowthMeterScores;
  label: string;
  barVar: string; // CSS variable or class
};

const AXES: AxisConfig[] = [
  { key: "creatorSkill", label: "発信力",      barVar: "bg-[var(--accent)]"  },
  { key: "pageGrowth",   label: "ページ充実度", barVar: "bg-[var(--support)]" },
  { key: "trust",        label: "信頼",         barVar: "bg-[var(--accent)]"  },
  { key: "fanEnergy",    label: "ファン熱量",   barVar: "bg-[var(--warning)]" },
  { key: "opportunity",  label: "チャンス",     barVar: "bg-[var(--support)]" },
];

export function GrowthMeterDisplay({ scores }: Props) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
      <div className="mb-3 text-sm font-semibold text-[var(--text)]">成長メーター</div>
      <div className="space-y-2.5">
        {AXES.map(({ key, label, barVar }) => {
          const score = scores[key];
          return (
            <div key={key}>
              <div className="mb-0.5 flex items-center justify-between">
                <span className="text-xs text-[var(--text-subtle)]">{label}</span>
                <span className="text-xs font-medium tabular-nums text-[var(--text)]">
                  {score}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barVar}`}
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
