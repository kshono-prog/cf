export type CreatorDailyBriefingActionKind =
  | "AI_OFFICE"
  | "PLANNER"
  | "PROJECT";

export type CreatorDailyBriefingItem = {
  id: string;
  title: string;
  body: string;
  tone: "attention" | "recommended" | "neutral";
  actionKind: CreatorDailyBriefingActionKind;
};

export type CreatorDailyBriefingData = {
  creatorProfileId: string;
  focusTheme: string;
  summaryLine: string;
  attentionItems: CreatorDailyBriefingItem[];
  signals: {
    overdueCount: number;
    dueSoonCount: number;
    shareableFollowUpCount: number;
    riskNoteCount: number;
    contactActionCount: number;
    managerSideActive: boolean;
  };
  generatedAt: string;
};
