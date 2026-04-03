"use client";

import { useCallback, useEffect, useState } from "react";

import { isRecord } from "@/lib/api/guards";
import { ownerAuthFetch } from "@/lib/ownerAuthClient";
import type { ManagerDeskNotesSurfaceData } from "@/lib/managerDesk/readModelTypes";

type UseManagerDeskNotesSurfaceState = {
  loading: boolean;
  error: string | null;
  data: ManagerDeskNotesSurfaceData | null;
};

function parseNotesSurfaceResponse(
  value: unknown
): ManagerDeskNotesSurfaceData | null {
  if (!isRecord(value) || value.ok !== true) return null;
  if (!("items" in value) || !("summary" in value) || !("generatedAt" in value)) {
    return null;
  }

  return value as unknown as ManagerDeskNotesSurfaceData;
}

export function useManagerDeskNotesSurface(args: {
  address: string | undefined;
  isConnected: boolean;
  creatorProfileId: string | null;
  noteType: string | null;
  visibility: string | null;
  followUpOnly: boolean;
  q: string | null;
}) {
  const [state, setState] = useState<UseManagerDeskNotesSurfaceState>({
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
      if (args.noteType) {
        searchParams.set("noteType", args.noteType);
      }
      if (args.visibility) {
        searchParams.set("visibility", args.visibility);
      }
      if (args.followUpOnly) {
        searchParams.set("followUpOnly", "1");
      }
      if (args.q) {
        searchParams.set("q", args.q);
      }

      const response = await ownerAuthFetch({
        address: args.address,
        url: `/api/manager-desk/notes?${searchParams.toString()}`,
      });
      const json: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("MANAGER_DESK_NOTES_FAILED");
      }

      const parsed = parseNotesSurfaceResponse(json);
      if (!parsed) {
        throw new Error("MANAGER_DESK_NOTES_INVALID");
      }

      setState({
        loading: false,
        error: null,
        data: parsed,
      });
    } catch {
      setState((current) => ({
        loading: false,
        error: "MANAGER_DESK_NOTES_FAILED",
        data: current.data,
      }));
    }
  }, [
    args.address,
    args.creatorProfileId,
    args.followUpOnly,
    args.isConnected,
    args.noteType,
    args.q,
    args.visibility,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}
