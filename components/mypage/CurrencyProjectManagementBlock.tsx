"use client";

import React from "react";

import { CurrencyGoalSettlementPanel } from "@/components/mypage/CurrencyGoalSettlementPanel";
import { ProjectSection } from "@/components/mypage/ProjectSection";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import type { MyPageProjectDashboard } from "@/lib/mypage/dashboardTypes";

type Props = {
  currency: CurrencyCode;
  ownerAddress: string;
  activeProjectId: string | null;
  initialDashboard: MyPageProjectDashboard | null;
  walletAddress: string | null;
  isConnected: boolean;
  showSummaryActions: boolean;
  onActiveProjectIdChange: (pid: string | null, changedCur: CurrencyCode) => void;
};

export function CurrencyProjectManagementBlock(props: Props) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-500">
        {props.currency} 用
      </div>
      <ProjectSection
        ownerAddress={props.ownerAddress}
        activeProjectId={props.activeProjectId}
        initialProject={props.initialDashboard?.summary.project ?? null}
        currency={props.currency}
        featureHideSummaryActions={!props.showSummaryActions}
        onActiveProjectIdChange={props.onActiveProjectIdChange}
        integratedGoalPanel={
          <CurrencyGoalSettlementPanel
            currency={props.currency}
            projectId={props.activeProjectId}
            address={props.walletAddress}
            isConnected={props.isConnected}
            initialSummary={props.initialDashboard?.summary ?? null}
            initialSettlementData={props.initialDashboard?.settlement ?? null}
          />
        }
      />
    </div>
  );
}
