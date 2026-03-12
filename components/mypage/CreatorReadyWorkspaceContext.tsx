"use client";

import React from "react";
import type { Address } from "viem";

import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

export type CreatorReadyWorkspaceState = {
  meCreatorUsername: string;
  eventBaseUrl: string;
  localProjectId: string | null;
  address: Address | undefined;
  isConnected: boolean;
  editingProfile: boolean;
  onStartEditProfile: () => void;
  onCancelEditProfile: () => void;
  displayName: string;
  profile: string;
  avatarUrl: string;
  themeColorValue: string;
  creatorType: CreatorProfile["creatorType"];
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  avatarFile: File | null;
  avatarPreview: string | null;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  setThemeColor: React.Dispatch<React.SetStateAction<string>>;
  setCreatorType: React.Dispatch<
    React.SetStateAction<CreatorProfile["creatorType"]>
  >;
  setSocials: React.Dispatch<React.SetStateAction<SocialLinks>>;
  setYoutubeVideos: React.Dispatch<React.SetStateAction<YoutubeVideo[]>>;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAvatarPreview: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  onSubmitProfile: (e: React.FormEvent) => void;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
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
