"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { SupporterOverviewData } from "@/lib/operations/supporterOverviewTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type SupporterOverviewState = {
  loading: boolean;
  error: string | null;
  data: SupporterOverviewData | null;
};

function parseSupporterOverviewResponse(value: unknown): SupporterOverviewData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("totalSupporterCount" in value)) return null;
  return value as unknown as SupporterOverviewData;
}

export function useCreatorReadySupporterOverview(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<SupporterOverviewState>({
    loading: false,
    error: null,
    data: null,
  });

  useEffect(() => {
    const address = args.address;
    if (!address || !args.isConnected) {
      setState({ loading: false, error: null, data: null });
      return;
    }

    const ownerAddress: string = address;
    let cancelled = false;

    async function load(): Promise<void> {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const searchParams = new URLSearchParams();
        searchParams.set("address", ownerAddress);
        const response = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/mypage/supporter-overview?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("MYPAGE_SUPPORTER_OVERVIEW_FAILED");
        const parsed = parseSupporterOverviewResponse(json);
        if (!parsed) throw new Error("MYPAGE_SUPPORTER_OVERVIEW_INVALID");
        if (cancelled) return;
        setState({ loading: false, error: null, data: parsed });
      } catch {
        if (cancelled) return;
        setState({ loading: false, error: "MYPAGE_SUPPORTER_OVERVIEW_FAILED", data: null });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected]);

  return state;
}
