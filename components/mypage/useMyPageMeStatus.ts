"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";

import { fetchMe } from "@/lib/api/creator";
import type { ProjectIdsByCurrency } from "@/lib/mypage/accountPageTypes";
import type { MeStatus, Status } from "@/lib/mypage/types";
import type { CreatorProfile } from "@/types/creator";

type UserLike = MeStatus["user"];

type Args = {
  address: Address | undefined;
  isConnected: boolean;
  username: string;
  initialProjectId?: string | null;
  initialProjectIdsByCurrency?: ProjectIdsByCurrency;
  resetProfileState: (nextUsername?: string) => void;
  applyUserOnly: (user: UserLike, nextUsername?: string) => void;
  applyCreatorProfile: (
    creator: CreatorProfile,
    user: UserLike,
    fallbackUsername?: string
  ) => void;
};

function resolveStatus(meData: MeStatus): Status {
  if (!meData.hasUser) return "noUser";
  if (!meData.hasCreator || !meData.creator) return "userOnly";
  return "creatorReady";
}

function pickDefaultProjectId(meData: MeStatus): string | null {
  return (
    meData.projectId ??
    meData.projectIdsByCurrency?.JPYC ??
    meData.projectIdsByCurrency?.USDC ??
    null
  );
}

export function useMyPageMeStatus({
  address,
  isConnected,
  username,
  initialProjectId = null,
  initialProjectIdsByCurrency = { JPYC: null, USDC: null },
  resetProfileState,
  applyUserOnly,
  applyCreatorProfile,
}: Args) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<MeStatus | null>(null);
  const [localProjectId, setLocalProjectId] = useState<string | null>(
    initialProjectId
  );
  const [projectIdsByCurrency, setProjectIdsByCurrency] =
    useState<ProjectIdsByCurrency>(initialProjectIdsByCurrency);

  const hydratedRef = useRef(false);

  const hydrateFormFromSummary = useCallback(
    (meData: MeStatus) => {
      if (!meData.hasUser) {
        resetProfileState(username);
        return;
      }
      if (!meData.hasCreator || !meData.creator) {
        applyUserOnly(meData.user, username);
        return;
      }
      applyCreatorProfile(meData.creator, meData.user, username);
    },
    [applyCreatorProfile, applyUserOnly, resetProfileState, username]
  );

  const refreshMeStatus = useCallback(
    async (walletAddress: Address): Promise<MeStatus | null> => {
      const result = await fetchMe(walletAddress);
      if (!result.ok) return null;

      const meData = result.data;
      const nextProjectIds =
        meData.projectIdsByCurrency ?? { JPYC: null, USDC: null };

      setMe(meData);
      setProjectIdsByCurrency(nextProjectIds);
      setLocalProjectId(pickDefaultProjectId(meData));
      setStatus(resolveStatus(meData));

      return meData;
    },
    []
  );

  const syncActiveProjectId = useCallback(
    (projectId: string | null, changedCurrency: keyof ProjectIdsByCurrency) => {
      setProjectIdsByCurrency((prev) => ({
        ...prev,
        [changedCurrency]: projectId,
      }));
      setLocalProjectId(projectId);
    },
    []
  );

  useEffect(() => {
    if (!isConnected || !address) {
      setStatus("unconnected");
      setMe(null);
      setLocalProjectId(null);
      setProjectIdsByCurrency({ JPYC: null, USDC: null });
      hydratedRef.current = false;
      resetProfileState(username);
      return;
    }

    const connectedAddress = address;
    let cancelled = false;

    async function run(): Promise<void> {
      setStatus("loading");
      const meData = await refreshMeStatus(connectedAddress);
      if (cancelled || !meData) {
        setStatus("loading");
        return;
      }

      if (!hydratedRef.current) {
        hydrateFormFromSummary(meData);
        hydratedRef.current = true;
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    address,
    hydrateFormFromSummary,
    isConnected,
    refreshMeStatus,
    resetProfileState,
    username,
  ]);

  return {
    status,
    me,
    localProjectId,
    projectIdsByCurrency,
    refreshMeStatus,
    syncActiveProjectId,
  };
}
