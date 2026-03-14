"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";

import type { CreatorProfile } from "@/types/creator";

import type { MeStatus, Status } from "@/lib/mypage/types";
import { generateRandomId } from "@/lib/mypage/helpers";

import {
  fetchMe,
  requestCreatorApply,
  saveMyPageUser,
  updateMyPageCreatorProfile,
} from "@/lib/mypage/api";

import { CreatorReadyAccountView } from "@/components/mypage/CreatorReadyAccountView";
import { SettingsPageClient } from "@/components/mypage/SettingsPageClient";
import { LoadingMyPageView } from "@/components/mypage/LoadingMyPageView";
import { NoUserMyPageView } from "@/components/mypage/NoUserMyPageView";
import { UnconnectedMyPageView } from "@/components/mypage/UnconnectedMyPageView";
import { UserOnlyMyPageView } from "@/components/mypage/UserOnlyMyPageView";
import { useMyPageProfileState } from "@/components/mypage/useMyPageProfileState";
import { useMyPageShellState } from "@/components/mypage/useMyPageShellState";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  username: string;
  initialWorkspaceView: WorkspaceView;
  renderMode?: "workspace" | "settings";
};

export default function AccountPageClient({
  username,
  initialWorkspaceView,
  renderMode = "workspace",
}: Props) {
  const { address, isConnected } = useAccount();

  const API_BASE = "";

  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeStatus | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const generatedUsername = useMemo(
    () => `user_${generateRandomId()}`,
    []
  );
  const {
    openSections,
    setOpenSections,
    toggleSection,
  } = useMyPageShellState();
  const {
    displayName,
    setDisplayName,
    profile,
    setProfile,
    avatarUrl,
    externalUrl,
    themeColor,
    setThemeColor,
    setExternalUrl,
    creatorType,
    setCreatorType,
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
  } = useMyPageProfileState(generatedUsername);

  const [localProjectId, setLocalProjectId] = useState<string | null>(null);
  const [projectIdsByCurrency, setProjectIdsByCurrency] = useState<{
    JPYC: string | null;
    USDC: string | null;
  }>({ JPYC: null, USDC: null });
  const pickDefaultProjectId = useCallback((data: MeStatus): string | null => {
    return (
      data.projectId ??
      data.projectIdsByCurrency?.JPYC ??
      data.projectIdsByCurrency?.USDC ??
      null
    );
  }, []);

  const applyMeStatus = useCallback(
    (meData: MeStatus) => {
      setMe(meData);
      const nextProjectIds =
        meData.projectIdsByCurrency ?? { JPYC: null, USDC: null };
      setProjectIdsByCurrency(nextProjectIds);
      setLocalProjectId(pickDefaultProjectId(meData));

      if (!meData.hasUser) {
        setStatus("noUser");
        resetProfileState(username);
        return;
      }

      if (meData.hasUser && !meData.hasCreator) {
        setStatus("userOnly");
        applyUserOnly(meData.user, username);
        return;
      }

      setStatus("creatorReady");

      const cp = meData.creator as CreatorProfile | null;
      if (!cp) {
        setStatus("userOnly");
        applyUserOnly(meData.user, username);
        return;
      }
      applyCreatorProfile(cp, meData.user, username);
    },
    [applyCreatorProfile, applyUserOnly, pickDefaultProjectId, resetProfileState, username]
  );

  const loadMeStatus = useCallback(
    async (addr: Address): Promise<boolean> => {
      const result = await fetchMe({
        apiBase: API_BASE,
        address: addr,
      });

      if (!result.ok) {
        setError(
          "サーバーエラーが発生しました。時間をおいて再度お試しください。"
        );
        return false;
      }

      applyMeStatus(result.data);
      return true;
    },
    [API_BASE, applyMeStatus]
  );

  // /api/me から projectId + creator profile をstateへ
  useEffect(() => {
    if (!isConnected || !address) {
      setStatus("unconnected");
      setMe(null);
      setLocalProjectId(null);
      setProjectIdsByCurrency({ JPYC: null, USDC: null });
      resetProfileState(username);
      return;
    }

    const addr: Address = address;
    let cancelled = false;

    async function run(): Promise<void> {
      setStatus("loading");
      setError(null);
      const ok = await loadMeStatus(addr);
      if (cancelled || ok) return;
      setStatus("loading");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, loadMeStatus, resetProfileState, username]);

  // /api/user
  async function handleSaveUser(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!address) return;

    const addr: Address = address;

    setSaving(true);
    setError(null);

    try {
      const slug = usernameInput.trim() || username;
      const result = await saveMyPageUser({
        apiBase: API_BASE,
        address: addr,
        username: slug,
        displayName: displayName.trim(),
        profile: profile.trim(),
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      await loadMeStatus(addr);
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

  // /api/creator/apply
  async function handleApplyCreator(): Promise<void> {
    if (!address) return;
    const addr: Address = address;

    setSaving(true);
    setError(null);

    try {
      const result = await requestCreatorApply({
        apiBase: API_BASE,
        address: addr,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }

      await loadMeStatus(addr);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "クリエイター申請に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================
  // Creator Profile Save（②の保存）
  // ============================
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
        socials,
        youtubeVideos,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }

      await loadMeStatus(address);

      cancelEditingProfile();
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

  // ==================================================
  // UI
  // ==================================================
  const promoHeaderColor = themeColor || "#005bbb";

  if (status === "loading") {
    return <LoadingMyPageView headerColor={promoHeaderColor} />;
  }

  if (status === "unconnected") {
    return (
      <UnconnectedMyPageView
        headerColor={promoHeaderColor}
        error={error}
        openSections={openSections}
        setOpenSections={setOpenSections}
      />
    );
  }

  if (status === "noUser") {
    return (
      <NoUserMyPageView
        headerColor={promoHeaderColor}
        error={error}
        usernameInput={usernameInput}
        displayName={displayName}
        profile={profile}
        setUsernameInput={setUsernameInput}
        setDisplayName={setDisplayName}
        setProfile={setProfile}
        saving={saving}
        onSubmit={handleSaveUser}
      />
    );
  }

  if (status === "userOnly") {
    return (
      <UserOnlyMyPageView
        headerColor={promoHeaderColor}
        error={error}
        openSections={openSections}
        onToggleSection={toggleSection}
        userDisplayName={me?.user?.displayName}
        userProfile={me?.user?.profile}
        displayName={displayName}
        profile={profile}
        setDisplayName={setDisplayName}
        setProfile={setProfile}
        saving={saving}
        onSubmit={handleSaveUser}
        onApply={() => void handleApplyCreator()}
      />
    );
  }

  // creatorReady
  const creatorUsername = me?.creator?.username ?? username;
  const eventBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(
    /\/$/,
    ""
  );

  const sharedCreatorReadyProps = {
    initialWorkspaceView,
    workspaceBasePath: `/${username}/mypage`,
    meCreatorUsername: creatorUsername,
    eventBaseUrl,
    themeColor,
    error,
    localProjectId,
    address,
    isConnected,
    editingProfile,
    onStartEditProfile: startEditingProfile,
    onCancelEditProfile: cancelEditingProfile,
    displayName,
    profile,
    avatarUrl,
    externalUrl,
    themeColorValue: themeColor,
    creatorType,
    socials,
    youtubeVideos,
    avatarFile,
    avatarPreview,
    setDisplayName,
    setProfile,
    setExternalUrl,
    setThemeColor,
    setCreatorType,
    setSocials,
    setYoutubeVideos,
    setAvatarFile,
    setAvatarPreview,
    saving,
    onSubmitProfile: (e: React.FormEvent) => void handleSaveCreatorProfile(e),
    projectIdsByCurrency,
    onActiveProjectIdChange: (pid: string | null, changedCur: "JPYC" | "USDC") => {
      setProjectIdsByCurrency((prev) => ({
        ...prev,
        [changedCur]: pid,
      }));
      setLocalProjectId(pid);
    },
    openSections,
    onToggleSection: toggleSection,
  };

  if (renderMode === "settings") {
    return <SettingsPageClient {...sharedCreatorReadyProps} />;
  }

  return <CreatorReadyAccountView {...sharedCreatorReadyProps} />;
}
