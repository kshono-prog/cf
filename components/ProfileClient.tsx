"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

import type { FeedListView } from "@/lib/feedList";
import type { CreatorProfile } from "@/lib/profileTypes";
import {
  clampPct,
  type Currency,
} from "@/components/profile/profileClientHelpers";
import { LazyFeedSection } from "@/components/feed/LazyFeedSection";
import { Avatar } from "@/components/shared/Avatar";
import { CreatorManagementStrip } from "@/components/profile/CreatorManagementStrip";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileViewerGuideCard } from "@/components/profile/ProfileViewerGuideCard";
import {
  type SupportProjectView,
  type SupportProfileView,
} from "@/lib/supportProfileView";
import { SupportProjectSummaryCard } from "@/components/support/SupportProjectSummaryCard";
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
  layout?: "full" | "content";
};


function formatSupportAmount(value: number, currency: Currency): string {
  if (!Number.isFinite(value)) return currency === "USDC" ? "0.00" : "0";
  if (currency === "USDC") {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return Math.floor(value).toLocaleString();
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
  return match ? match[1] : "";
}

export default function ProfileClient({
  username,
  creator: creatorInput,
  projectId,
  projectIdsByCurrency,
  supportProfileView,
  recruitingProjects = [],
  initialFeed = null,
  layout = "full",
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

  useEffect(() => {
    if (!supportProfileView) return;
    setSupportProfileState(supportProfileView);
  }, [supportProfileView]);

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
    handleOpenProjectSupport,
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
    progressLoading,
    progressError,
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
  const supportMode = supportProfileState.mode;
  const supportCardReady = activeSupportProject !== null;
  const supportTitle =
    supportCardReady
      ? activeSupportProject?.title ?? `${displayName}の活動を応援する`
      : supportMode === "draft"
      ? supportProfileState.draft?.title ?? `${displayName}の公開ページは準備中です`
      : `${displayName}の公開ページは準備中です`;
  const supportDescription =
    supportCardReady
      ? activeSupportProject?.description ?? null
      : supportMode === "draft"
      ? supportProfileState.draft?.description ?? null
      : "公開ページを準備中です。応援内容が整うと、ここから確認できます。";

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

  const ownerComposerManagementHref = `/${username}/mypage#public-page`;
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
  const availableCurrencies = availableSupportCurrencies;
  const selectedCurrencyLabel =
    activeSupportProject?.currency ??
    supportProfileState.activeCurrency ??
    "JPYC";
  const currentSupportLabel = activeSupportProject
    ? `${formatSupportAmount(
        activeSupportProject.confirmedAmount,
        activeSupportProject.currency
      )} ${activeSupportProject.currency}`
    : "-";
  const targetSupportLabel = activeSupportProject
    ? activeSupportProject.targetAmount != null
      ? `${formatSupportAmount(
          activeSupportProject.targetAmount,
          activeSupportProject.currency
        )} ${activeSupportProject.currency}`
      : "-"
    : "-";
  const statusLabel =
    activeSupportProject?.status === "ACHIEVED"
      ? "目標達成済み"
      : activeSupportProject?.status === "NO_GOAL"
      ? "目標未設定"
      : "受付中";
  const statusDetail = activeSupportProject?.deadline
    ? `期限 ${activeSupportProject.deadline.slice(0, 10)}`
    : activeSupportProject
    ? null
    : supportMode === "draft"
    ? "公開ページを準備中です"
    : "応援を受け付ける準備が整っていません";

  async function handleViewerConnect(): Promise<void> {
    const { appkit } = await import("@/lib/appkitInstance");
    await appkit.open({ view: "Connect" });
  }

  const profileGuideCard = (
    <ProfileViewerGuideCard
      viewerState={viewerState}
      canOpenSupportSheet={canOpenSupportSheet}
      pageDisplayName={pageDisplayName}
      viewerComposeHref={viewerComposeHref}
      viewerWorkspaceHref={viewerWorkspaceHref}
      viewerProfileHref={viewerProfileHref}
      onOpenSupportSheet={openSupportSheet}
    />
  );

  const profileScreen = (
    <div className="space-y-3">
      <ProfileHero
        username={username}
        displayName={displayName}
        avatarUrl={creator.avatarUrl}
        profile={creator.profile}
        externalUrl={creator.url}
        themeColor={creator.themeColor}
        socials={creator.socials}
        communityContent={
          <CreatorCommunityCard
            username={username}
            viewerAddress={viewerAddress ?? null}
            viewerState={viewerState}
            managementHref={ownerComposerManagementHref}
            registrationHref={viewerWorkspaceHref}
            onRequireConnection={() => void handleViewerConnect()}
          />
        }
      />

      {viewerState.mode !== "unconnected" ? profileGuideCard : null}
      {recruitingProjects.length === 0 ? (
        <section
          id="support-projects"
          className="panel-card px-3.5 py-2.5 sm:px-4 sm:py-3"
        >
          <div className="grid gap-2.5 pb-2.5 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-3">
            <div className="flex min-w-0 flex-col items-center justify-center gap-2 text-center">
              <div className="flex min-w-0 flex-col items-center gap-2">
                <Avatar
                  src={creator.avatarUrl}
                  alt={`${displayName} のアイコン`}
                  fallbackText={displayName.slice(0, 1) || "?"}
                  size={32}
                />
                <div className="text-[11px] font-medium text-[var(--text-subtle)]">
                  {displayName}
                </div>
              </div>
              <div>
                {viewerState.isOwner ? (
                  <Link
                    href={viewerWorkspaceHref}
                    className="btn-secondary px-3 py-1.5 text-[12px]"
                  >
                    公開ページを整える
                  </Link>
                ) : canOpenSupportSheet ? (
                  <button
                    type="button"
                    className="btn px-3 py-1.5 text-[12px]"
                    onClick={openSupportSheet}
                  >
                    応援する
                  </button>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[var(--text)] sm:text-[15px]">
                {supportTitle}
              </div>
              {supportDescription ? (
                <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-4.5 text-[var(--text-subtle)] sm:mt-1 sm:text-[12px]">
                  {supportDescription}
                </p>
              ) : null}
            </div>
          </div>

          {!supportCardReady ? (
            <div className="mt-1.5 border-t border-[var(--line)] pt-1.5 text-[11px] leading-5 text-[var(--text-subtle)]">
              {supportMode === "draft"
                ? "公開ページを準備中です。応援内容が整うと、ここに進捗が表示されます。"
                : "いまは応援内容を読み込めません。時間をおいてもう一度お試しください。"}
            </div>
          ) : progressLoading ? (
            <div className="mt-1.5 border-t border-[var(--line)] pt-1.5 text-sm text-[var(--text-subtle)]">
              読み込み中です
            </div>
          ) : progressError ? (
            <div className="alert-warn mt-1.5">
              うまく読み込めませんでした。もう一度お試しください。
            </div>
          ) : (
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-1.5 sm:grid-cols-4">
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[var(--text-subtle)]">集まった応援</div>
                <div className="mt-0.5 text-[14px] font-semibold text-[var(--text)] sm:text-[1rem]">
                  {currentSupportLabel}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[var(--text-subtle)]">目標</div>
                <div className="mt-0.5 text-[14px] font-semibold text-[var(--text)] sm:text-[1rem]">
                  {targetSupportLabel}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-[10px] font-medium text-[var(--text-subtle)]">進捗</div>
                  <div className="text-[12px] font-semibold text-[var(--text)]">
                    {activeSupportProject
                      ? `${Math.floor(clampPct(activeSupportProject.progressPct))}%`
                      : "-"}
                  </div>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--support)]"
                    style={{
                      width: `${
                        activeSupportProject
                          ? clampPct(activeSupportProject.progressPct)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-[var(--text-subtle)]">状態</div>
                <div className="mt-0.5 text-[13px] font-semibold text-[var(--text)]">
                  {statusLabel}
                </div>
                {statusDetail ? (
                  <div className="mt-0.5 text-[10px] leading-4 text-[var(--text-subtle)]">
                    {statusDetail}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {supportCardReady && availableCurrencies.length > 1 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-1.5">
              <div className="text-[10px] font-medium text-[var(--text-subtle)]">
                表示通貨
              </div>
              {(["JPYC", "USDC"] as const).map((currency) => (
                <button
                  key={currency}
                  type="button"
                  className={`px-2.5 py-1 text-[11px] ${
                    viewCurrency === currency ? "action-pill-active" : "chip-button"
                  }`}
                  disabled={!supportProfileState.projectsByCurrency[currency]}
                  onClick={() => setViewCurrency(currency)}
                >
                  {currency}
                </button>
              ))}
            </div>
          ) : supportCardReady && availableCurrencies.length === 1 ? (
            <div className="mt-1.5 border-t border-[var(--line)] pt-1.5 text-[10px] text-[var(--text-subtle)]">
              表示通貨: {selectedCurrencyLabel}
            </div>
          ) : null}
        </section>
      ) : null}

      {recruitingProjects.length > 0 ? (
        <section
          id="support-projects"
          className="panel-card px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-base font-semibold text-[var(--text)]">
                募集中のプロジェクト
              </div>
              <p className="mt-1 text-sm text-[var(--text-subtle)]">
                いま応援を受け付けている project をまとめて見られます。
              </p>
            </div>
            <div className="text-sm text-[var(--text-subtle)]">
              {recruitingProjects.length} 件
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recruitingProjects.map((project) => {
              const isSelected = activeSupportProject?.projectId === project.projectId;

              return (
                <SupportProjectSummaryCard
                  key={project.projectId}
                  creator={{
                    username,
                    displayName,
                    avatarUrl: creator.avatarUrl ?? null,
                  }}
                  project={project}
                  isSelected={isSelected}
                  actionLabel={
                    isSelected ? "選択中の project" : "この project を応援"
                  }
                  onAction={() => {
                    handleOpenProjectSupport(project);
                  }}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {creator.youtubeVideos && creator.youtubeVideos.length > 0 ? (
        <section className="panel-card px-4 py-4 sm:px-5 sm:py-5">
          <div className="text-base font-semibold text-[var(--text)]">紹介動画</div>
          <div className="mt-3 space-y-4">
            {creator.youtubeVideos.map((video, index) => {
              const videoId = extractYouTubeId(video.url);

              return (
                <div key={`${video.url}-${index}`} className="space-y-2.5">
                  {videoId ? (
                    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-black">
                      <div className="aspect-video w-full">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
                          title={video.title || "紹介動画"}
                          className="h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : video.url ? (
                    <Link
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-[var(--line)] px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface-subtle)]"
                    >
                      動画を開く
                    </Link>
                  ) : null}
                  <div>
                    <div className="text-[15px] font-semibold text-[var(--text)]">
                      {video.title || "紹介動画"}
                    </div>
                    {video.description ? (
                      <p className="mt-1.5 text-[13px] leading-6 text-[var(--text-subtle)]">
                        {video.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div id="posts" ref={timelineRef}>
        <LazyFeedSection
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

      {viewerState.mode === "unconnected" ? profileGuideCard : null}
    </div>
  );

  const content = (
    <>
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

  if (layout === "content") {
    return content;
  }

  return (
    <div className="space-y-4">
      {viewerState.isOwner ? (
        <CreatorManagementStrip username={username} />
      ) : null}
      {content}
    </div>
  );
}
