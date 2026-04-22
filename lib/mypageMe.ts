import { unstable_cache } from "next/cache";
import { cache } from "react";

import { normalizeAddress } from "@/lib/api/guards";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { prisma } from "@/lib/prisma";
import type { MeStatus } from "@/lib/mypage/types";
import {
  PUBLIC_PAGE_CONFIG_SELECT_BASE,
  PUBLIC_PAGE_CONFIG_SELECT_WITH_INTRO_SECTION_ORDER,
  hasPublicPageIntroSectionOrderColumn,
  normalizePublicPageConfigRow,
} from "@/lib/publicPageConfigSchema";
import {
  resolveCreatorProjectSelection,
  serializeCreatorProfile,
} from "@/lib/serializers/creator";

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
      const canReadIntroSectionOrder =
        await hasPublicPageIntroSectionOrderColumn();
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
            ecosystemRole: true,
            walletAddress: true,
            activeProjectIdJpyc: true,
            activeProjectIdUsdc: true,
            status: true,
            publicPageConfig: {
              select: canReadIntroSectionOrder
                ? PUBLIC_PAGE_CONFIG_SELECT_WITH_INTRO_SECTION_ORDER
                : PUBLIC_PAGE_CONFIG_SELECT_BASE,
            },
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
      const publicPageConfig = normalizePublicPageConfigRow(profile.publicPageConfig);
      const creator = serializeCreatorProfile({
        username: profile.username,
        displayName: profile.displayName,
        profileText: profile.profileText,
        avatarUrl: profile.avatarUrl,
        qrcodeUrl: profile.qrcodeUrl,
        externalUrl: profile.externalUrl,
        themeColor: profile.themeColor,
        creatorType: profile.creatorType,
        ecosystemRole: profile.ecosystemRole,
        walletAddress: profile.walletAddress,
        socialLinks: profile.socialLinks,
        youtubeVideos: profile.youtubeVideos,
        publicPageConfig,
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
