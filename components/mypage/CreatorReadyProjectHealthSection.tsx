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
  onOpenSettings?: () => void;
};

function ProjectHealthCard(props: ProjectHealthCardProps) {
  if (!props.dashboard?.summary) {
    return (
      <WorkspaceEmptyState
        title={`${props.currency} の支援設定はまだありません`}
        description="この通貨で支援を受ける場合は、詳細設定からプロジェクトと目標金額を設定してください。"
      >
        {props.onOpenSettings ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={props.onOpenSettings}
          >
            設定・準備を開く
          </button>
        ) : null}
      </WorkspaceEmptyState>
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
  const progressPct = Math.min(100, Math.max(0, Math.round(progress.progressPct)));
  const nextStep = !goal
    ? "Goal を設定すると、支援理由と次の行動が支援者に伝わりやすくなります。"
    : goal.achievedAt
      ? props.dashboard.settlement?.settlement.status === "DISTRIBUTED"
        ? "配分は完了しています。結果共有や次のプロジェクト準備へ進めます。"
        : props.dashboard.settlement?.settlement.status === "READY_FOR_DISTRIBUTION"
          ? "配分内容を確認して、実行に進める状態です。"
          : props.dashboard.settlement?.settlement.status === "BRIDGING"
            ? "ブリッジ完了後の配分確認に備えましょう。"
            : "達成後の精算確認を進めましょう。"
      : progressPct === 0
        ? "最初の告知と使い道の説明を整えて、支援の入口を作りましょう。"
        : progressPct < 50
          ? "進捗共有を増やして、支援理由をもう一歩具体化しましょう。"
          : progressPct < 100
            ? "達成まであと少しです。近況共有と告知の密度を上げましょう。"
            : "達成後の整理と次のアクション確認へ進めます。";
  const remainingAmount =
    goal && total !== null ? Math.max(goal.targetAmount - total, 0) : null;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-[var(--muted)]">
            {props.currency}
          </div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {project.title}
          </div>
        </div>
        <span className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
          {progressLabel}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, var(--accent), #60a5fa)",
          }}
        />
      </div>

      <dl className="mt-4 space-y-2 text-xs text-[var(--text-subtle)]">
        <div className="flex items-center justify-between gap-4">
          <dt>現在の支援額</dt>
          <dd className="font-medium text-[var(--text)]">
            {formatAmountByCurrency(total, totalCurrency)} {totalCurrency}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>目標</dt>
          <dd className="font-medium text-[var(--text)]">{goalLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>精算状況</dt>
          <dd className="font-medium text-[var(--text)]">{settlementState}</dd>
        </div>
        {remainingAmount !== null && remainingAmount > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <dt>達成まで</dt>
            <dd className="font-medium text-[var(--text)]">
              {formatAmountByCurrency(remainingAmount, totalCurrency)}{" "}
              {totalCurrency}
            </dd>
          </div>
        ) : null}
      </dl>

      <div
        className="mt-4 rounded-xl px-3 py-3 text-xs leading-5 text-[var(--text-subtle)]"
        style={{
          background: "var(--surface-subtle)",
          borderLeft: "3px solid var(--accent-muted)",
        }}
      >
        <p className="font-semibold text-[var(--text)]">次に必要なこと</p>
        <p className="mt-1">{nextStep}</p>
      </div>
    </div>
  );
}

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
  onOpenSettings?: () => void;
};

export function CreatorReadyProjectHealthSection(props: Props) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-4 border-b border-[var(--line)]">
        <p className="text-sm font-bold text-[var(--text)]">プロジェクトの進行状況</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--text-subtle)]">
          Project / Goal / 精算の現在地をまとめて確認できます。
        </p>
      </div>
      <div className="p-4 grid gap-3">
        {(["JPYC", "USDC"] as const).map((currency) => (
          <ProjectHealthCard
            key={currency}
            currency={currency}
            dashboard={props.projectDashboardsByCurrency[currency]}
            onOpenSettings={props.onOpenSettings}
          />
        ))}
      </div>
    </div>
  );
}
