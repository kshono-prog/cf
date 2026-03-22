"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  BridgeStep,
  CctpJobView,
  DistributionEntry,
  DistributionExecutionView,
  RefreshProjectSettlement,
  SettlementView,
} from "@/components/mypage/projectSettlementRuntime";
import {
  fetchProjectSettlement,
  recomputeProjectSettlement,
} from "@/lib/mypage/api";
import type { ProjectSettlementData } from "@/lib/projectSettlementView";

type Args = {
  projectId: string | null;
  walletAddress: string | null;
  initialData?: ProjectSettlementData | null;
  onApply: (data: ProjectSettlementData) => void;
  onClear: () => void;
};

export type ProjectSettlementDataFetchResult = {
  loading: boolean;
  message: string | null;
  settlement: SettlementView | null;
  bridgeSteps: BridgeStep[];
  entries: DistributionEntry[];
  recentExecutions: DistributionExecutionView[];
  cctpJobs: CctpJobView[];
  refresh: RefreshProjectSettlement;
  recompute: () => Promise<void>;
  setLoading: (v: boolean) => void;
  setMessage: (v: string | null) => void;
};

export function useProjectSettlementDataFetch(
  args: Args
): ProjectSettlementDataFetchResult {
  const { projectId, walletAddress, initialData } = args;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<SettlementView | null>(null);
  const [bridgeSteps, setBridgeSteps] = useState<BridgeStep[]>([]);
  const [entries, setEntries] = useState<DistributionEntry[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<
    DistributionExecutionView[]
  >([]);
  const [cctpJobs, setCctpJobs] = useState<CctpJobView[]>([]);

  const onApplyRef = useRef(args.onApply);
  const onClearRef = useRef(args.onClear);
  useEffect(() => {
    onApplyRef.current = args.onApply;
    onClearRef.current = args.onClear;
  });

  const applyData = useCallback((data: ProjectSettlementData) => {
    setSettlement(data.settlement);
    setBridgeSteps(data.bridgeSteps);
    setEntries(data.distributionEntries);
    setRecentExecutions(data.recentExecutions);
    setCctpJobs(data.cctpJobs);
    onApplyRef.current(data);
  }, []);

  const clearData = useCallback(() => {
    setSettlement(null);
    setBridgeSteps([]);
    setEntries([]);
    setRecentExecutions([]);
    setCctpJobs([]);
    onClearRef.current();
  }, []);

  const refreshRef = useRef<RefreshProjectSettlement>(async () => {});

  const refresh = useCallback(async () => {
    if (!projectId) {
      clearData();
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (!walletAddress) {
        setMessage("WALLET_NOT_CONNECTED");
        return;
      }

      const result = await fetchProjectSettlement({
        projectId,
        address: walletAddress,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      applyData(result.data);
    } catch {
      setMessage("SETTLEMENT_FETCH_FAILED");
    } finally {
      setLoading(false);
    }
  }, [applyData, clearData, projectId, walletAddress]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const callRefresh = useCallback<RefreshProjectSettlement>(
    () => refreshRef.current(),
    []
  );

  useEffect(() => {
    if (!projectId) {
      clearData();
      return;
    }
    if (initialData && initialData.project.id === projectId) {
      applyData(initialData);
      return;
    }
    void refresh();
  }, [applyData, clearData, initialData, projectId, refresh]);

  const recompute = useCallback(async () => {
    if (!projectId || !walletAddress) return;

    setLoading(true);
    setMessage(null);
    try {
      const result = await recomputeProjectSettlement({
        projectId,
        address: walletAddress,
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      await callRefresh();
      setMessage("settlement status を再計算しました");
    } catch {
      setMessage("SETTLEMENT_RECOMPUTE_FAILED");
    } finally {
      setLoading(false);
    }
  }, [callRefresh, projectId, walletAddress]);

  return {
    loading,
    message,
    settlement,
    bridgeSteps,
    entries,
    recentExecutions,
    cctpJobs,
    refresh: callRefresh,
    recompute,
    setLoading,
    setMessage,
  };
}
