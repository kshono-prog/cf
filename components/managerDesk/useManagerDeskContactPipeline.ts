"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { ManagerDeskContactPipelineData } from "@/lib/managerDesk/readModelTypes";

type UseManagerDeskContactPipelineState = {
  loading: boolean;
  error: string | null;
  data: ManagerDeskContactPipelineData | null;
};

function parseContactPipelineResponse(
  value: unknown
): ManagerDeskContactPipelineData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("items" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }

  return value as unknown as ManagerDeskContactPipelineData;
}

export function useManagerDeskContactPipeline(args: {
  address: string | undefined;
  isConnected: boolean;
  creatorProfileId: string | null;
  status: string | null;
  overdueOnly: boolean;
}) {
  const [state, setState] = useState<UseManagerDeskContactPipelineState>({
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
      if (args.status) {
        searchParams.set("status", args.status);
      }
      if (args.overdueOnly) {
        searchParams.set("overdue", "1");
      }

      const response = await ownerAuthFetch({
        address: args.address,
        url: `/api/manager-desk/contacts?${searchParams.toString()}`,
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("MANAGER_DESK_CONTACT_PIPELINE_FAILED");
      }

      const parsed = parseContactPipelineResponse(json);
      if (!parsed) {
        throw new Error("MANAGER_DESK_CONTACT_PIPELINE_INVALID");
      }

      setState({
        loading: false,
        error: null,
        data: parsed,
      });
    } catch {
      setState({
        loading: false,
        error: "MANAGER_DESK_CONTACT_PIPELINE_FAILED",
        data: null,
      });
    }
  }, [args.address, args.creatorProfileId, args.isConnected, args.overdueOnly, args.status]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
