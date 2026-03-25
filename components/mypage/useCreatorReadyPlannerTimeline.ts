"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { PlannerTimelineData } from "@/lib/operations/plannerTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type PlannerState = {
  loading: boolean;
  error: string | null;
  data: PlannerTimelineData | null;
};

function parsePlannerResponse(value: unknown): PlannerTimelineData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("items" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }

  return value as unknown as PlannerTimelineData;
}

export function useCreatorReadyPlannerTimeline(args: {
  address: string | undefined;
  isConnected: boolean;
  limit?: number;
}) {
  const [state, setState] = useState<PlannerState>({
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
        searchParams.set("limit", String(args.limit ?? 6));

        const response = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/mypage/planner?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("MYPAGE_PLANNER_FAILED");
        }

        const parsed = parsePlannerResponse(json);
        if (!parsed) {
          throw new Error("MYPAGE_PLANNER_INVALID");
        }

        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          data: parsed,
        });
      } catch {
        if (cancelled) return;
        setState({
          loading: false,
          error: "MYPAGE_PLANNER_FAILED",
          data: null,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected, args.limit]);

  return state;
}
