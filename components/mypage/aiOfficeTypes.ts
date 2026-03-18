"use client";

import type { CreatorAiAgentRole } from "@/lib/creator-ai/agentRoleRegistry";

export type TaskFilter = "ALL" | "WAITING_APPROVAL";
export type TranslationLang = "ja" | "en" | "ko" | "zh";
export type DraftTone = "warm" | "formal" | "casual";
export type AnnouncementChannel = "SUPPORTERS" | "GENERAL";
export type SupporterMessagePurpose = "THANK_YOU" | "REENGAGEMENT";
export type AiOfficeView = "OVERVIEW" | "CREATE" | "INBOX";

export type AiOfficeContentSummaryView = {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  archivedPosts: number;
  aiGeneratedPosts: number;
  lastPostAt: string | null;
  lastPublishedAt: string | null;
};

export type AiOfficeUsefulnessSummaryView = {
  windowDays: number;
  staleAfterHours: number;
  createdCount: number;
  actionableCount: number;
  autoCompletedCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  ignoredCount: number;
  followThroughCount: number;
  followThroughRate: number;
  approvalRate: number;
  rejectionRate: number;
  medianDecisionHours: number | null;
  roleBreakdown: AiOfficeRoleUsefulnessView[];
};

export type AiOfficeRoleUsefulnessView = {
  roleId: CreatorAiAgentRole;
  label: string;
  actionableCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  ignoredCount: number;
  followThroughRate: number;
};

export function getEmptyAiOfficeUsefulnessSummary(): AiOfficeUsefulnessSummaryView {
  return {
    windowDays: 30,
    staleAfterHours: 72,
    createdCount: 0,
    actionableCount: 0,
    autoCompletedCount: 0,
    waitingApprovalCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    ignoredCount: 0,
    followThroughCount: 0,
    followThroughRate: 0,
    approvalRate: 0,
    rejectionRate: 0,
    medianDecisionHours: null,
    roleBreakdown: [],
  };
}

export type AgentTaskView = {
  id: string;
  projectId: string | null;
  taskType: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  output: unknown;
  auditLogs: Array<{
    id: string;
    action: string;
    actorAddress: string | null;
    createdAt: string;
    note: string | null;
  }>;
};

export type MetricSnapshotView = {
  id: string;
  platform: string;
  capturedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
};

export type MetricTrendDayView = {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  interactionRate: number;
  topPlatform: { platform: string; rate: number; count: number } | null;
};
