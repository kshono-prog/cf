"use client";

import { AiProfileDraftCard } from "@/components/mypage/AiProfileDraftCard";
import { CreatorPublicLinkSection } from "@/components/mypage/CreatorPublicLinkSection";
import { GrowthCoachCard } from "@/components/mypage/GrowthCoachCard";
import { NextBestActionCard } from "@/components/mypage/NextBestActionCard";
import {
  useCreatorReadyWorkspace,
  type CreatorReadyWorkspaceShellProps,
} from "@/components/mypage/CreatorReadyWorkspaceContext";
import { CreatorReadyPostingSection } from "@/components/mypage/CreatorReadyPostingSection";
import { CreatorSettingsAiManagerAccountSection } from "@/components/mypage/CreatorSettingsAiManagerAccountSection";
import { CreatorSettingsBasicInfoSection } from "@/components/mypage/CreatorSettingsBasicInfoSection";
import { CreatorSettingsHeaderSection } from "@/components/mypage/CreatorSettingsHeaderSection";
import { CreatorSettingsSupportSection } from "@/components/mypage/CreatorSettingsSupportSection";
import { CreatorSettingsWalletSection } from "@/components/mypage/CreatorSettingsWalletSection";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { SetupProgressCard } from "@/components/mypage/SetupProgressCard";
import { ShareDraftCard } from "@/components/mypage/ShareDraftCard";
import { ShareExecutionLogCard } from "@/components/mypage/ShareExecutionLogCard";
import { useCreatorGrowthOverview } from "@/components/mypage/useCreatorGrowthOverview";
import { useCreatorReadyPublicWorkspaceData } from "@/components/mypage/useCreatorReadyPublicWorkspaceData";
import {
  buildBasicProfileCompletion,
  buildProfilePreviewMissingHints,
  buildSetupNextBestAction,
  buildSetupProgressState,
  mergeSetupProgressInputWithGrowthOverview,
} from "@/lib/growth/setup";
import { buildGrowthCoachCard } from "@/lib/growth/coach";
import { withBaseUrl } from "@/utils/baseUrl";

type SettingsPageClientProps = Pick<
  CreatorReadyWorkspaceShellProps,
  "workspaceBasePath" | "error"
>;

