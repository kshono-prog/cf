// app/api/rpg/users/[profileId]/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { okJson, errJson } from "@/lib/api/responses";
import { prisma } from "@/lib/prisma";
import { calculateStats } from "@/lib/rpg/statsCalculator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { profileId: string };

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  const { profileId } = await ctx.params;

  let creatorProfileId: bigint;
  try {
    creatorProfileId = BigInt(profileId);
  } catch {
    return errJson("RPG_400_VALIDATION_ERROR", 400, "Invalid profileId");
  }

  try {
    const [profile, rpg] = await Promise.all([
      prisma.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        select: { id: true, displayName: true, username: true },
      }),
      prisma.userRpgProfile.findUnique({ where: { creatorProfileId } }),
    ]);

    if (!profile) return errJson("RPG_404_NOT_FOUND", 404, "User not found");

    const level = rpg?.level ?? 1;
    const titleCode = rpg?.currentTitleCode ?? null;

    const result: Record<string, unknown> = {
      userId: String(creatorProfileId),
      displayName: profile.displayName,
      titleCode,
    };

    if (!rpg || rpg.showLevel) {
      result.level = level;
    }

    if (!rpg || rpg.showBadges) {
      const earned = await prisma.userRpgBadge.findMany({
        where: { creatorProfileId },
        orderBy: { earnedAt: "asc" },
        select: { badgeCode: true, earnedAt: true },
      });
      result.badges = earned.map((b) => ({
        badgeCode: b.badgeCode,
        earnedAt: b.earnedAt.toISOString(),
      }));
    }

    if (!rpg || rpg.showActivityLog) {
      const logs = await prisma.rpgActivityLog.findMany({
        where: { creatorProfileId },
        orderBy: { occurredAt: "desc" },
        take: 10,
        select: { occurredAt: true, eventType: true, messageJa: true },
      });
      result.activityLog = logs.map((l) => ({
        occurredAt: l.occurredAt.toISOString(),
        eventType: l.eventType,
        message: l.messageJa,
      }));
    }

    // Stats are always public (they don't reveal sensitive info)
    const stats = await calculateStats(creatorProfileId);
    result.stats = stats;

    return okJson(result as Parameters<typeof okJson>[0]);
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
