import { unstable_cache } from "next/cache";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import { serializeCreatorProfile } from "@/lib/serializers/creator";

type CreatorProfileRecord = {
  id: string;
  username: string;
  walletAddress: string | null;
  activeProjectIdJpyc: string | null;
  activeProjectIdUsdc: string | null;
};

type CreatorProfileLookup = {
  profile: CreatorProfileRecord;
  creator: ReturnType<typeof serializeCreatorProfile>;
};

const globalForCreatorProfileFallback = globalThis as unknown as {
  creatorProfileStaleByUsername?: Map<string, CreatorProfileLookup>;
};

function getCreatorProfileStaleMap(): Map<string, CreatorProfileLookup> {
  if (!globalForCreatorProfileFallback.creatorProfileStaleByUsername) {
    globalForCreatorProfileFallback.creatorProfileStaleByUsername = new Map();
  }

  return globalForCreatorProfileFallback.creatorProfileStaleByUsername;
}

const getCreatorProfileByUsernameCached = unstable_cache(
  async (username: string) => {
    const staleMap = getCreatorProfileStaleMap();

    try {
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

      const result: CreatorProfileLookup = {
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

      staleMap.set(username, result);
      return result;
    } catch (error) {
      if (isPrismaUnavailableError(error)) {
        const stale = staleMap.get(username);
        if (stale) {
          return stale;
        }
      }

      throw error;
    }
  },
  ["creator-profile-by-username"],
  { revalidate: 300 }
);

export const getCreatorProfileByUsername = cache(async (username: string) =>
  getCreatorProfileByUsernameCached(username)
);
