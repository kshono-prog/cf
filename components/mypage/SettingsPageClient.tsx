"use client";

import dynamic from "next/dynamic";

import { AiProfileDraftCard } from "@/components/mypage/AiProfileDraftCard";
import { CreatorPublicLinkSection } from "@/components/mypage/CreatorPublicLinkSection";
import { GrowthCoachCard } from "@/components/mypage/GrowthCoachCard";
import { NextBestActionCard } from "@/components/mypage/NextBestActionCard";
import {
  useCreatorReadyWorkspace,
  type CreatorReadyWorkspaceShellProps,
} from "@/components/mypage/CreatorReadyWorkspaceContext";
import { GrowthOverviewCard } from "@/components/mypage/GrowthOverviewCard";
import { CreatorReadyPostingSection } from "@/components/mypage/CreatorReadyPostingSection";
import { CreatorSettingsAiManagerAccountSection } from "@/components/mypage/CreatorSettingsAiManagerAccountSection";
import { CreatorSettingsBasicInfoSection } from "@/components/mypage/CreatorSettingsBasicInfoSection";
import { CreatorSettingsHeaderSection } from "@/components/mypage/CreatorSettingsHeaderSection";
import { CreatorSettingsSupportSection } from "@/components/mypage/CreatorSettingsSupportSection";
import { CreatorSettingsWalletSection } from "@/components/mypage/CreatorSettingsWalletSection";
import { CreatorWorkspaceProjectManagementBlocks } from "@/components/mypage/CreatorWorkspaceProjectManagementBlocks";
import { MyPageAccordion } from "@/components/mypage/MyPageAccordion";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { SetupProgressCard } from "@/components/mypage/SetupProgressCard";
import { ShareDraftCard } from "@/components/mypage/ShareDraftCard";
import { ShareExecutionLogCard } from "@/components/mypage/ShareExecutionLogCard";
import { useCreatorGrowthOverview } from "@/components/mypage/useCreatorGrowthOverview";
import { WorkspaceLoadingCard } from "@/components/mypage/WorkspaceFeedback";
import { buildGrowthCoachCard } from "@/lib/growth/coach";
import { useCreatorReadyPublicWorkspaceData } from "@/components/mypage/useCreatorReadyPublicWorkspaceData";
import {
  buildBasicProfileCompletion,
  buildProfilePreviewMissingHints,
  buildSetupNextBestAction,
  buildSetupProgressState,
  mergeSetupProgressInputWithGrowthOverview,
} from "@/lib/growth/setup";
import { withBaseUrl } from "@/utils/baseUrl";

const CreatorAdvancedSettingsSection = dynamic(
  () =>
    import("@/components/mypage/CreatorAdvancedSettingsSection").then(
      (mod) => mod.CreatorAdvancedSettingsSection
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="精算・詳細設定を読み込んでいます" />
    ),
  }
);

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
    publicPageViewedByOwner:
      workspace.localGrowthMilestones.publicPageViewedByOwner,
    shareDraftsGenerated:
      workspace.localGrowthMilestones.shareDraftsGenerated,
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

      <GrowthOverviewCard
        loading={growthOverview.loading}
        error={growthOverview.error}
        data={growthOverview.data}
      />

      <CreatorPublicLinkSection
        username={workspace.meCreatorUsername}
        localProjectId={workspace.localProjectId}
      />

      <CreatorSettingsBasicInfoSection
        assistantSection={aiAssistant}
        missingSetupHints={basicInfoHints}
      />

      <CreatorSettingsAiManagerAccountSection />

      <CreatorSettingsSupportSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />

      <section id="project-setup" className="surface-card p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">
            公開ページに載せる Project と Goal
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-subtle)]">
            何を支援してもらうのか、いくらを目標にするのかを順番に整えます。
          </p>
        </div>
        <div className="mt-4">
          <CreatorWorkspaceProjectManagementBlocks
            projectDashboardsByCurrency={projectDashboardsByCurrency}
          />
        </div>
      </section>

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
            metadata: {
              publicPageUrl: publicProfileUrl,
            },
          });
        }}
        onCopied={(channel) => {
          workspace.reportGrowthEvent({
            event: "share_copied",
            metadata: {
              channel,
            },
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

      <CreatorSettingsWalletSection />

      <CreatorReadyPostingSection projectOptions={postingProjectOptions} />

      <MyPageAccordion
        open={workspace.openSections}
        onToggle={workspace.onToggleSection}
        sectionKey="flow"
        title="詳細管理"
      >
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-semibold text-[var(--text)]">
            Summary / Distribution / 精算
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            試験中
          </span>
        </div>
        <CreatorAdvancedSettingsSection
          projectDashboardsByCurrency={projectDashboardsByCurrency}
        />
      </MyPageAccordion>
    </div>
  );
}
