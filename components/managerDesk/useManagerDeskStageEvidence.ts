"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

export type StageEvidenceItem = {
  id: string;
  creatorProfileId: string;
  stageId: string;
  evidenceType: string;
  value: string;
  verifiedAt: string;
  recordedBy: string | null;
  notes: string | null;
  createdAt: string;
};

type State = {
  loading: boolean;
  error: string | null;
  items: StageEvidenceItem[];
};

export function useManagerDeskStageEvidence(args: {
  address: string | undefined;
  isConnected: boolean;
  creatorProfileId: string | null;
}) {
  const [state, setState] = useState<State>({ loading: false, error: null, items: [] });

  const load = useCallback(async () => {
    if (!args.address || !args.isConnected || !args.creatorProfileId) {
      setState({ loading: false, error: null, items: [] });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = new URLSearchParams({
        address: args.address,
        creatorProfileId: args.creatorProfileId,
      });
      const res = await ownerAuthFetch({
        address: args.address,
        url: `/api/stage-evidence?${params.toString()}`,
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error("STAGE_EVIDENCE_FAILED");
      if (!isRecord(json) || !Array.isArray(json.stageEvidences))
        throw new Error("STAGE_EVIDENCE_INVALID");
      setState({ loading: false, error: null, items: json.stageEvidences as StageEvidenceItem[] });
    } catch {
      setState({ loading: false, error: "STAGE_EVIDENCE_FAILED", items: [] });
    }
  }, [args.address, args.isConnected, args.creatorProfileId]);

  useEffect(() => { void load(); }, [load]);

  function addItem(item: StageEvidenceItem) {
    setState((s) => ({ ...s, items: [item, ...s.items] }));
  }

  return { ...state, reload: load, addItem };
}
