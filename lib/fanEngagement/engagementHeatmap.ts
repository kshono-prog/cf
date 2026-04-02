export type EngagementHeatmapCell = {
  weekday: number; // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
  count: number;
};

export type EngagementHeatmap = {
  weekdayData: EngagementHeatmapCell[];
  peakWeekday: number | null;
  totalCount: number;
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;
export { WEEKDAY_LABELS };

export function buildEngagementHeatmap(confirmedAtDates: string[]): EngagementHeatmap {
  const counts = [0, 0, 0, 0, 0, 0, 0];

  for (const dateStr of confirmedAtDates) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) {
      const wd = d.getDay(); // 0=Sun
      counts[wd] = (counts[wd] ?? 0) + 1;
    }
  }

  const totalCount = counts.reduce((a, b) => a + b, 0);
  let peakWeekday: number | null = null;

  if (totalCount > 0) {
    peakWeekday = counts.indexOf(Math.max(...counts));
  }

  return {
    weekdayData: counts.map((count, weekday) => ({ weekday, count })),
    peakWeekday,
    totalCount,
  };
}
