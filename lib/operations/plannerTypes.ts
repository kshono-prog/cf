export type PlannerActorMode = "CREATOR_HOME" | "MANAGER_DESK";

export type PlannerTimelineItemSource =
  | "MEETING"
  | "MANAGER_NOTE_FOLLOW_UP"
  | "EXTERNAL_CONTACT_NEXT_ACTION"
  | "PROJECT_DEADLINE";

export type PlannerTimelineItemStatus = "OVERDUE" | "DUE_SOON" | "UPCOMING";

export type PlannerTimelineItemOwner = "CREATOR" | "MANAGER" | "SHARED";

export type PlannerTimelineItem = {
  id: string;
  sourceType: PlannerTimelineItemSource;
  entityType: "MEETING" | "MANAGER_NOTE" | "EXTERNAL_CONTACT" | "PROJECT";
  entityId: string;
  title: string;
  description: string;
  dueAt: string | null;
  owner: PlannerTimelineItemOwner;
  status: PlannerTimelineItemStatus;
  managerOnly: boolean;
};

export type PlannerTimelineData = {
  items: PlannerTimelineItem[];
  summary: {
    overdueCount: number;
    dueSoonCount: number;
    meetingCount: number;
    followUpCount: number;
    managerOnlyCount: number;
    nextDueAt: string | null;
    totalCount: number;
  };
  generatedAt: string;
};
