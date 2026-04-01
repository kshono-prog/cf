// app/api/rpg/activity-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { okJson, errJson } from "@/lib/api/responses";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "@/lib/api/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireOwnerSession(req);
  if (!session.ok) return session.response;

  const { searchParams } = new URL(req.url);
  const limitRaw = Number(searchParams.get("limit") ?? "20");
  const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));
  const cursor = searchParams.get("cursor");

  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { walletAddress: normalizeAddress(session.address) },
      select: { id: true },
    });
    if (!profile) return errJson("PROFILE_NOT_FOUND", 404);

    const logs = await prisma.rpgActivityLog.findMany({
      where: {
        creatorProfileId: profile.id,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: limit + 1,
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return okJson({
      items: items.map((l) => ({
        id: l.id,
        occurredAt: l.occurredAt.toISOString(),
        eventType: l.eventType,
        message: l.messageJa,
        metadata: l.metadataJson,
      })),
      nextCursor,
    });
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
