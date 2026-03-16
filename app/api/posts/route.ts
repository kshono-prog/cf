import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toBigIntOrThrow } from "@/lib/api/guards";
import {
  findCreatorByWalletAddress,
  normalizeTextBody,
  POST_BODY_MAX_LENGTH,
  serializePost,
  toNullableTrimmedString,
  toPostMediaType,
} from "@/lib/social";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = {
  address?: unknown;
  body?: unknown;
  mediaType?: unknown;
  mediaUrl?: unknown;
  projectId?: unknown;
};

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;
    if (typeof body.address !== "string") return errJson("ADDRESS_REQUIRED", 400);
    const ownerSession = await requireOwnerSession(req, body.address);
    if (!ownerSession.ok) return ownerSession.response;

    const postBody = normalizeTextBody(body.body, POST_BODY_MAX_LENGTH);
    if (!postBody) {
      return errJson(
        typeof body.body === "string" && body.body.trim().length > POST_BODY_MAX_LENGTH
          ? "BODY_TOO_LONG"
          : "BODY_REQUIRED",
        400
      );
    }

    const mediaType =
      typeof body.mediaType === "undefined" || body.mediaType === null
        ? null
        : toPostMediaType(body.mediaType);
    if (body.mediaType != null && !mediaType) {
      return errJson("MEDIA_TYPE_INVALID", 400);
    }

    const mediaUrl = toNullableTrimmedString(body.mediaUrl);
    if (typeof body.mediaUrl !== "undefined" && typeof mediaUrl === "undefined") {
      return errJson("MEDIA_URL_INVALID", 400);
    }
    if ((mediaType && !mediaUrl) || (!mediaType && mediaUrl)) {
      return errJson("MEDIA_FIELDS_MISMATCH", 400);
    }
    if (mediaUrl && !isHttpUrl(mediaUrl)) {
      return errJson("MEDIA_URL_INVALID", 400);
    }

    let projectId: bigint | null = null;
    if (body.projectId != null) {
      if (typeof body.projectId !== "string" || !body.projectId.trim()) {
        return errJson("PROJECT_ID_INVALID", 400);
      }
      try {
        projectId = toBigIntOrThrow(body.projectId, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    const creator = await findCreatorByWalletAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    if (projectId) {
      const ownedProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          creatorProfileId: creator.id,
        },
        select: { id: true },
      });
      if (!ownedProject) return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }

    const now = new Date();
    const row = await prisma.post.create({
      data: {
        creatorProfileId: creator.id,
        projectId,
        authorType: "CREATOR",
        body: postBody,
        mediaType,
        mediaUrl,
        visibility: "PUBLIC",
        status: "PUBLISHED",
        aiGenerated: false,
        aiAgentId: null,
        createdAt: now,
        updatedAt: now,
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
    console.error("POSTS_POST_FAILED", error);
    return errJson("POSTS_POST_FAILED", 500);
  }
}
