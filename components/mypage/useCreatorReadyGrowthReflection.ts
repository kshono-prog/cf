"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { GrowthReflectionData } from "@/lib/operations/growthReflectionTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type GrowthReflectionState = {
  loading: boolean;
  error: string | null;
  data: GrowthReflectionData | null;
};

function parseGrowthReflectionResponse(value: unknown): GrowthReflectionData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (
    !("month" in value) ||
    !("ongoing" in value) ||
    !("completed" in value) ||
    !("improvements" in value) ||
    !("stats" in value)
  ) {
    return null;
  }
  return value as unknown as GrowthReflectionData;
}

export function useCreatorReadyGrowthReflection(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<GrowthReflectionState>({
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
          url: `/api/mypage/growth-reflection?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("MYPAGE_GROWTH_REFLECTION_FAILED");
        }

        const parsed = parseGrowthReflectionResponse(json);
        if (!parsed) {
          throw new Error("MYPAGE_GROWTH_REFLECTION_INVALID");
        }

        if (cancelled) return;
        setState({ loading: false, error: null, data: parsed });
      } catch {
        if (cancelled) return;
        setState({ loading: false, error: "MYPAGE_GROWTH_REFLECTION_FAILED", data: null });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected]);

  return state;
}
