"use client";

import { useCallback } from "react";

import { useOwnerSession } from "@/context/OwnerSessionProvider";

export function useManagerDeskAccessState(args: { isConnected: boolean }) {
  const ownerSession = useOwnerSession();

  const canReadProtectedData =
    args.isConnected && ownerSession.status === "authenticated";
  const authChecking =
    args.isConnected &&
    (ownerSession.status === "checking" || ownerSession.status === "idle");
  const authRequired =
    args.isConnected && ownerSession.status === "unauthenticated";

  const authenticate = useCallback(() => {
    void ownerSession.authenticate();
  }, [ownerSession]);

  return {
    canReadProtectedData,
    authChecking,
    authRequired,
    authenticate,
    ownerSessionStatus: ownerSession.status,
  };
}
