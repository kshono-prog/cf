import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toBigIntOrThrow } from "@/lib/api/guards";
import {
  findCreatorByWalletAddress,
  isUuidString,
  normalizeTextBody,
  POST_BODY_MAX_LENGTH,
  serializePost,
  toNullableTrimmedString,
  toManagedPostStatus,
  toPostMediaType,
} from "@/lib/social";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { postId: string };
type PatchBody = {
  address?: unknown;
  status?: unknown;
  body?: unknown;
  mediaType?: unknown;
  mediaUrl?: unknown;
  projectId?: unknown;
};

type DeleteBody = {
  address?: unknown;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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
    const ownerSession = await requireOwnerSessionFromBody(req, body);
    if (!ownerSession.ok) return ownerSession.response;

    const nextStatus =
      typeof body.status === "undefined"
        ? undefined
        : toManagedPostStatus(body.status);
    if (typeof body.status !== "undefined" && !nextStatus) {
      return errJson("STATUS_INVALID", 400);
    }

    const nextBody =
      typeof body.body === "undefined"
        ? undefined
        : normalizeTextBody(body.body, POST_BODY_MAX_LENGTH);
    if (typeof body.body !== "undefined" && !nextBody) {
      return errJson(
        typeof body.body === "string" &&
          body.body.trim().length > POST_BODY_MAX_LENGTH
          ? "BODY_TOO_LONG"
          : "BODY_REQUIRED",
        400
      );
    }

    const nextMediaType =
      typeof body.mediaType === "undefined"
        ? undefined
        : body.mediaType === null
        ? null
        : toPostMediaType(body.mediaType);
    if (
      typeof body.mediaType !== "undefined" &&
      body.mediaType !== null &&
      !nextMediaType
    ) {
      return errJson("MEDIA_TYPE_INVALID", 400);
    }

    const nextMediaUrl = toNullableTrimmedString(body.mediaUrl);
    if (
      typeof body.mediaUrl !== "undefined" &&
      typeof nextMediaUrl === "undefined"
    ) {
      return errJson("MEDIA_URL_INVALID", 400);
    }

    let nextProjectId: bigint | null | undefined = undefined;
    if (typeof body.projectId !== "undefined") {
      if (body.projectId === null) {
        nextProjectId = null;
      } else if (typeof body.projectId === "string") {
        const trimmedProjectId = body.projectId.trim();
        if (!trimmedProjectId) {
          nextProjectId = null;
        } else {
          try {
            nextProjectId = toBigIntOrThrow(trimmedProjectId, "PROJECT_ID_INVALID");
          } catch {
            return errJson("PROJECT_ID_INVALID", 400);
          }
        }
      } else {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    const shouldUpdateContent =
      typeof nextBody !== "undefined" ||
      typeof nextMediaType !== "undefined" ||
      typeof nextMediaUrl !== "undefined" ||
      typeof nextProjectId !== "undefined";
    if (typeof nextStatus === "undefined" && !shouldUpdateContent) {
      return errJson("UPDATE_FIELDS_REQUIRED", 400);
    }

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const existing = await prisma.post.findFirst({
      where: {
        id: postId,
        creatorProfileId: creator.id,
      },
      select: {
        id: true,
        body: true,
        mediaType: true,
        mediaUrl: true,
        projectId: true,
      },
    });
    if (!existing) return errJson("POST_NOT_FOUND", 404);

    const resolvedBody = nextBody ?? existing.body;
    const resolvedMediaType =
      typeof nextMediaType === "undefined" ? existing.mediaType : nextMediaType;
    const resolvedMediaUrl =
      typeof nextMediaUrl === "undefined" ? existing.mediaUrl : nextMediaUrl;
    if (
      (resolvedMediaType && !resolvedMediaUrl) ||
      (!resolvedMediaType && resolvedMediaUrl)
    ) {
      return errJson("MEDIA_FIELDS_MISMATCH", 400);
    }
    if (resolvedMediaUrl && !isHttpUrl(resolvedMediaUrl)) {
      return errJson("MEDIA_URL_INVALID", 400);
    }

    const resolvedProjectId =
      typeof nextProjectId === "undefined" ? existing.projectId : nextProjectId;
    if (resolvedProjectId) {
      const ownedProject = await prisma.project.findFirst({
        where: {
          id: resolvedProjectId,
          creatorProfileId: creator.id,
        },
        select: { id: true },
      });
      if (!ownedProject) return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const updateData: Prisma.PostUncheckedUpdateInput = {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(shouldUpdateContent
        ? {
            body: resolvedBody,
            mediaType: resolvedMediaType,
            mediaUrl: resolvedMediaUrl,
            projectId: resolvedProjectId,
          }
        : {}),
      updatedAt: new Date(),
    };

    const row = await prisma.post.update({
      where: { id: postId },
      data: updateData,
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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { postId } = await ctx.params;
    if (!isUuidString(postId)) return errJson("POST_ID_INVALID", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as DeleteBody;
    const ownerSession = await requireOwnerSessionFromBody(req, body);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const existing = await prisma.post.findFirst({
      where: {
        id: postId,
        creatorProfileId: creator.id,
      },
      select: { id: true },
    });
    if (!existing) return errJson("POST_NOT_FOUND", 404);

    await prisma.post.delete({
      where: { id: postId },
      select: { id: true },
    });

    return okJson({
      deletedPostId: postId,
    });
  } catch (error) {
    console.error("MYPAGE_SNS_POST_DELETE_FAILED", error);
    return errJson("MYPAGE_SNS_POST_DELETE_FAILED", 500);
  }
}
