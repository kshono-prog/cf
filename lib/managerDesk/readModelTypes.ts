import type {
  SerializedActionLog,
  SerializedExternalContact,
  SerializedManagerAssignment,
  SerializedManagerNote,
} from "@/lib/managerDesk/server";
import type { PlannerTimelineData } from "@/lib/operations/plannerTypes";

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

export type ManagerDeskCreatorDetailData = {
  creator: ManagerDeskCreatorIdentity;
  assignment: SerializedManagerAssignment | null;
  activeProject: ManagerDeskProjectSummary | null;
  planner: PlannerTimelineData;
  latestManagerNotes: SerializedManagerNote[];
  keyContacts: SerializedExternalContact[];
  recentActionLogs: SerializedActionLog[];
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
