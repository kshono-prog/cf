// app/api/creators/random/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CreatorProfile } from "@/types/creator";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");

  // 最大100件まで
  const limitRaw = limitParam ? Number(limitParam) : 100;
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 100)
    : 100;

  try {
    const total = await prisma.creatorProfile.count();

    if (total === 0) {
      return NextResponse.json<CreatorProfile[]>([]);
    }

    // 超ざっくりランダム抽出：
    // ランダムな位置から limit 件だけ取る（完全ランダムではないが十分「バラける」）
    const maxSkip = Math.max(total - limit, 0);
    const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0;

    const rows = await prisma.creatorProfile.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        socialLinks: true,
        youtubeVideos: true,
      },
    });

    const result: CreatorProfile[] = rows.map((p) => {
      // SocialLinks / YoutubeVideo は必要なら後で拡張でもOK
      return {
        username: p.username,
        address: p.walletAddress ?? undefined,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        profile: p.profileText,
        qrcode: p.qrcodeUrl,
        url: p.externalUrl,
        goalTitle: p.goalTitle,
        goalTargetJpyc: p.goalTargetJpyc ?? undefined,
        themeColor: p.themeColor,
        socials: {}, // ここはひとまず空でもOK（必要なら /api/me と同じ整形を足せる）
        youtubeVideos: [],
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    console.error("RANDOM_CREATORS_ERROR", e);
    return NextResponse.json(
      {
        error: "RANDOM_CREATORS_ERROR",
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
