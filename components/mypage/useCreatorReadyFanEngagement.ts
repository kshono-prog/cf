"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { FanEngagementTimeline } from "@/lib/fanEngagement/engagementTimeline";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type FanEngagementState = {
  loading: boolean;
  error: string | null;
  data: FanEngagementTimeline | null;
};

function parseFanEngagementResponse(value: unknown): FanEngagementTimeline | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (typeof value.totalContributorCount !== "number") return null;
  if (!Array.isArray(value.recentContributions)) return null;
  if (typeof value.thankNeededCount !== "number") return null;
  if (value.weekHighlight !== null && typeof value.weekHighlight !== "string") return null;
  const heatmap =
    Array.isArray(value.heatmap) ? (value.heatmap as FanEngagementTimeline["heatmap"]) : null;
  const peakWeekday =
    typeof value.peakWeekday === "number" ? value.peakWeekday : null;
  return {
    ...(value as unknown as FanEngagementTimeline),
    heatmap,
    peakWeekday,
  };
}

export function useCreatorReadyFanEngagement(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<FanEngagementState>({
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
          url: `/api/mypage/fan-engagement?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("MYPAGE_FAN_ENGAGEMENT_FAILED");
        const parsed = parseFanEngagementResponse(json);
        if (!parsed) throw new Error("MYPAGE_FAN_ENGAGEMENT_INVALID");
        if (cancelled) return;
        setState({ loading: false, error: null, data: parsed });
      } catch {
        if (cancelled) return;
        setState({ loading: false, error: "MYPAGE_FAN_ENGAGEMENT_FAILED", data: null });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected]);

  return state;
}
