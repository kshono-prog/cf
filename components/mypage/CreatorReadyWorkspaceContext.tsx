"use client";

import React from "react";
import type { Address } from "viem";

import type { ProfileDraftResult } from "@/lib/ai/profileDraft";
import type { AiOfficePanelUrlState } from "@/components/mypage/aiOfficePanelUrlState";
import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";
import type { EcosystemRole } from "@/lib/creatorTaxonomy";
import type {
  CurrencyCode,
  ProjectIdsByCurrency,
} from "@/lib/mypage/accountPageTypes";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";
import type {
  OpenSections,
  SectionKey,
} from "@/components/mypage/MyPageAccordion";
import type { GrowthEventPayload } from "@/lib/growth/types";
import type {
  SetupLocalMilestoneKey,
  SetupLocalMilestones,
} from "@/lib/growth/setup";
import type { WorkspaceActionNotice } from "@/lib/mypage/workspaceActionCopy";

export type SetupAiDraftState = {
  goalTitle: string | null;
  projectTitle: string;
  projectDescription: string;
  goalTargetInput: string;
};

export type CreatorReadyWorkspaceState = {
  meCreatorUsername: string;
  qrcodeUrl: string | null;
  eventBaseUrl: string;
  localProjectId: string | null;
  address: Address | undefined;
  isConnected: boolean;
  isManualCheck: boolean;
  editingProfile: boolean;
  onStartEditProfile: () => void;
  onCancelEditProfile: () => void;
  displayName: string;
  profile: string;
  avatarUrl: string;
  externalUrl: string;
  themeColorValue: string;
  creatorType: CreatorProfile["creatorType"];
  ecosystemRole: EcosystemRole | null;
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  avatarFile: File | null;
  avatarPreview: string | null;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  setExternalUrl: React.Dispatch<React.SetStateAction<string>>;
  setThemeColor: React.Dispatch<React.SetStateAction<string>>;
  setCreatorType: React.Dispatch<
    React.SetStateAction<CreatorProfile["creatorType"]>
  >;
  setEcosystemRole: React.Dispatch<React.SetStateAction<EcosystemRole | null>>;
  setSocials: React.Dispatch<React.SetStateAction<SocialLinks>>;
  setYoutubeVideos: React.Dispatch<React.SetStateAction<YoutubeVideo[]>>;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAvatarPreview: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  onSubmitProfile: (e: React.FormEvent) => void;
  projectIdsByCurrency: ProjectIdsByCurrency;
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
  openSections: OpenSections;
  onToggleSection: (key: SectionKey) => void;
  initialAiOfficeUrlState?: Partial<AiOfficePanelUrlState>;
  reportGrowthEvent: (payload: GrowthEventPayload) => void;
  localGrowthMilestones: SetupLocalMilestones;
  markLocalGrowthMilestone: (key: SetupLocalMilestoneKey) => void;
  aiSetupDraft: SetupAiDraftState;
  aiSetupDraftVersion: number;
  applyAiProfileDraft: (draft: ProfileDraftResult) => void;
};

export type CreatorReadyWorkspaceShellProps = {
  workspaceBasePath: string;
  themeColor: string;
  error: string | null;
  errorDescription?: string | null;
  notice?: WorkspaceActionNotice | null;
};

export type CreatorReadyAccountViewProps = CreatorReadyWorkspaceShellProps & {
  initialWorkspaceView: WorkspaceView;
};

const CreatorReadyWorkspaceContext =
  React.createContext<CreatorReadyWorkspaceState | null>(null);

export function CreatorReadyWorkspaceProvider(props: {
  value: CreatorReadyWorkspaceState;
  children: React.ReactNode;
}) {
  return (
    <CreatorReadyWorkspaceContext.Provider value={props.value}>
      {props.children}
    </CreatorReadyWorkspaceContext.Provider>
  );
}

export function useCreatorReadyWorkspace(): CreatorReadyWorkspaceState {
  const value = React.useContext(CreatorReadyWorkspaceContext);
  if (!value) {
    throw new Error("CreatorReadyWorkspaceContext is not available.");
  }
  return value;
}
