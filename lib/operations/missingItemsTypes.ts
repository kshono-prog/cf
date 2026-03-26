export type MissingItemCategory =
  | "NOTE_FOLLOW_UP_NO_DUE_DATE"
  | "NOTE_FOLLOW_UP_OVERDUE"
  | "CONTACT_NO_NEXT_ACTION"
  | "CONTACT_NEXT_ACTION_OVERDUE"
  | "MEETING_NO_AGENDA"
  | "MEETING_NO_FOLLOW_UP";

export type MissingItemSeverity = "HIGH" | "MEDIUM" | "LOW";

export type MissingItem = {
  id: string;
  category: MissingItemCategory;
  severity: MissingItemSeverity;
  creatorProfileId: string;
  creatorName: string;
  entityType: "MANAGER_NOTE" | "EXTERNAL_CONTACT" | "MEETING";
  entityId: string;
  title: string;
  detail: string;
  dueAt: string | null;
};

export type MissingItemsCreatorSummary = {
  creatorProfileId: string;
  creatorName: string;
  count: number;
};

export type MissingItemsData = {
  managerWalletAddress: string;
  items: MissingItem[];
  summary: {
    totalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    byCreator: MissingItemsCreatorSummary[];
  };
  generatedAt: string;
};
