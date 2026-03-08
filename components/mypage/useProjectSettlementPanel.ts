"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChainId, usePublicClient, useWalletClient } from "wagmi";

import {
  type BridgeStep,
  type CctpJobView,
  type DistributionEntry,
  type DistributionExecutionView,
  type RefreshProjectSettlement,
  type SettlementView,
} from "@/components/mypage/projectSettlementRuntime";
import { useProjectSettlementBridgeState } from "@/components/mypage/useProjectSettlementBridgeState";
import { useProjectSettlementDistributionState } from "@/components/mypage/useProjectSettlementDistributionState";
import { useProjectSettlementExecutionState } from "@/components/mypage/useProjectSettlementExecutionState";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import {
  fetchProjectSettlement,
  recomputeProjectSettlement,
} from "@/lib/mypage/api";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";

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

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementView | null>(null);
  const [bridgeSteps, setBridgeSteps] = useState<BridgeStep[]>([]);
  const [entries, setEntries] = useState<DistributionEntry[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<
    DistributionExecutionView[]
  >([]);
  const [cctpJobs, setCctpJobs] = useState<CctpJobView[]>([]);

  const canUse = !!projectId;
  const refreshRef = useRef<RefreshProjectSettlement>(async () => {});
  const callRefresh = useCallback(() => refreshRef.current(), []);

  const distribution = useProjectSettlementDistributionState({
    projectId,
    walletAddress,
    projectCurrency,
    settlement,
    refresh: callRefresh,
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
    refresh: callRefresh,
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
    refresh: callRefresh,
    setLoading,
    setMessage,
  });
  const {
    applyDistributionEntries,
    resetDistributionState,
    ...distributionState
  } = distribution;
  const { resetExecutionRuntime, ...executionState } = execution;

  const applySettlementData = useCallback(
    (data: ProjectSettlementData) => {
      setSettlement(data.settlement);
      setBridgeSteps(data.bridgeSteps);
      setEntries(data.distributionEntries);
      setRecentExecutions(data.recentExecutions);
      setCctpJobs(data.cctpJobs);
      applyDistributionEntries(data.distributionEntries);
      resetExecutionRuntime();
    },
    [applyDistributionEntries, resetExecutionRuntime]
  );

  const clearLoadedData = useCallback(() => {
    setSettlement(null);
    setBridgeSteps([]);
    setEntries([]);
    setRecentExecutions([]);
    setCctpJobs([]);
    resetDistributionState();
    resetExecutionRuntime();
  }, [resetDistributionState, resetExecutionRuntime]);

  const refresh = useCallback(async () => {
    if (!projectId) {
      clearLoadedData();
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const result = await fetchProjectSettlement({ projectId });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      applySettlementData(result.data);
    } catch {
      setMessage("SETTLEMENT_FETCH_FAILED");
    } finally {
      setLoading(false);
    }
  }, [applySettlementData, clearLoadedData, projectId]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!projectId) {
      clearLoadedData();
      return;
    }
    if (initialData && initialData.project.id === projectId) {
      applySettlementData(initialData);
      return;
    }
    void refresh();
  }, [applySettlementData, clearLoadedData, initialData, projectId, refresh]);

  const recompute = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setMessage(null);
    try {
      const result = await recomputeProjectSettlement({ projectId });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      await refresh();
      setMessage("settlement status を再計算しました");
    } catch {
      setMessage("SETTLEMENT_RECOMPUTE_FAILED");
    } finally {
      setLoading(false);
    }
  }, [projectId, refresh]);

  return {
    canUse,
    loading,
    message,
    settlement,
    bridgeSteps,
    entries,
    recentExecutions,
    cctpJobs,
    rows: distributionState.rows,
    draftDirty: distributionState.draftDirty,
    isDistributing: executionState.isDistributing,
    activeEntryId: executionState.activeEntryId,
    runtimeRowStatus: executionState.runtimeRowStatus,
    preflight: executionState.preflight,
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
    totals: distributionState.totals,
    walletNotice: executionState.walletNotice,
    polygonDone: bridge.polygonDone,
    ethereumDone: bridge.ethereumDone,
    canDistribute: executionState.canDistribute,
    hasPreflightFailure: executionState.hasPreflightFailure,
    recordBridge: bridge.recordBridge,
    runOneClickBridge: bridge.runOneClickBridge,
    updateDraft: distributionState.updateDraft,
    addDraftRow: distributionState.addDraftRow,
    removeDraftRow: distributionState.removeDraftRow,
    saveDistributions: distributionState.saveDistributions,
    checkBalances: executionState.checkBalances,
    executeDistribution: executionState.executeDistribution,
    runCctpAction: executionState.runCctpAction,
    markEntryResult: executionState.markEntryResult,
    recompute,
  };
}
