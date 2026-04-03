"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { CreatorDailyBriefingData } from "@/lib/operations/dailyBriefingTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type DailyBriefingState = {
  loading: boolean;
  error: string | null;
  data: CreatorDailyBriefingData | null;
};

function parseBriefingResponse(
  value: unknown
): CreatorDailyBriefingData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (
    !("focusTheme" in value) ||
    !("attentionItems" in value) ||
    !("generatedAt" in value)
  ) {
    return null;
  }

  return value as unknown as CreatorDailyBriefingData;
}

export function useCreatorReadyDailyBriefing(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<DailyBriefingState>({
    loading: false,
    error: null,
    data: null,
  });

  useEffect(() => {
    const address = args.address;
    if (!address || !args.isConnected) {
      setState({
        loading: false,
        error: null,
        data: null,
      });
      return;
    }

    const ownerAddress: string = address;
    let cancelled = false;

    async function load(): Promise<void> {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const searchParams = new URLSearchParams();
        searchParams.set("address", ownerAddress);

        const response = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/mypage/daily-briefing?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("MYPAGE_DAILY_BRIEFING_FAILED");
        }

        const parsed = parseBriefingResponse(json);
        if (!parsed) {
          throw new Error("MYPAGE_DAILY_BRIEFING_INVALID");
        }

        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          data: parsed,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        const code =
          error instanceof Error && typeof error.message === "string"
            ? error.message
            : "MYPAGE_DAILY_BRIEFING_FAILED";
        setState({
          loading: false,
          error: code,
          data: null,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected]);

  return state;
}
