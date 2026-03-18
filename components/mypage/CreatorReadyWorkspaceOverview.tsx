"use client";

import React from "react";

import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import {
  buildCreatorReadyBetaActions,
  buildCreatorReadyQuickActions,
  hasCreatorReadySettlementAttention,
  parseCreatorReadyWaitingTasks,
  type HomeTaskPreview,
} from "@/components/mypage/creatorReadyWorkspaceOverviewHelpers";
import { PublicReadinessPanel } from "@/components/mypage/PublicReadinessPanel";
import type { CreatorProfile } from "@/types/creator";
import {
  formatAmountByCurrency,
  type CurrencyCode,
} from "@/lib/mypage/accountPageTypes";
import {
  hasProjectSummary,
  type MyPageProjectDashboard,
} from "@/lib/mypage/dashboardTypes";
import { buildPublicReadiness } from "@/lib/mypage/publicReadiness";
import { getAgentTaskTypeCopy } from "@/lib/uxCopy";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type Props = {
  username: string;
  displayName: string;
  profile: string;
  avatarUrl: string;
  creatorType: CreatorProfile["creatorType"];
  walletAddress: string | null;
  projectId: string | null;
  isConnected: boolean;
  projectDashboardsByCurrency: {
    JPYC: MyPageProjectDashboard | null;
    USDC: MyPageProjectDashboard | null;
  };
  onOpenSupportPage: () => void;
  onOpenSupporterResponse: () => void;
  onOpenPublicPage: () => void;
  onOpenAdvancedSettings: () => void;
};

function ProjectHealthCard({
  currency,
  dashboard,
}: {
  currency: CurrencyCode;
  dashboard: MyPageProjectDashboard | null;
}) {
  if (!dashboard?.summary) {
    return (
      <WorkspaceEmptyState
        title={`${currency} の支援設定はまだありません`}
        description="この通貨で支援を受ける場合は、詳細設定からプロジェクトと目標金額を設定してください。"
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
          <dt>精算状況</dt>
          <dd className="font-medium text-gray-900">{settlementState}</dd>
        </div>
      </dl>
    </div>
  );
}

export function CreatorReadyWorkspaceOverview(props: Props) {
  const [loadingAiSummary, setLoadingAiSummary] = React.useState(false);
  const [aiSummaryError, setAiSummaryError] = React.useState<string | null>(null);
  const [waitingTasks, setWaitingTasks] = React.useState<HomeTaskPreview[]>([]);

  const activeDashboards = React.useMemo(
    () =>
      (["JPYC", "USDC"] as const)
        .map((currency) => props.projectDashboardsByCurrency[currency])
        .filter(hasProjectSummary),
    [props.projectDashboardsByCurrency]
  );

  const waitingApprovalCount = waitingTasks.length;
  const publicReadiness = React.useMemo(
    () =>
      buildPublicReadiness({
        displayName: props.displayName,
        profile: props.profile,
        avatarUrl: props.avatarUrl,
        creatorType: props.creatorType ?? null,
        projectDashboardsByCurrency: props.projectDashboardsByCurrency,
      }),
    [
      props.avatarUrl,
      props.creatorType,
      props.displayName,
      props.profile,
      props.projectDashboardsByCurrency,
    ]
  );
  const settlementAttentionNeeded = React.useMemo(
    () => hasCreatorReadySettlementAttention(activeDashboards),
    [activeDashboards]
  );

  const quickActions = React.useMemo(
    () =>
      buildCreatorReadyQuickActions({
        activeDashboards,
        waitingApprovalCount,
        onOpenSupportPage: props.onOpenSupportPage,
        onOpenSupporterResponse: props.onOpenSupporterResponse,
        onOpenPublicPage: props.onOpenPublicPage,
      }),
    [
      activeDashboards,
      waitingApprovalCount,
      props.onOpenSupportPage,
      props.onOpenSupporterResponse,
      props.onOpenPublicPage,
    ]
  );
  const betaActions = React.useMemo(
    () =>
      buildCreatorReadyBetaActions({
        onOpenSupporterResponse: props.onOpenSupporterResponse,
        onOpenAdvancedSettings: props.onOpenAdvancedSettings,
      }),
    [props.onOpenAdvancedSettings, props.onOpenSupporterResponse]
  );

  React.useEffect(() => {
    if (!props.isConnected || !props.walletAddress) {
      setWaitingTasks([]);
      setAiSummaryError(null);
      return;
    }

    const walletAddress = props.walletAddress;
    let cancelled = false;

    async function loadAiSummary(): Promise<void> {
      setLoadingAiSummary(true);
      setAiSummaryError(null);

      try {
        const response = await ownerAuthFetch({
          address: walletAddress,
          url: `/api/ai-office/dashboard?address=${encodeURIComponent(
            walletAddress
          )}${
            props.projectId
              ? `&projectId=${encodeURIComponent(props.projectId)}`
              : ""
          }&taskLimit=20`,
          init: { cache: "no-store" },
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          if (!cancelled) {
            setAiSummaryError("AIの提案状況を取得できませんでした。");
            setWaitingTasks([]);
          }
          return;
        }

        if (!cancelled) {
          setWaitingTasks(parseCreatorReadyWaitingTasks(json));
        }
      } catch {
        if (!cancelled) {
          setAiSummaryError("AIの提案状況を取得できませんでした。");
          setWaitingTasks([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAiSummary(false);
        }
      }
    }

    void loadAiSummary();

    return () => {
      cancelled = true;
    };
  }, [props.isConnected, props.projectId, props.walletAddress]);

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
          href={`/${props.username}`}
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
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">次にやること</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                優先度の高い順に並べています。
              </div>
            </div>
          </div>
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

        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-amber-950">
                  試験中の機能
                </div>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  通常使う機能とは別に、試験版の機能や詳しい設定はこちらから確認できます。
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                試験中
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {betaActions.map((action) => (
                <div
                  key={action.title}
                  className="rounded-2xl border border-amber-200 bg-white/90 p-4"
                >
                  <div className="text-sm font-semibold text-amber-950">
                    {action.title}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    {action.body}
                  </p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:border-amber-500"
                    onClick={action.onAction}
                  >
                    {action.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-950">AIの提案・承認待ち</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              AIが作成した告知・お礼などの提案を確認・承認できます。
            </p>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold tracking-wide text-gray-500">
                    承認待ち
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-gray-900">
                    {waitingApprovalCount}
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
                  onClick={props.onOpenSupporterResponse}
                >
                  提案を確認する
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600">
                {waitingApprovalCount > 0
                  ? "承認を待っている提案があります。確認して承認または却下してください。"
                  : "現在、承認待ちの提案はありません。必要なら新しい下書きを作れます。"}
              </p>
              <div className="mt-3 space-y-2">
                {loadingAiSummary ? (
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
                    AIの提案状況を読み込んでいます。
                  </div>
                ) : aiSummaryError ? (
                  <WorkspaceEmptyState
                    compact
                    title="AIの提案状況を取得できませんでした"
                    description={aiSummaryError}
                  />
                ) : waitingTasks.length === 0 ? (
                  <WorkspaceEmptyState
                    compact
                    title="いまは承認待ちの提案はありません"
                    description="告知やお礼の下書きを作ると、ここからすぐ確認できます。"
                  />
                ) : (
                  waitingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-700"
                    >
                      {getAgentTaskTypeCopy(task.taskType).label}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

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
        </div>
      </div>
    </section>
  );
}
