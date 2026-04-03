"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { SupporterCrmData } from "@/lib/operations/supporterCrmTypes";

type State = { loading: boolean; error: string | null; data: SupporterCrmData | null };

function parseResponse(value: unknown): SupporterCrmData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("items" in value) || !("totalSupporterCount" in value)) return null;
  return value as unknown as SupporterCrmData;
}

export function useManagerDeskSupporterCrm(args: {
  address: string | undefined;
  isConnected: boolean;
  creatorProfileId: string | null;
}) {
  const [state, setState] = useState<State>({ loading: false, error: null, data: null });

  const load = useCallback(async () => {
    if (!args.address || !args.isConnected || !args.creatorProfileId) {
      setState({ loading: false, error: null, data: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const params = new URLSearchParams({ address: args.address });
      const response = await ownerAuthFetch({
        address: args.address,
        url: `/api/manager-desk/creators/${args.creatorProfileId}/supporter-crm?${params.toString()}`,
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error("SUPPORTER_CRM_FAILED");
      const parsed = parseResponse(json);
      if (!parsed) throw new Error("SUPPORTER_CRM_INVALID");
      setState({ loading: false, error: null, data: parsed });
    } catch {
      setState((current) => ({
        loading: false,
        error: "SUPPORTER_CRM_FAILED",
        data: current.data,
      }));
    }
  }, [args.address, args.isConnected, args.creatorProfileId]);

  useEffect(() => { void load(); }, [load]);

  return { ...state, reload: load };
}
