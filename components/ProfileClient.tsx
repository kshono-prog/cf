"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";

import { trackGrowthEvent } from "@/lib/growth/client";
import {
  readSetupLocalMilestones,
  writeSetupLocalMilestone,
} from "@/lib/growth/setup";
import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";
import type { Currency } from "@/components/profile/profileClientHelpers";
import { DeferredFeedSection } from "@/components/feed/DeferredFeedSection";
import { CreatorManagementStrip } from "@/components/profile/CreatorManagementStrip";
import { PublicExternalWalletTipQrCard } from "@/components/profile/PublicExternalWalletTipQrCard";
import { RewardTierPublicSection } from "@/components/profile/RewardTierPublicSection";
import {
  type SupportProjectView,
  type SupportProfileView,
} from "@/lib/supportProfileView";
import {
  orderConfiguredPublicPageSections,
  resolveCreatorPublicPageConfig,
  type PublicPageCenterSectionKey,
} from "@/lib/publicPageConfig";
import { useWalletResume } from "@/components/profile/useWalletResume";
import { useProjectProgress } from "@/components/profile/useProjectProgress";
import { useContributionFlow } from "@/components/profile/useContributionFlow";
import { useSupportSheet } from "@/components/profile/useSupportSheet";

const ProfileWalletClient = dynamic(
  () =>
    import("@/components/profile/ProfileWalletClient").then(
      (module) => module.ProfileWalletClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--text-subtle)]">
        ウォレット情報を準備しています…
      </div>
    ),
  }
);

const SupportSheet = dynamic(
  () =>
    import("@/components/support/SupportSheet").then(
      (module) => module.SupportSheet
    ),
  {
    ssr: false,
  }
);

const CreatorCommunityCard = dynamic(
  () =>
    import("@/components/profile/CreatorCommunityCard").then(
      (module) => module.CreatorCommunityCard
    ),
  {
    loading: () => (
      <div className="text-sm text-[var(--text-subtle)]">
        つながり情報を準備しています…
      </div>
    ),
  }
);

const ProfileViewerGuideCard = dynamic(
  () =>
    import("@/components/profile/ProfileViewerGuideCard").then(
      (module) => module.ProfileViewerGuideCard
    ),
  {
    loading: () => null,
  }
);

type CreatorProfileInput = Omit<CreatorProfile, "address"> & {
  address?: string | null;
};

type Props = {
  username: string;
  creator: CreatorProfileInput;
  projectId: string | null;
  projectIdsByCurrency?: {
    JPYC: string | null;
    USDC: string | null;
  } | null;
  supportProfileView?: SupportProfileView | null;
  recruitingProjects?: SupportProjectView[];
  initialFeed?: FeedListView | null;
  introContent?: React.ReactNode;
};

