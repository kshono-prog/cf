// app/api/creators/[username]/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  corsReadOnlyMethods,
  optionsPreflight,
  withCorsResponse,
} from "@/app/api/_lib/cors";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { errJson, jsonResponse, okJson, routeJson } from "@/lib/api/responses";
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

type CreatorEventsRouteContext = {
  params: Promise<{ username: string }>;
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

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return optionsPreflight(req, undefined, corsReadOnlyMethods);
}

// GET: イベント一覧取得
export async function GET(
  req: NextRequest,
  ctx: CreatorEventsRouteContext
): Promise<NextResponse> {
  const { username } = await ctx.params;
  const response = await fetchCreatorPublishedEventsByUsername(username);
  return withCorsResponse(req, routeJson(response), undefined, corsReadOnlyMethods);
}

// POST: イベント登録（マイページから利用）
export async function POST(
  req: NextRequest,
  ctx: CreatorEventsRouteContext
): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const body = (await req.json().catch(() => null)) as EventPostBody | null;
    if (!body) {
      return errJson("INVALID_JSON", 400);
    }

    const { title, description, date, goalAmount, isPublished } = body;
    const categories = parseEventCategories(body.categories) ?? [];

    if (!title || !date) {
      return errJson("TITLE_AND_DATE_REQUIRED", 400);
    }

    const creator = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: { id: true, walletAddress: true },
      })
    );

    if (!creator) {
      return errJson("CREATOR_NOT_FOUND", 404);
    }

    if (!creator.walletAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
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

    return jsonResponse({
      ok: true,
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
      return errJson(error.message, 400);
    }
    console.error("EVENT_CREATE_ERROR", error);
    return errJson("EVENT_CREATE_FAILED", 500);
  }
}

// PUT: イベント更新（マイページから利用）
export async function PUT(
  req: NextRequest,
  ctx: CreatorEventsRouteContext
): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const body = (await req.json().catch(() => null)) as EventPutBody | null;
    if (!body?.id) {
      return errJson("EVENT_ID_REQUIRED", 400);
    }

    const creator = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: { id: true, walletAddress: true },
      })
    );
    if (!creator) {
      return errJson("CREATOR_NOT_FOUND", 404);
    }

    if (!creator.walletAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
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
      return errJson("EVENT_NOT_FOUND", 404);
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

    return jsonResponse({
      ok: true,
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
      return errJson(error.message, 400);
    }
    console.error("EVENT_UPDATE_ERROR", error);
    return errJson("EVENT_UPDATE_FAILED", 500);
  }
}

// DELETE: イベント削除（マイページから利用）
export async function DELETE(
  req: NextRequest,
  ctx: CreatorEventsRouteContext
): Promise<NextResponse> {
  const { username } = await ctx.params;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return errJson("EVENT_ID_REQUIRED", 400);
    }

    const creator = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        select: { id: true, walletAddress: true },
      })
    );
    if (!creator) {
      return errJson("CREATOR_NOT_FOUND", 404);
    }

    if (!creator.walletAddress) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
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
      return errJson("EVENT_NOT_FOUND", 404);
    }

    await withPrismaRetry(() => prisma.event.delete({ where: { id: eventId } }));

    return okJson({});
  } catch (error: unknown) {
    console.error("EVENT_DELETE_ERROR", error);
    return errJson("EVENT_DELETE_FAILED", 500);
  }
}
