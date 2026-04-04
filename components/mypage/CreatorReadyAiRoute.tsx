"use client";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyHomeAiOfficeSummary } from "@/components/mypage/useCreatorReadyHomeAiOfficeSummary";
import { useCreatorAiManagerAccount } from "@/components/mypage/useCreatorAiManagerAccount";
import { useCreatorReadyStage } from "@/components/mypage/useCreatorReadyStage";
import { useCreatorReadyHomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import { GrowthMeterDisplay } from "@/components/mypage/GrowthMeterDisplay";
import { TodayAchievementCard } from "@/components/mypage/TodayAchievementCard";
import { AiManagerStreakCard } from "@/components/mypage/AiManagerStreakCard";
import { AchievementCard } from "@/components/mypage/AchievementCard";
import { CreatorReadyAiManagerSection } from "@/components/mypage/CreatorReadyAiManagerSection";
import { useCreatorGrowthOverview } from "@/components/mypage/useCreatorGrowthOverview";
import { AiOfficeManagementSection } from "@/components/mypage/AiOfficeManagementSection";
import {
  buildCreatorReadyAiManagerCards,
} from "@/components/mypage/creatorReadyHomeAiHelpers";
import { hasProjectSummary } from "@/lib/mypage/dashboardTypes";
import { deriveGrowthMeterScores } from "@/lib/gamification/growthMeter";
import { calcXp, calcLevel } from "@/lib/gamification/levelSystem";
import { calcDailyStreak } from "@/lib/gamification/streakCalc";
import { buildBasicProfileCompletion } from "@/lib/growth/setup";

type Props = {
  onOpenSettings: () => void;
};

export function CreatorReadyAiRoute({ onOpenSettings }: Props) {
  const workspace = useCreatorReadyWorkspace();
  const isActive = workspace.isConnected && !workspace.isManualCheck;
  const localProjectId = workspace.localProjectId;

  const { projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards("ai-office");

  const activeDashboards = (["JPYC", "USDC"] as const)
    .map((c) => projectDashboardsByCurrency[c])
    .filter(hasProjectSummary);

  const homeStats = useCreatorReadyHomeStats({
    address: isActive ? workspace.address : undefined,
    projectDashboardsByCurrency,
  });

  const aiOfficeSummary = useCreatorReadyHomeAiOfficeSummary({
    address: isActive ? workspace.address : undefined,
    projectId: localProjectId,
    isConnected: isActive,
  });

  const aiManagerAccount = useCreatorAiManagerAccount({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const stageData = useCreatorReadyStage({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const growthOverview = useCreatorGrowthOverview({
    address: workspace.address,
    isConnected: workspace.isConnected,
    enabled: isActive,
  });

  const profileMissing = !workspace.displayName;
  const goalMissing =
    activeDashboards.length === 0 ||
    activeDashboards.some((d) => !d.summary.goal);

  const aiOfficeInboxHref = `#ai-office`;
  const aiOfficeOverviewHref = `#ai-office`;
  const aiOfficeCreateManagerHref = `#ai-office`;
  const aiOfficeCreatePromotionHref = `#ai-office`;

  const aiManagerCards = buildCreatorReadyAiManagerCards({
    tasks: aiOfficeSummary.tasks,
    usefulness: aiOfficeSummary.usefulness,
    contentSummary: aiOfficeSummary.contentSummary,
    dailyBriefing: null,
    profileMissing,
    goalMissing,
    settlementAttentionNeeded: false,
    avgProgressPct: homeStats.avgProgressPct,
    hrefs: {
      aiOfficeOverview: aiOfficeOverviewHref,
      aiOfficeInbox: aiOfficeInboxHref,
      aiOfficeInboxRole: () => aiOfficeInboxHref,
      aiOfficeCreateManager: aiOfficeCreateManagerHref,
      aiOfficeCreatePromotion: aiOfficeCreatePromotionHref,
    },
  });

  const basicProfileState = buildBasicProfileCompletion({
    displayName: workspace.displayName,
    profile: workspace.profile,
    avatarUrl: workspace.avatarUrl,
    socials: workspace.socials,
  });
  const approvedTaskCount = aiOfficeSummary.tasks.filter(
    (t) => t.status === "APPROVED"
  ).length;
  const growthMeterScores = deriveGrowthMeterScores({
    stageData: stageData.data,
    basicProfileComplete: basicProfileState.complete,
    hasProject: activeDashboards.length > 0,
    hasGoal: !goalMissing,
    approvedTaskCount,
  });
  const levelInfo = calcLevel(calcXp(growthMeterScores));
  const streakInfo = calcDailyStreak(
    aiOfficeSummary.tasks
      .filter((t) => t.status === "APPROVED")
      .map((t) => t.approvedAt)
  );

  return (
    <div className="space-y-4">
      {/* ── AI提案カード ── */}
      <CreatorReadyAiManagerSection
        loading={aiOfficeSummary.loading}
        cards={aiManagerCards}
        account={aiManagerAccount.account}
        accountLoading={aiManagerAccount.loading}
        accountError={aiManagerAccount.error}
        onOpenSettings={onOpenSettings}
      />

      {/* ── AI Office パネル（概要・相談・承認） ── */}
      <AiOfficeManagementSection
        walletAddress={workspace.address ?? null}
        projectId={localProjectId}
        isConnected={workspace.isConnected}
        initialUrlState={workspace.initialAiOfficeUrlState}
      />

      {/* ── AI成長・達成・ストリーク ── */}
      <TodayAchievementCard
        levelInfo={levelInfo}
        displayName={workspace.displayName}
      />
      <AiManagerStreakCard streak={streakInfo} />
      <GrowthMeterDisplay scores={growthMeterScores} />
      <AchievementCard
        displayName={workspace.displayName}
        username={workspace.meCreatorUsername}
        growthOverview={growthOverview.data}
        approvedTaskCount={approvedTaskCount}
        postCount={homeStats.postCount}
        activityReportHref={`/${workspace.meCreatorUsername}/activity-report`}
      />
    </div>
  );
}
