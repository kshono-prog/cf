"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  achieveProjectGoal,
  fetchProjectSummary,
  saveProjectGoal,
} from "@/lib/mypage/api";
import type {
  CurrencyCode,
  SummaryViewData,
} from "@/lib/mypage/accountPageTypes";

type UseCurrencyGoalSettlementPanelArgs = {
  currency: CurrencyCode;
  projectId: string | null;
  address: string | null;
  isConnected: boolean;
  initialSummary?: SummaryViewData | null;
};

function applyGoalDraftsFromSummary(
  summary: SummaryViewData | null,
  setTargetInput: (value: string) => void,
  setDeadlineInput: (value: string) => void
) {
  if (!summary?.goal) {
    setTargetInput("");
    setDeadlineInput("");
    return;
  }

  setTargetInput(String(summary.goal.targetAmount));
  setDeadlineInput(
    summary.goal.deadline ? summary.goal.deadline.slice(0, 10) : ""
  );
}

export function useCurrencyGoalSettlementPanel(
  args: UseCurrencyGoalSettlementPanelArgs
) {
  const {
    currency,
    projectId,
    address,
    isConnected,
    initialSummary = null,
  } = args;

  const [targetInput, setTargetInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [summary, setSummary] = useState<SummaryViewData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [goalSaving, setGoalSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const applySummary = useCallback((nextSummary: SummaryViewData | null) => {
    setSummary(nextSummary);
    applyGoalDraftsFromSummary(nextSummary, setTargetInput, setDeadlineInput);
  }, []);

  const refreshSummary = useCallback(async (options?: {
    clearMessage?: boolean;
  }): Promise<boolean> => {
    const clearMessage = options?.clearMessage ?? true;
    if (!projectId) {
      applySummary(null);
      if (clearMessage) {
        setMsg(null);
      }
      return false;
    }

    setSummaryLoading(true);
    if (clearMessage) {
      setMsg(null);
    }

    try {
      const result = await fetchProjectSummary({ projectId });
      if (!result.ok) {
        applySummary(null);
        setMsg(result.error);
        return false;
      }

      applySummary(result.data);
      return true;
    } catch {
      applySummary(null);
      setMsg("SUMMARY_FETCH_FAILED");
      return false;
    } finally {
      setSummaryLoading(false);
    }
  }, [applySummary, projectId]);

  useEffect(() => {
    if (!projectId) {
      applySummary(null);
      setMsg(null);
      return;
    }

    if (initialSummary && initialSummary.project.id === projectId) {
      applySummary(initialSummary);
      setMsg(null);
      return;
    }

    void refreshSummary();
  }, [applySummary, initialSummary, projectId, refreshSummary]);

  const ownerLower = useMemo(() => {
    if (!summary?.project.ownerAddress) return null;
    return summary.project.ownerAddress.toLowerCase();
  }, [summary?.project.ownerAddress]);

  const connectedLower = useMemo(
    () => (address ? address.toLowerCase() : null),
    [address]
  );

  const isOwner =
    !!ownerLower && !!connectedLower && ownerLower === connectedLower;
  const goalIsSet = !!summary?.goal;
  const goalAchieved = !!summary?.goal?.achievedAt;

  // ボタン表示制御のみ。進捗チェックは API 側（goal/achieve）が行う。
  const canAchieve = isOwner && goalIsSet && !goalAchieved;

  const onSaveGoal = useCallback(async (): Promise<boolean> => {
    setMsg(null);

    if (!projectId) {
      setMsg("PROJECT_ID_MISSING");
      return false;
    }
    if (!address) {
      setMsg("WALLET_NOT_CONNECTED");
      return false;
    }

    const trimmed = targetInput.trim();
    const numericTarget = Number(trimmed);
    if (!trimmed || !Number.isFinite(numericTarget) || numericTarget <= 0) {
      setMsg("GOAL_TARGET_INVALID");
      return false;
    }

    const targetAmount =
      currency === "USDC"
        ? Number(numericTarget.toFixed(2))
        : Math.floor(numericTarget);
    const deadline =
      deadlineInput.trim().length > 0
        ? `${deadlineInput.trim()}T00:00:00.000Z`
        : null;

    setGoalSaving(true);

    try {
      const result = await saveProjectGoal({
        projectId,
        address,
        targetAmount,
        deadline,
      });

      if (!result.ok) {
        setMsg(result.error);
        return false;
      }

      const refreshed = await refreshSummary({ clearMessage: false });
      if (refreshed) {
        setMsg("GOAL_SAVED");
      }
      return true;
    } catch {
      setMsg("GOAL_SAVE_FAILED");
      return false;
    } finally {
      setGoalSaving(false);
    }
  }, [address, currency, deadlineInput, projectId, refreshSummary, targetInput]);

  const onAchieveGoal = useCallback(async () => {
    if (!projectId || !address) {
      setMsg("WALLET_NOT_CONNECTED");
      return;
    }

    setSummaryLoading(true);
    setMsg(null);

    try {
      const result = await achieveProjectGoal({
        projectId,
        address,
      });

      if (!result.ok) {
        setMsg(result.error);
        return;
      }

      const refreshed = await refreshSummary({ clearMessage: false });
      if (refreshed) {
        setMsg("GOAL_ACHIEVED_SET");
      }
    } catch {
      setMsg("GOAL_ACHIEVE_FAILED");
    } finally {
      setSummaryLoading(false);
    }
  }, [address, projectId, refreshSummary]);

  return {
    summary,
    summaryLoading,
    goalSaving,
    msg,
    targetInput,
    setTargetInput,
    deadlineInput,
    setDeadlineInput,
    refreshSummary,
    onSaveGoal,
    onAchieveGoal,
    isConnected,
    isOwner,
    goalIsSet,
    goalAchieved,
    canAchieve,
  };
}
