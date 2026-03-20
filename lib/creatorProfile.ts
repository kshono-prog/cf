import { unstable_cache } from "next/cache";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { serializeCreatorProfile } from "@/lib/serializers/creator";

type CreatorProfileRecord = {
  id: string;
  username: string;
  walletAddress: string | null;
  activeProjectIdJpyc: string | null;
  activeProjectIdUsdc: string | null;
};

const getCreatorProfileByUsernameCached = unstable_cache(
  async (username: string) => {
    const profile = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        include: {
          socialLinks: true,
          youtubeVideos: true,
        },
      })
    );

    if (!profile) return null;

    const safeProfile: CreatorProfileRecord = {
      id: profile.id.toString(),
      username: profile.username,
      walletAddress: profile.walletAddress,
      activeProjectIdJpyc: profile.activeProjectIdJpyc?.toString() ?? null,
      activeProjectIdUsdc: profile.activeProjectIdUsdc?.toString() ?? null,
    };

    return {
      profile: safeProfile,
      creator: serializeCreatorProfile({
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
      }),
    };
  },
  ["creator-profile-by-username"],
  { revalidate: 300 }
);

export const getCreatorProfileByUsername = cache(async (username: string) =>
  getCreatorProfileByUsernameCached(username)
);
