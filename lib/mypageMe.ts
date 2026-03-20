import { unstable_cache } from "next/cache";
import { cache } from "react";

import { withPrismaRetry } from "@/lib/prismaRetry";
import { prisma } from "@/lib/prisma";
import type { MeStatus } from "@/lib/mypage/types";
import {
  resolveCreatorProjectSelection,
  serializeCreatorProfile,
} from "@/lib/serializers/creator";

function normalizeAddress(input: string): string {
  return input.trim().toLowerCase();
}

function emptyMeStatus(): MeStatus {
  return {
    hasUser: false,
    hasCreator: false,
    user: null,
    creator: null,
    projectId: null,
    projectIdsByCurrency: { JPYC: null, USDC: null },
  };
}

export async function getMeStatusByAddress(
  addressRaw: string | null | undefined
): Promise<MeStatus> {
  if (!addressRaw) return emptyMeStatus();

  const walletAddress = normalizeAddress(addressRaw);
  if (!walletAddress) return emptyMeStatus();

  return getMeStatusByWalletAddressCached(walletAddress);
}

const getMeStatusByWalletAddressCached = cache(
  unstable_cache(
    async (walletAddress: string): Promise<MeStatus> => {
      const profile = await withPrismaRetry(() =>
        prisma.creatorProfile.findUnique({
          where: { walletAddress },
          select: {
            id: true,
            username: true,
            displayName: true,
            profileText: true,
            avatarUrl: true,
            qrcodeUrl: true,
            externalUrl: true,
            themeColor: true,
            creatorType: true,
            walletAddress: true,
            activeProjectIdJpyc: true,
            activeProjectIdUsdc: true,
            status: true,
            socialLinks: {
              select: { type: true, url: true },
              orderBy: { createdAt: "asc" },
            },
            youtubeVideos: {
              select: { url: true, title: true, description: true },
              orderBy: { createdAt: "asc" },
            },
          },
        })
      );

      if (!profile) return emptyMeStatus();

      const hasCreator = profile.status === "PUBLISHED";
      const creator = serializeCreatorProfile({
        username: profile.username,
        displayName: profile.displayName,
        profileText: profile.profileText,
        avatarUrl: profile.avatarUrl,
        qrcodeUrl: profile.qrcodeUrl,
        externalUrl: profile.externalUrl,
        themeColor: profile.themeColor,
        creatorType: profile.creatorType,
        walletAddress: profile.walletAddress,
        socialLinks: profile.socialLinks,
        youtubeVideos: profile.youtubeVideos,
      });
      const projectSelection = resolveCreatorProjectSelection({
        activeProjectIdJpyc: profile.activeProjectIdJpyc?.toString() ?? null,
        activeProjectIdUsdc: profile.activeProjectIdUsdc?.toString() ?? null,
      });

      return {
        hasUser: true,
        hasCreator,
        user: {
          username: profile.username,
          displayName: profile.displayName,
          profile: profile.profileText,
        },
        creator: hasCreator ? creator : null,
        projectId: projectSelection.projectId,
        projectIdsByCurrency: projectSelection.projectIdsByCurrency,
      };
    },
    ["me-status-by-wallet-address"],
    { revalidate: 30 }
  )
);
