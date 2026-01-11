import { unstable_cache } from "next/cache";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import {
  SOCIAL_ICON_CONFIG,
  type CreatorProfile,
  type SocialKey,
  type SocialLinks,
  type YoutubeVideo,
} from "@/lib/profileTypes";

const SOCIAL_KEYS = SOCIAL_ICON_CONFIG.map((item) => item.key);

function isSocialKey(value: string): value is SocialKey {
  return SOCIAL_KEYS.includes(value as SocialKey);
}

function normalizeCreator(raw: {
  username: string;
  displayName: string | null;
  profileText: string | null;
  avatarUrl: string | null;
  qrcodeUrl: string | null;
  externalUrl: string | null;
  goalTitle: string | null;
  goalTargetJpyc: number | null;
  themeColor: string | null;
  walletAddress: string | null;
  socials?: SocialLinks;
  youtubeVideos?: YoutubeVideo[];
}): CreatorProfile {
  return {
    username: raw.username,
    address: raw.walletAddress ?? undefined,
    displayName: raw.displayName ?? raw.username,
    avatarUrl: raw.avatarUrl ?? null,
    profile: raw.profileText ?? null,
    qrcode: raw.qrcodeUrl ?? null,
    url: raw.externalUrl ?? null,
    goalTitle: raw.goalTitle ?? null,
    goalTargetJpyc: raw.goalTargetJpyc ?? null,
    themeColor: raw.themeColor ?? null,
    socials: raw.socials,
    youtubeVideos: raw.youtubeVideos,
  };
}

const getCreatorProfileByUsernameCached = unstable_cache(
  async (username: string) => {
    const profile = await prisma.creatorProfile.findUnique({
      where: { username },
      include: {
        socialLinks: true,
        youtubeVideos: true,
      },
    });

    if (!profile) return null;

    const socials: SocialLinks = {};
    for (const link of profile.socialLinks) {
      if (isSocialKey(link.type)) {
        socials[link.type] = link.url;
      }
    }
    return {
      profile,
      creator: normalizeCreator({
        username: profile.username,
        displayName: profile.displayName,
        profileText: profile.profileText,
        avatarUrl: profile.avatarUrl,
        qrcodeUrl: profile.qrcodeUrl,
        externalUrl: profile.externalUrl,
        goalTitle: profile.goalTitle,
        goalTargetJpyc: profile.goalTargetJpyc,
        themeColor: profile.themeColor,
        walletAddress: profile.walletAddress,
        socials,
        youtubeVideos: profile.youtubeVideos.map((video) => ({
          url: video.url,
          title: video.title ?? "",
          description: video.description ?? "",
        })),
      }),
    };
  },
  ["creator-profile-by-username"],
  { revalidate: 60 }
);

export const getCreatorProfileByUsername = cache(async (username: string) =>
  getCreatorProfileByUsernameCached(username)
);
