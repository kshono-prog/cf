"use client";

import dynamic from "next/dynamic";

import { CreatorReadyAiManagerSection } from "@/components/mypage/CreatorReadyAiManagerSection";
import { CreatorReadyDailyBriefingHero } from "@/components/mypage/CreatorReadyDailyBriefingHero";
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
import { useCreatorReadyPlannerTimeline } from "@/components/mypage/useCreatorReadyPlannerTimeline";
import { useCreatorReadyHomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import { useDailyActionPlanAutoTrigger } from "@/components/mypage/useDailyActionPlanAutoTrigger";
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

  const isNewCreator =
    !homeStats.loadingPosting &&
    (homeStats.postCount ?? 1) === 0 &&
    goalMissing;
  const aiOfficeSummary = useCreatorReadyHomeAiOfficeSummary({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: workspace.isConnected,
  });
  const planner = useCreatorReadyPlannerTimeline({
    address: workspace.address,
    isConnected: workspace.isConnected,
    limit: 6,
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
  const aiOfficeOverviewHref = buildAiOfficeHref({
    activeView: "OVERVIEW",
    selectedRoleId: "MANAGER",
    selectedInboxRoleId: null,
    openLatestTaskType: null,
  });
  const aiOfficeHref = isNewCreator ? aiOfficeCreateManagerHref : aiOfficeOverviewHref;
  const publicPageHref = `/${workspace.meCreatorUsername}`;

  const aiManagerCards = buildCreatorReadyAiManagerCards({
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
      <CreatorReadyUpcomingPlannerSection
        loading={planner.loading}
        error={planner.error}
        data={planner.data}
      />
      <CreatorWorkspaceAiOfficePanel />
      <CreatorReadyWeeklySummarySection
        jpycTotal={homeStats.jpycTotal}
        usdcTotal={homeStats.usdcTotal}
        avgProgressPct={homeStats.avgProgressPct}
        postCount={homeStats.postCount}
        publishedCount={homeStats.publishedCount}
        loadingPosting={homeStats.loadingPosting}
      />
    </div>
  );
}
