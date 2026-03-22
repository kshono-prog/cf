"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";

import { useProjectSettlementDataFetch } from "@/components/mypage/useProjectSettlementDataFetch";
import { useProjectSettlementBridgeState } from "@/components/mypage/useProjectSettlementBridgeState";
import { useProjectSettlementDistributionState } from "@/components/mypage/useProjectSettlementDistributionState";
import { useProjectSettlementExecutionState } from "@/components/mypage/useProjectSettlementExecutionState";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";

type UseProjectSettlementPanelArgs = {
  projectId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
  projectCurrency?: CurrencyCode;
  initialData?: ProjectSettlementData | null;
};

export function useProjectSettlementPanel(
  args: UseProjectSettlementPanelArgs
) {
  const chainId = useChainId();
  const sourcePublicClient = usePublicClient();
  const avalanchePublicClient = usePublicClient({ chainId: 43114 });
  const { data: walletClient } = useWalletClient();
  const {
    projectId,
    walletAddress,
    isConnected,
    projectCurrency = "JPYC",
    initialData = null,
  } = args;

  // Refs for callbacks that bridge the fetch → sub-hook circular dep
  const onApplyRef = useRef<(data: ProjectSettlementData) => void>(() => {});
  const onClearRef = useRef<() => void>(() => {});

  const {
    loading,
    message,
    settlement,
    bridgeSteps,
    entries,
    recentExecutions,
    cctpJobs,
    refresh,
    recompute,
    setLoading,
    setMessage,
  } = useProjectSettlementDataFetch({
    projectId,
    walletAddress,
    initialData,
    onApply: useCallback((data) => onApplyRef.current(data), []),
    onClear: useCallback(() => onClearRef.current(), []),
  });

  const canUse = !!projectId;

  const distribution = useProjectSettlementDistributionState({
    projectId,
    walletAddress,
    projectCurrency,
    settlement,
    refresh,
    setLoading,
    setMessage,
  });

  const execution = useProjectSettlementExecutionState({
    projectId,
    walletAddress,
    isConnected,
    chainId,
    avalanchePublicClient,
    walletClient,
    settlement,
    entries,
    draftDirty: distribution.draftDirty,
    refresh,
    setLoading,
    setMessage,
  });

  const bridge = useProjectSettlementBridgeState({
    projectId,
    walletAddress,
    isConnected,
    projectCurrency,
    chainId,
    sourcePublicClient,
    walletClient,
    bridgeSteps,
    refresh,
    setLoading,
    setMessage,
  });

  // Wire sub-hook callbacks into the data-fetch layer via refs
  useEffect(() => {
    onApplyRef.current = (data) => {
      distribution.applyDistributionEntries(data.distributionEntries);
      execution.resetExecutionRuntime();
    };
    onClearRef.current = () => {
      distribution.resetDistributionState();
      execution.resetExecutionRuntime();
    };
  });

  return {
    canUse,
    loading,
    message,
    settlement,
    bridgeSteps,
    entries,
    recentExecutions,
    cctpJobs,
    rows: distribution.rows,
    draftDirty: distribution.draftDirty,
    totals: distribution.totals,
    updateDraft: distribution.updateDraft,
    addDraftRow: distribution.addDraftRow,
    removeDraftRow: distribution.removeDraftRow,
    replaceDraftRows: distribution.replaceDraftRows,
    saveDistributions: distribution.saveDistributions,
    isDistributing: execution.isDistributing,
    activeEntryId: execution.activeEntryId,
    runtimeRowStatus: execution.runtimeRowStatus,
    preflight: execution.preflight,
    walletNotice: execution.walletNotice,
    canDistribute: execution.canDistribute,
    hasPreflightFailure: execution.hasPreflightFailure,
    checkBalances: execution.checkBalances,
    executeDistribution: execution.executeDistribution,
    runCctpAction: execution.runCctpAction,
    markEntryResult: execution.markEntryResult,
    bridgeAmountPolygon: bridge.bridgeAmountPolygon,
    setBridgeAmountPolygon: bridge.setBridgeAmountPolygon,
    bridgeTxPolygon: bridge.bridgeTxPolygon,
    setBridgeTxPolygon: bridge.setBridgeTxPolygon,
    bridgeAmountEthereum: bridge.bridgeAmountEthereum,
    setBridgeAmountEthereum: bridge.setBridgeAmountEthereum,
    bridgeTxEthereum: bridge.bridgeTxEthereum,
    setBridgeTxEthereum: bridge.setBridgeTxEthereum,
    bridgeNowBusy: bridge.bridgeNowBusy,
    bridgeNowStatus: bridge.bridgeNowStatus,
    polygonDone: bridge.polygonDone,
    ethereumDone: bridge.ethereumDone,
    recordBridge: bridge.recordBridge,
    runOneClickBridge: bridge.runOneClickBridge,
    recompute,
  };
}
