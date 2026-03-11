"use client";

import React from "react";
import type { Address } from "viem";

import type { SocialLinks, YoutubeVideo } from "@/types/creator";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";
import { CreatorProfileSection } from "@/components/mypage/CreatorProfileSection";
import { CurrencyProjectManagementBlock } from "@/components/mypage/CurrencyProjectManagementBlock";

type Props = {
  meCreatorUsername: string;
  eventBaseUrl: string;
  editingProfile: boolean;
  onStartEditProfile: () => void;
  onCancelEditProfile: () => void;
  displayName: string;
  profile: string;
  avatarUrl: string;
  themeColorValue: string;
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  avatarFile: File | null;
  avatarPreview: string | null;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setProfile: React.Dispatch<React.SetStateAction<string>>;
  setThemeColor: React.Dispatch<React.SetStateAction<string>>;
  setSocials: React.Dispatch<React.SetStateAction<SocialLinks>>;
  setYoutubeVideos: React.Dispatch<React.SetStateAction<YoutubeVideo[]>>;
  setAvatarFile: React.Dispatch<React.SetStateAction<File | null>>;
  setAvatarPreview: React.Dispatch<React.SetStateAction<string | null>>;
  saving: boolean;
  onSubmitProfile: (e: React.FormEvent) => void;
  address: Address | undefined;
  isConnected: boolean;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  projectDashboardsByCurrency: {
    JPYC: MyPageProjectDashboard | null;
    USDC: MyPageProjectDashboard | null;
  };
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
};

export function CreatorProjectManagementSection(props: Props) {
  return (
    <CreatorProfileSection
      username={props.meCreatorUsername}
      editing={props.editingProfile}
      onStartEdit={props.onStartEditProfile}
      onCancelEdit={props.onCancelEditProfile}
      displayName={props.displayName}
      profile={props.profile}
      avatarUrl={props.avatarUrl}
      themeColor={props.themeColorValue}
      socials={props.socials}
      youtubeVideos={props.youtubeVideos}
      avatarFile={props.avatarFile}
      avatarPreview={props.avatarPreview}
      setDisplayName={props.setDisplayName}
      setProfile={props.setProfile}
      setThemeColor={props.setThemeColor}
      setSocials={props.setSocials}
      setYoutubeVideos={props.setYoutubeVideos}
      setAvatarFile={props.setAvatarFile}
      setAvatarPreview={props.setAvatarPreview}
      saving={props.saving}
      onSubmit={props.onSubmitProfile}
      baseUrl={props.eventBaseUrl}
      extraSections={
        <div className="space-y-4">
          {(["JPYC", "USDC"] as const).map((cur) => (
            <CurrencyProjectManagementBlock
              key={cur}
              currency={cur}
              ownerAddress={props.address?.toLowerCase() ?? ""}
              activeProjectId={props.projectIdsByCurrency[cur]}
              initialDashboard={props.projectDashboardsByCurrency[cur]}
              walletAddress={props.address ?? null}
              isConnected={props.isConnected}
              onActiveProjectIdChange={props.onActiveProjectIdChange}
            />
          ))}
        </div>
      }
    />
  );
}
