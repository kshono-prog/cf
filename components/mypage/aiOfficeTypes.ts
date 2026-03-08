"use client";

export type Platform = "YOUTUBE" | "X" | "INSTAGRAM" | "TIKTOK";
export type TaskFilter = "ALL" | "WAITING_APPROVAL";
export type TranslationLang = "ja" | "en" | "ko" | "zh";
export type DraftTone = "warm" | "formal" | "casual";
export type AnnouncementChannel = "SUPPORTERS" | "GENERAL";
export type SupporterMessagePurpose = "THANK_YOU" | "REENGAGEMENT";
export type AiOfficeView = "OVERVIEW" | "CREATE" | "INBOX";

export type SocialConnectionView = {
  id: string;
  platform: string;
  accountHandle: string;
  status: string;
  createdAt: string;
};

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
