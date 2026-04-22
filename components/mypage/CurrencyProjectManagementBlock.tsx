"use client";

import React from "react";

import { CurrencyGoalSettlementPanel } from "@/components/mypage/CurrencyGoalSettlementPanel";
import { ProjectSection } from "@/components/mypage/ProjectSection";
import { RewardTierManagementSection } from "@/components/mypage/RewardTierManagementSection";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";

type Props = {
  currency: CurrencyCode;
  ownerAddress: string;
  activeProjectId: string | null;
  initialDashboard: MyPageProjectDashboard | null;
  walletAddress: string | null;
  isConnected: boolean;
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
};

export function CurrencyProjectManagementBlock(props: Props) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[var(--muted)]">
        {props.currency} 用
      </div>
      <ProjectSection
        ownerAddress={props.ownerAddress}
        activeProjectId={props.activeProjectId}
        initialProject={props.initialDashboard?.summary?.project ?? null}
        currency={props.currency}
        featureHideSummaryActions
        onActiveProjectIdChange={props.onActiveProjectIdChange}
        integratedGoalPanel={
          <CurrencyGoalSettlementPanel
            currency={props.currency}
            projectId={props.activeProjectId}
            address={props.walletAddress}
            isConnected={props.isConnected}
            initialSummary={props.initialDashboard?.summary ?? null}
          />
        }
      />
      {props.currency === "JPYC" ? (
        <RewardTierManagementSection
          projectId={props.activeProjectId}
          ownerAddress={props.walletAddress}
        />
      ) : null}
    </div>
  );
}
