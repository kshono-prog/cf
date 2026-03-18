"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import type { Address } from "viem";

import type { CreatorProfile } from "@/types/creator";

import type { MeStatus, Status } from "@/lib/mypage/types";
import { generateRandomId } from "@/lib/mypage/helpers";

import { fetchMe } from "@/lib/api/creator";

import { CreatorReadyAccountView } from "@/components/mypage/CreatorReadyAccountView";
import { SettingsPageClient } from "@/components/mypage/SettingsPageClient";
import { LoadingMyPageView } from "@/components/mypage/LoadingMyPageView";
import { NoUserMyPageView } from "@/components/mypage/NoUserMyPageView";
import { UnconnectedMyPageView } from "@/components/mypage/UnconnectedMyPageView";
import { UserOnlyMyPageView } from "@/components/mypage/UserOnlyMyPageView";
import { useMyPageProfileState } from "@/components/mypage/useMyPageProfileState";
import { useMyPageShellState } from "@/components/mypage/useMyPageShellState";
import { useAccountPageActions } from "@/components/mypage/useAccountPageActions";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  username: string;
  initialWorkspaceView: WorkspaceView;
  renderMode?: "workspace" | "settings";
  initialProjectId?: string | null;
  initialProjectIdsByCurrency?: { JPYC: string | null; USDC: string | null };
};

export default function AccountPageClient({
  username,
  initialWorkspaceView,
  renderMode = "workspace",
  initialProjectId = null,
  initialProjectIdsByCurrency = { JPYC: null, USDC: null },
}: Props) {
  const { address, isConnected } = useAccount();

  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeStatus | null>(null);

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

  const [localProjectId, setLocalProjectId] = useState<string | null>(initialProjectId);
  const [projectIdsByCurrency, setProjectIdsByCurrency] = useState<{
    JPYC: string | null;
    USDC: string | null;
  }>(initialProjectIdsByCurrency);

  // ── P1-3: hydrate form only on initial load ──────────────────────────────
  const hydratedRef = useRef(false);

  const pickDefaultProjectId = useCallback((data: MeStatus): string | null => {
    return (
      data.projectId ??
      data.projectIdsByCurrency?.JPYC ??
      data.projectIdsByCurrency?.USDC ??
      null
    );
  }, []);

  /** Updates server-derived state (status, me, projectIds). No form changes. */
  const fetchSummary = useCallback(
    async (addr: Address): Promise<MeStatus | null> => {
      const result = await fetchMe(addr);
      if (!result.ok) return null;

      const meData = result.data;
      setMe(meData);
      const nextProjectIds =
        meData.projectIdsByCurrency ?? { JPYC: null, USDC: null };
      setProjectIdsByCurrency(nextProjectIds);
      setLocalProjectId(pickDefaultProjectId(meData));

      if (!meData.hasUser) {
        setStatus("noUser");
      } else if (!meData.hasCreator || !meData.creator) {
        setStatus("userOnly");
      } else {
        setStatus("creatorReady");
      }

      return meData;
    },
    [pickDefaultProjectId]
  );

  /** Applies server data to form fields. Should only run once on initial load. */
  const hydrateFormFromSummary = useCallback(
    (meData: MeStatus) => {
      if (!meData.hasUser) {
        resetProfileState(username);
        return;
      }
      if (!meData.hasCreator || !meData.creator) {
        applyUserOnly(meData.user, username);
        return;
      }
      applyCreatorProfile(meData.creator as CreatorProfile, meData.user, username);
    },
    [applyCreatorProfile, applyUserOnly, resetProfileState, username]
  );

  const loadMeStatus = useCallback(
    async (addr: Address): Promise<boolean> => {
      const meData = await fetchSummary(addr);
      if (!meData) {
        setStatus("loading");
        return false;
      }

      if (!hydratedRef.current) {
        hydrateFormFromSummary(meData);
        hydratedRef.current = true;
      }

      return true;
    },
    [fetchSummary, hydrateFormFromSummary]
  );

  useEffect(() => {
    if (!isConnected || !address) {
      setStatus("unconnected");
      setMe(null);
      setLocalProjectId(null);
      setProjectIdsByCurrency({ JPYC: null, USDC: null });
      hydratedRef.current = false;
      resetProfileState(username);
      return;
    }

    const addr: Address = address;
    let cancelled = false;

    async function run(): Promise<void> {
      setStatus("loading");
      const ok = await loadMeStatus(addr);
      if (cancelled || ok) return;
      setStatus("loading");
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, loadMeStatus, resetProfileState, username]);

  // ── P1-1: API handlers in useAccountPageActions ───────────────────────────
  const { saving, error, handleSaveUser, handleApplyCreator, handleSaveCreatorProfile } =
    useAccountPageActions({
      address,
      username,
      usernameInput,
      displayName,
      profile,
      avatarUrl,
      externalUrl,
      themeColor,
      creatorType,
      socials,
      youtubeVideos,
      onSaved: fetchSummary,
      cancelEditingProfile,
    });

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
