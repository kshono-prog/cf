import type { ManagerNoteType } from "@prisma/client";

export type CreatorManagerFeedItemTone =
  | "attention"
  | "recommended"
  | "neutral";

export type CreatorManagerFeedItem = {
  id: string;
  title: string;
  summary: string;
  noteType: ManagerNoteType;
  tone: CreatorManagerFeedItemTone;
  managerLabel: string;
  projectTitle: string | null;
  contactLabel: string | null;
  meetingLabel: string | null;
  followUpNeeded: boolean;
  followUpDueAt: string | null;
  updatedAt: string;
};

export type CreatorManagerFeedData = {
  creatorProfileId: string;
  items: CreatorManagerFeedItem[];
  summary: {
    itemCount: number;
    followUpCount: number;
    dueSoonCount: number;
    attentionCount: number;
    latestUpdateAt: string | null;
  };
  generatedAt: string;
};
