// components/mypage/CreatorProfileSection.tsx
"use client";

import React from "react";
import { CreatorProfileEditForm } from "./CreatorProfileEditForm";
import { CreatorProfileViewCard } from "./CreatorProfileViewCard";
import type { SocialLinks, YoutubeVideo } from "@/types/creator";

type Props = {
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;

  displayName: string;
  profile: string;

  // ✅ 旧goalは廃止したので削除
  // goalTitle: string;
  // goalTargetJpyc: string;

  avatarUrl: string;
  themeColor: string;

  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];

  avatarFile: File | null;
  avatarPreview: string | null;

  setDisplayName: (v: string) => void;
  setProfile: (v: string) => void;

  // ✅ 旧goalは廃止したので削除
  // setGoalTitle: (v: string) => void;
  // setGoalTargetJpyc: (v: string) => void;

  setThemeColor: (v: string) => void;

  setSocials: (v: SocialLinks) => void;
  setYoutubeVideos: (v: YoutubeVideo[]) => void;

  setAvatarFile: (v: File | null) => void;
  setAvatarPreview: (v: string | null) => void;

  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;

  extraSections?: React.ReactNode;
};

export function CreatorProfileSection(props: Props) {
  const {
    editing,
    onStartEdit,
    onCancelEdit,

    displayName,
    profile,

    // ✅ 削除
    // goalTitle,
    // goalTargetJpyc,

    avatarUrl,
    themeColor,

    socials,
    youtubeVideos,

    avatarFile,
    avatarPreview,

    setDisplayName,
    setProfile,

    // ✅ 削除
    // setGoalTitle,
    // setGoalTargetJpyc,

    setThemeColor,

    setSocials,
    setYoutubeVideos,

    setAvatarFile,
    setAvatarPreview,

    saving,
    onSubmit,
    extraSections,
  } = props;

  if (!editing) {
    return (
      <CreatorProfileViewCard
        displayName={displayName}
        profile={profile}
        avatarUrl={avatarUrl}
        themeColor={themeColor}
        socials={socials}
        youtubeVideos={youtubeVideos}
        onEdit={onStartEdit}
      />
    );
  }

  return (
    <CreatorProfileEditForm
      displayName={displayName}
      profile={profile}
      avatarUrl={avatarUrl}
      themeColor={themeColor}
      socials={socials}
      youtubeVideos={youtubeVideos}
      avatarFile={avatarFile}
      avatarPreview={avatarPreview}
      setDisplayName={setDisplayName}
      setProfile={setProfile}
      setThemeColor={setThemeColor}
      setSocials={setSocials}
      setYoutubeVideos={setYoutubeVideos}
      setAvatarFile={setAvatarFile}
      setAvatarPreview={setAvatarPreview}
      saving={saving}
      onSubmit={onSubmit}
      onCancel={onCancelEdit}
      extraSections={extraSections}
      onAvatarPreviewRevoke={(prevUrl) => URL.revokeObjectURL(prevUrl)}
    />
  );
}
