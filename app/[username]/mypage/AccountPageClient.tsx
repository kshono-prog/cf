"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount } from "wagmi";

import type { ProfileDraftResult } from "@/lib/ai/profileDraft";
import {
  readSetupLocalMilestones,
  writeSetupLocalMilestone,
  type SetupLocalMilestoneKey,
  type SetupLocalMilestones,
} from "@/lib/growth/setup";
import { trackGrowthEvent } from "@/lib/growth/client";
import { generateRandomId } from "@/lib/mypage/helpers";

import { CreatorReadyAccountView } from "@/components/mypage/CreatorReadyAccountView";
import { AiProfileDraftCard } from "@/components/mypage/AiProfileDraftCard";
import { AuthRequiredMyPageView } from "@/components/mypage/AuthRequiredMyPageView";
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
import { useOwnerSession } from "@/context/OwnerSessionProvider";
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
  const ownerSession = useOwnerSession();
  const manualCheckOwnerAddress = useMemo(
    () => toAddressOrNull(manualCheckAddress),
    [manualCheckAddress]
  );
  const effectiveAddress = manualCheckOwnerAddress ?? address;
  const effectiveIsConnected = manualCheckOwnerAddress ? true : isConnected;
  const effectiveConnectionStatus = manualCheckOwnerAddress
    ? "connected"
    : connectionStatus;
  const effectiveAppAuthStatus = manualCheckOwnerAddress
    ? "authenticated"
    : ownerSession.status === "authenticated"
    ? "authenticated"
    : ownerSession.status === "checking"
    ? "checking"
    : "unauthenticated";

  const generatedUsername = useMemo(
    () => `user_${generateRandomId()}`,
    []
  );
  const [localGrowthMilestones, setLocalGrowthMilestones] =
    useState<SetupLocalMilestones>(() => readSetupLocalMilestones(username));
  const [aiSetupDraft, setAiSetupDraft] = useState({
    goalTitle: null as string | null,
    projectTitle: "",
    projectDescription: "",
    goalTargetInput: "",
  });
  const [aiSetupDraftVersion, setAiSetupDraftVersion] = useState(0);
  const trackedWalletRef = useRef<string | null>(null);
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
    ecosystemRole,
    setEcosystemRole,
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
    appAuthStatus: effectiveAppAuthStatus,
    username,
    skipInitialRefresh: Boolean(manualCheckOwnerAddress && initialMeStatus),
    initialProjectId,
    initialProjectIdsByCurrency,
    initialMeStatus,
    resetProfileState,
    applyUserOnly,
    applyCreatorProfile,
  });

  const currentGrowthUsername =
    me?.creator?.username ?? me?.user?.username ?? username;

  const reportGrowthEvent = useCallback(
    (payload: Parameters<typeof trackGrowthEvent>[0]) => {
      if (manualCheckOwnerAddress) {
        return;
      }

      trackGrowthEvent({
        ...payload,
        username: payload.username ?? currentGrowthUsername,
        walletAddress:
          payload.walletAddress ??
          (effectiveAddress ? effectiveAddress.toLowerCase() : null),
        projectId: payload.projectId ?? localProjectId ?? null,
      });
    },
    [
      currentGrowthUsername,
      effectiveAddress,
      localProjectId,
      manualCheckOwnerAddress,
    ]
  );

  const markLocalGrowthMilestone = useCallback(
    (key: SetupLocalMilestoneKey) => {
      const next = writeSetupLocalMilestone(currentGrowthUsername, key, true);
      setLocalGrowthMilestones(next);
    },
    [currentGrowthUsername]
  );

  const applyAiProfileDraft = useCallback(
    (draft: ProfileDraftResult) => {
      setDisplayName(draft.displayName);
      setProfile(draft.profile);
      setThemeColor(draft.suggestedThemeColor);
      setAiSetupDraft({
        goalTitle: draft.goalTitle,
        projectTitle: draft.suggestedProjectTitle,
        projectDescription: draft.suggestedProjectDescription,
        goalTargetInput: String(draft.suggestedGoalTargetJpyc),
      });
      setAiSetupDraftVersion((current) => current + 1);
    },
    [setDisplayName, setProfile, setThemeColor]
  );

  useLayoutEffect(() => {
    registerOwnerAuthDevOverride(manualCheckOwnerAddress);
    return () => {
      registerOwnerAuthDevOverride(null);
    };
  }, [manualCheckOwnerAddress]);

  useEffect(() => {
    setLocalGrowthMilestones(readSetupLocalMilestones(currentGrowthUsername));
  }, [currentGrowthUsername]);

  useEffect(() => {
    if (status !== "unconnected") {
      return;
    }

    setAiSetupDraft({
      goalTitle: null,
      projectTitle: "",
      projectDescription: "",
      goalTargetInput: "",
    });
    setAiSetupDraftVersion(0);
  }, [status]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refreshLocalMilestones = () => {
      setLocalGrowthMilestones(readSetupLocalMilestones(currentGrowthUsername));
    };

    window.addEventListener("focus", refreshLocalMilestones);
    window.addEventListener("storage", refreshLocalMilestones);

    return () => {
      window.removeEventListener("focus", refreshLocalMilestones);
      window.removeEventListener("storage", refreshLocalMilestones);
    };
  }, [currentGrowthUsername]);

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

  useEffect(() => {
    if (!effectiveIsConnected || !effectiveAddress || manualCheckOwnerAddress) {
      return;
    }

    const normalizedAddress = effectiveAddress.toLowerCase();
    if (trackedWalletRef.current === normalizedAddress) {
      return;
    }

    trackedWalletRef.current = normalizedAddress;

    reportGrowthEvent({
      event: "wallet_connected",
      walletAddress: normalizedAddress,
      metadata: {
        source: "mypage",
      },
    });
  }, [
    effectiveAddress,
    effectiveIsConnected,
    manualCheckOwnerAddress,
    reportGrowthEvent,
  ]);

  // ── P1-1: API handlers in useAccountPageActions ───────────────────────────
  const {
    saving,
    error,
    errorDescription,
    notice,
    setNotice,
    handleSaveUser,
    handleApplyCreator,
    handleSaveCreatorProfile,
  } = useAccountPageActions({
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
      onSaved: refreshMeStatus,
      cancelEditingProfile,
      onUserSavedSuccess: (nextMe) => {
        if (status !== "noUser") {
          return;
        }

        reportGrowthEvent({
          event: "user_registered",
          username: nextMe.user?.username ?? usernameInput.trim() ?? null,
        });
      },
      onCreatorAppliedSuccess: (nextMe) => {
        reportGrowthEvent({
          event: "creator_applied",
          username: nextMe.creator?.username ?? nextMe.user?.username ?? null,
        });
      },
      onCreatorProfileSavedSuccess: (result) => {
        reportGrowthEvent({
          event: "profile_saved",
          username:
            result.creator?.username ?? result.me.creator?.username ?? currentGrowthUsername,
          metadata: {
            socialLinkCount: Object.values(socials).filter(Boolean).length,
            hasAvatar: avatarUrl.trim().length > 0,
          },
        });
      },
    });

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice, setNotice]);

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

  if (status === "authRequired") {
    return (
      <AuthRequiredMyPageView
        headerColor={promoHeaderColor}
        authenticating={ownerSession.status === "checking"}
        onAuthenticate={() => {
          void ownerSession.authenticate();
        }}
      />
    );
  }

  if (status === "noUser") {
    return (
      <NoUserMyPageView
        headerColor={promoHeaderColor}
        error={error}
        errorDescription={errorDescription}
        notice={notice}
        assistantSection={
          <AiProfileDraftCard
            username={usernameInput || null}
            existingDisplayName={displayName}
            existingProfile={profile}
            existingGoalTitle={aiSetupDraft.goalTitle}
            existingSocials={socials}
            existingYoutubeVideos={youtubeVideos}
            onApply={(draft) => {
              applyAiProfileDraft(draft);
            }}
            onGenerated={(draft) => {
              reportGrowthEvent({
                event: "profile_ai_generated",
                username: usernameInput.trim() || null,
                metadata: {
                  sourceStatus: "noUser",
                  suggestedGoalTargetJpyc: draft.suggestedGoalTargetJpyc,
                },
              });
            }}
          />
        }
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
        errorDescription={errorDescription}
        notice={notice}
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
    qrcodeUrl: me?.creator?.qrcode ?? null,
    eventBaseUrl,
    localProjectId,
    address: effectiveAddress,
    isConnected: effectiveIsConnected,
    isManualCheck: Boolean(manualCheckOwnerAddress),
    editingProfile,
    onStartEditProfile: startEditingProfile,
    onCancelEditProfile: cancelEditingProfile,
    displayName,
    profile,
    avatarUrl,
    externalUrl,
    themeColorValue: themeColor,
    creatorType,
    ecosystemRole,
    socials,
    youtubeVideos,
    avatarFile,
    avatarPreview,
    setDisplayName,
    setProfile,
    setExternalUrl,
    setThemeColor,
    setCreatorType,
    setEcosystemRole,
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
    reportGrowthEvent,
    localGrowthMilestones,
    markLocalGrowthMilestone,
    aiSetupDraft,
    aiSetupDraftVersion,
    applyAiProfileDraft,
  };

  return (
    <CreatorReadyWorkspaceProvider value={workspaceState}>
      <CreatorReadyAccountView
        initialWorkspaceView={initialWorkspaceView}
        workspaceBasePath={workspaceBasePath}
        themeColor={themeColor}
        error={error}
        errorDescription={errorDescription}
        notice={notice}
      />
    </CreatorReadyWorkspaceProvider>
  );
}
