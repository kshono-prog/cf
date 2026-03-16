import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import { findCreatorByWalletAddress, isUuidString } from "@/lib/social";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { postId: string };

function parseAddress(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  return typeof raw.address === "string" ? raw.address : null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { postId } = await ctx.params;
    if (!isUuidString(postId)) return errJson("POST_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    const address = parseAddress(raw);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, address);
    if (!ownerSession.ok) return ownerSession.response;

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

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.postLike.findUnique({
        where: {
          postId_creatorProfileId: {
            postId,
            creatorProfileId: creator.id,
          },
        },
        select: { id: true },
      });

      if (existing) {
        const currentPost = await tx.post.findUnique({
          where: { id: postId },
          select: { likeCount: true },
        });
        return {
          liked: true,
          likeCount: currentPost?.likeCount ?? 0,
        };
      }

      await tx.postLike.create({
        data: {
          postId,
          creatorProfileId: creator.id,
          createdAt: now,
        },
        select: { id: true },
      });

      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          likeCount: { increment: 1 },
          updatedAt: now,
        },
        select: { likeCount: true },
      });

      return {
        liked: true,
        likeCount: updatedPost.likeCount,
      };
    });

    return okJson({
      postId,
      liked: result.liked,
      likeCount: result.likeCount,
    });
  } catch (error) {
    console.error("POST_LIKE_POST_FAILED", error);
    return errJson("POST_LIKE_POST_FAILED", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { postId } = await ctx.params;
    if (!isUuidString(postId)) return errJson("POST_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    const address = parseAddress(raw);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, address);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) return errJson("POST_NOT_FOUND", 404);

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.postLike.findUnique({
        where: {
          postId_creatorProfileId: {
            postId,
            creatorProfileId: creator.id,
          },
        },
        select: { id: true },
      });

      if (!existing) {
        const currentPost = await tx.post.findUnique({
          where: { id: postId },
          select: { likeCount: true },
        });
        return {
          liked: false,
          likeCount: currentPost?.likeCount ?? 0,
        };
      }

      await tx.postLike.delete({
        where: {
          postId_creatorProfileId: {
            postId,
            creatorProfileId: creator.id,
          },
        },
      });

      await tx.post.updateMany({
        where: {
          id: postId,
          likeCount: { gt: 0 },
        },
        data: {
          likeCount: { decrement: 1 },
          updatedAt: now,
        },
      });

      const updatedPost = await tx.post.findUnique({
        where: { id: postId },
        select: { likeCount: true },
      });

      return {
        liked: false,
        likeCount: updatedPost?.likeCount ?? 0,
      };
    });

    return okJson({
      postId,
      liked: result.liked,
      likeCount: result.likeCount,
    });
  } catch (error) {
    console.error("POST_LIKE_DELETE_FAILED", error);
    return errJson("POST_LIKE_DELETE_FAILED", 500);
  }
}
