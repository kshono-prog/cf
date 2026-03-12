"use client";

import React from "react";

import { GasSupportTabs } from "@/components/mypage/GasSupportTabs";
import { ProjectSettlementPanel } from "@/components/mypage/ProjectSettlementPanel";
import {
  WorkspaceEmptyState,
  WorkspaceStatusNotice,
} from "@/components/mypage/WorkspaceFeedback";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";

type Props = {
  projectIdsByCurrency: {
    JPYC: string | null;
    USDC: string | null;
  };
  projectDashboardsByCurrency: {
    JPYC: MyPageProjectDashboard | null;
    USDC: MyPageProjectDashboard | null;
  };
  walletAddress: string | null;
  isConnected: boolean;
};

function SettlementWorkspaceCard(props: {
  currency: CurrencyCode;
  projectId: string | null;
  dashboard: MyPageProjectDashboard | null;
  walletAddress: string | null;
  isConnected: boolean;
}) {
  if (!props.projectId) {
    return (
      <WorkspaceEmptyState
        title={`${props.currency} の配分と精算はまだ始められません`}
        description="この通貨の project を作成すると、必要なときにここでブリッジや配分を進められます。"
      />
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          {props.currency}
        </div>
        <div className="mt-1 text-sm font-semibold text-gray-900">
          配分と精算
        </div>
        <div className="mt-1 text-xs leading-5 text-gray-600">
          目標達成後の資金移動、配分、実行結果の確認を行います。
        </div>
      </div>

      <ProjectSettlementPanel
        projectId={props.projectId}
        walletAddress={props.walletAddress}
        isConnected={props.isConnected}
        projectCurrency={props.currency}
        initialData={props.dashboard?.settlement ?? null}
      />
    </div>
  );
}

export function CreatorAdvancedSettingsSection(props: Props) {
  const hasAnyProject = Boolean(
    props.projectIdsByCurrency.JPYC || props.projectIdsByCurrency.USDC
  );

  return (
    <div className="space-y-4">
      <WorkspaceStatusNotice
        tone="attention"
        title="高リスク操作は日常運営と分けて扱います"
        description="資金移動、配分実行、ガス代支援は通常の公開面編集とは別の判断が必要です。必要なときだけここを開いて進めます。"
      />

      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">配分と精算</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">
            project ごとの配分フローと実行ログをここで確認します。
          </div>
        </div>

        {hasAnyProject ? (
          <div className="space-y-3">
            {(["JPYC", "USDC"] as const).map((currency) => (
              <SettlementWorkspaceCard
                key={currency}
                currency={currency}
                projectId={props.projectIdsByCurrency[currency]}
                dashboard={props.projectDashboardsByCurrency[currency]}
                walletAddress={props.walletAddress}
                isConnected={props.isConnected}
              />
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            title="まだ配分と精算を設定する project はありません"
            description="先にプロフィールと支援設定で project と goal を整えると、必要なときにここから精算フローへ進めます。"
          />
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-gray-900">ガス代支援</div>
          <div className="mt-1 text-xs leading-5 text-gray-600">
            必要なときだけ申請や確認を行います。日常運営の導線とは分けて置きます。
          </div>
        </div>
        <GasSupportTabs />
      </div>
    </div>
  );
}
