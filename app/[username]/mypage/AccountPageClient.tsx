"use client";

import React, { useEffect, useLayoutEffect, useMemo } from "react";
import { useAccount } from "wagmi";

import { generateRandomId } from "@/lib/mypage/helpers";

import { CreatorReadyAccountView } from "@/components/mypage/CreatorReadyAccountView";
import type { AiOfficePanelUrlState } from "@/components/mypage/aiOfficePanelUrlState";
import { LoadingMyPageView } from "@/components/mypage/LoadingMyPageView";
import { NoUserMyPageView } from "@/components/mypage/NoUserMyPageView";
import { UnconnectedMyPageView } from "@/components/mypage/UnconnectedMyPageView";
import { UserOnlyMyPageView } from "@/components/mypage/UserOnlyMyPageView";
import { useMyPageProfileState } from "@/components/mypage/useMyPageProfileState";
import { useMyPageShellState } from "@/components/mypage/useMyPageShellState";
import { useMyPageMeStatus } from "@/components/mypage/useMyPageMeStatus";
import { useAccountPageActions } from "@/components/mypage/useAccountPageActions";
import { CreatorReadyWorkspaceProvider } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { toAddressOrNull } from "@/lib/api/guards";
import { registerOwnerAuthDevOverride } from "@/lib/ownerAuthClient";
import type { MeStatus } from "@/lib/mypage/types";
import { getPublicEnv } from "@/lib/publicEnv";
import type { WorkspaceView } from "@/lib/mypage/workspaceView";

type Props = {
  username: string;
  initialWorkspaceView: WorkspaceView;
  initialProjectId?: string | null;
  initialProjectIdsByCurrency?: { JPYC: string | null; USDC: string | null };
  manualCheckAddress?: string | null;
  initialMeStatus?: MeStatus | null;
  initialAiOfficeUrlState?: Partial<AiOfficePanelUrlState>;
};

export default function AccountPageClient({
  username,
  initialWorkspaceView,
  initialProjectId = null,
  initialProjectIdsByCurrency = { JPYC: null, USDC: null },
  manualCheckAddress = null,
  initialMeStatus = null,
  initialAiOfficeUrlState = undefined,
}: Props) {
  const publicEnv = getPublicEnv();
  const { address, isConnected, status: connectionStatus } = useAccount();
  const manualCheckOwnerAddress = useMemo(
    () => toAddressOrNull(manualCheckAddress),
    [manualCheckAddress]
  );
  const effectiveAddress = manualCheckOwnerAddress ?? address;
  const effectiveIsConnected = manualCheckOwnerAddress ? true : isConnected;
  const effectiveConnectionStatus = manualCheckOwnerAddress
    ? "connected"
    : connectionStatus;

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

  const {
    status,
    me,
    localProjectId,
    projectIdsByCurrency,
    refreshMeStatus,
    syncActiveProjectId,
  } = useMyPageMeStatus({
    address: effectiveAddress,
    isConnected: effectiveIsConnected,
    connectionStatus: effectiveConnectionStatus,
    username,
    initialProjectId,
    initialProjectIdsByCurrency,
    initialMeStatus,
    resetProfileState,
    applyUserOnly,
    applyCreatorProfile,
  });

  useLayoutEffect(() => {
    registerOwnerAuthDevOverride(manualCheckOwnerAddress);
    return () => {
      registerOwnerAuthDevOverride(null);
    };
  }, [manualCheckOwnerAddress]);

  useEffect(() => {
    if (!manualCheckOwnerAddress || typeof window === "undefined") {
      return;
    }

    const hashTargetId = window.location.hash.replace(/^#/, "").trim();
    if (!hashTargetId) {
      return;
    }

    let timeoutId: number | null = null;
    let cancelled = false;

    const scrollToHashTarget = (attempt: number) => {
      if (cancelled) {
        return;
      }

      const target = document.getElementById(hashTargetId);
      if (target) {
        target.scrollIntoView({
          block: "start",
          behavior: attempt === 0 ? "auto" : "smooth",
        });
        return;
      }

      if (attempt >= 10) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        scrollToHashTarget(attempt + 1);
      }, 200);
    };

    scrollToHashTarget(0);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [manualCheckOwnerAddress]);

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
      onSaved: refreshMeStatus,
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
  const eventBaseUrl = (publicEnv.baseUrl ?? "").replace(/\/$/, "");
  const workspaceBasePath = `/${username}/mypage`;

  const workspaceState = {
    meCreatorUsername: creatorUsername,
    eventBaseUrl,
    localProjectId,
    address: effectiveAddress,
    isConnected: effectiveIsConnected,
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
    onActiveProjectIdChange: syncActiveProjectId,
    openSections,
    onToggleSection: toggleSection,
    initialAiOfficeUrlState,
  };

  return (
    <CreatorReadyWorkspaceProvider value={workspaceState}>
      <CreatorReadyAccountView
        initialWorkspaceView={initialWorkspaceView}
        workspaceBasePath={workspaceBasePath}
        themeColor={themeColor}
        error={error}
      />
    </CreatorReadyWorkspaceProvider>
  );
}
