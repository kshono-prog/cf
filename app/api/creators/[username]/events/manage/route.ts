// app/api/creators/[username]/events/manage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = {
  params: Promise<{ username: string }>;
};

export async function GET(_req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ events: [] });
    }

    // 管理画面は公開/非公開すべて返す
    const events = await prisma.event.findMany({
      where: { creatorProfileId: creator.id },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({
      events: events.map((e: (typeof events)[number]) => ({
        id: e.id.toString(),
        title: e.title,
        description: e.description,
        date: e.startAt ? e.startAt.toISOString() : null,
        goalAmount: e.goalAmountJpyc,
        isPublished: e.isPublished,
      })),
    });
  } catch (error: unknown) {
    console.error("EVENT_MANAGE_LIST_ERROR", error);
    return NextResponse.json(
      { error: "EVENT_MANAGE_LIST_FAILED" },
      { status: 500 }
    );
  }
}
