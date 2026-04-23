"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Address } from "viem";

import type {
  CurrencyCode,
  SummaryViewData,
  UiMsg,
} from "@/lib/mypage/accountPageTypes";
import {
  fetchProjectSummary,
  saveProjectDistributionPlan,
  saveProjectDistributionResult,
} from "@/lib/mypage/api";
import {
  parseJsonObjectOrArray,
  parseTxHashesText,
} from "@/lib/mypage/parsers";

type ApplySummaryState = (
  view: SummaryViewData | null,
  options?: { preserveDraftInputs?: boolean }
) => void;

type UseMyPageSummaryActionsArgs = {
  projectId: string | null;
  address: Address | undefined;
  planText: string;
  txHashesText: string;
  currency: CurrencyCode;
  distChainId: number;
  note: string;
  applySummaryState: ApplySummaryState;
  setSummaryLoading: Dispatch<SetStateAction<boolean>>;
  setMsg: Dispatch<SetStateAction<UiMsg | null>>;
};

export function useMyPageSummaryActions(
  args: UseMyPageSummaryActionsArgs
) {
  const {
    projectId,
    address,
    planText,
    txHashesText,
    currency,
    distChainId,
    note,
    applySummaryState,
    setSummaryLoading,
    setMsg,
  } = args;

  const refreshSummary = useCallback(async () => {
    if (!projectId) {
      applySummaryState(null);
      return;
    }

    setSummaryLoading(true);
    setMsg(null);

    try {
      const result = await fetchProjectSummary({ projectId });
      if (!result.ok) {
        applySummaryState(null);
        setMsg({ kind: "error", text: result.error });
        return;
      }

      applySummaryState(result.data, { preserveDraftInputs: true });
    } catch {
      applySummaryState(null);
      setMsg({ kind: "error", text: "SUMMARY_FETCH_FAILED" });
    } finally {
      setSummaryLoading(false);
    }
  }, [applySummaryState, projectId, setMsg, setSummaryLoading]);

  const doSavePlan = useCallback(async () => {
    if (!projectId) return;
    if (!address) {
      setMsg({ kind: "error", text: "WALLET_NOT_CONNECTED" });
      return;
    }

    const parsedPlan = parseJsonObjectOrArray(planText);
    if (!parsedPlan) {
      setMsg({ kind: "error", text: "PLAN_INVALID_JSON_OBJECT_OR_ARRAY" });
      return;
    }

    setSummaryLoading(true);
    setMsg(null);

    try {
      const result = await saveProjectDistributionPlan({
        projectId,
        address,
        plan: parsedPlan,
      });

      if (!result.ok) {
        setMsg({ kind: "error", text: result.error });
        return;
      }

      setMsg({ kind: "success", text: "PLAN_SAVED" });
      await refreshSummary();
    } catch {
      setMsg({ kind: "error", text: "PLAN_SAVE_FAILED" });
    } finally {
      setSummaryLoading(false);
    }
  }, [
    address,
    planText,
    projectId,
    refreshSummary,
    setMsg,
    setSummaryLoading,
  ]);

  const doSaveDistributionResult = useCallback(async () => {
    if (!projectId) return;
    if (!address) {
      setMsg({ kind: "error", text: "WALLET_NOT_CONNECTED" });
      return;
    }

    const txHashes = parseTxHashesText(txHashesText);
    if (!txHashes) {
      setMsg({ kind: "error", text: "TX_HASHES_INVALID" });
      return;
    }

    setSummaryLoading(true);
    setMsg(null);

    try {
      const result = await saveProjectDistributionResult({
        projectId,
        address,
        chainId: distChainId,
        currency,
        txHashes,
        dryRun: false,
        note: note.trim() ? note.trim() : undefined,
      });

      if (!result.ok) {
        setMsg({ kind: "error", text: result.error });
        return;
      }

      setMsg({ kind: "success", text: "DISTRIBUTION_RESULT_SAVED" });
      await refreshSummary();
    } catch {
      setMsg({ kind: "error", text: "DISTRIBUTION_SAVE_FAILED" });
    } finally {
      setSummaryLoading(false);
    }
  }, [
    address,
    currency,
    distChainId,
    note,
    projectId,
    refreshSummary,
    setMsg,
    setSummaryLoading,
    txHashesText,
  ]);

  return {
    refreshSummary,
    doSavePlan,
    doSaveDistributionResult,
  };
}
