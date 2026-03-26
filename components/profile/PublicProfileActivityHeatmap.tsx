import type { PublicProfileActivityHeatmapData } from "@/lib/publicProfileEnhancement";

type Props = {
  data: PublicProfileActivityHeatmapData;
};

const LEVEL_CLASS_NAMES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-[var(--surface-muted)]",
  1: "bg-emerald-100",
  2: "bg-emerald-200",
  3: "bg-emerald-400",
  4: "bg-emerald-600",
};

const WEEKDAY_LABELS = ["月", "", "水", "", "金", "", "日"] as const;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export function PublicProfileActivityHeatmap({ data }: Props) {
  if (data.totalPosts === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
            Activity Heatmap
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--text)]">
            最近{data.windowWeeks.toString()}週間の公開投稿ペースです。
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            {data.totalPosts}
          </div>
          <div className="text-[11px] text-[var(--text-subtle)]">
            投稿 / {data.activeDays.toString()}日
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex min-w-max gap-2">
          <div className="grid grid-rows-7 gap-1 pt-5">
            {WEEKDAY_LABELS.map((label, index) => (
              <span
                key={`${label}-${index.toString()}`}
                className="h-4 text-[9px] leading-4 text-[var(--text-subtle)]"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="space-y-1">
            <div className="flex gap-1">
              {data.weeks.map((week) => (
                <div
                  key={week.startDate}
                  className="w-4 text-[9px] leading-4 text-[var(--text-subtle)]"
                >
                  {week.monthLabel ?? "\u00a0"}
                </div>
              ))}
            </div>

            <div className="flex gap-1">
              {data.weeks.map((week) => (
                <div key={week.startDate} className="grid grid-rows-7 gap-1">
                  {week.cells.map((cell) => (
                    <div
                      key={cell.date}
                      className={`h-4 w-4 rounded-[4px] ${LEVEL_CLASS_NAMES[cell.level]}`}
                      title={`${formatDate(cell.date)}: ${cell.count.toString()}件`}
                      aria-label={`${formatDate(cell.date)}: ${cell.count.toString()}件`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[10px] text-[var(--text-subtle)]">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASS_NAMES[level as 0 | 1 | 2 | 3 | 4]}`}
          />
        ))}
        <span>多</span>
      </div>
    </section>
  );
}