export default function ProfileClient({
  username,
  creator: creatorInput,
  projectId,
  projectIdsByCurrency,
  supportProfileView,
  recruitingProjects = [],
  initialFeed = null,
  introContent,
}: Props) {
  const { address: viewerAddress } = useAccount();
  const creator: CreatorProfile = useMemo(() => {
    const normalizedAddress =
      typeof creatorInput.address === "string" && creatorInput.address.length > 0
        ? creatorInput.address
        : undefined;

    return {
      ...(creatorInput as Omit<CreatorProfile, "address">),
      address: normalizedAddress,
    };
  }, [creatorInput]);

  const [viewCurrency, setViewCurrency] = useState<Currency>("JPYC");
  const resolvedProjectIdsByCurrency = useMemo(
    () => ({
      JPYC: projectIdsByCurrency?.JPYC ?? projectId ?? null,
      USDC: projectIdsByCurrency?.USDC ?? null,
    }),
    [projectId, projectIdsByCurrency]
  );
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const [supportProfileState, setSupportProfileState] =
    useState<SupportProfileView>(
      supportProfileView ?? {
        mode: creator.profile ? "draft" : "unavailable",
        activeCurrency: null,
        activeProjectId: null,
        projectsByCurrency: { JPYC: null, USDC: null },
        draft: creator.profile
          ? { title: null, description: creator.profile ?? null }
          : null,
      }
    );
  const [feedRefreshToken, setFeedRefreshToken] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [supportSectionInView, setSupportSectionInView] = useState(true);
  const [ownerPageReviewed, setOwnerPageReviewed] = useState(false);
  const ownerViewTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supportProfileView) return;
    setSupportProfileState(supportProfileView);
  }, [supportProfileView]);

  useEffect(() => {
    setOwnerPageReviewed(
      readSetupLocalMilestones(username).publicPageViewedByOwner
    );
  }, [username]);

  useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supportSection = document.getElementById("support-projects");
    if (!supportSection) {
      setSupportSectionInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setSupportSectionInView(entry.isIntersecting);
      },
      {
        threshold: 0.35,
      }
    );

    observer.observe(supportSection);

    return () => observer.disconnect();
  }, []);

  const recruitingProjectMap = useMemo(
    () =>
      new Map(
        recruitingProjects.map((project) => [project.projectId, project] as const)
      ),
    [recruitingProjects]
  );

  const availableSupportCurrencies = useMemo(
    () =>
      (["JPYC", "USDC"] as const).filter(
        (currency) => supportProfileState.projectsByCurrency[currency] !== null
      ),
    [supportProfileState]
  );

  // canOpenSupportSheet determined from supportProfileState (pre-selection),
  // sufficient to guard the sheet open action.
  const canOpenSupportSheet =
    availableSupportCurrencies.length > 0 || recruitingProjects.length > 0;

  // ── useSupportSheet ───────────────────────────────────────────────────────
  const {
    selectedSupportProject,
    selectedPostTipContext,
    setSelectedPostTipContext,
    supportSheetOpen,
    supportSheetLoaded,
    openSupportSheet,
    closeSupportSheet,
    handleSelectPostTip,
  } = useSupportSheet({
    canOpenSupportSheet,
    recruitingProjectMap,
    viewCurrency,
    setViewCurrency,
  });

  const activeSupportProject = useMemo(() => {
    if (selectedSupportProject) {
      return selectedSupportProject;
    }

    const preferred = supportProfileState.projectsByCurrency[viewCurrency];
    if (preferred) return preferred;
    if (supportProfileState.activeCurrency) {
      return supportProfileState.projectsByCurrency[supportProfileState.activeCurrency];
    }
    return availableSupportCurrencies.length > 0
      ? supportProfileState.projectsByCurrency[availableSupportCurrencies[0]]
      : null;
  }, [
    availableSupportCurrencies,
    selectedSupportProject,
    supportProfileState,
    viewCurrency,
  ]);

  const activeProjectId = activeSupportProject?.projectId ?? null;

  useEffect(() => {
    if (selectedSupportProject) return;
    if (supportProfileState.mode !== "ready") return;
    if (supportProfileState.projectsByCurrency[viewCurrency]) return;
    if (supportProfileState.activeCurrency) {
      setViewCurrency(supportProfileState.activeCurrency);
      return;
    }
    if (availableSupportCurrencies[0]) {
      setViewCurrency(availableSupportCurrencies[0]);
    }
  }, [
    availableSupportCurrencies,
    selectedSupportProject,
    supportProfileState,
    viewCurrency,
  ]);

  // ── P1-5: useWalletResume ────────────────────────────────────────────────
  const { viewerState } = useWalletResume({
    pageUsername: username,
    pageCreatorAddress: creator.address ?? null,
    viewerAddress: viewerAddress ?? null,
  });

  // ── P1-5: useProjectProgress ─────────────────────────────────────────────
  const {
    goalAchievedAt,
    supportedJpycChainIds,
    supportedChainIdsByCurrency,
    fetchProjectProgressSafe,
  } = useProjectProgress({
    activeProjectId,
    activeSupportProjectCurrency: activeSupportProject?.currency ?? null,
    activeSupportProjectGoalAchievedAt: activeSupportProject?.achievedAt ?? null,
    creatorDisplayName: creator.displayName || username,
    creatorProfile: creator.profile ?? null,
    username,
    viewerIsOwner: viewerState.isOwner,
    activeSupportProjectConfirmedAmount: activeSupportProject?.confirmedAmount,
    onSupportProfileUpdate: setSupportProfileState,
  });

  // ── P1-5: useContributionFlow ────────────────────────────────────────────
  const { postContribution, afterSendPipeline } = useContributionFlow({
    activeProjectId,
    viewerAddress: viewerAddress ?? null,
    goalAchievedAt,
    selectedPostTipContext,
    fetchProjectProgressSafe,
    setFeedRefreshToken,
    setSelectedPostTipContext,
  });

  const displayName = creator.displayName || username;
  const publicPageConfig = useMemo(
    () => resolveCreatorPublicPageConfig(creator.publicPage),
    [creator.publicPage]
  );
  const ownerProjectOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = [];
    const seen = new Set<string>();

    for (const currency of ["JPYC", "USDC"] as const) {
      const nextProject = supportProfileState.projectsByCurrency[currency];
      const nextId = nextProject?.projectId ?? resolvedProjectIdsByCurrency[currency];
      if (!nextId || seen.has(nextId)) continue;
      seen.add(nextId);

      options.push({
        id: nextId,
        label: `${currency} / ${nextProject?.title ?? `${currency} の公開ページ`}`,
      });
    }

    return options;
  }, [resolvedProjectIdsByCurrency, supportProfileState.projectsByCurrency]);

  const ownerComposerManagementHref = `/${username}/mypage/settings#public-page`;
  const ownerShareDraftHref = `/${username}/mypage/settings#growth-share`;
  const viewerWorkspaceHref = viewerState.userUsername
    ? `/${viewerState.userUsername}/mypage`
    : `/${username}/mypage`;
  const viewerComposeHref = viewerState.creatorUsername
    ? `/${viewerState.creatorUsername}/compose`
    : viewerWorkspaceHref;
  const viewerProfileHref = viewerState.creatorUsername
    ? `/${viewerState.creatorUsername}`
    : viewerWorkspaceHref;
  const pageDisplayName = displayName;

  const showStickyBar =
    stickyVisible &&
    !supportSectionInView &&
    !viewerState.isOwner &&
    viewerState.mode !== "unconnected" &&
    canOpenSupportSheet;

  useEffect(() => {
    if (!viewerState.isOwner) {
      return;
    }

    const trackKey = `${username}:${(viewerAddress ?? creator.address ?? "").toLowerCase()}`;
    if (ownerViewTrackedRef.current === trackKey) {
      return;
    }

    ownerViewTrackedRef.current = trackKey;

    trackGrowthEvent({
      event: "public_page_viewed_by_owner",
      username,
      walletAddress: viewerAddress ?? creator.address ?? null,
      projectId: activeProjectId,
      metadata: {
        pagePath:
          typeof window !== "undefined" ? window.location.pathname : `/${username}`,
      },
    });
  }, [activeProjectId, creator.address, username, viewerAddress, viewerState.isOwner]);

  // first_tip_received should be emitted from the confirmed contribution path
  // on the server side, not from this owner-view UI.

  const handleConfirmOwnerPageReviewed = useCallback(() => {
    writeSetupLocalMilestone(username, "publicPageViewedByOwner", true);
    setOwnerPageReviewed(true);
  }, [username]);

  const profileGuideCard = useMemo(
    () => (
      <ProfileViewerGuideCard
        viewerState={viewerState}
        canOpenSupportSheet={canOpenSupportSheet}
        pageDisplayName={pageDisplayName}
        ownerPageReviewed={ownerPageReviewed}
        ownerShareDraftHref={ownerShareDraftHref}
        viewerComposeHref={viewerComposeHref}
        viewerWorkspaceHref={viewerWorkspaceHref}
        viewerProfileHref={viewerProfileHref}
        onConfirmOwnerPageReviewed={handleConfirmOwnerPageReviewed}
        onOpenSupportSheet={openSupportSheet}
      />
    ),
    [
      canOpenSupportSheet,
      handleConfirmOwnerPageReviewed,
      openSupportSheet,
      ownerPageReviewed,
      ownerShareDraftHref,
      pageDisplayName,
      viewerComposeHref,
      viewerProfileHref,
      viewerState,
      viewerWorkspaceHref,
    ]
  );

  const standaloneCommunityCard = useMemo(
    () => (
      <section className="panel-card px-4 py-3.5 sm:px-5 sm:py-4">
        <CreatorCommunityCard
          username={username}
          viewerAddress={viewerAddress ?? null}
          viewerState={viewerState}
          managementHref={ownerComposerManagementHref}
          registrationHref={viewerWorkspaceHref}
        />
      </section>
    ),
    [
      ownerComposerManagementHref,
      username,
      viewerAddress,
      viewerState,
      viewerWorkspaceHref,
    ]
  );

  const centerSectionItems = useMemo<
    Array<{ key: PublicPageCenterSectionKey; node: ReactNode }>
  >(() => {
    const items: Array<{ key: PublicPageCenterSectionKey; node: ReactNode }> = [];

    if (creator.address) {
      items.push({
        key: "wallet-tip",
        node: (
          <PublicExternalWalletTipQrCard
            username={username}
            displayName={displayName}
            creatorAddress={creator.address}
          />
        ),
      });
    }

    items.push({ key: "community", node: standaloneCommunityCard });
    items.push({ key: "guide", node: profileGuideCard });
    if (activeProjectId) {
      items.push({
        key: "reward-tiers",
        node: (
          <RewardTierPublicSection
            projectId={activeProjectId}
            headerColor={creator.themeColor ?? undefined}
            onRequestSupport={() => {
              if (canOpenSupportSheet) {
                openSupportSheet();
              }
            }}
          />
        ),
      });
    }
    items.push({
      key: "posts",
      node: (
        <div id="posts" ref={timelineRef}>
          <DeferredFeedSection
            creatorUsername={username}
            viewerAddress={viewerAddress ?? null}
            managedCreatorUsername={viewerState.creatorUsername}
            managePostAddress={viewerState.hasCreator ? viewerAddress ?? null : null}
            manageProjectOptions={ownerProjectOptions}
            selectedPostId={selectedPostTipContext?.id ?? null}
            projectIdsByCurrency={resolvedProjectIdsByCurrency}
            showTipAction={canOpenSupportSheet}
            refreshToken={feedRefreshToken}
            initialFeed={initialFeed}
            headerColor={creator.themeColor || "#2563eb"}
            goalAchievedAt={goalAchievedAt ?? null}
            onSelectTipPost={handleSelectPostTip}
            onFocusWalletSection={openSupportSheet}
          />
        </div>
      ),
    });

    return items;
  }, [
    activeProjectId,
    canOpenSupportSheet,
    creator.address,
    creator.themeColor,
    displayName,
    feedRefreshToken,
    goalAchievedAt,
    handleSelectPostTip,
    initialFeed,
    openSupportSheet,
    ownerProjectOptions,
    profileGuideCard,
    resolvedProjectIdsByCurrency,
    selectedPostTipContext?.id,
    standaloneCommunityCard,
    username,
    viewerAddress,
    viewerState.creatorUsername,
    viewerState.hasCreator,
  ]);

  const orderedCenterKeys = useMemo(
    () =>
      orderConfiguredPublicPageSections({
        availableKeys: centerSectionItems.map((item) => item.key),
        configuredOrder: publicPageConfig.centerSectionOrder,
        hiddenKeys: publicPageConfig.hiddenCenterSectionKeys,
      }),
    [centerSectionItems, publicPageConfig.centerSectionOrder, publicPageConfig.hiddenCenterSectionKeys]
  );

  const centerSectionMap = useMemo(
    () =>
      new Map(
        centerSectionItems.map((item) => [item.key, item.node] as const)
      ),
    [centerSectionItems]
  );

  const profileScreen = (
    <div className="space-y-3">
      {introContent}
      {orderedCenterKeys.map((key) => (
        <div key={key}>{centerSectionMap.get(key) ?? null}</div>
      ))}
    </div>
  );

  const content = (
    <>
      {viewerState.isOwner ? <CreatorManagementStrip username={username} /> : null}
      {profileScreen}

      {canOpenSupportSheet && (supportSheetLoaded || supportSheetOpen) ? (
        <SupportSheet
          open={supportSheetOpen}
          title={
            selectedPostTipContext
              ? "この投稿を応援"
              : selectedSupportProject
              ? `${selectedSupportProject.title}を応援`
              : `${displayName}を応援`
          }
          description={
            selectedPostTipContext
              ? "金額と通貨を選んで、そのまま応援を送れます。"
              : selectedSupportProject
              ? "選んだ project に向けて、そのまま応援を送れます。"
              : "金額と通貨を選んで、やさしく応援を送れます。"
          }
          onClose={closeSupportSheet}
        >
          {supportSheetLoaded ? (
            <ProfileWalletClient
              username={username}
              creator={creator}
              projectId={activeProjectId}
              projectIdsByCurrency={resolvedProjectIdsByCurrency}
              supportedJpycChainIds={supportedJpycChainIds}
              supportedChainIdsByCurrency={supportedChainIdsByCurrency}
              headerColor={creator.themeColor || "#2563eb"}
              selectedProjectId={selectedSupportProject?.projectId ?? null}
              selectedProjectTitle={selectedSupportProject?.title ?? null}
              selectedProjectCurrency={selectedSupportProject?.currency ?? null}
              selectedPostId={selectedPostTipContext?.id ?? null}
              selectedPostSummary={selectedPostTipContext?.preview ?? null}
              selectedPostCurrency={selectedPostTipContext?.preferredCurrency ?? null}
              onClearSelectedPost={() => setSelectedPostTipContext(null)}
              onPostContribution={postContribution}
              onAfterSend={afterSendPipeline}
            />
          ) : null}
        </SupportSheet>
      ) : null}
    </>
  );

  const supportBgColor = creator.themeColor ?? "#7c3aed";

  const stickyBar = showStickyBar ? (
    <div
      className={`fixed inset-x-0 z-40 transition-transform duration-300 md:hidden ${
        stickyVisible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 78px)" }}
    >
      <div className="mx-auto max-w-[760px] px-4 pb-2">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.98]"
          style={{ backgroundColor: supportBgColor }}
          onClick={() => {
            if (canOpenSupportSheet) {
              openSupportSheet();
            }
          }}
        >
          {/* Gift icon */}
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
            <path
              d="M12 7c-1-2-3-3-3.5-1.5C8 7 10 7.5 12 7c1-2 3-3 3.5-1.5C16 7 14 7.5 12 7Z"
              fill="white"
              stroke="white"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <rect x="4" y="7" width="16" height="3.2" rx="1" fill="white" />
            <rect x="5.2" y="10.2" width="13.6" height="8.8" rx="1" fill="white" />
            <line x1="12" y1="7" x2="12" y2="19" stroke={supportBgColor} strokeWidth="1.4" />
          </svg>
          <span>{displayName}を応援する</span>
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {content}
      {stickyBar}
    </>
  );
}
