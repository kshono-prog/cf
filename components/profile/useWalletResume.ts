"use client";

import { useEffect, useState } from "react";
import {
  parsePublicViewerMeResponse,
  resolvePublicViewerState,
} from "@/lib/publicViewerState";
import { fetchPublicViewerIdentityCached } from "@/lib/publicViewerIdentityClient";

type Args = {
  pageUsername: string;
  pageCreatorAddress: string | null;
  viewerAddress: string | null;
};

export function useWalletResume({ pageUsername, pageCreatorAddress, viewerAddress }: Args) {
  const [viewerIdentityResolved, setViewerIdentityResolved] = useState(false);
  const [viewerIdentity, setViewerIdentity] = useState<ReturnType<
    typeof parsePublicViewerMeResponse
  > | null>(null);

  useEffect(() => {
    if (!viewerAddress) {
      setViewerIdentity(null);
      setViewerIdentityResolved(true);
      return;
    }

    const connectedAddress = viewerAddress;
    let cancelled = false;

    async function fetchViewerIdentity(): Promise<void> {
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

    void fetchViewerIdentity();

    return () => {
      cancelled = true;
    };
  }, [viewerAddress]);

  const viewerState = resolvePublicViewerState({
    pageUsername,
    pageCreatorAddress,
    viewerAddress,
    identity: viewerIdentity,
    identityResolved: viewerIdentityResolved,
  });

  return { viewerState, viewerIdentityResolved };
}
