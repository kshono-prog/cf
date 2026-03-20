// app/api/creators/[username]/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import {
  isEventCategory,
  type EventCategory,
} from "@/lib/creatorTaxonomy";
import { fetchCreatorPublishedEventsByUsername } from "@/lib/publicEventsApi";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

type EventPostBody = {
  title?: string;
  description?: string;
  // フロントから受け取る開始日時（datetime-local の文字列など）
  date?: string;
  // フロントから受け取る目標額（JPYC）
  goalAmount?: number;
  // 将来拡張用フィールド（今は使わなくてもOK）
  endDate?: string;
  placeName?: string;
  placeUrl?: string;
  ticketUrl?: string;
  categories?: string[];
  isPublished?: boolean;
};

// 追記: 更新用の body 型
type EventPutBody = {
  id?: string; // BigIntを文字列で受ける
  title?: string;
  description?: string;
  date?: string; // startAt
  goalAmount?: number;
  categories?: string[];
  isPublished?: boolean;
};

function parseEventCategories(
  input: unknown
): EventCategory[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) {
    throw new Error("EVENT_CATEGORIES_INVALID");
  }

  const categories: EventCategory[] = [];
  for (const item of input) {
    if (typeof item !== "string" || !isEventCategory(item)) {
      throw new Error("EVENT_CATEGORIES_INVALID");
    }
    if (!categories.includes(item)) {
      categories.push(item);
    }
  }

  if (categories.length > 5) {
    throw new Error("EVENT_CATEGORIES_TOO_MANY");
  }

  return categories;
}

function serializeGoalAmount(
  goalAmountJpyc: bigint | number | null
): string | number | null {
  if (goalAmountJpyc === null) {
    return null;
  }
  return typeof goalAmountJpyc === "bigint"
    ? goalAmountJpyc.toString()
    : goalAmountJpyc;
}

// GET: イベント一覧取得
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/creators/[username]/events">
): Promise<NextResponse> {
  const { username } = await ctx.params;
  const response = await fetchCreatorPublishedEventsByUsername(username);
  return NextResponse.json(response.body, { status: response.status });
}

// POST: イベント登録（マイページから利用）
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/creators/[username]/events">
): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const body = (await req.json().catch(() => null)) as EventPostBody | null;
    if (!body) {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const { title, description, date, goalAmount, isPublished } = body;
    const categories = parseEventCategories(body.categories) ?? [];

    if (!title || !date) {
      return NextResponse.json(
        { error: "TITLE_AND_DATE_REQUIRED" },
        { status: 400 }
      );
    }

    const creator = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: { id: true, walletAddress: true },
      })
    );

    if (!creator) {
      return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
    }

    if (!creator.walletAddress) {
      return NextResponse.json(
        { error: "FORBIDDEN_NOT_OWNER" },
        { status: 403 }
      );
    }

    const ownerSession = await requireOwnerSession(req, creator.walletAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    const startAt = new Date(date);

    const newEvent = await withPrismaRetry(() =>
      prisma.event.create({
        data: {
          creatorProfileId: creator.id,
          title,
          description: description || null,
          // Prisma 側のフィールド名に合わせる
          startAt,
          endAt: null,
          placeName: null,
          placeUrl: null,
          ticketUrl: null,
          eventCategories: categories,
          goalAmountJpyc:
            typeof goalAmount === "number" ? Math.trunc(goalAmount) : null,
          isPublished:
            typeof isPublished === "boolean" ? isPublished : true,
        },
      })
    );

    return NextResponse.json({
      id: newEvent.id.toString(),
      title: newEvent.title,
      description: newEvent.description,
      // レスポンスでは startAt を date として返す
      date: newEvent.startAt ? newEvent.startAt.toISOString() : null,
      goalAmount: serializeGoalAmount(newEvent.goalAmountJpyc),
      categories: newEvent.eventCategories.filter(isEventCategory),
      isPublished: newEvent.isPublished,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "EVENT_CATEGORIES_INVALID" ||
        error.message === "EVENT_CATEGORIES_TOO_MANY")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("EVENT_CREATE_ERROR", error);
    return NextResponse.json({ error: "EVENT_CREATE_FAILED" }, { status: 500 });
  }
}

// PUT: イベント更新（マイページから利用）
export async function PUT(
  req: NextRequest,
  ctx: RouteContext<"/api/creators/[username]/events">
): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const body = (await req.json().catch(() => null)) as EventPutBody | null;
    if (!body?.id) {
      return NextResponse.json({ error: "EVENT_ID_REQUIRED" }, { status: 400 });
    }

    const creator = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: { id: true, walletAddress: true },
      })
    );
    if (!creator) {
      return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
    }

    if (!creator.walletAddress) {
      return NextResponse.json(
        { error: "FORBIDDEN_NOT_OWNER" },
        { status: 403 }
      );
    }

    const ownerSession = await requireOwnerSession(req, creator.walletAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    // 自分のイベントのみ更新できるようにガード
    const eventId = BigInt(body.id);

    const existing = await withPrismaRetry(() =>
      prisma.event.findFirst({
        where: { id: eventId, creatorProfileId: creator.id },
        select: { id: true },
      })
    );
    if (!existing) {
      return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    const categories = parseEventCategories(body.categories);

    const updated = await withPrismaRetry(() =>
      prisma.event.update({
        where: { id: eventId },
        data: {
          title: typeof body.title === "string" ? body.title : undefined,
          description:
            typeof body.description === "string" ? body.description : undefined,
          startAt:
            typeof body.date === "string" ? new Date(body.date) : undefined,
          goalAmountJpyc:
            typeof body.goalAmount === "number"
              ? Math.trunc(body.goalAmount)
              : undefined,
          eventCategories: categories,
          isPublished:
            typeof body.isPublished === "boolean"
              ? body.isPublished
              : undefined,
        },
      })
    );

    return NextResponse.json({
      id: updated.id.toString(),
      title: updated.title,
      description: updated.description,
      date: updated.startAt ? updated.startAt.toISOString() : null,
      goalAmount: updated.goalAmountJpyc,
      categories: updated.eventCategories.filter(isEventCategory),
      isPublished: updated.isPublished,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === "EVENT_CATEGORIES_INVALID" ||
        error.message === "EVENT_CATEGORIES_TOO_MANY")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("EVENT_UPDATE_ERROR", error);
    return NextResponse.json({ error: "EVENT_UPDATE_FAILED" }, { status: 500 });
  }
}

// DELETE: イベント削除（マイページから利用）
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/creators/[username]/events">
): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "EVENT_ID_REQUIRED" }, { status: 400 });
    }

    const creator = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: { id: true, walletAddress: true },
      })
    );
    if (!creator) {
      return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
    }

    if (!creator.walletAddress) {
      return NextResponse.json(
        { error: "FORBIDDEN_NOT_OWNER" },
        { status: 403 }
      );
    }

    const ownerSession = await requireOwnerSession(req, creator.walletAddress);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    const eventId = BigInt(id);

    // 自分のイベントのみ削除できるようにガード
    const existing = await withPrismaRetry(() =>
      prisma.event.findFirst({
        where: { id: eventId, creatorProfileId: creator.id },
        select: { id: true },
      })
    );
    if (!existing) {
      return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    await withPrismaRetry(() => prisma.event.delete({ where: { id: eventId } }));

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("EVENT_DELETE_ERROR", error);
    return NextResponse.json({ error: "EVENT_DELETE_FAILED" }, { status: 500 });
  }
}
