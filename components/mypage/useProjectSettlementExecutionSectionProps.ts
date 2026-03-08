"use client";

import { useMemo } from "react";

import type { ProjectSettlementCctpSectionProps } from "@/components/mypage/ProjectSettlementCctpSection";
import type { ProjectSettlementDistributionExecutionSectionProps } from "@/components/mypage/ProjectSettlementDistributionExecutionSection";
import type { ProjectSettlementExecutionLogsSectionProps } from "@/components/mypage/ProjectSettlementExecutionLogsSection";
import type { ProjectSettlementManualResultSectionProps } from "@/components/mypage/ProjectSettlementManualResultSection";
import type { ProjectSettlementPreflightSectionProps } from "@/components/mypage/ProjectSettlementPreflightSection";
import { useProjectSettlementPanel } from "@/components/mypage/useProjectSettlementPanel";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

type PanelState = ReturnType<typeof useProjectSettlementPanel>;

type UseProjectSettlementExecutionSectionPropsArgs = {
  panel: PanelState;
  walletAddress: string | null;
  isConnected: boolean;
  projectCurrency: CurrencyCode;
};

export type ProjectSettlementExecutionSectionProps = {
  preflight: ProjectSettlementPreflightSectionProps;
  distributionExecution: ProjectSettlementDistributionExecutionSectionProps;
  executionLogs: ProjectSettlementExecutionLogsSectionProps;
  cctp: ProjectSettlementCctpSectionProps | null;
  manualResult: ProjectSettlementManualResultSectionProps;
};

export function useProjectSettlementExecutionSectionProps(
  args: UseProjectSettlementExecutionSectionPropsArgs
): ProjectSettlementExecutionSectionProps {
  const { panel, walletAddress, isConnected, projectCurrency } = args;

  return useMemo(
    () => ({
      preflight: {
        loading: panel.loading,
        walletAddress,
        isConnected,
        preflight: panel.preflight,
        hasPreflightFailure: panel.hasPreflightFailure,
        checkBalances: panel.checkBalances,
      },
      distributionExecution: {
        canDistribute: panel.canDistribute,
        hasCheckedPreflight: panel.preflight.length > 0,
        isDistributing: panel.isDistributing,
        entries: panel.entries,
        executeDistribution: panel.executeDistribution,
      },
      executionLogs: {
        recentExecutions: panel.recentExecutions,
      },
      cctp:
        projectCurrency === "USDC"
          ? {
              loading: panel.loading,
              walletAddress,
              cctpJobs: panel.cctpJobs,
              onRunAction: panel.runCctpAction,
            }
          : null,
      manualResult: {
        loading: panel.loading,
        isDistributing: panel.isDistributing,
        activeEntryId: panel.activeEntryId,
        runtimeRowStatus: panel.runtimeRowStatus,
        entries: panel.entries,
        markEntryResult: panel.markEntryResult,
      },
    }),
    [
      isConnected,
      panel.activeEntryId,
      panel.canDistribute,
      panel.checkBalances,
      panel.cctpJobs,
      panel.entries,
      panel.executeDistribution,
      panel.hasPreflightFailure,
      panel.isDistributing,
      panel.loading,
      panel.markEntryResult,
      panel.preflight,
      panel.recentExecutions,
      panel.runCctpAction,
      panel.runtimeRowStatus,
      projectCurrency,
      walletAddress,
    ]
  );
}
