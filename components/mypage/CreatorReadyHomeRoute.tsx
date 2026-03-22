"use client";

import dynamic from "next/dynamic";

import { CreatorReadyProjectHealthSection } from "@/components/mypage/CreatorReadyProjectHealthSection";
import { CreatorReadyWeeklySummarySection } from "@/components/mypage/CreatorReadyWeeklySummarySection";
import { WorkspaceLoadingCard, WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { hasCreatorReadySettlementAttention } from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyHomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import { useDailyActionPlanAutoTrigger } from "@/components/mypage/useDailyActionPlanAutoTrigger";
import { hasProjectSummary } from "@/lib/mypage/dashboardTypes";
import { AI_OFFICE_URL_PARAMS } from "@/components/mypage/aiOfficePanelUrlState";

const CreatorWorkspaceAiOfficePanel = dynamic(
  () =>
    import("@/components/mypage/CreatorWorkspaceAiOfficePanel").then(
      (mod) => mod.CreatorWorkspaceAiOfficePanel
    ),
  {
    loading: () => <WorkspaceLoadingCard title="AI事務所を読み込んでいます" />,
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

  useDailyActionPlanAutoTrigger({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: workspace.isConnected,
  });

  const isNewCreator =
    !homeStats.loadingPosting &&
    (homeStats.postCount ?? 1) === 0 &&
    goalMissing;

  const aiOfficeCreateHref =
    typeof window !== "undefined"
      ? (() => {
          const params = new URLSearchParams(window.location.search);
          params.set(AI_OFFICE_URL_PARAMS.view, "CREATE");
          params.set(AI_OFFICE_URL_PARAMS.role, "MANAGER");
          return `${window.location.pathname}?${params.toString()}#ai-office`;
        })()
      : "#ai-office";

  const setupDescription = profileMissing
    ? "まずプロフィール（名前・紹介文）を設定すると、支援者に伝わる公開ページの土台ができます。"
    : "支援を受け取るための目標金額がまだ設定されていません。設定・準備から整えましょう。";

  return (
    <div className="space-y-4">
      {dashboardError ? (
        <WorkspaceStatusNotice tone="error" title={dashboardError} />
      ) : null}
      {needsSetup && !settlementAttentionNeeded ? (
        <WorkspaceStatusNotice
          tone="attention"
          title="設定・準備を整えると、支援者に伝わるページになります"
          description={setupDescription}
        >
          <button
            type="button"
            onClick={props.onOpenSettings}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            設定・準備を開く
          </button>
        </WorkspaceStatusNotice>
      ) : null}
      {settlementAttentionNeeded ? (
        <WorkspaceStatusNotice
          tone="attention"
          title="精算が必要な状態のプロジェクトがあります"
          description="目標達成または精算対象のプロジェクトがあります。設定・準備から確認してください。"
        >
          <button
            type="button"
            onClick={props.onOpenSettings}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            設定・準備を開く
          </button>
        </WorkspaceStatusNotice>
      ) : null}
      {isNewCreator ? (
        <WorkspaceStatusNotice
          tone="attention"
          title="まずここから始めましょう"
          description="AI事務所があなたの最初の一歩をサポートします。プロフィールの改善案を作ってもらうところから始めてみましょう。"
        >
          <a
            href={aiOfficeCreateHref}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            AI事務所にはじめての一歩を相談する
          </a>
        </WorkspaceStatusNotice>
      ) : null}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4" id="ai-office">
        <div className="mb-3 text-sm font-semibold text-[var(--text)]">
          AI事務所
        </div>
        <CreatorWorkspaceAiOfficePanel />
      </div>
      <CreatorReadyWeeklySummarySection
        jpycTotal={homeStats.jpycTotal}
        usdcTotal={homeStats.usdcTotal}
        avgProgressPct={homeStats.avgProgressPct}
        postCount={homeStats.postCount}
        publishedCount={homeStats.publishedCount}
        loadingPosting={homeStats.loadingPosting}
      />
      <CreatorReadyProjectHealthSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
      />
    </div>
  );
}
