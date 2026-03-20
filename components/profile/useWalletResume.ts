"use client";

import { usePublicViewerIdentity } from "@/components/shared/usePublicViewerIdentity";

type Args = {
  pageUsername: string;
  pageCreatorAddress: string | null;
  viewerAddress: string | null;
};

export function useWalletResume({ pageUsername, pageCreatorAddress, viewerAddress }: Args) {
  const { viewerIdentityResolved, viewerState } = usePublicViewerIdentity({
    pageUsername,
    pageCreatorAddress,
    viewerAddress,
  });

  return { viewerState, viewerIdentityResolved };
}
