import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import {
  findCreatorByWalletAddress,
  isUuidString,
  serializePost,
  toManagedPostStatus,
} from "@/lib/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { postId: string };
type PatchBody = {
  address?: unknown;
  status?: unknown;
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { postId } = await ctx.params;
    if (!isUuidString(postId)) return errJson("POST_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PatchBody;
    if (typeof body.address !== "string") return errJson("ADDRESS_REQUIRED", 400);

    const status = toManagedPostStatus(body.status);
    if (!status) return errJson("STATUS_INVALID", 400);

    const creator = await findCreatorByWalletAddress(body.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const existing = await prisma.post.findFirst({
      where: {
        id: postId,
        creatorProfileId: creator.id,
      },
      select: { id: true },
    });
    if (!existing) return errJson("POST_NOT_FOUND", 404);

    const row = await prisma.post.update({
      where: { id: postId },
      data: {
        status,
        updatedAt: new Date(),
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
      },
    });

    return okJson({
      post: serializePost(row, false),
    });
  } catch (error) {
    console.error("MYPAGE_SNS_POST_PATCH_FAILED", error);
    return errJson("MYPAGE_SNS_POST_PATCH_FAILED", 500);
  }
}
