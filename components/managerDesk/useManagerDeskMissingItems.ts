"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { MissingItemsData } from "@/lib/operations/missingItemsTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type MissingItemsState = {
  loading: boolean;
  error: string | null;
  data: MissingItemsData | null;
};

function parseMissingItemsResponse(value: unknown): MissingItemsData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("items" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }
  return value as unknown as MissingItemsData;
}

export function useManagerDeskMissingItems(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<MissingItemsState>({
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
          url: `/api/manager-desk/missing-items?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("MANAGER_DESK_MISSING_ITEMS_FAILED");
        }

        const parsed = parseMissingItemsResponse(json);
        if (!parsed) {
          throw new Error("MANAGER_DESK_MISSING_ITEMS_INVALID");
        }

        if (cancelled) return;
        setState({ loading: false, error: null, data: parsed });
      } catch {
        if (cancelled) return;
        setState({
          loading: false,
          error: "MANAGER_DESK_MISSING_ITEMS_FAILED",
          data: null,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected]);

  return state;
}
