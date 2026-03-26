"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { ManagerDeskOpportunityCrmData } from "@/lib/managerDesk/readModelTypes";

type UseManagerDeskOpportunityCrmState = {
  loading: boolean;
  error: string | null;
  data: ManagerDeskOpportunityCrmData | null;
};

function parseResponse(value: unknown): ManagerDeskOpportunityCrmData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("stages" in value) || !("summary" in value) || !("generatedAt" in value)) return null;
  return value as unknown as ManagerDeskOpportunityCrmData;
}

export function useManagerDeskOpportunityCrm(args: {
  address: string | undefined;
  isConnected: boolean;
  creatorProfileId: string | null;
}) {
  const [state, setState] = useState<UseManagerDeskOpportunityCrmState>({
    loading: false,
    error: null,
    data: null,
  });

  const load = useCallback(async () => {
    if (!args.address || !args.isConnected) {
      setState({ loading: false, error: null, data: null });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const searchParams = new URLSearchParams();
      searchParams.set("address", args.address);
      if (args.creatorProfileId) {
        searchParams.set("creatorProfileId", args.creatorProfileId);
      }

      const response = await ownerAuthFetch({
        address: args.address,
        url: `/api/manager-desk/opportunities?${searchParams.toString()}`,
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) throw new Error("MANAGER_DESK_OPPORTUNITY_CRM_FAILED");

      const parsed = parseResponse(json);
      if (!parsed) throw new Error("MANAGER_DESK_OPPORTUNITY_CRM_INVALID");

      setState({ loading: false, error: null, data: parsed });
    } catch {
      setState({ loading: false, error: "MANAGER_DESK_OPPORTUNITY_CRM_FAILED", data: null });
    }
  }, [args.address, args.creatorProfileId, args.isConnected]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
