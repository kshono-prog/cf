import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  INITIAL_REPLY_LIMIT,
  INITIAL_REPLY_MAX_LIMIT,
  isUuidString,
  parsePositiveInt,
  resolveViewerCreatorProfileId,
  serializePost,
  serializeReply,
} from "@/lib/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { postId: string };

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { postId } = await ctx.params;
    if (!isUuidString(postId)) return errJson("POST_ID_INVALID", 400);

    const { searchParams } = new URL(req.url);
    const viewerCreatorProfileId = await resolveViewerCreatorProfileId(
      searchParams.get("viewerAddress")
    );
    const replyLimit = parsePositiveInt(
      searchParams.get("replyLimit"),
      INITIAL_REPLY_LIMIT,
      INITIAL_REPLY_MAX_LIMIT
    );

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
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

    if (!post) return errJson("POST_NOT_FOUND", 404);

    const replies = await prisma.reply.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: replyLimit,
      select: {
        id: true,
        postId: true,
        creatorProfileId: true,
        parentReplyId: true,
        authorType: true,
        body: true,
        aiGenerated: true,
        aiAgentId: true,
        likeCount: true,
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

    const serializedPost = serializePost(post, viewerCreatorProfileId !== null);
    const serializedReplies = replies.map((reply) =>
      serializeReply(reply, viewerCreatorProfileId !== null)
    );
    const likedReplyIds: string[] = [];
    for (const reply of serializedReplies) {
      if ("viewerHasLiked" in reply && reply.viewerHasLiked === true) {
        likedReplyIds.push(reply.id);
      }
    }

    return okJson({
      post: serializedPost,
      replies: serializedReplies,
      replyLimit,
      ...(viewerCreatorProfileId
        ? {
            viewer: {
              creatorProfileId: viewerCreatorProfileId.toString(),
              hasLikedPost:
                "viewerHasLiked" in serializedPost
                  ? serializedPost.viewerHasLiked
                  : false,
              likedReplyIds,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error("POST_GET_FAILED", error);
    return errJson("POST_GET_FAILED", 500);
  }
}
