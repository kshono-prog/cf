// app/api/creators/[username]/events/manage/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, jsonResponse } from "@/lib/api/responses";
import { isEventCategory } from "@/lib/creatorTaxonomy";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

type Ctx = {
  params: Promise<{ username: string }>;
};

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true, walletAddress: true },
    });

    if (!creator) {
      return jsonResponse({ events: [] });
    }

    if (!creator.walletAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const ownerSession = await requireOwnerSession(req, creator.walletAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    // 管理画面は公開/非公開すべて返す
    const events = await prisma.event.findMany({
      where: { creatorProfileId: creator.id },
      orderBy: { startAt: "asc" },
    });

    return jsonResponse({
      events: events.map((e: (typeof events)[number]) => ({
        id: e.id.toString(),
        title: e.title,
        description: e.description,
        date: e.startAt ? e.startAt.toISOString() : null,
        goalAmount: e.goalAmountJpyc,
        categories: e.eventCategories.filter(isEventCategory),
        isPublished: e.isPublished,
      })),
    });
  } catch (error: unknown) {
    console.error("EVENT_MANAGE_LIST_ERROR", error);
    return errJson("EVENT_MANAGE_LIST_FAILED", 500);
  }
}
