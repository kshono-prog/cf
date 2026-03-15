import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  encodeFeedCursor,
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  parsePositiveInt,
  resolveViewerCreatorProfileId,
  serializePost,
} from "@/lib/social";

type FeedCursor = {
  createdAt: Date;
  id: string;
} | null;

export type FeedListFilters = {
  creatorUsername: string | null;
  creatorId: string | null;
  projectId: string | null;
};

export type FeedListItem = ReturnType<typeof serializePost>;

export type FeedListView = {
  items: FeedListItem[];
  nextCursor: string | null;
  limit: number;
  filters: FeedListFilters;
};

type GetFeedListViewArgs = {
  limit?: number | null;
  cursor?: FeedCursor;
  creatorUsername?: string | null;
  creatorId?: bigint | null;
  projectId?: bigint | null;
  viewerAddress?: string | null;
};

export async function getFeedListView(
  args: GetFeedListViewArgs
): Promise<FeedListView> {
  const limit = parsePositiveInt(
    args.limit != null ? String(args.limit) : null,
    FEED_DEFAULT_LIMIT,
    FEED_MAX_LIMIT
  );
  const creatorUsername = args.creatorUsername?.trim() ?? null;
  let creatorId = args.creatorId ?? null;
  const projectId = args.projectId ?? null;

  if (creatorUsername) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { username: creatorUsername },
      select: { id: true },
    });

    if (!creator) {
      return {
        items: [],
        nextCursor: null,
        limit,
        filters: {
          creatorUsername,
          creatorId: creatorId?.toString() ?? null,
          projectId: projectId?.toString() ?? null,
        },
      };
    }

    if (creatorId && creatorId !== creator.id) {
      return {
        items: [],
        nextCursor: null,
        limit,
        filters: {
          creatorUsername,
          creatorId: creatorId.toString(),
          projectId: projectId?.toString() ?? null,
        },
      };
    }

    creatorId = creator.id;
  }

  const viewerCreatorProfileId = await resolveViewerCreatorProfileId(
    args.viewerAddress ?? null
  );

  const where: Prisma.PostWhereInput = {
    status: "PUBLISHED",
    visibility: "PUBLIC",
    ...(creatorId ? { creatorProfileId: creatorId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(args.cursor
      ? {
          OR: [
            { createdAt: { lt: args.cursor.createdAt } },
            {
              createdAt: args.cursor.createdAt,
              id: { lt: args.cursor.id },
            },
          ],
        }
      : {}),
  };

  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      creatorProfileId: true,
      projectId: true,
      authorType: true,
      body: true,
      mediaType: true,
      mediaUrl: true,
      visibility: true,
      status: true,
      aiGenerated: true,
      aiAgentId: true,
      likeCount: true,
      replyCount: true,
      tipCount: true,
      tipAmountJpyc: true,
      tipAmountUsdc: true,
      createdAt: true,
      updatedAt: true,
      creatorProfile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          title: true,
          currency: true,
          status: true,
        },
      },
      ...(viewerCreatorProfileId
        ? {
            likes: {
              where: { creatorProfileId: viewerCreatorProfileId },
              select: { id: true },
              take: 1,
            },
          }
        : {}),
    },
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map((row) =>
    serializePost(row, viewerCreatorProfileId !== null)
  );
  const last = pageRows.at(-1);

  return {
    items,
    nextCursor:
      hasMore && last
        ? encodeFeedCursor({ createdAt: last.createdAt, id: last.id })
        : null,
    limit,
    filters: {
      creatorUsername,
      creatorId: creatorId?.toString() ?? null,
      projectId: projectId?.toString() ?? null,
    },
  };
}

const getInitialPublicFeedListCached = unstable_cache(
  async (creatorUsername: string | null) =>
    getFeedListView({
      creatorUsername,
      limit: FEED_DEFAULT_LIMIT,
    }),
  ["initial-public-feed"],
  { revalidate: 15 }
);

export async function getInitialPublicFeedList(
  creatorUsername: string | null
): Promise<FeedListView> {
  return getInitialPublicFeedListCached(creatorUsername);
}
