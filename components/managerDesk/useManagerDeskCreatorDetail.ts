"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { ManagerDeskCreatorDetailData } from "@/lib/managerDesk/readModelTypes";

type UseManagerDeskCreatorDetailState = {
  loading: boolean;
  error: string | null;
  data: ManagerDeskCreatorDetailData | null;
};

function parseCreatorDetailResponse(
  value: unknown
): ManagerDeskCreatorDetailData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("creator" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }

  return value as unknown as ManagerDeskCreatorDetailData;
}

export function useManagerDeskCreatorDetail(args: {
  creatorProfileId: string;
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<UseManagerDeskCreatorDetailState>({
    loading: false,
    error: null,
    data: null,
  });

  const load = useCallback(async () => {
    if (!args.address || !args.isConnected) {
      setState({
        loading: false,
        error: null,
        data: null,
      });
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const searchParams = new URLSearchParams();
      searchParams.set("address", args.address);
      const response = await ownerAuthFetch({
        address: args.address,
        url: `/api/manager-desk/creators/${encodeURIComponent(
          args.creatorProfileId
        )}?${searchParams.toString()}`,
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("MANAGER_DESK_CREATOR_DETAIL_FAILED");
      }

      const parsed = parseCreatorDetailResponse(json);
      if (!parsed) {
        throw new Error("MANAGER_DESK_CREATOR_DETAIL_INVALID");
      }

      setState({
        loading: false,
        error: null,
        data: parsed,
      });
    } catch {
      setState({
        loading: false,
        error: "MANAGER_DESK_CREATOR_DETAIL_FAILED",
        data: null,
      });
    }
  }, [args.address, args.creatorProfileId, args.isConnected]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
