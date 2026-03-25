"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { ManagerDeskDashboardData } from "@/lib/managerDesk/readModelTypes";

type UseManagerDeskDashboardState = {
  loading: boolean;
  error: string | null;
  data: ManagerDeskDashboardData | null;
};

function parseDashboardResponse(value: unknown): ManagerDeskDashboardData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("cards" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }

  return value as unknown as ManagerDeskDashboardData;
}

export function useManagerDeskDashboard(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<UseManagerDeskDashboardState>({
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
        url: `/api/manager-desk/dashboard?${searchParams.toString()}`,
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("MANAGER_DESK_DASHBOARD_FAILED");
      }

      const parsed = parseDashboardResponse(json);
      if (!parsed) {
        throw new Error("MANAGER_DESK_DASHBOARD_INVALID");
      }

      setState({
        loading: false,
        error: null,
        data: parsed,
      });
    } catch {
      setState({
        loading: false,
        error: "MANAGER_DESK_DASHBOARD_FAILED",
        data: null,
      });
    }
  }, [args.address, args.isConnected]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
