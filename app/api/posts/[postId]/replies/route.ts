import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  findCreatorByWalletAddress,
  isUuidString,
  normalizeTextBody,
  REPLY_BODY_MAX_LENGTH,
  serializeReply,
  toNullableUuidString,
} from "@/lib/social";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { postId: string };
type ReplyPostBody = {
  address?: unknown;
  body?: unknown;
  parentReplyId?: unknown;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { postId } = await ctx.params;
    if (!isUuidString(postId)) return errJson("POST_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as ReplyPostBody;
    const ownerSession = await requireOwnerSessionFromBody(req, body);
    if (!ownerSession.ok) return ownerSession.response;

    const replyBody = normalizeTextBody(body.body, REPLY_BODY_MAX_LENGTH);
    if (!replyBody) {
      return errJson(
        typeof body.body === "string" &&
          body.body.trim().length > REPLY_BODY_MAX_LENGTH
          ? "BODY_TOO_LONG"
          : "BODY_REQUIRED",
        400
      );
    }

    const parentReplyId = toNullableUuidString(body.parentReplyId);
    if (
      typeof body.parentReplyId !== "undefined" &&
      typeof parentReplyId === "undefined"
    ) {
      return errJson("PARENT_REPLY_ID_INVALID", 400);
    }

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      select: { id: true },
    });
    if (!post) return errJson("POST_NOT_FOUND", 404);

    if (parentReplyId) {
      const parentReply = await prisma.reply.findFirst({
        where: { id: parentReplyId, postId },
        select: { id: true },
      });
      if (!parentReply) return errJson("PARENT_REPLY_NOT_FOUND", 404);
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const reply = await tx.reply.create({
        data: {
          postId,
          creatorProfileId: creator.id,
          parentReplyId,
          authorType: "CREATOR",
          body: replyBody,
          aiGenerated: false,
          aiAgentId: null,
          createdAt: now,
          updatedAt: now,
        },
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
        },
      });

      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          replyCount: { increment: 1 },
          updatedAt: now,
        },
        select: { replyCount: true },
      });

      return {
        reply,
        replyCount: updatedPost.replyCount,
      };
    });

    return okJson({
      reply: serializeReply(result.reply, false),
      postReplyCount: result.replyCount,
    });
  } catch (error) {
    console.error("POST_REPLY_POST_FAILED", error);
    return errJson("POST_REPLY_POST_FAILED", 500);
  }
}
