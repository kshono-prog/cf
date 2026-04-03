"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { SupporterCrmData } from "@/lib/operations/supporterCrmTypes";
import type {
  SupporterCrmCurrencyBreakdown,
  SupporterCrmItem,
} from "@/lib/operations/supporterCrmTypes";

type State = { loading: boolean; error: string | null; data: SupporterCrmData | null };

function isCurrencyBreakdown(value: unknown): value is SupporterCrmCurrencyBreakdown {
  return (
    isRecord(value) &&
    typeof value.currency === "string" &&
    typeof value.amount === "string" &&
    typeof value.count === "number"
  );
}

function isSupporterCrmItem(value: unknown): value is SupporterCrmItem {
  return (
    isRecord(value) &&
    typeof value.fromAddress === "string" &&
    typeof value.totalCount === "number" &&
    (value.firstSupportAt === null || typeof value.firstSupportAt === "string") &&
    (value.lastSupportAt === null || typeof value.lastSupportAt === "string") &&
    Array.isArray(value.currencies) &&
    value.currencies.every(isCurrencyBreakdown) &&
    typeof value.consecutiveSupportMonths === "number" &&
    typeof value.trustScore === "number"
  );
}

function parseResponse(value: unknown): SupporterCrmData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (
    typeof value.creatorProfileId !== "string" ||
    !Array.isArray(value.items) ||
    !value.items.every(isSupporterCrmItem) ||
    typeof value.totalSupporterCount !== "number" ||
    typeof value.generatedAt !== "string"
  ) {
    return null;
  }
  return {
    creatorProfileId: value.creatorProfileId,
    items: value.items,
    totalSupporterCount: value.totalSupporterCount,
    generatedAt: value.generatedAt,
  };
}

export function useCreatorReadySupporterCrm(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<State>({ loading: false, error: null, data: null });

  const load = useCallback(async () => {
    if (!args.address || !args.isConnected) {
      setState({ loading: false, error: null, data: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const response = await ownerAuthFetch({
        address: args.address,
        url: `/api/mypage/supporter-crm?address=${encodeURIComponent(args.address)}`,
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error("SUPPORTER_CRM_FAILED");
      const parsed = parseResponse(json);
      if (!parsed) throw new Error("SUPPORTER_CRM_INVALID");
      setState({ loading: false, error: null, data: parsed });
    } catch (error: unknown) {
      const code =
        error instanceof Error && typeof error.message === "string"
          ? error.message
          : "SUPPORTER_CRM_FAILED";
      setState({ loading: false, error: code, data: null });
    }
  }, [args.address, args.isConnected]);

  useEffect(() => { void load(); }, [load]);

  return { ...state, reload: load };
}