export function SettingsPageClient(props: SettingsPageClientProps) {
  const workspace = useCreatorReadyWorkspace();
  const {
    dashboardError,
    projectDashboardsByCurrency,
    publicReadiness,
    postingProjectOptions,
  } = useCreatorReadyPublicWorkspaceData("settings");
  const growthOverview = useCreatorGrowthOverview({
    address: workspace.address,
    isConnected: workspace.isConnected,
    enabled: !workspace.isManualCheck,
  });

  const publicProfileUrl = withBaseUrl(workspace.meCreatorUsername);
  const basicProfileState = buildBasicProfileCompletion({
    displayName: workspace.displayName,
    profile: workspace.profile,
    avatarUrl: workspace.avatarUrl,
    socials: workspace.socials,
  });
  const hasProject = (["JPYC", "USDC"] as const).some(
    (currency) => Boolean(projectDashboardsByCurrency[currency]?.summary?.project)
  );
  const hasGoal = (["JPYC", "USDC"] as const).some(
    (currency) => Boolean(projectDashboardsByCurrency[currency]?.summary?.goal)
  );
  const publicSetupInput = {
    walletConnected: workspace.isConnected,
    userRegistered: true,
    creatorApplied: true,
    basicProfileCompleted: basicProfileState.complete,
    projectCreated: hasProject,
    goalSaved: hasGoal,
    publicPageViewedByOwner: workspace.localGrowthMilestones.publicPageViewedByOwner,
    shareDraftsGenerated: workspace.localGrowthMilestones.shareDraftsGenerated,
  };
  const syncedPublicSetupInput = mergeSetupProgressInputWithGrowthOverview({
    input: publicSetupInput,
    growthOverview: growthOverview.data,
  });
  const setupProgress = buildSetupProgressState(syncedPublicSetupInput);
  const nextBestAction = buildSetupNextBestAction(syncedPublicSetupInput);
  const missingGoalCurrency =
    projectDashboardsByCurrency.JPYC?.summary?.project &&
    !projectDashboardsByCurrency.JPYC.summary.goal
      ? "JPYC"
      : projectDashboardsByCurrency.USDC?.summary?.project &&
          !projectDashboardsByCurrency.USDC.summary.goal
        ? "USDC"
        : "JPYC";
  const goalHref =
    missingGoalCurrency === "USDC" ? "#goal-input-usdc" : "#goal-input-jpyc";
  const progressPrimaryHref =
    nextBestAction.kind === "public"
      ? publicProfileUrl
      : nextBestAction.kind === "project"
        ? "#project-setup"
        : nextBestAction.kind === "goal"
          ? goalHref
          : nextBestAction.kind === "share" || nextBestAction.kind === "done"
            ? "#growth-share"
            : undefined;
  const growthCoach = buildGrowthCoachCard({
    workspaceBasePath: props.workspaceBasePath,
    publicProfileUrl,
    basicProfileCompleted: syncedPublicSetupInput.basicProfileCompleted,
    projectCreated: syncedPublicSetupInput.projectCreated,
    goalSaved: syncedPublicSetupInput.goalSaved,
    publicPageViewedByOwner: syncedPublicSetupInput.publicPageViewedByOwner,
    shareDraftsGenerated: syncedPublicSetupInput.shareDraftsGenerated,
    growthOverview: growthOverview.data,
    goalHref,
  });
  const primarySummary =
    projectDashboardsByCurrency.JPYC?.summary ??
    projectDashboardsByCurrency.USDC?.summary ??
    null;
  const shareLogProjectId = primarySummary?.project.id ?? workspace.localProjectId ?? null;
  const basicInfoHints = buildProfilePreviewMissingHints({
    avatarUrl: workspace.avatarUrl,
    socials: workspace.socials,
    hasGoal,
  });

  const aiAssistant = (
    <AiProfileDraftCard
      username={workspace.meCreatorUsername}
      existingDisplayName={workspace.displayName}
      existingProfile={workspace.profile}
      existingGoalTitle={workspace.aiSetupDraft.goalTitle}
      existingSocials={workspace.socials}
      existingYoutubeVideos={workspace.youtubeVideos}
      onApply={(draft) => {
        workspace.applyAiProfileDraft(draft);
        workspace.onStartEditProfile();
      }}
      onGenerated={(draft) => {
        workspace.reportGrowthEvent({
          event: "profile_ai_generated",
          metadata: {
            warningCount: draft.warnings.length,
            suggestedGoalTargetJpyc: draft.suggestedGoalTargetJpyc,
          },
        });
      }}
    />
  );

  return (
    <div className="space-y-4">
      <CreatorSettingsHeaderSection
        error={props.error}
        dashboardError={dashboardError}
      />

      {/* ── セットアップ進捗（完了まで表示） ── */}
      {!syncedPublicSetupInput.shareDraftsGenerated ? (
        <>
          <SetupProgressCard
            steps={setupProgress.steps}
            completedCount={setupProgress.completedCount}
            totalCount={setupProgress.totalCount}
            completionPercentage={setupProgress.completionPercentage}
            primaryCtaLabel={nextBestAction.ctaLabel}
            primaryCtaHref={progressPrimaryHref}
            onPrimaryAction={
              nextBestAction.kind === "profile"
                ? workspace.onStartEditProfile
                : undefined
            }
          />
          <NextBestActionCard
            walletConnected={publicSetupInput.walletConnected}
            userRegistered={syncedPublicSetupInput.userRegistered}
            creatorApplied={syncedPublicSetupInput.creatorApplied}
            basicProfileCompleted={syncedPublicSetupInput.basicProfileCompleted}
            projectCreated={syncedPublicSetupInput.projectCreated}
            goalSaved={syncedPublicSetupInput.goalSaved}
            publicPageViewedByOwner={syncedPublicSetupInput.publicPageViewedByOwner}
            shareDraftsGenerated={syncedPublicSetupInput.shareDraftsGenerated}
            publicPageUrl={publicProfileUrl}
            projectHref="#project-setup"
            goalHref={goalHref}
            shareHref="#growth-share"
            onProfileAction={workspace.onStartEditProfile}
          />
          <GrowthCoachCard coach={growthCoach} />
        </>
      ) : null}

      {/* ── プロフィール ── */}
      <CreatorPublicLinkSection
        username={workspace.meCreatorUsername}
        localProjectId={workspace.localProjectId}
        walletAddress={workspace.address ?? null}
        initialQrcodeUrl={workspace.qrcodeUrl}
      />

      <CreatorSettingsBasicInfoSection
        assistantSection={aiAssistant}
        missingSetupHints={basicInfoHints}
      />

      {/* ── 公開ページ・SNS拡散 ── */}
      <PublicReadinessPanel
        title="公開ページの準備状況"
        description="未設定の項目を埋めると、支援者に伝わりやすいページになります。"
        readiness={publicReadiness}
        actions={[
          {
            label: "ファン目線で確認する ↗",
            href: publicProfileUrl,
            tone: "primary",
          },
        ]}
      />

      <ShareDraftCard
        displayName={workspace.displayName || workspace.meCreatorUsername}
        username={workspace.meCreatorUsername}
        profile={workspace.profile || null}
        goalTitle={workspace.aiSetupDraft.goalTitle}
        projectTitle={
          primarySummary?.project.title || workspace.aiSetupDraft.projectTitle || null
        }
        projectDescription={
          primarySummary?.project.description ||
          workspace.aiSetupDraft.projectDescription ||
          null
        }
        publicPageUrl={publicProfileUrl}
        progress={
          primarySummary
            ? {
                progressPct: primarySummary.progress.progressPct,
                confirmedAmount: primarySummary.progress.confirmedAmount,
                targetAmount: primarySummary.progress.targetAmount,
                currency: primarySummary.project.currency ?? "JPYC",
              }
            : null
        }
        onGenerated={() => {
          workspace.markLocalGrowthMilestone("shareDraftsGenerated");
          workspace.reportGrowthEvent({
            event: "share_drafts_generated",
            metadata: { publicPageUrl: publicProfileUrl },
          });
        }}
        onCopied={(channel) => {
          workspace.reportGrowthEvent({
            event: "share_copied",
            metadata: { channel },
          });
        }}
      />

      <ShareExecutionLogCard
        username={workspace.meCreatorUsername}
        walletAddress={workspace.address ?? null}
        projectId={shareLogProjectId}
        onLogged={() => {
          growthOverview.refresh();
        }}
      />

      {/* ── AIマネージャー・ウォレット設定 ── */}
      <CreatorSettingsAiManagerAccountSection />

      <CreatorSettingsSupportSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />

      <CreatorSettingsWalletSection />

      <CreatorReadyPostingSection projectOptions={postingProjectOptions} />
    </div>
  );
}
