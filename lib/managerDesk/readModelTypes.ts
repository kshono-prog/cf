import type {
  SerializedActionLog,
  SerializedExternalContact,
  SerializedManagerAssignment,
  SerializedManagerNote,
  SerializedMeeting,
} from "@/lib/managerDesk/server";
import type { PlannerTimelineData } from "@/lib/operations/plannerTypes";
import type { CreatorStageResult } from "@/lib/creatorStage";
import type { SerializedManagerDeskAiManagerSummary } from "@/lib/serializers/aiManager";
import type { SerializedFinancialOpsRisk } from "@/lib/aiManager/financialOpsRisk";

export type ManagerDeskProjectSummary = {
  projectId: string;
  title: string;
  status: string;
  currency: "JPYC" | "USDC";
  targetAmount: number | null;
  confirmedAmount: number;
  progressPct: number;
  achievedAt: string | null;
  deadline: string | null;
  updatedAt: string;
};

export type ManagerDeskCreatorIdentity = {
  id: string;
  username: string;
  displayName: string;
  profileText: string | null;
  avatarUrl: string | null;
  creatorType: string | null;
  walletAddress: string | null;
};

export type ManagerDeskDashboardPriority = {
  score: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
};

export type ManagerDeskDashboardCard = {
  assignment: SerializedManagerAssignment;
  creator: ManagerDeskCreatorIdentity;
  activeProject: ManagerDeskProjectSummary | null;
  latestManagerNote: SerializedManagerNote | null;
  nextContact: SerializedExternalContact | null;
  latestActionAt: string | null;
  latestActionTitle: string | null;
  riskNoteCount: number;
  followUpNoteCount: number;
  contactActionCount: number;
  staleDays: number | null;
  priority: ManagerDeskDashboardPriority;
};

export type ManagerDeskDashboardData = {
  managerWalletAddress: string;
  cards: ManagerDeskDashboardCard[];
  summary: {
    assignmentCount: number;
    creatorCount: number;
    highPriorityCount: number;
    mediumPriorityCount: number;
    staleCreatorCount: number;
    followUpCreatorCount: number;
    contactActionCreatorCount: number;
  };
  generatedAt: string;
};

export type ManagerDeskContactPipelineDueState =
  | "OVERDUE"
  | "DUE_SOON"
  | "NONE";

export type ManagerDeskContactLatestNote = {
  id: string;
  title: string;
  bodySnippet: string;
  createdAt: string;
};

export type ManagerDeskContactPipelineItem = {
  assignment: SerializedManagerAssignment | null;
  creator: ManagerDeskCreatorIdentity;
  contact: SerializedExternalContact;
  dueState: ManagerDeskContactPipelineDueState;
  staleDays: number | null;
  financialOpsRisk: SerializedFinancialOpsRisk;
  latestNote: ManagerDeskContactLatestNote | null;
};

export type ManagerDeskContactPipelineData = {
  managerWalletAddress: string;
  availableCreators: ManagerDeskCreatorIdentity[];
  items: ManagerDeskContactPipelineItem[];
  filters: {
    creatorProfileId: string | null;
    status: SerializedExternalContact["status"] | null;
    overdueOnly: boolean;
  };
  summary: {
    totalCount: number;
    overdueCount: number;
    dueSoonCount: number;
    withNextActionCount: number;
    warmContactCount: number;
    creatorCount: number;
  };
  generatedAt: string;
};

export type ManagerDeskNotesSurfaceItem = {
  assignment: SerializedManagerAssignment | null;
  creator: ManagerDeskCreatorIdentity;
  note: SerializedManagerNote;
  staleDays: number | null;
};

export type ManagerDeskNotesSurfaceData = {
  managerWalletAddress: string;
  availableCreators: ManagerDeskCreatorIdentity[];
  items: ManagerDeskNotesSurfaceItem[];
  filters: {
    creatorProfileId: string | null;
    noteType: SerializedManagerNote["noteType"] | null;
    visibility: SerializedManagerNote["visibility"] | null;
    followUpOnly: boolean;
    q: string | null;
  };
  summary: {
    totalCount: number;
    followUpCount: number;
    overdueCount: number;
    riskCount: number;
    shareableCount: number;
    creatorCount: number;
  };
  generatedAt: string;
};

