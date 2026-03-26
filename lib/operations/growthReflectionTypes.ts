export type GrowthOngoingItem = {
  label: string;
  value: string;
  note: string;
};

export type GrowthCompletedItem = {
  label: string;
  occurredAt: string;
  summary: string | null;
};

export type GrowthImprovementItem = {
  label: string;
  reason: string;
};

export type GrowthReflectionStats = {
  postCountThisMonth: number;
  goalProgressPct: number | null;
  completedActionCount: number;
  activeActionCount: number;
};

export type GrowthReflectionData = {
  creatorProfileId: string;
  month: string; // "YYYY-MM"
  ongoing: GrowthOngoingItem[];
  completed: GrowthCompletedItem[];
  improvements: GrowthImprovementItem[];
  stats: GrowthReflectionStats;
  generatedAt: string;
};
