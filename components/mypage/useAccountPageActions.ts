"use client";

import React, { useState } from "react";
import type { Address } from "viem";
import type { CreatorProfile, SocialLinks, YoutubeVideo } from "@/types/creator";
import type { EcosystemRole } from "@/lib/creatorTaxonomy";
import {
  saveMyPageUser,
  requestCreatorApply,
  updateMyPageCreatorProfile,
} from "@/lib/api/creator";

type Args = {
  address: Address | undefined;
  username: string;
  // form field reads
  usernameInput: string;
  displayName: string;
  profile: string;
  avatarUrl: string;
  externalUrl: string;
  themeColor: string;
  creatorType: CreatorProfile["creatorType"];
  ecosystemRole: EcosystemRole | null;
  socials: SocialLinks;
  youtubeVideos: YoutubeVideo[];
  // callbacks after successful mutation
  onSaved: (addr: Address) => Promise<unknown>;
  cancelEditingProfile: () => void;
};

export function useAccountPageActions(args: Args) {
  const {
    address,
    username,
    usernameInput,
    displayName,
    profile,
    avatarUrl,
    externalUrl,
    themeColor,
    creatorType,
    ecosystemRole,
    socials,
    youtubeVideos,
    onSaved,
    cancelEditingProfile,
  } = args;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveUser(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!address) return;

    setSaving(true);
    setError(null);

    try {
      const slug = usernameInput.trim() || username;
      const result = await saveMyPageUser({
        address,
        username: slug,
        displayName: displayName.trim(),
        profile: profile.trim(),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      await onSaved(address);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "ユーザー情報の保存に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyCreator(): Promise<void> {
    if (!address) return;

    setSaving(true);
    setError(null);

    try {
      const result = await requestCreatorApply(address);
      if (!result.ok) {
        throw new Error(result.error);
      }

      await onSaved(address);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "クリエイター申請に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCreatorProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!address) return;

    setSaving(true);
    setError(null);

    try {
      const result = await updateMyPageCreatorProfile({
        displayName: displayName.trim(),
        profile: profile.trim(),
        address,
        avatarUrl,
        externalUrl,
        themeColor,
        creatorType,
        ecosystemRole,
        socials,
        youtubeVideos,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      cancelEditingProfile();
      await onSaved(address);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "保存に失敗しました。入力内容を確認してください。"
      );
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    error,
    setError,
    handleSaveUser,
    handleApplyCreator,
    handleSaveCreatorProfile,
  };
}