export type ManagerDeskActivityTimelineSourceType =
  | "ACTION_LOG"
  | "MEETING"
  | "SHAREABLE_NOTE";

export type ManagerDeskActivityTimelineItem = {
  id: string;
  sourceType: ManagerDeskActivityTimelineSourceType;
  assignment: SerializedManagerAssignment | null;
  creator: ManagerDeskCreatorIdentity;
  actorLabel: string;
  title: string;
  summary: string | null;
  happenedAt: string;
  href: string;
  actionLog: SerializedActionLog | null;
  meeting: SerializedMeeting | null;
  note: SerializedManagerNote | null;
};

export type ManagerDeskActivityTimelineData = {
  managerWalletAddress: string;
  availableCreators: ManagerDeskCreatorIdentity[];
  items: ManagerDeskActivityTimelineItem[];
  filters: {
    creatorProfileId: string | null;
    sourceType: ManagerDeskActivityTimelineSourceType | null;
  };
  summary: {
    totalCount: number;
    actionLogCount: number;
    meetingCount: number;
    shareableNoteCount: number;
    creatorCount: number;
  };
  generatedAt: string;
};

export type ManagerDeskOpportunityStatus =
  | "IN_DISCUSSION"
  | "NEGOTIATING"
  | "WON"
  | "ONGOING";

export type ManagerDeskOpportunityStage = {
  status: ManagerDeskOpportunityStatus;
  items: ManagerDeskContactPipelineItem[];
};

export type ManagerDeskOpportunityCrmData = {
  managerWalletAddress: string;
  availableCreators: ManagerDeskCreatorIdentity[];
  stages: ManagerDeskOpportunityStage[];
  creatorProfileId: string | null;
  summary: {
    totalCount: number;
    inDiscussionCount: number;
    negotiatingCount: number;
    wonCount: number;
    ongoingCount: number;
    hotCount: number;
  };
  generatedAt: string;
};

export type ManagerDeskExpenseSummaryItem = {
  id: string;
  category: string;
  amountDecimal: string;
  currency: string;
  occurredAt: string;
  title: string;
  note: string | null;
};

export type ManagerDeskExpenseCategoryTotal = {
  category: string;
  total: string;
  currency: string;
};

export type ManagerDeskExpenseSummary = {
  recentExpenses: ManagerDeskExpenseSummaryItem[];
  totalCount: number;
  totalAmountByCategory: ManagerDeskExpenseCategoryTotal[];
  thisMonthAmountByCategory: ManagerDeskExpenseCategoryTotal[];
  prevMonthAmountByCategory: ManagerDeskExpenseCategoryTotal[];
};

export type ManagerDeskCreatorDetailData = {
  creator: ManagerDeskCreatorIdentity;
  viewerRole: "CREATOR_OWNER" | "MANAGER";
  assignment: SerializedManagerAssignment | null;
  aiManager: SerializedManagerDeskAiManagerSummary | null;
  stage: CreatorStageResult | null;
  activeProject: ManagerDeskProjectSummary | null;
  planner: PlannerTimelineData;
  upcomingMeetings: SerializedMeeting[];
  recentCompletedMeetings: SerializedMeeting[];
  latestManagerNotes: SerializedManagerNote[];
  keyContacts: SerializedExternalContact[];
  recentActionLogs: SerializedActionLog[];
  expenseSummary: ManagerDeskExpenseSummary;
  summary: {
    latestActionAt: string | null;
    latestActionTitle: string | null;
    riskNoteCount: number;
    followUpNoteCount: number;
    contactActionCount: number;
    staleDays: number | null;
    nextActionDueAt: string | null;
  };
  deferred: {
    meeting: "planner_minimum_live";
    tasks: "not_implemented";
  };
  generatedAt: string;
};
