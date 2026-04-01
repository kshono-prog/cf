// app/api/rpg/badges/route.ts
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

  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { walletAddress: normalizeAddress(session.address) },
      select: { id: true },
    });
    if (!profile) return errJson("PROFILE_NOT_FOUND", 404);

    const [allBadges, earned] = await Promise.all([
      prisma.rpgBadge.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } }),
      prisma.userRpgBadge.findMany({ where: { creatorProfileId: profile.id } }),
    ]);

    const earnedMap = new Map(earned.map((e) => [e.badgeCode, e.earnedAt]));

    const badges = allBadges.map((b) => ({
      badgeCode: b.badgeCode,
      name: b.nameJa,
      description: b.descriptionJa,
      conditionText: b.conditionTextJa,
      rarity: b.rarity,
      earned: earnedMap.has(b.badgeCode),
      earnedAt: earnedMap.get(b.badgeCode)?.toISOString() ?? null,
    }));

    return okJson({ badges });
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
