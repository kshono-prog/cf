"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

import { AiConciergeGuideCard } from "@/components/mypage/AiConciergeGuideCard";
import { AiManagerTop3Section } from "@/components/mypage/AiManagerTop3Section";
import { deriveTop3Tasks } from "@/lib/aiManager/top3Tasks";
import { CreatorReadyDailyBriefingHero } from "@/components/mypage/CreatorReadyDailyBriefingHero";
import { GrowthCoachCard } from "@/components/mypage/GrowthCoachCard";
import { CreatorReadyManagerFeedSection } from "@/components/mypage/CreatorReadyManagerFeedSection";
import { CreatorReadyUpcomingPlannerSection } from "@/components/mypage/CreatorReadyUpcomingPlannerSection";
import { CreatorReadyProjectHealthSection } from "@/components/mypage/CreatorReadyProjectHealthSection";
import { CreatorReadyTodayThisWeekSection } from "@/components/mypage/CreatorReadyTodayThisWeekSection";
import { buildCreatorReadyTaskLists } from "@/components/mypage/creatorReadyHomeAiHelpers";
import { WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { mapWorkspaceActionError } from "@/lib/mypage/workspaceActionCopy";
import { hasCreatorReadySettlementAttention } from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyHomeAiOfficeSummary } from "@/components/mypage/useCreatorReadyHomeAiOfficeSummary";
import { useCreatorReadyDailyBriefing } from "@/components/mypage/useCreatorReadyDailyBriefing";
import { useCreatorReadyManagerFeed } from "@/components/mypage/useCreatorReadyManagerFeed";
import { useCreatorReadyPlannerTimeline } from "@/components/mypage/useCreatorReadyPlannerTimeline";
import { useCreatorReadyHomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import { useDailyActionPlanAutoTrigger } from "@/components/mypage/useDailyActionPlanAutoTrigger";
import { hasProjectSummary } from "@/lib/mypage/dashboardTypes";
import { buildGrowthCoachCard } from "@/lib/growth/coach";
import {
  buildAiOfficePanelHref,
  type AiOfficePanelUrlState,
} from "@/components/mypage/aiOfficePanelUrlState";
import { withBaseUrl } from "@/utils/baseUrl";

type Props = {
  onOpenSettings: () => void;
  workspaceBasePath: string;
};

export function CreatorReadyHomeRoute(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const router = useRouter();
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
    activeDashboards.find((d) => d.projectId === localProjectId) ??
    activeDashboards[0] ??
    null;

  useDailyActionPlanAutoTrigger({
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

  // ── href builders ──────────────────────────────────────────────────────────

  function buildAiOfficeHref(state: AiOfficePanelUrlState): string {
    return buildAiOfficePanelHref({
      pathname: `${props.workspaceBasePath}/ai-office`,
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

  const growthCoach = buildGrowthCoachCard({
    workspaceBasePath: props.workspaceBasePath,
    publicProfileUrl: withBaseUrl(workspace.meCreatorUsername),
    basicProfileCompleted: Boolean(workspace.displayName),
    projectCreated: activeDashboards.length > 0,
    goalSaved: !goalMissing,
    publicPageViewedByOwner: workspace.localGrowthMilestones.publicPageViewedByOwner,
    shareDraftsGenerated: workspace.localGrowthMilestones.shareDraftsGenerated,
    growthOverview: null,
    goalHref: "#goal-input-jpyc",
  });

  const dashboardErrorNotice = dashboardError
    ? mapWorkspaceActionError(dashboardError, "運営データの取得に失敗しました。")
    : null;
  const aiOfficeSummaryNotice = aiOfficeSummary.error
    ? mapWorkspaceActionError(aiOfficeSummary.error, "AIアシスタントの状況を取得できませんでした。")
    : null;
  const dailyBriefingNotice = dailyBriefing.error
    ? mapWorkspaceActionError(dailyBriefing.error, "今日のまとめを取得できませんでした。")
    : null;

  const navigateToTab = (path: string) =>
    router.push(`${props.workspaceBasePath}/${path}`, { scroll: true });

  return (
    <div className="space-y-4">
      {/* ── エラー通知 ── */}
      {dashboardErrorNotice ? (
        <WorkspaceStatusNotice
          tone={dashboardErrorNotice.tone}
          title={dashboardErrorNotice.title}
          description={dashboardErrorNotice.description}
        />
      ) : null}
      {aiOfficeSummaryNotice ? (
        <WorkspaceStatusNotice
          tone={aiOfficeSummaryNotice.tone}
          title={aiOfficeSummaryNotice.title}
          description={aiOfficeSummaryNotice.description}
        />
      ) : null}
      {dailyBriefingNotice ? (
        <WorkspaceStatusNotice
          tone={dailyBriefingNotice.tone}
          title={dailyBriefingNotice.title}
          description={dailyBriefingNotice.description}
        />
      ) : null}

      {/* ── 新規・セットアップ中ガイド ── */}
      {(isNewCreator || needsSetup) ? (
        <AiConciergeGuideCard
          title={
            isNewCreator
              ? "AIコンシェルジュと最初の一歩を決める"
              : "AIコンシェルジュが公開準備を支援します"
          }
          body={
            isNewCreator
              ? "AI Office は、プロフィール、Goal、最初の投稿づくりを「今どこから始めるか」の順で案内できます。"
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

      {/* ── 今日やること（Top3） ── */}
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

      {/* ── 今日のブリーフィング ── */}
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

      {/* ── プロジェクト状況 ── */}
      <CreatorReadyProjectHealthSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        onOpenSettings={props.onOpenSettings}
      />

      {/* ── 次のアクション ── */}
      <GrowthCoachCard coach={growthCoach} />

      {/* ── 今日・今週のタスク ── */}
      <CreatorReadyTodayThisWeekSection
        loading={aiOfficeSummary.loading}
        today={taskLists.today}
        week={taskLists.week}
        onOpenSettings={props.onOpenSettings}
      />

      {/* ── マネージャーフィード ── */}
      <CreatorReadyManagerFeedSection
        loading={managerFeed.loading}
        error={managerFeed.error}
        data={managerFeed.data}
      />

      {/* ── 予定・プランナー ── */}
      <CreatorReadyUpcomingPlannerSection
        loading={planner.loading}
        error={planner.error}
        data={planner.data}
        agendaCreateHref={aiOfficeCreateAgendaHref}
      />

      {/* ── 他タブへのナビゲーション ── */}
      <div className="border-t border-[var(--line)] pt-4">
        <p className="section-kicker mb-3">機能を開く</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { view: "project",   icon: "📊", label: "プロジェクト" },
              { view: "ai-office", icon: "🤖", label: "AIオフィス" },
              { view: "fans",      icon: "💙", label: "ファン" },
            ] as const
          ).map(({ view, icon, label }) => (
            <button
              key={view}
              type="button"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3.5 text-xs font-medium text-[var(--text-subtle)] hover:border-[var(--accent-muted)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] transition-colors"
              onClick={() => navigateToTab(view)}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
