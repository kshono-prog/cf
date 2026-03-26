"use client";

import { useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import type { CreatorStageResult } from "@/lib/creatorStage";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

type CreatorStageState = {
  loading: boolean;
  data: CreatorStageResult | null;
};

function parseStageResponse(value: unknown): CreatorStageResult | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!isRecord(value.stage)) return null;
  const stage = value.stage;
  if (
    typeof stage.stage !== "string" ||
    typeof stage.stageLabel !== "string" ||
    !isRecord(stage.maturity)
  ) {
    return null;
  }
  return stage as unknown as CreatorStageResult;
}

export function useCreatorReadyStage(args: {
  address: string | undefined;
  isConnected: boolean;
}) {
  const [state, setState] = useState<CreatorStageState>({
    loading: false,
    data: null,
  });

  useEffect(() => {
    const address = args.address;
    if (!address || !args.isConnected) {
      setState({ loading: false, data: null });
      return;
    }

    const ownerAddress: string = address;
    let cancelled = false;

    async function load(): Promise<void> {
      setState((current) => ({ ...current, loading: true }));
      try {
        const searchParams = new URLSearchParams();
        searchParams.set("address", ownerAddress);
        const response = await ownerAuthFetch({
          address: ownerAddress,
          url: `/api/mypage/creator-stage?${searchParams.toString()}`,
        });
        const json: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("STAGE_FAILED");
        const parsed = parseStageResponse(json);
        if (cancelled) return;
        setState({ loading: false, data: parsed });
      } catch {
        if (cancelled) return;
        setState({ loading: false, data: null });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [args.address, args.isConnected]);

  return state;
}
