import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import {
  decodeFeedCursor,
  encodeFeedCursor,
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  parsePositiveInt,
  resolveViewerCreatorProfileId,
  serializePost,
} from "@/lib/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const limit = parsePositiveInt(
      searchParams.get("limit"),
      FEED_DEFAULT_LIMIT,
      FEED_MAX_LIMIT
    );
    const cursor = decodeFeedCursor(searchParams.get("cursor"));
    if (searchParams.get("cursor") && !cursor) {
      return errJson("CURSOR_INVALID", 400);
    }

    const creatorUsername = searchParams.get("creatorUsername")?.trim() ?? null;
    const creatorIdRaw = searchParams.get("creatorId");
    const projectIdRaw = searchParams.get("projectId");
    const viewerAddress = searchParams.get("viewerAddress");

    let creatorId: bigint | null = null;
    if (creatorIdRaw) {
      try {
        creatorId = toBigIntOrThrow(creatorIdRaw, "CREATOR_ID_INVALID");
      } catch {
        return errJson("CREATOR_ID_INVALID", 400);
      }
    }

    let projectId: bigint | null = null;
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    if (creatorUsername) {
      const creator = await prisma.creatorProfile.findUnique({
        where: { username: creatorUsername },
        select: { id: true },
      });

      if (!creator) {
        return okJson({
          items: [],
          nextCursor: null,
          limit,
          filters: {
            creatorUsername,
            creatorId: creatorId?.toString() ?? null,
            projectId: projectId?.toString() ?? null,
          },
        });
      }

      if (creatorId && creatorId !== creator.id) {
        return okJson({
          items: [],
          nextCursor: null,
          limit,
          filters: {
            creatorUsername,
            creatorId: creatorId.toString(),
            projectId: projectId?.toString() ?? null,
          },
        });
      }

      creatorId = creator.id;
    }

    const viewerCreatorProfileId = await resolveViewerCreatorProfileId(
      viewerAddress
    );

    const where: Prisma.PostWhereInput = {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      ...(creatorId ? { creatorProfileId: creatorId } : {}),
      ...(projectId ? { projectId } : {}),
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

    return okJson({
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
    });
  } catch (error) {
    console.error("FEED_GET_FAILED", error);
    return errJson("FEED_GET_FAILED", 500);
  }
}
