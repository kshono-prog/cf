"use client";

import React from "react";

import { WorkspaceEmptyState } from "@/components/mypage/WorkspaceFeedback";
import {
  formatAmountByCurrency,
  type CurrencyCode,
} from "@/lib/mypage/accountPageTypes";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";

type QuickAction = {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
};

type Props = {
  username: string;
  projectDashboardsByCurrency: {
    JPYC: MyPageProjectDashboard | null;
    USDC: MyPageProjectDashboard | null;
  };
  onOpenProjectWorkspace: () => void;
  onOpenPublicPage: () => void;
  onOpenGasSupport: () => void;
};

function ProjectHealthCard({
  currency,
  dashboard,
}: {
  currency: CurrencyCode;
  dashboard: MyPageProjectDashboard | null;
}) {
  if (!dashboard) {
    return (
      <WorkspaceEmptyState
        title={`${currency} の project はまだありません`}
        description="この通貨で支援を受ける予定があるなら、まずは project を作成して目標を設定します。"
      />
    );
  }

  const { project, goal, progress } = dashboard.summary;
  const total = progress.confirmedTotal ?? progress.confirmedJpyc;
  const totalCurrency = progress.currency ?? goal?.unitCurrency ?? currency;
  const goalLabel = goal
    ? `${formatAmountByCurrency(
        goal.targetAmount ?? goal.targetAmountJpyc,
        totalCurrency
      )} ${totalCurrency}`
    : "未設定";
  const progressLabel = goal?.achievedAt
    ? "目標達成済み"
    : `${Math.round(progress.progressPct)}%`;
  const settlementState = dashboard.settlement
    ? dashboard.settlement.settlement.status === "DISTRIBUTED"
      ? "配分完了"
      : dashboard.settlement.settlement.status === "READY_FOR_DISTRIBUTION"
        ? "配分準備完了"
        : dashboard.settlement.settlement.status === "BRIDGING"
          ? "ブリッジ進行中"
          : "精算はこれから"
    : "精算はこれから";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-gray-500">
            {currency}
          </div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {project.title}
          </div>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
          {progressLabel}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-xs text-gray-600">
        <div className="flex items-center justify-between gap-4">
          <dt>現在の支援額</dt>
          <dd className="font-medium text-gray-900">
            {formatAmountByCurrency(total, totalCurrency)} {totalCurrency}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>目標</dt>
          <dd className="font-medium text-gray-900">{goalLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>次の運営ステータス</dt>
          <dd className="font-medium text-gray-900">{settlementState}</dd>
        </div>
      </dl>
    </div>
  );
}

function buildQuickActions(params: {
  projectDashboardsByCurrency: Props["projectDashboardsByCurrency"];
  onOpenProjectWorkspace: () => void;
  onOpenPublicPage: () => void;
  onOpenGasSupport: () => void;
}): QuickAction[] {
  const activeDashboards = (["JPYC", "USDC"] as const)
    .map((currency) => params.projectDashboardsByCurrency[currency])
    .filter((dashboard): dashboard is MyPageProjectDashboard => dashboard !== null);

  const missingProject = activeDashboards.length === 0;
  const missingGoal = activeDashboards.some((dashboard) => !dashboard.summary.goal);
  const reachedGoal = activeDashboards.some(
    (dashboard) => dashboard.summary.goal?.achievedAt
  );

  const actions: QuickAction[] = [];

  if (missingProject) {
    actions.push({
      title: "最初の project を準備する",
      body: "支援を受ける通貨を決めて、まずは project を1つ作成します。",
      actionLabel: "運営ワークスペースを開く",
      onAction: params.onOpenProjectWorkspace,
    });
  } else if (missingGoal) {
    actions.push({
      title: "目標金額を設定する",
      body: "支援ページで何を目指しているかが伝わるように、goal を先に固めます。",
      actionLabel: "目標設定を開く",
      onAction: params.onOpenProjectWorkspace,
    });
  } else if (reachedGoal) {
    actions.push({
      title: "精算と配分の確認を進める",
      body: "目標達成済みの project があるので、distribution と settlement の状態を確認します。",
      actionLabel: "運営ワークスペースを開く",
      onAction: params.onOpenProjectWorkspace,
    });
  } else {
    actions.push({
      title: "今週の運営タスクを更新する",
      body: "進捗に合わせて告知、支援導線、活動レポートを更新する段階です。",
      actionLabel: "運営ワークスペースを開く",
      onAction: params.onOpenProjectWorkspace,
    });
  }

  actions.push({
    title: "公開ページを確認する",
    body: "支援者から見える情報とリンクが最新かをすぐ確認できます。",
    actionLabel: "公開リンクを見る",
    onAction: params.onOpenPublicPage,
  });

  actions.push({
    title: "ガス代支援の状況を見る",
    body: "必要なときだけ申請や確認を行い、日常作業とは分けて扱います。",
    actionLabel: "ガス代支援を見る",
    onAction: params.onOpenGasSupport,
  });

  return actions;
}

export function CreatorReadyWorkspaceOverview(props: Props) {
  const quickActions = buildQuickActions({
    projectDashboardsByCurrency: props.projectDashboardsByCurrency,
    onOpenProjectWorkspace: props.onOpenProjectWorkspace,
    onOpenPublicPage: props.onOpenPublicPage,
    onOpenGasSupport: props.onOpenGasSupport,
  });

  return (
    <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            Creator Workspace
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            今日の運営で先に見るべきこと
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {props.username} の公開ページ、project の進捗、日々の運営タスクをここから確認します。
            下のカードから次の行動を選び、詳細な設定は各セクションで進めます。
          </p>
        </div>
        <a
          href={`/${props.username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          公開ページを別タブで開く
        </a>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">今日やること</div>
          <div className="mt-3 grid gap-3">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {action.title}
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  {action.body}
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
                  onClick={action.onAction}
                >
                  {action.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-950">
            Project / Goal の状況
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            日常運営で先に見るのは、どの通貨の project が進んでいて、次に何を詰めるべきかです。
          </p>
          <div className="mt-4 grid gap-3">
            {(["JPYC", "USDC"] as const).map((currency) => (
              <ProjectHealthCard
                key={currency}
                currency={currency}
                dashboard={props.projectDashboardsByCurrency[currency]}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
