// app/api/events/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);

    // ?exclude=username1,username2 のように複数除外も可能
    const excludeRaw = url.searchParams.get("exclude") ?? "";
    const excludeUsernames = excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? 50), 1),
      200
    );

    const events = await prisma.event.findMany({
      where: {
        isPublished: true,
        ...(excludeUsernames.length > 0
          ? { creatorProfile: { username: { notIn: excludeUsernames } } }
          : {}),
      },
      orderBy: { startAt: "asc" },
      take: limit,
      include: {
        creatorProfile: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
            themeColor: true,
          },
        },
      },
    });

    // BigInt を文字列化して返す
    return NextResponse.json({
      events: events.map((e: (typeof events)[number]) => ({
        id: e.id.toString(),
        title: e.title,
        description: e.description,
        date: e.startAt ? e.startAt.toISOString() : null,
        goalAmount: e.goalAmountJpyc,
        // イベント表示に必要な最小のクリエイター情報
        creator: {
          username: e.creatorProfile.username,
          displayName: e.creatorProfile.displayName,
          avatarUrl: e.creatorProfile.avatarUrl,
          themeColor: e.creatorProfile.themeColor,
        },
      })),
    });
  } catch (error: unknown) {
    console.error("PUBLIC_EVENT_LIST_ERROR", error);
    return NextResponse.json(
      { error: "PUBLIC_EVENT_LIST_FAILED" },
      { status: 500 }
    );
  }
}
