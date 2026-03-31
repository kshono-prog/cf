export type FanEngagementContributionEntry = {
  id: string;
  confirmedAt: string;
  maskedAddress: string;
  message: string | null;
};

export type FanEngagementTimeline = {
  recentContributions: FanEngagementContributionEntry[];
  totalContributorCount: number;
  weekHighlight: string | null;
  thankNeededCount: number;
  generatedAt: string;
};
