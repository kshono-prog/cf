// app/api/rpg/titles/route.ts
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

    const [allTitles, unlockedRows] = await Promise.all([
      prisma.rpgTitle.findMany({
        where: { enabled: true },
        orderBy: { unlockLevel: "asc" },
      }),
      prisma.userRpgTitle.findMany({
        where: { creatorProfileId: profile.id },
        select: { titleCode: true },
      }),
    ]);

    const unlockedSet = new Set(unlockedRows.map((r) => r.titleCode));

    return okJson({
      titles: allTitles.map((t) => ({
        titleCode: t.titleCode,
        nameJa: t.nameJa,
        descriptionJa: t.descriptionJa,
        unlockLevel: t.unlockLevel,
        unlocked: unlockedSet.has(t.titleCode),
      })),
    });
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
