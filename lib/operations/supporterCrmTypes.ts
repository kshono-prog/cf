export type SupporterCrmCurrencyBreakdown = {
  currency: string;
  amount: string;
  count: number;
};

export type SupporterCrmItem = {
  fromAddress: string;
  totalCount: number;
  firstSupportAt: string | null;
  lastSupportAt: string | null;
  currencies: SupporterCrmCurrencyBreakdown[];
  consecutiveSupportMonths: number;
  trustScore: number;
};

export type SupporterCrmData = {
  creatorProfileId: string;
  items: SupporterCrmItem[];
  totalSupporterCount: number;
  generatedAt: string;
};
