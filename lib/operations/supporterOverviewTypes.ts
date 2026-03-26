export type SupporterTopItem = {
  fromAddress: string;
  contributionCount: number;
  currencies: string[];
};

export type SupporterOverviewData = {
  creatorProfileId: string;
  totalSupporterCount: number;
  newThisMonthCount: number;
  recentSupporterCount: number;
  topSupporters: SupporterTopItem[];
  generatedAt: string;
};
