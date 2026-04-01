// app/api/rpg/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { okJson, errJson } from "@/lib/api/responses";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";
import { calculateStats } from "@/lib/rpg/statsCalculator";
import { normalizeAddress } from "@/lib/api/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireOwnerSession(req);
  if (!session.ok) return session.response;

  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { walletAddress: normalizeAddress(session.address) },
      select: { id: true, displayName: true, username: true },
    });
    if (!profile) return errJson("PROFILE_NOT_FOUND", 404);

    const creatorProfileId = profile.id;

    let rpg = await prisma.userRpgProfile.findUnique({ where: { creatorProfileId } });
    if (!rpg) {
      rpg = await prisma.userRpgProfile.create({ data: { creatorProfileId } });
    }

    const nextLevelReq = await prisma.rpgLevelRequirement.findUnique({ where: { level: rpg.level } });
    const nextLevelExp = nextLevelReq?.requiredExp ?? null;
    const expProgressRate = nextLevelExp ? Math.round((rpg.currentExp / nextLevelExp) * 1000) / 10 : 100;

    const [stats, earnedBadges, totalBadges] = await Promise.all([
      calculateStats(creatorProfileId),
      prisma.userRpgBadge.count({ where: { creatorProfileId } }),
      prisma.rpgBadge.count({ where: { enabled: true } }),
    ]);

    return okJson({
      userId: String(creatorProfileId),
      displayName: profile.displayName,
      level: rpg.level,
      currentExp: rpg.currentExp,
      nextLevelExp,
      expProgressRate,
      titleCode: rpg.currentTitleCode,
      stats,
      badgeSummary: { earnedCount: earnedBadges, totalCount: totalBadges },
      privacy: {
        showLevel: rpg.showLevel,
        showTotalSupportAmount: rpg.showTotalSupportAmount,
        showActivityLog: rpg.showActivityLog,
        showBadges: rpg.showBadges,
      },
    });
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
