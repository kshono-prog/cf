"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";

import {
  type DistributionDraft,
  type DistributionEntry,
  type RefreshProjectSettlement,
  type SetProjectSettlementLoading,
  type SetProjectSettlementMessage,
  type SettlementView,
  makeEmptyRow,
} from "@/components/mypage/projectSettlementRuntime";
import type { CurrencyCode } from "@/lib/mypage/accountPageTypes";
import { saveProjectSettlementDistributions } from "@/lib/mypage/api";

type UseProjectSettlementDistributionStateArgs = {
  projectId: string | null;
  walletAddress: string | null;
  projectCurrency: CurrencyCode;
  settlement: SettlementView | null;
  refresh: RefreshProjectSettlement;
  setLoading: SetProjectSettlementLoading;
  setMessage: SetProjectSettlementMessage;
};

export function useProjectSettlementDistributionState(
  args: UseProjectSettlementDistributionStateArgs
) {
  const {
    projectId,
    walletAddress,
    projectCurrency,
    settlement,
    refresh,
    setLoading,
    setMessage,
  } = args;

  const [rows, setRows] = useState<DistributionDraft[]>([
    makeEmptyRow(projectCurrency),
  ]);
  const [draftDirty, setDraftDirty] = useState(false);

  useEffect(() => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        token: projectCurrency,
      }))
    );
  }, [projectCurrency]);

  const totals = useMemo(() => {
    const planned = rows.reduce((acc, row) => {
      const raw = row.amountAtomic.trim();
      if (!/^\d+$/.test(raw)) return acc;
      const value = BigInt(raw);
      if (value <= 0n) return acc;
      return acc + value;
    }, 0n);

    const bridgedRaw = settlement?.bridgedTotalAtomic ?? "0";
    const bridged = /^\d+$/.test(bridgedRaw) ? BigInt(bridgedRaw) : 0n;
    return {
      planned,
      bridged,
      exceeds: planned > bridged,
    };
  }, [rows, settlement?.bridgedTotalAtomic]);

  const applyDistributionEntries = useCallback(
    (distributionEntries: DistributionEntry[]) => {
      const editableRows = distributionEntries
        .filter((entry) => entry.status !== "SENT")
        .map((entry) => ({
          id: entry.id,
          recipientAddress: entry.recipientAddressChecksum,
          amountAtomic: entry.amountAtomic,
          memo: entry.memo ?? "",
          token: projectCurrency,
        }));

      setRows(
        editableRows.length > 0 ? editableRows : [makeEmptyRow(projectCurrency)]
      );
      setDraftDirty(false);
    },
    [projectCurrency]
  );

  const resetDistributionState = useCallback(() => {
    setRows([makeEmptyRow(projectCurrency)]);
    setDraftDirty(false);
  }, [projectCurrency]);

  const updateDraft = useCallback(
    (index: number, patch: Partial<DistributionDraft>) => {
      setRows((prev) =>
        prev.map((row, rowIndex) =>
          rowIndex === index ? { ...row, ...patch } : row
        )
      );
      setDraftDirty(true);
    },
    []
  );

  const addDraftRow = useCallback(() => {
    setRows((prev) => [...prev, makeEmptyRow(projectCurrency)]);
    setDraftDirty(true);
  }, [projectCurrency]);

  const removeDraftRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setDraftDirty(true);
  }, []);

  const replaceDraftRows = useCallback(
    (nextRows: DistributionDraft[]) => {
      const normalizedRows = nextRows.map((row) => ({
        ...row,
        token: projectCurrency,
      }));

      setRows(
        normalizedRows.length > 0
          ? normalizedRows
          : [makeEmptyRow(projectCurrency)]
      );
      setDraftDirty(true);
    },
    [projectCurrency]
  );

  const saveDistributions = useCallback(async () => {
    if (!projectId || !walletAddress) {
      setMessage("ADDRESS_REQUIRED");
      return;
    }

    for (const row of rows) {
      if (!isAddress(row.recipientAddress)) {
        setMessage("RECIPIENT_ADDRESS_INVALID");
        return;
      }
      if (!/^\d+$/.test(row.amountAtomic) || row.amountAtomic === "0") {
        setMessage("AMOUNT_INVALID");
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await saveProjectSettlementDistributions({
        projectId,
        address: walletAddress,
        entries: rows.map((row, index) => ({
          id: row.id,
          recipientAddress: getAddress(row.recipientAddress),
          amountAtomic: row.amountAtomic,
          memo: row.memo.trim() || undefined,
          token: projectCurrency,
          orderIndex: index,
        })),
      });

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      setMessage("DISTRIBUTION_DRAFT_SAVED");
      await refresh();
    } catch {
      setMessage("DISTRIBUTION_SAVE_FAILED");
    } finally {
      setLoading(false);
    }
  }, [
    projectCurrency,
    projectId,
    refresh,
    rows,
    setLoading,
    setMessage,
    walletAddress,
  ]);

  return {
    rows,
    draftDirty,
    totals,
    applyDistributionEntries,
    resetDistributionState,
    updateDraft,
    addDraftRow,
    removeDraftRow,
    replaceDraftRows,
    saveDistributions,
  };
}
