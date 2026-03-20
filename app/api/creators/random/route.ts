// app/api/creators/random/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { errJson, jsonResponse } from "@/lib/api/responses";
import { isCreatorType } from "@/lib/creatorTaxonomy";
import type { CreatorProfile } from "@/types/creator";
import { serializeCreatorProfile } from "@/lib/serializers/creator";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");

  // 最大100件まで
  const limitRaw = limitParam ? Number(limitParam) : 100;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 100)
    : 100;
  const creatorTypeRaw = searchParams.get("creatorType");
  const creatorType =
    typeof creatorTypeRaw === "string" && isCreatorType(creatorTypeRaw)
      ? creatorTypeRaw
      : null;

  try {
    const total = await withPrismaRetry(() =>
      prisma.creatorProfile.count({
        where: creatorType ? { creatorType } : undefined,
      })
    );

    if (total === 0) {
      return withCorsResponse(
        req,
        jsonResponse<CreatorProfile[]>([]),
        undefined,
        corsReadOnlyMethods
      );
    }

    // 超ざっくりランダム抽出：
    // ランダムな位置から limit 件だけ取る（完全ランダムではないが十分「バラける」）
    const maxSkip = Math.max(total - limit, 0);
    const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0;

    const rows = await withPrismaRetry(() =>
      prisma.creatorProfile.findMany({
        where: creatorType ? { creatorType } : undefined,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          socialLinks: true,
          youtubeVideos: true,
        },
      })
    );

    const result: CreatorProfile[] = rows.map((p) =>
      serializeCreatorProfile({
        username: p.username,
        displayName: p.displayName,
        profileText: p.profileText,
        avatarUrl: p.avatarUrl,
        qrcodeUrl: p.qrcodeUrl,
        externalUrl: p.externalUrl,
        themeColor: p.themeColor,
        creatorType: p.creatorType,
        walletAddress: p.walletAddress,
        socialLinks: p.socialLinks,
        youtubeVideos: p.youtubeVideos,
      })
    );

    return withCorsResponse(
      req,
      jsonResponse(result, 200),
      undefined,
      corsReadOnlyMethods
    );
  } catch (e) {
    console.error("RANDOM_CREATORS_ERROR", e);
    return withCorsResponse(
      req,
      errJson(
        "RANDOM_CREATORS_ERROR",
        500,
        e instanceof Error ? e.message : String(e)
      ),
      undefined,
      corsReadOnlyMethods
    );
  }
}
