import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  findCreatorByWalletAddress,
  parsePositiveInt,
  serializePost,
} from "@/lib/social";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSession(
      req,
      searchParams.get("address") ?? undefined
    );
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const limit = parsePositiveInt(
      searchParams.get("limit"),
      FEED_DEFAULT_LIMIT,
      FEED_MAX_LIMIT
    );
    const cursor = decodeFeedCursor(searchParams.get("cursor"));
    if (searchParams.get("cursor") && !cursor) {
      return errJson("CURSOR_INVALID", 400);
    }

    const where = {
      creatorProfileId: creator.id,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              {
                createdAt: cursor.createdAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    };

    const [rows, totalCount] = await Promise.all([
      prisma.post.findMany({
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
          analytics: {
            select: {
              impressionCount: true,
              profileClickCount: true,
              engagementScore: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.post.count({
        where: { creatorProfileId: creator.id },
      }),
    ]);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows.at(-1);

    return okJson({
      items: pageRows.map((row) => ({
        ...serializePost(row, false),
        analytics: row.analytics
          ? {
              impressionCount: row.analytics.impressionCount,
              profileClickCount: row.analytics.profileClickCount,
              engagementScore: row.analytics.engagementScore.toString(),
              updatedAt: row.analytics.updatedAt.toISOString(),
            }
          : null,
      })),
      nextCursor:
        hasMore && last
          ? encodeFeedCursor({ createdAt: last.createdAt, id: last.id })
          : null,
      limit,
      totalCount,
    });
  } catch (error) {
    console.error("MYPAGE_SNS_POSTS_GET_FAILED", error);
    return errJson("MYPAGE_SNS_POSTS_GET_FAILED", 500);
  }
}
