// app/api/creators/[username]/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
};

// 追記: 更新用の body 型
type EventPutBody = {
  id?: string; // BigIntを文字列で受ける
  title?: string;
  description?: string;
  date?: string; // startAt
  goalAmount?: number;
  isPublished?: boolean;
};

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
  // RouteContext により params は Promise になる
  const { username } = await ctx.params;

  try {
    const creator = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!creator) {
      // クリエイターがまだ存在しない場合は 404 ではなく空配列を返す
      return NextResponse.json({ events: [] });
    }

    const events = await prisma.event.findMany({
      where: { creatorProfileId: creator.id, isPublished: true },
      orderBy: { startAt: "asc" },
    });

    // BigInt をそのまま返すと JSON 化で落ちるので、文字列に変換する
    return NextResponse.json({
      events: events.map((e: (typeof events)[number]) => ({
        id: e.id.toString(),
        title: e.title,
        description: e.description,
        // API レスポンスでは startAt を date として返す
        date: e.startAt ? e.startAt.toISOString() : null,
        // goalAmountJpyc を goalAmount として返す
        goalAmount: serializeGoalAmount(e.goalAmountJpyc),
        // placeName / placeUrl / ticketUrl などは必要になったらここに追加
      })),
    });
  } catch (error: unknown) {
    console.error("EVENT_LIST_ERROR", error);
    return NextResponse.json({ error: "EVENT_LIST_FAILED" }, { status: 500 });
  }
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

    const { title, description, date, goalAmount } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: "TITLE_AND_DATE_REQUIRED" },
        { status: 400 }
      );
    }

    const creator = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!creator) {
      return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
    }

    const startAt = new Date(date);

    const newEvent = await prisma.event.create({
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
        goalAmountJpyc:
          typeof goalAmount === "number" ? Math.trunc(goalAmount) : null,
        isPublished: true,
      },
    });

    return NextResponse.json({
      id: newEvent.id.toString(),
      title: newEvent.title,
      description: newEvent.description,
      // レスポンスでは startAt を date として返す
      date: newEvent.startAt ? newEvent.startAt.toISOString() : null,
      goalAmount: serializeGoalAmount(newEvent.goalAmountJpyc),
    });
  } catch (error: unknown) {
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

    const creator = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
    }

    // 自分のイベントのみ更新できるようにガード
    const eventId = BigInt(body.id);

    const existing = await prisma.event.findFirst({
      where: { id: eventId, creatorProfileId: creator.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    const updated = await prisma.event.update({
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
        isPublished:
          typeof body.isPublished === "boolean" ? body.isPublished : undefined,
      },
    });

    return NextResponse.json({
      id: updated.id.toString(),
      title: updated.title,
      description: updated.description,
      date: updated.startAt ? updated.startAt.toISOString() : null,
      goalAmount: updated.goalAmountJpyc,
      isPublished: updated.isPublished,
    });
  } catch (error: unknown) {
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

    const creator = await prisma.creatorProfile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!creator) {
      return NextResponse.json({ error: "CREATOR_NOT_FOUND" }, { status: 404 });
    }

    const eventId = BigInt(id);

    // 自分のイベントのみ削除できるようにガード
    const existing = await prisma.event.findFirst({
      where: { id: eventId, creatorProfileId: creator.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    await prisma.event.delete({ where: { id: eventId } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("EVENT_DELETE_ERROR", error);
    return NextResponse.json({ error: "EVENT_DELETE_FAILED" }, { status: 500 });
  }
}
