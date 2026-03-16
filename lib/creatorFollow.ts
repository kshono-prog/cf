import { prisma } from "@/lib/prisma";
import { findCreatorByWalletAddress } from "@/lib/social";

type CreatorPreviewRow = {
  id: bigint;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type FollowPreview = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type CreatorFollowSummary = {
  creator: FollowPreview;
  counts: {
    followers: number;
    following: number;
  };
  viewer: {
    hasUser: boolean;
    isOwner: boolean;
    follows: boolean;
  };
  followers: FollowPreview[];
};

export type CreatorFollowLists = {
  creator: FollowPreview;
  counts: {
    followers: number;
    following: number;
  };
  followers: FollowPreview[];
  following: FollowPreview[];
};

function serializePreview(row: CreatorPreviewRow): FollowPreview {
  return {
    id: row.id.toString(),
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
  };
}

export async function findTargetCreator(
  username: string
): Promise<CreatorPreviewRow | null> {
  return prisma.creatorProfile.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });
}

export async function getCreatorFollowSummary(args: {
  username: string;
  viewerAddress: string | null;
  followerPreviewLimit?: number;
}): Promise<CreatorFollowSummary | null> {
  const creator = await findTargetCreator(args.username);
  if (!creator) return null;

  const viewer =
    args.viewerAddress != null
      ? await findCreatorByWalletAddress(args.viewerAddress)
      : null;
  const isOwner = viewer?.id === creator.id;

  const [followerCount, followingCount, followerRows, viewerFollow] =
    await Promise.all([
      prisma.creatorFollow.count({
        where: { followingProfileId: creator.id },
      }),
      prisma.creatorFollow.count({
        where: { followerProfileId: creator.id },
      }),
      prisma.creatorFollow.findMany({
        where: { followingProfileId: creator.id },
        orderBy: { createdAt: "desc" },
        take: args.followerPreviewLimit ?? 6,
        select: {
          followerProfile: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      viewer && !isOwner
        ? prisma.creatorFollow.findUnique({
            where: {
              followerProfileId_followingProfileId: {
                followerProfileId: viewer.id,
                followingProfileId: creator.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

  return {
    creator: serializePreview(creator),
    counts: {
      followers: followerCount,
      following: followingCount,
    },
    viewer: {
      hasUser: viewer !== null,
      isOwner,
      follows: viewerFollow !== null,
    },
    followers: followerRows.map((row) => serializePreview(row.followerProfile)),
  };
}

export async function getCreatorFollowLists(
  username: string
): Promise<CreatorFollowLists | null> {
  const creator = await findTargetCreator(username);
  if (!creator) return null;

  const [followerRows, followingRows] = await Promise.all([
    prisma.creatorFollow.findMany({
      where: { followingProfileId: creator.id },
      orderBy: { createdAt: "desc" },
      select: {
        followerProfile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.creatorFollow.findMany({
      where: { followerProfileId: creator.id },
      orderBy: { createdAt: "desc" },
      select: {
        followingProfile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ]);

  const followers = followerRows.map((row) => serializePreview(row.followerProfile));
  const following = followingRows.map((row) =>
    serializePreview(row.followingProfile)
  );

  return {
    creator: serializePreview(creator),
    counts: {
      followers: followers.length,
      following: following.length,
    },
    followers,
    following,
  };
}
