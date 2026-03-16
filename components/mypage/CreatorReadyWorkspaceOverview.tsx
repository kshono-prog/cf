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
            setAiSummaryError("下書きと承認の状況を取得できませんでした。");
            setWaitingTasks([]);
          }
          return;
        }

        if (!cancelled) {
          setWaitingTasks(parseCreatorReadyWaitingTasks(json));
        }
      } catch {
        if (!cancelled) {
          setAiSummaryError("下書きと承認の状況を取得できませんでした。");
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
            Weekly Home
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            今ここで進めること
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {props.username} のプロフィール、支援状況、承認待ちをここから確認します。
            最初にやることを1つ決めて進み、詳細な設定は下の管理セクションで必要なときだけ開きます。
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

      {settlementAttentionNeeded ? (
        <div className="mt-6">
          <WorkspaceStatusNotice
            tone="attention"
            title="目標達成後の確認が必要な project があります"
            description="配分や精算の準備が必要な project があるため、通常の運営と分けて確認します。"
          >
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition hover:border-amber-500"
              onClick={props.onOpenAdvancedSettings}
            >
              精算と詳細設定を開く
            </button>
          </WorkspaceStatusNotice>
        </div>
      ) : null}

      <div className="mt-6">
        <PublicReadinessPanel
          compact
          title="公開準備の進捗"
          description="公開ページに必要な項目がどこまで揃っているかを確認します。"
          readiness={publicReadiness}
          actions={[
            {
              label: "プロフィールと支援設定を開く",
              onClick: props.onOpenSupportPage,
              tone: "primary",
            },
            {
              label: "公開ページ確認を開く",
              onClick: props.onOpenPublicPage,
            },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">今やること</div>
              <div className="mt-1 text-xs leading-5 text-slate-600">
                最初に1つだけ選んで進める前提で並べています。
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              MVP
            </span>
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
                  Beta / Advanced
                </div>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  実験導線と高リスク設定は、日常運営とは別の枠で確認します。
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                Beta
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
            <div className="text-sm font-semibold text-slate-950">下書きと承認の状況</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              承認待ちと下書きの状態だけを先に見ます。
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
                  下書きと承認を開く
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-600">
                {waitingApprovalCount > 0
                  ? "承認待ちが残っているので、まずここを処理すると運営が進めやすくなります。"
                  : "今は承認待ちはありません。必要なら新しい下書きを作れます。"}
              </p>
              <div className="mt-3 space-y-2">
                {loadingAiSummary ? (
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
                    下書きと承認の状況を読み込んでいます。
                  </div>
                ) : aiSummaryError ? (
                  <WorkspaceEmptyState
                    compact
                    title="下書きと承認の状況を取得できませんでした"
                    description={aiSummaryError}
                  />
                ) : waitingTasks.length === 0 ? (
                  <WorkspaceEmptyState
                    compact
                    title="いまは承認待ちの下書きはありません"
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
            <div className="text-sm font-semibold text-slate-950">支援状況</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              どの通貨の project が進んでいて、次に何を詰めるべきかを見ます。
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
