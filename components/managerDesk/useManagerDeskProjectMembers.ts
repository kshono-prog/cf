"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";

export type ProjectMemberItem = {
  id: string;
  projectId: string;
  creatorProfileId: string | null;
  walletAddress: string | null;
  displayName: string | null;
  role: string;
  sharePercent: number | null;
  note: string | null;
  status: string;
  addedAt: string;
  createdAt: string;
};

type State = {
  loading: boolean;
  error: string | null;
  items: ProjectMemberItem[];
};

export function useManagerDeskProjectMembers(args: {
  address: string | undefined;
  isConnected: boolean;
  creatorProfileId: string | null;
  projectId?: string | null;
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
      if (args.projectId) params.set("projectId", args.projectId);
      const res = await ownerAuthFetch({
        address: args.address,
        url: `/api/project-members?${params.toString()}`,
      });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error("PROJECT_MEMBERS_FAILED");
      if (!isRecord(json) || !Array.isArray(json.projectMembers))
        throw new Error("PROJECT_MEMBERS_INVALID");
      setState({ loading: false, error: null, items: json.projectMembers as ProjectMemberItem[] });
    } catch {
      setState((current) => ({
        loading: false,
        error: "PROJECT_MEMBERS_FAILED",
        items: current.items,
      }));
    }
  }, [args.address, args.isConnected, args.creatorProfileId, args.projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function addItem(item: ProjectMemberItem) {
    setState((s) => ({ ...s, items: [...s.items, item] }));
  }

  return { ...state, reload: load, addItem };
}
