// app/api/rpg/monthly-report/route.ts
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
  const monthParam = searchParams.get("month"); // e.g. "2026-03"
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return errJson("RPG_400_VALIDATION_ERROR", 400, "month parameter required (YYYY-MM)");
  }

  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { walletAddress: normalizeAddress(session.address) },
      select: { id: true },
    });
    if (!profile) return errJson("PROFILE_NOT_FOUND", 404);

    // Check Lv6 gate
    const rpg = await prisma.userRpgProfile.findUnique({
      where: { creatorProfileId: profile.id },
      select: { level: true },
    });
    if (!rpg || rpg.level < 6) {
      return errJson("RPG_403_LOCKED_BY_LEVEL", 403, "Monthly report unlocks at Lv.6");
    }

    const [year, month] = monthParam.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const events = await prisma.rpgExpEvent.findMany({
      where: {
        creatorProfileId: profile.id,
        occurredAt: { gte: from, lt: to },
      },
      select: { eventType: true, awardedExp: true },
    });

    const expEarned = events.reduce((sum, e) => sum + e.awardedExp, 0);

    // Group by eventType
    const grouped = new Map<string, { count: number; exp: number }>();
    for (const e of events) {
      const cur = grouped.get(e.eventType) ?? { count: 0, exp: 0 };
      grouped.set(e.eventType, { count: cur.count + 1, exp: cur.exp + e.awardedExp });
    }
    const topActions = [...grouped.entries()]
      .map(([eventType, { count, exp }]) => ({ eventType, count, exp }))
      .sort((a, b) => b.exp - a.exp)
      .slice(0, 5);

    // Level gain: count LEVEL_UP activity logs in month
    const levelUpLogs = await prisma.rpgActivityLog.count({
      where: {
        creatorProfileId: profile.id,
        eventType: "LEVEL_UP",
        occurredAt: { gte: from, lt: to },
      },
    });

    return okJson({
      month: monthParam,
      expEarned,
      levelGain: levelUpLogs,
      topActions,
    });
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
