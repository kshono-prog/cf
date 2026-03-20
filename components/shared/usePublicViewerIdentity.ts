"use client";

import { useEffect, useMemo, useState } from "react";

import { resolveCommunityViewerMode } from "@/lib/communityUiState";
import { fetchPublicViewerIdentityCached } from "@/lib/publicViewerIdentityClient";
import {
  resolvePublicViewerState,
  type PublicViewerIdentity,
} from "@/lib/publicViewerState";

type Args = {
  pageUsername: string;
  pageCreatorAddress?: string | null;
  viewerAddress: string | null | undefined;
  isConnected?: boolean;
};

export function usePublicViewerIdentity(args: Args) {
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<PublicViewerIdentity | null>(
    null
  );

  const isConnected =
    args.isConnected ?? (typeof args.viewerAddress === "string" && args.viewerAddress.length > 0);
  const viewerAddress = args.viewerAddress ?? null;

  useEffect(() => {
    if (!viewerAddress || !isConnected) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    const connectedAddress = viewerAddress;
    let cancelled = false;

    async function loadViewer(): Promise<void> {
      setViewerIdentityResolved(false);
      try {
        const identity = await fetchPublicViewerIdentityCached(connectedAddress);
        if (!cancelled) {
          setViewerIdentity(identity);
        }
      } catch {
        if (!cancelled) {
          setViewerIdentity(null);
        }
      } finally {
        if (!cancelled) {
          setViewerIdentityResolved(true);
        }
      }
    }

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, [isConnected, viewerAddress]);

  const viewerMode = useMemo(
    () =>
      resolveCommunityViewerMode({
        isConnected,
        viewerAddress,
        identityResolved: viewerIdentityResolved,
        identity: viewerIdentity,
      }),
    [isConnected, viewerAddress, viewerIdentity, viewerIdentityResolved]
  );

  const viewerState = useMemo(
    () =>
      resolvePublicViewerState({
        pageUsername: args.pageUsername,
        pageCreatorAddress: args.pageCreatorAddress ?? null,
        viewerAddress,
        identity: viewerIdentity,
        identityResolved: viewerIdentityResolved,
      }),
    [
      args.pageCreatorAddress,
      args.pageUsername,
      viewerAddress,
      viewerIdentity,
      viewerIdentityResolved,
    ]
  );

  return {
    viewerIdentity,
    viewerIdentityResolved,
    viewerMode,
    viewerState,
  };
}
