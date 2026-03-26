"use client";

import dynamic from "next/dynamic";

import { CreatorReadyAiManagerSection } from "@/components/mypage/CreatorReadyAiManagerSection";
import { CreatorReadyDailyBriefingHero } from "@/components/mypage/CreatorReadyDailyBriefingHero";
import { CreatorReadyGrowthReflectionSection } from "@/components/mypage/CreatorReadyGrowthReflectionSection";
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
import { useCreatorReadyManagerFeed } from "@/components/mypage/useCreatorReadyManagerFeed";
import { useCreatorReadyStage } from "@/components/mypage/useCreatorReadyStage";
import { useCreatorReadySupporterOverview } from "@/components/mypage/useCreatorReadySupporterOverview";
import { CreatorReadySupporterOverviewSection } from "@/components/mypage/CreatorReadySupporterOverviewSection";
import { useCreatorReadySupporterCrm } from "@/components/mypage/useCreatorReadySupporterCrm";
import { CreatorReadySupporterCrmSection } from "@/components/mypage/CreatorReadySupporterCrmSection";
import { CreatorReadyStageGrowthPlanSection } from "@/components/mypage/CreatorReadyStageGrowthPlanSection";
import { useCreatorReadyPlannerTimeline } from "@/components/mypage/useCreatorReadyPlannerTimeline";
import { useCreatorReadyHomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import { useDailyActionPlanAutoTrigger } from "@/components/mypage/useDailyActionPlanAutoTrigger";
import { useStageGrowthPlanAutoTrigger } from "@/components/mypage/useStageGrowthPlanAutoTrigger";
import { hasProjectSummary } from "@/lib/mypage/dashboardTypes";
import {
  buildAiOfficePanelHref,
  type AiOfficePanelUrlState,
} from "@/components/mypage/aiOfficePanelUrlState";

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
};

export function CreatorReadyHomeRoute(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards("daily-work");

  const activeDashboards = (["JPYC", "USDC"] as const)
    .map((currency) => projectDashboardsByCurrency[currency])
    .filter(hasProjectSummary);

  const settlementAttentionNeeded =
    hasCreatorReadySettlementAttention(activeDashboards);

  const homeStats = useCreatorReadyHomeStats({
    address: workspace.address,
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
    isConnected: workspace.isConnected,
  });

  useStageGrowthPlanAutoTrigger({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: workspace.isConnected,
  });

  const isNewCreator =
    !homeStats.loadingPosting &&
    (homeStats.postCount ?? 1) === 0 &&
    goalMissing;
  const aiOfficeSummary = useCreatorReadyHomeAiOfficeSummary({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: workspace.isConnected,
  });
  const dailyBriefing = useCreatorReadyDailyBriefing({
    address: workspace.address,
    isConnected: workspace.isConnected,
  });
  const planner = useCreatorReadyPlannerTimeline({
    address: workspace.address,
    isConnected: workspace.isConnected,
    limit: 6,
  });
  const managerFeed = useCreatorReadyManagerFeed({
    address: workspace.address,
    isConnected: workspace.isConnected,
    limit: 4,
  });
  const growthReflection = useCreatorReadyGrowthReflection({
    address: workspace.address,
    isConnected: workspace.isConnected,
  });
  const stageData = useCreatorReadyStage({
    address: workspace.address,
    isConnected: workspace.isConnected,
  });
  const supporterOverview = useCreatorReadySupporterOverview({
    address: workspace.address,
    isConnected: workspace.isConnected,
  });
  const supporterCrm = useCreatorReadySupporterCrm({
    address: workspace.address,
    isConnected: workspace.isConnected,
  });

  function buildAiOfficeHref(state: AiOfficePanelUrlState): string {
    if (typeof window === "undefined") {
      return "#ai-office";
    }
    return buildAiOfficePanelHref({
      pathname: window.location.pathname,
      hash: "#ai-office",
      currentSearchParams: new URLSearchParams(window.location.search),
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
  const aiOfficeHref = isNewCreator ? aiOfficeCreateManagerHref : aiOfficeOverviewHref;

  const currentYearMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const stageGrowthTask =
    aiOfficeSummary.tasks.find(
      (t) =>
        t.taskType === "STAGE_GROWTH_PLAN" &&
        (t.status === "WAITING_APPROVAL" || t.status === "APPROVED") &&
        t.createdAt.startsWith(currentYearMonth)
    ) ?? null;
  const publicPageHref = `/${workspace.meCreatorUsername}`;

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

  return (
    <div className="space-y-4">
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      <CreatorReadyDailyBriefingHero
        creatorName={workspace.displayName || workspace.meCreatorUsername}
        publicPageHref={publicPageHref}
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
      <CreatorReadyProjectHealthSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        onOpenSettings={props.onOpenSettings}
      />
      <CreatorReadyAiManagerSection
        loading={aiOfficeSummary.loading}
        cards={aiManagerCards}
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
      <CreatorReadySupporterCrmSection data={supporterCrm.data} />
      <CreatorReadyStageGrowthPlanSection
        task={stageGrowthTask}
        address={workspace.address}
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
