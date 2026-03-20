import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { findCreatorByWalletAddress, isUuidString } from "@/lib/social";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { replyId: string };

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { replyId } = await ctx.params;
    if (!isUuidString(replyId)) return errJson("REPLY_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const reply = await prisma.reply.findFirst({
      where: {
        id: replyId,
        post: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
        },
      },
      select: { id: true },
    });
    if (!reply) return errJson("REPLY_NOT_FOUND", 404);

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.replyLike.findUnique({
        where: {
          replyId_creatorProfileId: {
            replyId,
            creatorProfileId: creator.id,
          },
        },
        select: { id: true },
      });

      if (existing) {
        const currentReply = await tx.reply.findUnique({
          where: { id: replyId },
          select: { likeCount: true },
        });
        return {
          liked: true,
          likeCount: currentReply?.likeCount ?? 0,
        };
      }

      await tx.replyLike.create({
        data: {
          replyId,
          creatorProfileId: creator.id,
          createdAt: now,
        },
        select: { id: true },
      });

      const updatedReply = await tx.reply.update({
        where: { id: replyId },
        data: {
          likeCount: { increment: 1 },
          updatedAt: now,
        },
        select: { likeCount: true },
      });

      return {
        liked: true,
        likeCount: updatedReply.likeCount,
      };
    });

    return okJson({
      replyId,
      liked: result.liked,
      likeCount: result.likeCount,
    });
  } catch (error) {
    console.error("REPLY_LIKE_POST_FAILED", error);
    return errJson("REPLY_LIKE_POST_FAILED", 500);
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
    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const reply = await prisma.reply.findUnique({
      where: { id: replyId },
      select: { id: true },
    });
    if (!reply) return errJson("REPLY_NOT_FOUND", 404);

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.replyLike.findUnique({
        where: {
          replyId_creatorProfileId: {
            replyId,
            creatorProfileId: creator.id,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        const currentReply = await tx.reply.findUnique({
          where: { id: replyId },
          select: { likeCount: true },
        });
        return {
          liked: false,
          likeCount: currentReply?.likeCount ?? 0,
        };
      }

      await tx.replyLike.delete({
        where: {
          replyId_creatorProfileId: {
            replyId,
            creatorProfileId: creator.id,
          },
        },
      });

      await tx.reply.updateMany({
        where: {
          id: replyId,
          likeCount: { gt: 0 },
        },
        data: {
          likeCount: { decrement: 1 },
          updatedAt: now,
        },
      });

      const updatedReply = await tx.reply.findUnique({
        where: { id: replyId },
        select: { likeCount: true },
      });

      return {
        liked: false,
        likeCount: updatedReply?.likeCount ?? 0,
      };
    });

    return okJson({
      replyId,
      liked: result.liked,
      likeCount: result.likeCount,
    });
  } catch (error) {
    console.error("REPLY_LIKE_DELETE_FAILED", error);
    return errJson("REPLY_LIKE_DELETE_FAILED", 500);
  }
}
