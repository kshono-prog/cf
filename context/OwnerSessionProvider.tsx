"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount } from "wagmi";

import {
  ensureOwnerSession,
  fetchOwnerSessionState,
  logoutOwnerSession,
  readOwnerSessionSnapshot,
  subscribeOwnerSession,
  type OwnerSessionSnapshot,
} from "@/lib/ownerAuthClient";
import { normalizeOwnerAddressOrNull } from "@/lib/ownerAuthAddress";

type OwnerSessionStatus = OwnerSessionSnapshot["status"];

type OwnerSessionContextValue = {
  status: OwnerSessionStatus;
  address: string | null;
  expiresAtMs: number | null;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAuthenticated: boolean;
};

const OwnerSessionContext = createContext<OwnerSessionContextValue | null>(null);

function toIdleSnapshot(address: string | null): OwnerSessionSnapshot {
  return {
    status: "idle",
    address,
    expiresAtMs: null,
  };
}

export function OwnerSessionProvider(props: { children: ReactNode }) {
  const { address, status: walletStatus } = useAccount();
  const normalizedAddress = normalizeOwnerAddressOrNull(address);
  const [snapshot, setSnapshot] = useState<OwnerSessionSnapshot>(() =>
    readOwnerSessionSnapshot()
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (!normalizedAddress) {
      setSnapshot(toIdleSnapshot(null));
      return;
    }

    try {
      const nextSnapshot = await fetchOwnerSessionState({
        address: normalizedAddress,
      });
      setSnapshot(nextSnapshot);
    } catch {
      setSnapshot({
        status: "unauthenticated",
        address: normalizedAddress,
        expiresAtMs: null,
      });
    }
  }, [normalizedAddress]);

  const authenticate = useCallback(async (): Promise<void> => {
    if (!normalizedAddress) {
      throw new Error("ADDRESS_REQUIRED");
    }

    setSnapshot((current) => ({
      status: "checking",
      address: normalizedAddress,
      expiresAtMs: current.expiresAtMs,
    }));
    await ensureOwnerSession({ address: normalizedAddress });
    await refresh();
  }, [normalizedAddress, refresh]);

  const logout = useCallback(async (): Promise<void> => {
    await logoutOwnerSession();
    setSnapshot({
      status: normalizedAddress ? "unauthenticated" : "idle",
      address: normalizedAddress,
      expiresAtMs: null,
    });
  }, [normalizedAddress]);

  useEffect(() => {
    return subscribeOwnerSession((nextSnapshot) => {
      if (!normalizedAddress) {
        setSnapshot(toIdleSnapshot(null));
        return;
      }

      if (
        nextSnapshot.address &&
        nextSnapshot.address !== normalizedAddress &&
        nextSnapshot.status !== "unauthenticated"
      ) {
        return;
      }

      setSnapshot(
        nextSnapshot.address === null
          ? {
              status: "unauthenticated",
              address: normalizedAddress,
              expiresAtMs: null,
            }
          : nextSnapshot
      );
    });
  }, [normalizedAddress]);

  useEffect(() => {
    if (!normalizedAddress) {
      setSnapshot(
        walletStatus === "connecting" || walletStatus === "reconnecting"
          ? {
              status: "checking",
              address: null,
              expiresAtMs: null,
            }
          : toIdleSnapshot(null)
      );
      return;
    }

    if (walletStatus === "connecting" || walletStatus === "reconnecting") {
      setSnapshot((current) => ({
        status: "checking",
        address: normalizedAddress,
        expiresAtMs: current.expiresAtMs,
      }));
      return;
    }

    void refresh();
  }, [normalizedAddress, refresh, walletStatus]);

  const value = useMemo<OwnerSessionContextValue>(
    () => ({
      status: snapshot.status,
      address: snapshot.address,
      expiresAtMs: snapshot.expiresAtMs,
      authenticate,
      logout,
      refresh,
      isAuthenticated: snapshot.status === "authenticated",
    }),
    [authenticate, logout, refresh, snapshot]
  );

  return (
    <OwnerSessionContext.Provider value={value}>
      {props.children}
    </OwnerSessionContext.Provider>
  );
}

export function useOwnerSession(): OwnerSessionContextValue {
  const context = useContext(OwnerSessionContext);
  if (!context) {
    throw new Error("useOwnerSession must be used within OwnerSessionProvider");
  }
  return context;
}
