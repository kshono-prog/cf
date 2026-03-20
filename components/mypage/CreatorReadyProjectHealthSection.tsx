"use client";

import { WorkspaceEmptyState } from "@/components/mypage/WorkspaceFeedback";
import {
  formatAmountByCurrency,
  type CurrencyCode,
} from "@/lib/mypage/accountPageTypes";
import type {
  MyPageProjectDashboard,
  ProjectDashboardsByCurrency,
} from "@/lib/mypage/dashboardTypes";

type ProjectHealthCardProps = {
  currency: CurrencyCode;
  dashboard: MyPageProjectDashboard | null;
};

function ProjectHealthCard(props: ProjectHealthCardProps) {
  if (!props.dashboard?.summary) {
    return (
      <WorkspaceEmptyState
        title={`${props.currency} の支援設定はまだありません`}
        description="この通貨で支援を受ける場合は、詳細設定からプロジェクトと目標金額を設定してください。"
      />
    );
  }

  const { project, goal, progress } = props.dashboard.summary;
  const total = progress.confirmedAmount ?? progress.confirmedTotal;
  const totalCurrency =
    progress.currency ?? goal?.unitCurrency ?? props.currency;
  const goalLabel = goal
    ? `${formatAmountByCurrency(
        goal.targetAmount,
        totalCurrency
      )} ${totalCurrency}`
    : "未設定";
  const progressLabel = goal?.achievedAt
    ? "目標達成済み"
    : `${Math.round(progress.progressPct)}%`;
  const settlementState = props.dashboard.settlement
    ? props.dashboard.settlement.settlement.status === "DISTRIBUTED"
      ? "配分完了"
      : props.dashboard.settlement.settlement.status ===
          "READY_FOR_DISTRIBUTION"
        ? "配分準備完了"
        : props.dashboard.settlement.settlement.status === "BRIDGING"
          ? "ブリッジ進行中"
          : "精算はこれから"
    : "精算はこれから";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-gray-500">
            {props.currency}
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
          <dt>精算状況</dt>
          <dd className="font-medium text-gray-900">{settlementState}</dd>
        </div>
      </dl>
    </div>
  );
}

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
};

export function CreatorReadyProjectHealthSection(props: Props) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-950">支援の進み具合</div>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        各通貨の支援額・目標・達成状況を確認できます。
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
  );
}
