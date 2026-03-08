"use client";

import { useCallback, useState } from "react";

import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";

function createEmptyYoutubeVideos(): YoutubeVideo[] {
  return [{ url: "", title: "", description: "" }];
}

type UserLike = {
  displayName?: string;
  profile?: string | null;
} | null | undefined;

export function useMyPageProfileState(defaultUsername: string) {
  const [displayName, setDisplayName] = useState<string>("");
  const [profile, setProfile] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [themeColor, setThemeColor] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [socials, setSocials] = useState<SocialLinks>({});
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideo[]>(
    createEmptyYoutubeVideos()
  );
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>(defaultUsername);

  const resetProfileState = useCallback(
    (nextUsername = defaultUsername) => {
      setDisplayName("");
      setProfile("");
      setAvatarUrl("");
      setThemeColor("");
      setAvatarFile(null);
      setAvatarPreview(null);
      setSocials({});
      setYoutubeVideos(createEmptyYoutubeVideos());
      setEditingProfile(false);
      setUsernameInput(nextUsername);
    },
    [defaultUsername]
  );

  const applyUserOnly = useCallback(
    (user: UserLike, nextUsername = defaultUsername) => {
      setDisplayName(user?.displayName ?? "");
      setProfile(user?.profile ?? "");
      setAvatarUrl("");
      setThemeColor("");
      setAvatarFile(null);
      setAvatarPreview(null);
      setSocials({});
      setYoutubeVideos(createEmptyYoutubeVideos());
      setEditingProfile(false);
      setUsernameInput(nextUsername);
    },
    [defaultUsername]
  );

  const applyCreatorProfile = useCallback(
    (creator: CreatorProfile, user: UserLike, fallbackUsername = defaultUsername) => {
      setDisplayName(creator.displayName ?? user?.displayName ?? "");
      setProfile(creator.profile ?? user?.profile ?? "");
      setAvatarUrl(creator.avatarUrl ?? "");
      setThemeColor(creator.themeColor ?? "");
      setAvatarFile(null);
      setAvatarPreview(null);
      setSocials(creator.socials ?? {});
      setYoutubeVideos(
        creator.youtubeVideos && creator.youtubeVideos.length > 0
          ? creator.youtubeVideos
          : createEmptyYoutubeVideos()
      );
      setEditingProfile(false);
      setUsernameInput(creator.username ?? fallbackUsername);
    },
    [defaultUsername]
  );

  const startEditingProfile = useCallback(() => {
    setEditingProfile(true);
  }, []);

  const cancelEditingProfile = useCallback(() => {
    setEditingProfile(false);
  }, []);

  return {
    displayName,
    setDisplayName,
    profile,
    setProfile,
    avatarUrl,
    setAvatarUrl,
    themeColor,
    setThemeColor,
    avatarFile,
    setAvatarFile,
    avatarPreview,
    setAvatarPreview,
    socials,
    setSocials,
    youtubeVideos,
    setYoutubeVideos,
    editingProfile,
    startEditingProfile,
    cancelEditingProfile,
    usernameInput,
    setUsernameInput,
    resetProfileState,
    applyUserOnly,
    applyCreatorProfile,
  };
}
