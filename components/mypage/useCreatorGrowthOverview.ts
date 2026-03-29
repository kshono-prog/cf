"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import {
  parseGrowthOverviewData,
  type GrowthOverviewData,
} from "@/lib/growth/overview";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type GrowthOverviewState = {
  loading: boolean;
  error: string | null;
  data: GrowthOverviewData | null;
};

function parseGrowthOverviewResponse(value: unknown): GrowthOverviewData | null {
  if (!isRecord(value) || value.ok !== true) {
    return null;
  }

  return parseGrowthOverviewData(value.overview);
}

export function useCreatorGrowthOverview(args: {
  address: string | undefined;
  isConnected: boolean;
  enabled?: boolean;
}) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<GrowthOverviewState>({
    loading: false,
    error: null,
    data: null,
  });
  const refresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    const ownerAddress = args.address;

    if (
      typeof ownerAddress !== "string" ||
      ownerAddress.length === 0 ||
      !args.isConnected ||
      args.enabled === false
    ) {
      setState({ loading: false, error: null, data: null });
      return;
    }

    const resolvedOwnerAddress = ownerAddress;
    let cancelled = false;

    async function load(): Promise<void> {
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const searchParams = new URLSearchParams();
        searchParams.set("address", resolvedOwnerAddress);

        const response = await ownerAuthFetch({
          address: resolvedOwnerAddress,
          url: `/api/mypage/growth-overview?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("MYPAGE_GROWTH_OVERVIEW_FAILED");
        }

        const parsed = parseGrowthOverviewResponse(json);
        if (!parsed) {
          throw new Error("MYPAGE_GROWTH_OVERVIEW_INVALID");
        }

        if (cancelled) {
          return;
        }

        setState({ loading: false, error: null, data: parsed });
      } catch {
        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          error: "MYPAGE_GROWTH_OVERVIEW_FAILED",
          data: null,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.address, args.enabled, args.isConnected, refreshToken]);

  return {
    ...state,
    refresh,
  };
}
