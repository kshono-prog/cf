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
} from "@/lib/social";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { replyId: string };

type ReplyPatchBody = {
  address?: unknown;
  body?: unknown;
};

type ReplyDeleteBody = {
  address?: unknown;
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { replyId } = await ctx.params;
    if (!isUuidString(replyId)) return errJson("REPLY_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as ReplyPatchBody;
    if (typeof body.address !== "string") return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, body.address);
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

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const existing = await prisma.reply.findFirst({
      where: {
        id: replyId,
        creatorProfileId: creator.id,
      },
      select: { id: true },
    });
    if (!existing) return errJson("REPLY_NOT_FOUND", 404);

    const row = await prisma.reply.update({
      where: { id: replyId },
      data: {
        body: replyBody,
        updatedAt: new Date(),
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

    return okJson({
      reply: serializeReply(row, false),
    });
  } catch (error) {
    console.error("REPLY_PATCH_FAILED", error);
    return errJson("REPLY_PATCH_FAILED", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { replyId } = await ctx.params;
    if (!isUuidString(replyId)) return errJson("REPLY_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as ReplyDeleteBody;
    if (typeof body.address !== "string") return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, body.address);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const existing = await prisma.reply.findFirst({
      where: {
        id: replyId,
        creatorProfileId: creator.id,
      },
      select: {
        id: true,
        postId: true,
      },
    });
    if (!existing) return errJson("REPLY_NOT_FOUND", 404);

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      await tx.reply.delete({
        where: { id: replyId },
        select: { id: true },
      });

      const updatedPost = await tx.post.update({
        where: { id: existing.postId },
        data: {
          replyCount: { decrement: 1 },
          updatedAt: now,
        },
        select: { replyCount: true },
      });

      return {
        postId: existing.postId,
        postReplyCount: updatedPost.replyCount,
      };
    });

    return okJson({
      deletedReplyId: replyId,
      postId: result.postId,
      postReplyCount: result.postReplyCount,
    });
  } catch (error) {
    console.error("REPLY_DELETE_FAILED", error);
    return errJson("REPLY_DELETE_FAILED", 500);
  }
}
