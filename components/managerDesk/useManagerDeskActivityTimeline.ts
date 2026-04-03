"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type {
  ManagerDeskActivityTimelineData,
  ManagerDeskActivityTimelineSourceType,
} from "@/lib/managerDesk/readModelTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type UseManagerDeskActivityTimelineState = {
  loading: boolean;
  error: string | null;
  data: ManagerDeskActivityTimelineData | null;
};

function parseActivityTimelineResponse(
  value: unknown
): ManagerDeskActivityTimelineData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("items" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }

  return value as unknown as ManagerDeskActivityTimelineData;
}

export function useManagerDeskActivityTimeline(args: {
  address: string | undefined;
  isConnected: boolean;
  creatorProfileId: string | null;
  sourceType: ManagerDeskActivityTimelineSourceType | null;
}) {
  const [state, setState] = useState<UseManagerDeskActivityTimelineState>({
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
      if (args.creatorProfileId) {
        searchParams.set("creatorProfileId", args.creatorProfileId);
      }
      if (args.sourceType) {
        searchParams.set("sourceType", args.sourceType);
      }

      const response = await ownerAuthFetch({
        address: args.address,
        url: `/api/manager-desk/activity?${searchParams.toString()}`,
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("MANAGER_DESK_ACTIVITY_TIMELINE_FAILED");
      }

      const parsed = parseActivityTimelineResponse(json);
      if (!parsed) {
        throw new Error("MANAGER_DESK_ACTIVITY_TIMELINE_INVALID");
      }

      setState({
        loading: false,
        error: null,
        data: parsed,
      });
    } catch {
      setState((current) => ({
        loading: false,
        error: "MANAGER_DESK_ACTIVITY_TIMELINE_FAILED",
        data: current.data,
      }));
    }
  }, [args.address, args.creatorProfileId, args.isConnected, args.sourceType]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
