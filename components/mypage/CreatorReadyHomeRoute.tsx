"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AiConciergeGuideCard } from "@/components/mypage/AiConciergeGuideCard";
import { AiManagerTop3Section } from "@/components/mypage/AiManagerTop3Section";
import { deriveTop3Tasks } from "@/lib/aiManager/top3Tasks";
import { CreatorReadyAiManagerSection } from "@/components/mypage/CreatorReadyAiManagerSection";
import { CreatorReadyDailyBriefingHero } from "@/components/mypage/CreatorReadyDailyBriefingHero";
import { CreatorReadyGrowthReflectionSection } from "@/components/mypage/CreatorReadyGrowthReflectionSection";
import { GrowthCoachCard } from "@/components/mypage/GrowthCoachCard";
import { CreatorReadyManagerFeedSection } from "@/components/mypage/CreatorReadyManagerFeedSection";
import { CreatorReadyUpcomingPlannerSection } from "@/components/mypage/CreatorReadyUpcomingPlannerSection";
import { CreatorReadyProjectHealthSection } from "@/components/mypage/CreatorReadyProjectHealthSection";
import { CreatorReadyTodayThisWeekSection } from "@/components/mypage/CreatorReadyTodayThisWeekSection";
import { CreatorReadyWeeklySummarySection } from "@/components/mypage/CreatorReadyWeeklySummarySection";
import {
  buildCreatorReadyAiManagerCards,
  buildCreatorReadyTaskLists,
} from "@/components/mypage/creatorReadyHomeAiHelpers";
import { WorkspaceLoadingCard, WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { hasCreatorReadySettlementAttention } from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyHomeAiOfficeSummary } from "@/components/mypage/useCreatorReadyHomeAiOfficeSummary";
import { useCreatorReadyDailyBriefing } from "@/components/mypage/useCreatorReadyDailyBriefing";
import { useCreatorReadyGrowthReflection } from "@/components/mypage/useCreatorReadyGrowthReflection";
import { useCreatorGrowthOverview } from "@/components/mypage/useCreatorGrowthOverview";
import { useCreatorReadyManagerFeed } from "@/components/mypage/useCreatorReadyManagerFeed";
import { useCreatorReadyStage } from "@/components/mypage/useCreatorReadyStage";
import { useCreatorReadySupporterOverview } from "@/components/mypage/useCreatorReadySupporterOverview";
import { CreatorReadySupporterOverviewSection } from "@/components/mypage/CreatorReadySupporterOverviewSection";
import { useCreatorReadySupporterCrm } from "@/components/mypage/useCreatorReadySupporterCrm";
import { CreatorReadySupporterCrmSection } from "@/components/mypage/CreatorReadySupporterCrmSection";
import { CreatorReadyStageGrowthPlanSection } from "@/components/mypage/CreatorReadyStageGrowthPlanSection";
import { useCreatorReadyExpenses } from "@/components/mypage/useCreatorReadyExpenses";
import { CreatorReadyExpenseInputSection } from "@/components/mypage/CreatorReadyExpenseInputSection";
import { useCreatorReadyRevenueRecords } from "@/components/mypage/useCreatorReadyRevenueRecords";
import { CreatorReadyRevenueSection } from "@/components/mypage/CreatorReadyRevenueSection";
import { CreatorReadyCashflowHealthCard } from "@/components/mypage/CreatorReadyCashflowHealthCard";
import { CreatorReadyCashflowReportSection } from "@/components/mypage/CreatorReadyCashflowReportSection";
import { useMonthlyCashflowReportAutoTrigger } from "@/components/mypage/useMonthlyCashflowReportAutoTrigger";
import { useCreatorReadyPlannerTimeline } from "@/components/mypage/useCreatorReadyPlannerTimeline";
import { useCreatorReadyHomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import { useCreatorAiManagerAccount } from "@/components/mypage/useCreatorAiManagerAccount";
import { useDailyActionPlanAutoTrigger } from "@/components/mypage/useDailyActionPlanAutoTrigger";
import { useStageGrowthPlanAutoTrigger } from "@/components/mypage/useStageGrowthPlanAutoTrigger";
import { hasProjectSummary } from "@/lib/mypage/dashboardTypes";
import { buildGrowthCoachCard } from "@/lib/growth/coach";
import {
  buildAiOfficePanelHref,
  type AiOfficePanelUrlState,
} from "@/components/mypage/aiOfficePanelUrlState";
import { buildBasicProfileCompletion } from "@/lib/growth/setup";
import { deriveGrowthMeterScores } from "@/lib/gamification/growthMeter";
import { calcXp, calcLevel } from "@/lib/gamification/levelSystem";
import { calcDailyStreak } from "@/lib/gamification/streakCalc";
import { GrowthMeterDisplay } from "@/components/mypage/GrowthMeterDisplay";
import { TodayAchievementCard } from "@/components/mypage/TodayAchievementCard";
import { AiManagerStreakCard } from "@/components/mypage/AiManagerStreakCard";
import { useCreatorReadyFanEngagement } from "@/components/mypage/useCreatorReadyFanEngagement";
import { FanEngagementTimelineCard } from "@/components/mypage/FanEngagementTimelineCard";
import { FanEngagementHeatmapCard } from "@/components/mypage/FanEngagementHeatmapCard";
import { FanThankActionCard } from "@/components/mypage/FanThankActionCard";
import { AchievementCard } from "@/components/mypage/AchievementCard";
import { withBaseUrl } from "@/utils/baseUrl";

const CreatorWorkspaceAiOfficePanel = dynamic(
  () =>
    import("@/components/mypage/CreatorWorkspaceAiOfficePanel").then(
      (mod) => mod.CreatorWorkspaceAiOfficePanel
    ),
  {
    loading: () => <WorkspaceLoadingCard title="AIアシスタントを読み込んでいます" />,
  }
);

type Props = {
  onOpenSettings: () => void;
  workspaceBasePath: string;
};

export function CreatorReadyHomeRoute(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const searchParams = useSearchParams();
  const backgroundInsightsEnabled =
    workspace.isConnected && !workspace.isManualCheck;
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards("daily-work");

  const activeDashboards = (["JPYC", "USDC"] as const)
    .map((currency) => projectDashboardsByCurrency[currency])
    .filter(hasProjectSummary);

  const settlementAttentionNeeded =
    hasCreatorReadySettlementAttention(activeDashboards);

  const homeStats = useCreatorReadyHomeStats({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    projectDashboardsByCurrency,
  });

  const profileMissing = !workspace.displayName;
  const goalMissing =
    activeDashboards.length === 0 ||
    activeDashboards.some((d) => !d.summary.goal);
  const needsSetup = profileMissing || goalMissing;

  const localProjectId = workspace.localProjectId;
  const primaryDashboard =
    activeDashboards.find((dashboard) => dashboard.projectId === localProjectId) ??
    activeDashboards[0] ??
    null;

  useDailyActionPlanAutoTrigger({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: backgroundInsightsEnabled,
  });

  useStageGrowthPlanAutoTrigger({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: backgroundInsightsEnabled,
  });

  useMonthlyCashflowReportAutoTrigger({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: backgroundInsightsEnabled,
  });

  const isNewCreator =
    !homeStats.loadingPosting &&
    (homeStats.postCount ?? 1) === 0 &&
    goalMissing;
  const aiOfficeSummary = useCreatorReadyHomeAiOfficeSummary({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    projectId: localProjectId,
    isConnected: backgroundInsightsEnabled,
  });
  const aiManagerAccount = useCreatorAiManagerAccount({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const dailyBriefing = useCreatorReadyDailyBriefing({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const planner = useCreatorReadyPlannerTimeline({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
    limit: 6,
  });
  const managerFeed = useCreatorReadyManagerFeed({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
    limit: 4,
  });
  const growthReflection = useCreatorReadyGrowthReflection({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const growthOverview = useCreatorGrowthOverview({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
    enabled: backgroundInsightsEnabled,
  });
  const stageData = useCreatorReadyStage({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const supporterOverview = useCreatorReadySupporterOverview({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const supporterCrm = useCreatorReadySupporterCrm({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const { expenses, addExpense } = useCreatorReadyExpenses({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const { revenueRecords, addRevenueRecord } = useCreatorReadyRevenueRecords({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });
  const fanEngagement = useCreatorReadyFanEngagement({
    address: backgroundInsightsEnabled ? workspace.address : undefined,
    isConnected: backgroundInsightsEnabled,
  });

  function buildAiOfficeHref(state: AiOfficePanelUrlState): string {
    return buildAiOfficePanelHref({
      pathname: props.workspaceBasePath,
      hash: "#ai-office",
      currentSearchParams: new URLSearchParams(searchParams.toString()),
      state,
    });
  }

  const aiOfficeCreateManagerHref = buildAiOfficeHref({
    activeView: "CREATE",
    selectedRoleId: "MANAGER",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
  });
  const aiOfficeCreatePromotionHref = buildAiOfficeHref({
    activeView: "CREATE",
    selectedRoleId: "PROMOTION",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
  });
  const aiOfficeInboxHref = buildAiOfficeHref({
    activeView: "INBOX",
    selectedRoleId: "MANAGER",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
  });
  const aiOfficeCreateFanRelationHref = buildAiOfficeHref({
    activeView: "CREATE",
    selectedRoleId: "FAN_RELATION",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
  });
  const aiOfficeOverviewHref = buildAiOfficeHref({
    activeView: "OVERVIEW",
    selectedRoleId: "MANAGER",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
  });
  const aiOfficeCreateAgendaHref = buildAiOfficeHref({
    activeView: "CREATE",
    selectedRoleId: "MANAGER",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
    openCreateTaskType: "MEETING_AGENDA_DRAFT",
  });
  const aiOfficeCreateFinanceHref = buildAiOfficeHref({
    activeView: "CREATE",
    selectedRoleId: "FINANCE",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
    openCreateTaskType: "MONTHLY_CASHFLOW_REPORT",
  });
  const aiOfficeHref = isNewCreator ? aiOfficeCreateManagerHref : aiOfficeOverviewHref;
  const conciergeHref = profileMissing
    ? buildAiOfficeHref({
        activeView: "CREATE",
        selectedRoleId: "MANAGER",
        selectedInboxRoleId: null,
        openLatestTaskType: null,
        openCreateTaskType: "PROFILE_UPDATE_PROPOSAL",
      })
    : buildAiOfficeHref({
        activeView: "CREATE",
        selectedRoleId: "MANAGER",
        selectedInboxRoleId: null,
        openLatestTaskType: null,
        openCreateTaskType: "DAILY_ACTION_PLAN",
      });
  const conciergeCtaLabel = profileMissing
    ? "AIにプロフィール改善を相談する"
    : isNewCreator
      ? "AIに最初の一歩を相談する"
      : "AIに今日の進め方を相談する";

  const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const stageGrowthTask =
    aiOfficeSummary.tasks.find(
      (t) =>
        t.taskType === "STAGE_GROWTH_PLAN" &&
        (t.status === "WAITING_APPROVAL" || t.status === "APPROVED") &&
        t.createdAt.startsWith(currentYearMonth)
    ) ?? null;

  const cashflowReportTask =
    aiOfficeSummary.tasks.find(
      (t) =>
        t.taskType === "MONTHLY_CASHFLOW_REPORT" &&
        (t.status === "WAITING_APPROVAL" || t.status === "APPROVED") &&
        t.createdAt.startsWith(currentYearMonth)
    ) ?? null;
  const aiManagerCards = buildCreatorReadyAiManagerCards({
    tasks: aiOfficeSummary.tasks,
    usefulness: aiOfficeSummary.usefulness,
    contentSummary: aiOfficeSummary.contentSummary,
    dailyBriefing: dailyBriefing.data,
    profileMissing,
    goalMissing,
    settlementAttentionNeeded,
    avgProgressPct: homeStats.avgProgressPct,
    hrefs: {
      aiOfficeOverview: aiOfficeOverviewHref,
      aiOfficeInbox: aiOfficeInboxHref,
      aiOfficeInboxRole: (roleId) =>
        buildAiOfficeHref({
          activeView: "INBOX",
          selectedRoleId: "MANAGER",
          selectedInboxRoleId: roleId,
          openLatestTaskType: null,
        }),
      aiOfficeCreateManager: aiOfficeCreateManagerHref,
      aiOfficeCreatePromotion: aiOfficeCreatePromotionHref,
    },
  });

  const taskLists = buildCreatorReadyTaskLists({
    tasks: aiOfficeSummary.tasks,
    usefulness: aiOfficeSummary.usefulness,
    contentSummary: aiOfficeSummary.contentSummary,
    profileMissing,
    goalMissing,
    settlementAttentionNeeded,
    avgProgressPct: homeStats.avgProgressPct,
    hrefs: {
      aiOfficeOverview: aiOfficeOverviewHref,
      aiOfficeInbox: aiOfficeInboxHref,
      aiOfficeCreateManager: aiOfficeCreateManagerHref,
      aiOfficeCreatePromotion: aiOfficeCreatePromotionHref,
    },
  });
  const conciergePoints =
    taskLists.today.length > 0
      ? taskLists.today.slice(0, 3).map((item) => ({
          title: item.title,
          body: item.body,
        }))
      : [
          {
            title: "プロフィールの土台を整える",
            body: "紹介文や基本情報が見えると、公開ページと AI の提案が具体的になります。",
          },
          {
            title: "Goal を決める",
            body: "支援理由と目標が見えると、応援導線と日々の運営が整理しやすくなります。",
          },
          {
            title: "近況を1本出す",
            body: "最初の投稿があるだけで、活動が止まっていないことが伝わりやすくなります。",
          },
        ];
  const top3Tasks = deriveTop3Tasks({
    profileMissing,
    goalMissing,
    settlementAttentionNeeded,
    waitingApprovalCount: aiOfficeSummary.usefulness.waitingApprovalCount,
    postCount: homeStats.postCount,
    avgProgressPct: homeStats.avgProgressPct,
    hrefs: {
      settings: props.onOpenSettings,
      aiOfficeInbox: aiOfficeInboxHref,
      aiOfficeCreatePromotion: aiOfficeCreatePromotionHref,
      aiOfficeCreateManager: aiOfficeCreateManagerHref,
      publicProfile: withBaseUrl(workspace.meCreatorUsername),
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

  const growthCoach = buildGrowthCoachCard({
    workspaceBasePath: props.workspaceBasePath,
    publicProfileUrl: withBaseUrl(workspace.meCreatorUsername),
    basicProfileCompleted: basicProfileState.complete,
    projectCreated: activeDashboards.length > 0,
    goalSaved: !goalMissing,
    publicPageViewedByOwner:
      workspace.localGrowthMilestones.publicPageViewedByOwner,
    shareDraftsGenerated: workspace.localGrowthMilestones.shareDraftsGenerated,
    growthOverview: growthOverview.data,
    goalHref: "#goal-input-jpyc",
  });

  return (
    <div className="space-y-4">
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      {(isNewCreator || needsSetup) ? (
        <AiConciergeGuideCard
          title={
            isNewCreator
              ? "AIコンシェルジュと最初の一歩を決める"
              : "AIコンシェルジュが公開準備を支援します"
          }
          body={
            isNewCreator
              ? "AI Office は、プロフィール、Goal、最初の投稿づくりを“今どこから始めるか”の順で案内できます。"
              : "公開ページ、支援導線、日々の運営で迷いやすいところを、AI Office がコンシェルジュのように整理して支援します。"
          }
          points={conciergePoints}
        >
          <Link href={conciergeHref} className="btn">
            {conciergeCtaLabel}
          </Link>
          <button
            type="button"
            className="text-xs text-[var(--text-subtle)] hover:text-[var(--text)] underline-offset-2 hover:underline transition-colors"
            onClick={props.onOpenSettings}
          >
            詳細設定を開く
          </button>
        </AiConciergeGuideCard>
      ) : null}
      <AiManagerTop3Section
        tasks={top3Tasks}
        loading={aiOfficeSummary.loading || homeStats.loadingPosting}
        onOpenSettings={props.onOpenSettings}
        inlineContext={{
          address: workspace.address,
          username: workspace.meCreatorUsername,
          displayName: workspace.displayName,
          profile: workspace.profile,
          projectId: localProjectId,
          publicPageUrl: withBaseUrl(workspace.meCreatorUsername),
        }}
      />
      <CreatorReadyDailyBriefingHero
        creatorName={workspace.displayName || workspace.meCreatorUsername}
        aiOfficeHref={aiOfficeHref}
        primaryDashboard={primaryDashboard}
        avgProgressPct={homeStats.avgProgressPct}
        postCount={homeStats.postCount}
        publishedCount={homeStats.publishedCount}
        needsSetup={needsSetup}
        profileMissing={profileMissing}
        goalMissing={goalMissing}
        settlementAttentionNeeded={settlementAttentionNeeded}
        isNewCreator={isNewCreator}
        dailyBriefing={dailyBriefing.data}
        onOpenSettings={props.onOpenSettings}
      />
      <GrowthCoachCard coach={growthCoach} />
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
      <CreatorReadyProjectHealthSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        onOpenSettings={props.onOpenSettings}
      />
      <CreatorReadyAiManagerSection
        loading={aiOfficeSummary.loading}
        cards={aiManagerCards}
        account={aiManagerAccount.account}
        accountLoading={aiManagerAccount.loading}
        accountError={aiManagerAccount.error}
        onOpenSettings={props.onOpenSettings}
      />
      <CreatorReadyTodayThisWeekSection
        loading={aiOfficeSummary.loading}
        today={taskLists.today}
        week={taskLists.week}
        onOpenSettings={props.onOpenSettings}
      />
      <CreatorReadyManagerFeedSection
        loading={managerFeed.loading}
        error={managerFeed.error}
        data={managerFeed.data}
      />
      <CreatorReadyUpcomingPlannerSection
        loading={planner.loading}
        error={planner.error}
        data={planner.data}
        agendaCreateHref={aiOfficeCreateAgendaHref}
      />
      <CreatorReadyGrowthReflectionSection
        loading={growthReflection.loading}
        error={growthReflection.error}
        data={growthReflection.data}
      />
      <CreatorReadySupporterOverviewSection
        loading={supporterOverview.loading}
        error={supporterOverview.error}
        data={supporterOverview.data}
        aiOfficeCreateFanRelationHref={aiOfficeCreateFanRelationHref}
      />
      <FanEngagementTimelineCard
        loading={fanEngagement.loading}
        error={fanEngagement.error}
        data={fanEngagement.data}
      />
      <FanEngagementHeatmapCard
        heatmap={fanEngagement.data?.heatmap ?? null}
        peakWeekday={fanEngagement.data?.peakWeekday ?? null}
      />
      <FanThankActionCard
        thankNeededCount={fanEngagement.data?.thankNeededCount ?? 0}
        projectId={localProjectId}
        workspaceBasePath={props.workspaceBasePath}
      />
      <CreatorReadySupporterCrmSection data={supporterCrm.data} />
      <CreatorReadyStageGrowthPlanSection
        task={stageGrowthTask}
        address={workspace.address}
      />
      <CreatorReadyRevenueSection
        address={workspace.address ?? null}
        revenueRecords={revenueRecords}
        expenses={expenses}
        onRevenueAdded={addRevenueRecord}
      />
      <CreatorReadyCashflowHealthCard
        revenueRecords={revenueRecords}
        expenses={expenses}
        aiOfficeFinanceHref={aiOfficeCreateFinanceHref}
      />
      <CreatorReadyCashflowReportSection
        task={cashflowReportTask}
        address={workspace.address}
      />
      <CreatorReadyExpenseInputSection
        address={workspace.address ?? null}
        expenses={expenses}
        onExpenseAdded={addExpense}
      />
      <CreatorWorkspaceAiOfficePanel />
      <CreatorReadyWeeklySummarySection
        jpycTotal={homeStats.jpycTotal}
        usdcTotal={homeStats.usdcTotal}
        avgProgressPct={homeStats.avgProgressPct}
        postCount={homeStats.postCount}
        publishedCount={homeStats.publishedCount}
        loadingPosting={homeStats.loadingPosting}
        stage={stageData.data}
      />
    </div>
  );
}
