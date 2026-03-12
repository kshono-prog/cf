import { withPrismaRetry } from "@/lib/prismaRetry";
import { prisma } from "@/lib/prisma";
import { isCreatorCategory, isCreatorType } from "@/lib/creatorTaxonomy";
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
        creatorCategories: true,
        walletAddress: true,
        activeProjectId: true,
        activeProjectIdJpyc: true,
        activeProjectIdUsdc: true,
        status: true,
      },
    })
  );

  if (!profile) return emptyMeStatus();

  const hasCreator = profile.status === "PUBLISHED";

  const [socialRows, youtubeRows] = await withPrismaRetry(() =>
    Promise.all([
      prisma.creatorSocialLink.findMany({
        where: { profileId: profile.id },
        select: { type: true, url: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.creatorYoutubeVideo.findMany({
        where: { profileId: profile.id },
        select: { url: true, title: true, description: true },
        orderBy: { createdAt: "asc" },
      }),
    ])
  );

  const socialsResult: SocialLinks = {};
  for (const row of socialRows) {
    if (isAllowedSocialType(row.type) && row.url) {
      socialsResult[row.type] = row.url;
    }
  }

  const youtubeResult: YoutubeVideo[] = youtubeRows.map((v) => ({
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
    categories: profile.creatorCategories.filter(isCreatorCategory),
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
      displayName: profile.displayName,
      profile: profile.profileText,
    },
    creator: hasCreator ? creator : null,
    projectId: profile.activeProjectId
      ? profile.activeProjectId.toString()
      : projectIdsByCurrency.JPYC,
    projectIdsByCurrency,
  };
}
