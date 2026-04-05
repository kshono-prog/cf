"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";

import { AiSuggestionsCard } from "@/components/mypage/AiSuggestionsCard";
import {
  WorkspaceLoadingCard,
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import {
  getNextActionSuggestions,
  type NextActionSuggestion,
} from "@/lib/creator-ai/nextActionSuggestions";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { ProjectDashboardsByCurrency } from "@/lib/mypage/dashboardTypes";
import { useCreatorReadyWorkspace } from "@/components/mypage/CreatorReadyWorkspaceContext";

type Props = {
  projectDashboardsByCurrency: ProjectDashboardsByCurrency;
};

const ProjectSettlementPanel = dynamic(
  () =>
    import("@/components/mypage/ProjectSettlementPanel").then(
      (mod) => mod.ProjectSettlementPanel
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="配分と精算の状態を読み込んでいます" />
    ),
  }
);

const GasSupportTabs = dynamic(
  () =>
    import("@/components/mypage/GasSupportTabs").then(
      (mod) => mod.GasSupportTabs
    ),
  {
    loading: () => (
      <WorkspaceLoadingCard title="ガス代支援の状態を読み込んでいます" />
    ),
  }
);

function SettlementWorkspaceCard(props: {
  currency: CurrencyCode;
  projectId: string | null;
  dashboard: ProjectDashboardsByCurrency[CurrencyCode];
  walletAddress: string | null;
  isConnected: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (!props.projectId) {
    return (
      <WorkspaceEmptyState
        title={`${props.currency} の配分と精算はまだ始められません`}
        description="この通貨のプロジェクトを作成すると、必要なときにここで精算や送金を進められます。"
      />
    );
  }

  const summary = props.dashboard?.summary ?? null;
  const isOwner =
    !!summary?.project.ownerAddress &&
    !!props.walletAddress &&
    summary.project.ownerAddress.toLowerCase() === props.walletAddress;
  const suggestions = getNextActionSuggestions({
    summary,
    isOwner,
  });
  const currencyKey = props.currency.toLowerCase();
  const workspaceBasePath = (() => {
    if (!pathname) {
      return null;
    }

    const myPageIndex = pathname.indexOf("/mypage");
    if (myPageIndex === -1) {
      return null;
    }

    return pathname.slice(0, myPageIndex + "/mypage".length);
  })();

  const handleSelectSuggestion = (suggestion: NextActionSuggestion) => {
    if (!workspaceBasePath) {
      return;
    }

    if (
      suggestion.recommendedUiTarget === "bridge" ||
      suggestion.recommendedUiTarget === "plan" ||
      suggestion.recommendedUiTarget === "distributionResult"
    ) {
      const anchorId =
        suggestion.recommendedUiTarget === "bridge"
          ? `settlement-bridge-${currencyKey}`
          : suggestion.recommendedUiTarget === "plan"
            ? `settlement-plan-${currencyKey}`
            : `settlement-distribution-result-${currencyKey}`;

      window.requestAnimationFrame(() => {
        document.getElementById(anchorId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }

    const anchorId =
      suggestion.recommendedUiTarget === "goal"
        ? `goal-input-${currencyKey}`
        : suggestion.recommendedUiTarget === "achieve"
          ? `goal-achieve-${currencyKey}`
          : `goal-summary-${currencyKey}`;

    router.push(`${workspaceBasePath}/support-page#${anchorId}`, {
      scroll: true,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {props.currency}
        </div>
        <div className="mt-1 text-sm font-semibold text-[var(--text)]">
          配分と精算
        </div>
        <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
          目標達成後の資金移動、配分、実行結果の確認を行います。
        </div>
      </div>

      <AiSuggestionsCard
        suggestions={suggestions}
        emptyLabel="この段階での追加提案はありません"
        onSelectSuggestion={handleSelectSuggestion}
      />

      <ProjectSettlementPanel
        projectId={props.projectId}
        walletAddress={props.walletAddress}
        isConnected={props.isConnected}
        projectCurrency={props.currency}
        initialData={props.dashboard?.settlement ?? null}
        summary={props.dashboard?.summary ?? null}
      />
    </div>
  );
}

export function CreatorAdvancedSettingsSection(props: Props) {
  const workspace = useCreatorReadyWorkspace();
  const hasAnyProject = Boolean(
    workspace.projectIdsByCurrency.JPYC || workspace.projectIdsByCurrency.USDC
  );

  return (
    <div className="space-y-4">
      <WorkspaceStatusNotice
        tone="attention"
        title="送金や精算は通常の運営と分けて確認します"
        description="送金・配分の実行・ガス代の申請は、通常のプロフィール編集とは別に慎重な確認が必要です。必要なときだけここを開いて進めます。"
      />

      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">配分と精算</div>
          <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
            通貨ごとの配分フローと実行ログを確認します。
          </div>
        </div>

        {hasAnyProject ? (
          <div className="space-y-3">
            {(["JPYC", "USDC"] as const).map((currency) => (
              <SettlementWorkspaceCard
                key={currency}
                currency={currency}
                projectId={workspace.projectIdsByCurrency[currency]}
                dashboard={props.projectDashboardsByCurrency[currency]}
                walletAddress={workspace.address?.toLowerCase() ?? null}
                isConnected={workspace.isConnected}
              />
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            title="まだ配分と精算を設定するプロジェクトはありません"
            description="先にプロフィールと支援設定でプロジェクトと目標を整えると、必要なときにここから精算フローへ進めます。"
          />
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">ガス代支援</div>
          <div className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">
            必要なときだけ申請や確認を行います。通常の運営画面とは分けて置いています。
          </div>
        </div>
        <GasSupportTabs />
      </div>
    </div>
  );
}
