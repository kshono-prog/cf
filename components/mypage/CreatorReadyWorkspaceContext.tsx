"use client";

import React from "react";
import type { Address } from "viem";

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

export type CreatorReadyWorkspaceState = {
  meCreatorUsername: string;
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
};

export type CreatorReadyWorkspaceShellProps = {
  workspaceBasePath: string;
  themeColor: string;
  error: string | null;
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
