export type FanEngagementContributionEntry = {
  id: string;
  confirmedAt: string;
  maskedAddress: string;
  message: string | null;
};

export type FanEngagementHeatmapCell = {
  weekday: number; // 0=日, 1=月, … 6=土
  count: number;
};

export type FanEngagementTimeline = {
  recentContributions: FanEngagementContributionEntry[];
  totalContributorCount: number;
  weekHighlight: string | null;
  thankNeededCount: number;
  generatedAt: string;
  heatmap: FanEngagementHeatmapCell[] | null;
  peakWeekday: number | null;
};
