"use client";

import {
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import { CreatorReadyAiApprovalSection } from "@/components/mypage/CreatorReadyAiApprovalSection";
import { CreatorReadyBetaActionsSection } from "@/components/mypage/CreatorReadyBetaActionsSection";
import { CreatorReadyProjectHealthSection } from "@/components/mypage/CreatorReadyProjectHealthSection";
import { CreatorReadyQuickActionsSection } from "@/components/mypage/CreatorReadyQuickActionsSection";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";
import { useCreatorReadyWorkspaceOverviewData } from "@/components/mypage/useCreatorReadyWorkspaceOverviewData";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
  onOpenSupportPage: () => void;
  onOpenSupporterResponse: () => void;
  onOpenPublicPage: () => void;
  onOpenAdvancedSettings: () => void;
};

export function CreatorReadyWorkspaceOverview(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const {
    loadingAiSummary,
    aiSummaryError,
    waitingTasks,
    waitingApprovalCount,
    publicReadiness,
    settlementAttentionNeeded,
    quickActions,
    betaActions,
  } = useCreatorReadyWorkspaceOverviewData({
    projectDashboardsByCurrency: props.projectDashboardsByCurrency,
    onOpenSupportPage: props.onOpenSupportPage,
    onOpenSupporterResponse: props.onOpenSupporterResponse,
    onOpenPublicPage: props.onOpenPublicPage,
    onOpenAdvancedSettings: props.onOpenAdvancedSettings,
  });

  return (
    <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-950">
            今日の運営状況
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            支援の進み具合、AIからの提案、承認待ちを一覧で確認できます。
          </p>
        </div>
        <a
          href={`/${workspace.meCreatorUsername}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          公開ページを確認する
        </a>
      </div>

      {settlementAttentionNeeded ? (
        <div className="mt-6">
          <WorkspaceStatusNotice
            tone="attention"
            title="目標を達成したプロジェクトがあります"
            description="配分や受け取りの手続きが必要です。精算・詳細設定から確認してください。"
          >
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:border-amber-500"
              onClick={props.onOpenAdvancedSettings}
            >
              精算・詳細設定を開く
            </button>
          </WorkspaceStatusNotice>
        </div>
      ) : null}

      <div className="mt-6">
        <PublicReadinessPanel
          compact
          title="公開ページの準備状況"
          description="支援者が訪れたとき必要な情報が揃っているか確認できます。"
          readiness={publicReadiness}
          actions={[
            {
              label: "プロフィール・支援設定を整える",
              onClick: props.onOpenSupportPage,
              tone: "primary",
            },
            {
              label: "公開ページを確認する",
              onClick: props.onOpenPublicPage,
            },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <CreatorReadyQuickActionsSection actions={quickActions} />

        <div className="space-y-4">
          <CreatorReadyBetaActionsSection actions={betaActions} />
          <CreatorReadyAiApprovalSection
            waitingApprovalCount={waitingApprovalCount}
            loadingAiSummary={loadingAiSummary}
            aiSummaryError={aiSummaryError}
            waitingTasks={waitingTasks}
            onOpenSupporterResponse={props.onOpenSupporterResponse}
          />
          <CreatorReadyProjectHealthSection
            projectDashboardsByCurrency={props.projectDashboardsByCurrency}
          />
        </div>
      </div>
    </section>
  );
}
