"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { CreatorManagerFeedData } from "@/lib/operations/managerFeedTypes";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type ManagerFeedState = {
  loading: boolean;
  error: string | null;
  data: CreatorManagerFeedData | null;
};

function parseManagerFeedResponse(value: unknown): CreatorManagerFeedData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("items" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }

  return value as unknown as CreatorManagerFeedData;
}

export function useCreatorReadyManagerFeed(args: {
  address: string | undefined;
  isConnected: boolean;
  limit?: number;
}) {
  const [state, setState] = useState<ManagerFeedState>({
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
        searchParams.set("limit", String(args.limit ?? 4));

        const response = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/mypage/manager-feed?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error("MYPAGE_MANAGER_FEED_FAILED");
        }

        const parsed = parseManagerFeedResponse(json);
        if (!parsed) {
          throw new Error("MYPAGE_MANAGER_FEED_INVALID");
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
          error: "MYPAGE_MANAGER_FEED_FAILED",
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
