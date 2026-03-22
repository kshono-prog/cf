// app/api/metrics/manual/route.ts
// POST — manually record a ContentMetricSnapshot for an external platform post.

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toNonEmptyString,
  toNumberOrNull,
} from "@/lib/api/guards";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

const ALLOWED_PLATFORMS = [
  "YouTube",
  "Twitter/X",
  "Instagram",
  "TikTok",
  "CF",
  "その他",
] as const;

type AllowedPlatform = (typeof ALLOWED_PLATFORMS)[number];

function toPlatform(v: unknown): AllowedPlatform {
  const s = toNonEmptyString(v);
  if (ALLOWED_PLATFORMS.includes(s as AllowedPlatform)) return s as AllowedPlatform;
  return "その他";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await prisma.creatorProfile.findUnique({
      where: { walletAddress: ownerSession.address.toLowerCase() },
      select: { id: true },
    });
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const platform = toPlatform(raw.platform);
    const contentUrl = toNonEmptyString(raw.contentUrl);
    if (!contentUrl) return errJson("CONTENT_URL_REQUIRED", 400);

    let projectId: bigint | null = null;
    const projectIdRaw = toNonEmptyString(raw.projectId);
    if (projectIdRaw) {
      projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
    }

    const toSafeCount = (v: unknown): number | null => {
      const n = toNumberOrNull(v);
      return n !== null ? Math.max(0, Math.trunc(n)) : null;
    };

    const postedAtRaw = toNonEmptyString(raw.postedAt);
    const postedAt = postedAtRaw ? new Date(postedAtRaw) : null;
    if (postedAt && isNaN(postedAt.getTime())) {
      return errJson("POSTED_AT_INVALID", 400);
    }

    const snapshot = await prisma.contentMetricSnapshot.create({
      data: {
        creatorProfileId: creator.id,
        projectId,
        platform,
        contentExternalId: contentUrl,
        contentUrl,
        postedAt,
        views: toSafeCount(raw.views),
        likes: toSafeCount(raw.likes),
        comments: toSafeCount(raw.comments),
        shares: toSafeCount(raw.shares),
        rawJson: { source: "manual" },
      },
      select: {
        id: true,
        platform: true,
        contentUrl: true,
        capturedAt: true,
        views: true,
        likes: true,
        comments: true,
        shares: true,
      },
    });

    return okJson({ ok: true, snapshot });
  } catch (err) {
    console.error("[metrics/manual]", err);
    return errJson("INTERNAL_ERROR", 500);
  }
}
