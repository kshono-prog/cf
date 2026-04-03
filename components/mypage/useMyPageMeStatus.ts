"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";

import { fetchMe } from "@/lib/api/creator";
import type { ProjectIdsByCurrency } from "@/lib/mypage/accountPageTypes";
import type { MeStatus, Status } from "@/lib/mypage/types";
import type { CreatorProfile } from "@/types/creator";

type UserLike = MeStatus["user"];
type ConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

type Args = {
  address: Address | undefined;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  appAuthStatus: "authenticated" | "checking" | "unauthenticated";
  username: string;
  skipInitialRefresh?: boolean;
  initialProjectId?: string | null;
  initialProjectIdsByCurrency?: ProjectIdsByCurrency;
  initialMeStatus?: MeStatus | null;
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
  connectionStatus,
  appAuthStatus,
  username,
  skipInitialRefresh = false,
  initialProjectId = null,
  initialProjectIdsByCurrency = { JPYC: null, USDC: null },
  initialMeStatus = null,
  resetProfileState,
  applyUserOnly,
  applyCreatorProfile,
}: Args) {
  const [status, setStatus] = useState<Status>(() =>
    initialMeStatus ? resolveStatus(initialMeStatus) : "loading"
  );
  const [me, setMe] = useState<MeStatus | null>(initialMeStatus);
  const [localProjectId, setLocalProjectId] = useState<string | null>(
    initialProjectId ??
      (initialMeStatus ? pickDefaultProjectId(initialMeStatus) : null)
  );
  const [projectIdsByCurrency, setProjectIdsByCurrency] =
    useState<ProjectIdsByCurrency>(
      initialMeStatus?.projectIdsByCurrency ?? initialProjectIdsByCurrency
    );

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
      if (!result.ok) {
        if (result.error === "HTTP 401") {
          setStatus("authRequired");
        }
        return null;
      }

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
    if (
      connectionStatus === "connecting" ||
      connectionStatus === "reconnecting"
    ) {
      if (!hydratedRef.current && !initialMeStatus) {
        setStatus("loading");
      }
      return;
    }

    if (!isConnected || !address) {
      setStatus("unconnected");
      setMe(null);
      setLocalProjectId(null);
      setProjectIdsByCurrency({ JPYC: null, USDC: null });
      hydratedRef.current = false;
      resetProfileState(username);
      return;
    }

    if (appAuthStatus === "checking") {
      setStatus("loading");
      return;
    }

    if (appAuthStatus !== "authenticated") {
      setStatus("authRequired");
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
      if (initialMeStatus && !hydratedRef.current) {
        hydrateFormFromSummary(initialMeStatus);
        hydratedRef.current = true;
        if (skipInitialRefresh) {
          return;
        }
      } else {
        setStatus("loading");
      }

      let meData: MeStatus | null = null;
      try {
        meData = await refreshMeStatus(connectedAddress);
      } catch {
        meData = null;
      }
      if (cancelled || !meData) {
        if (!initialMeStatus && !hydratedRef.current) {
          setStatus("loading");
        }
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
    appAuthStatus,
    connectionStatus,
    hydrateFormFromSummary,
    initialMeStatus,
    isConnected,
    refreshMeStatus,
    resetProfileState,
    skipInitialRefresh,
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
