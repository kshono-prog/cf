import { unstable_cache } from "next/cache";
import { cache } from "react";

import { withPrismaRetry } from "@/lib/prismaRetry";
import { prisma } from "@/lib/prisma";
import { isCreatorType } from "@/lib/creatorTaxonomy";
import type {
  CreatorProfile,
  SocialLinks,
  YoutubeVideo,
} from "@/types/creator";
import type { MeStatus } from "@/lib/mypage/types";

const allowedSocialTypes = [
  "twitter",
  "instagram",
  "youtube",
  "facebook",
  "tiktok",
  "website",
] as const;

type AllowedSocialType = (typeof allowedSocialTypes)[number];

function isAllowedSocialType(value: string): value is AllowedSocialType {
  return (allowedSocialTypes as readonly string[]).includes(value);
}

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
            activeProjectId: true,
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

      const socialsResult: SocialLinks = {};
      for (const row of profile.socialLinks) {
        if (isAllowedSocialType(row.type) && row.url) {
          socialsResult[row.type] = row.url;
        }
      }

      const youtubeResult: YoutubeVideo[] = profile.youtubeVideos.map((v) => ({
        url: v.url,
        title: v.title ?? "",
        description: v.description ?? "",
      }));

      const creator: CreatorProfile = {
        username: profile.username,
        address: profile.walletAddress ?? undefined,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        profile: profile.profileText,
        qrcode: profile.qrcodeUrl,
        url: profile.externalUrl,
        themeColor: profile.themeColor,
        creatorType:
          typeof profile.creatorType === "string" && isCreatorType(profile.creatorType)
            ? profile.creatorType
            : null,
        socials: socialsResult,
        youtubeVideos: youtubeResult,
      };

      const projectIdsByCurrency = {
        JPYC: profile.activeProjectIdJpyc
          ? profile.activeProjectIdJpyc.toString()
          : null,
        USDC: profile.activeProjectIdUsdc
          ? profile.activeProjectIdUsdc.toString()
          : null,
      };

      return {
        hasUser: true,
        hasCreator,
        user: {
          username: profile.username,
          displayName: profile.displayName,
          profile: profile.profileText,
        },
        creator: hasCreator ? creator : null,
        projectId: profile.activeProjectId
          ? profile.activeProjectId.toString()
          : projectIdsByCurrency.JPYC,
        projectIdsByCurrency,
      };
    },
    ["me-status-by-wallet-address"],
    { revalidate: 30 }
  )
);
