"use client";

import dynamic from "next/dynamic";

import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyWorkspaceProjectDashboards } from "@/components/mypage/useCreatorReadyWorkspaceProjectDashboards";
import { useCreatorReadyExpenses } from "@/components/mypage/useCreatorReadyExpenses";
import { useCreatorReadyRevenueRecords } from "@/components/mypage/useCreatorReadyRevenueRecords";
import { useMonthlyCashflowReportAutoTrigger } from "@/components/mypage/useMonthlyCashflowReportAutoTrigger";
import { useCreatorReadyStage } from "@/components/mypage/useCreatorReadyStage";
import { useCreatorReadyHomeStats } from "@/components/mypage/useCreatorReadyHomeStats";
import { useCreatorReadyPublicWorkspaceData } from "@/components/mypage/useCreatorReadyPublicWorkspaceData";
import { useCreatorReadyHomeAiOfficeSummary } from "@/components/mypage/useCreatorReadyHomeAiOfficeSummary";
import { useStageGrowthPlanAutoTrigger } from "@/components/mypage/useStageGrowthPlanAutoTrigger";
import { CreatorReadyProjectHealthSection } from "@/components/mypage/CreatorReadyProjectHealthSection";
import { CreatorReadyCashflowHealthCard } from "@/components/mypage/CreatorReadyCashflowHealthCard";
import { CreatorReadyRevenueSection } from "@/components/mypage/CreatorReadyRevenueSection";
import { CreatorReadyExpenseInputSection } from "@/components/mypage/CreatorReadyExpenseInputSection";
import { CreatorReadyCashflowReportSection } from "@/components/mypage/CreatorReadyCashflowReportSection";
import { CreatorReadyStageGrowthPlanSection } from "@/components/mypage/CreatorReadyStageGrowthPlanSection";
import { CreatorReadyWeeklySummarySection } from "@/components/mypage/CreatorReadyWeeklySummarySection";
import { CreatorWorkspaceProjectManagementBlocks } from "@/components/mypage/CreatorWorkspaceProjectManagementBlocks";
import { MyPageAccordion } from "@/components/mypage/MyPageAccordion";
import { WorkspaceLoadingCard, WorkspaceStatusNotice } from "@/components/mypage/WorkspaceFeedback";
import { hasProjectSummary } from "@/lib/mypage/dashboardTypes";

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

type Props = {
  onOpenSettings: () => void;
};

export function CreatorReadyProjectRoute({ onOpenSettings }: Props) {
  const workspace = useCreatorReadyWorkspace();
  const isActive = workspace.isConnected && !workspace.isManualCheck;

  const { dashboardError, projectDashboardsByCurrency } =
    useCreatorReadyWorkspaceProjectDashboards("project");

  useCreatorReadyPublicWorkspaceData("project");

  const localProjectId = workspace.localProjectId;

  const homeStats = useCreatorReadyHomeStats({
    address: isActive ? workspace.address : undefined,
    projectDashboardsByCurrency,
  });

  const aiOfficeSummary = useCreatorReadyHomeAiOfficeSummary({
    address: isActive ? workspace.address : undefined,
    projectId: localProjectId,
    isConnected: isActive,
  });

  const stageData = useCreatorReadyStage({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const { expenses, addExpense } = useCreatorReadyExpenses({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  const { revenueRecords, addRevenueRecord } = useCreatorReadyRevenueRecords({
    address: isActive ? workspace.address : undefined,
    isConnected: isActive,
  });

  useStageGrowthPlanAutoTrigger({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: isActive,
  });

  useMonthlyCashflowReportAutoTrigger({
    address: workspace.address,
    projectId: localProjectId,
    isConnected: isActive,
  });

  const currentYearMonth = new Date().toISOString().slice(0, 7);
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

  const activeDashboards = (["JPYC", "USDC"] as const)
    .map((c) => projectDashboardsByCurrency[c])
    .filter(hasProjectSummary);

  // AI finance href for cashflow card
  const aiOfficeFinanceHref = `${workspace.isConnected ? "" : "#"}#ai-office`;

  return (
    <div className="space-y-4">
      {dashboardError ? (
        <WorkspaceStatusNotice
          tone="error"
          title="プロジェクトデータの取得に失敗しました"
        />
      ) : null}

      {/* ── プロジェクト状況 ── */}
      <CreatorReadyProjectHealthSection
        projectDashboardsByCurrency={projectDashboardsByCurrency}
        onOpenSettings={onOpenSettings}
      />

      {/* ── Project / Goal 設定 ── */}
      {activeDashboards.length === 0 ? (
        <section id="project-setup" className="surface-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[var(--text)]">
            Project と Goal を設定する
          </h2>
          <p className="mt-1 text-sm text-[var(--text-subtle)]">
            何を支援してもらうのか、いくらを目標にするのかを決めましょう。
          </p>
          <div className="mt-4">
            <CreatorWorkspaceProjectManagementBlocks
              projectDashboardsByCurrency={projectDashboardsByCurrency}
            />
          </div>
        </section>
      ) : null}

      {/* ── 収支ヘルス ── */}
      <CreatorReadyCashflowHealthCard
        revenueRecords={revenueRecords}
        expenses={expenses}
        aiOfficeFinanceHref={aiOfficeFinanceHref}
      />

      {/* ── 収益・経費 ── */}
      <CreatorReadyRevenueSection
        address={workspace.address ?? null}
        revenueRecords={revenueRecords}
        expenses={expenses}
        onRevenueAdded={addRevenueRecord}
      />
      <CreatorReadyExpenseInputSection
        address={workspace.address ?? null}
        expenses={expenses}
        onExpenseAdded={addExpense}
      />

      {/* ── AI財務レポート・成長プラン ── */}
      <CreatorReadyCashflowReportSection
        task={cashflowReportTask}
        address={workspace.address}
      />
      <CreatorReadyStageGrowthPlanSection
        task={stageGrowthTask}
        address={workspace.address}
      />

      {/* ── 週次サマリー ── */}
      <CreatorReadyWeeklySummarySection
        jpycTotal={homeStats.jpycTotal}
        usdcTotal={homeStats.usdcTotal}
        avgProgressPct={homeStats.avgProgressPct}
        postCount={homeStats.postCount}
        publishedCount={homeStats.publishedCount}
        loadingPosting={homeStats.loadingPosting}
        stage={stageData.data}
      />

      {/* ── 精算・詳細 ── */}
      {activeDashboards.length > 0 ? (
        <section id="project-setup" className="surface-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-[var(--text)] mb-4">
            Project / Goal 詳細設定
          </h2>
          <CreatorWorkspaceProjectManagementBlocks
            projectDashboardsByCurrency={projectDashboardsByCurrency}
          />
        </section>
      ) : null}

      <MyPageAccordion
        open={workspace.openSections}
        onToggle={workspace.onToggleSection}
        sectionKey="flow"
        title="精算・配分管理"
      >
        <div className="flex items-center gap-2 mb-2">
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
