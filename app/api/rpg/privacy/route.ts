// app/api/rpg/privacy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { okJson, errJson } from "@/lib/api/responses";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";
import { normalizeAddress, isRecord, toBool } from "@/lib/api/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await requireOwnerSession(req);
  if (!session.ok) return session.response;

  let body: unknown;
  try { body = await req.json(); } catch { return errJson("RPG_400_VALIDATION_ERROR", 400, "Invalid JSON"); }
  if (!isRecord(body)) return errJson("RPG_400_VALIDATION_ERROR", 400);

  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { walletAddress: normalizeAddress(session.address) },
      select: { id: true },
    });
    if (!profile) return errJson("PROFILE_NOT_FOUND", 404);

    await prisma.userRpgProfile.upsert({
      where: { creatorProfileId: profile.id },
      update: {
        showLevel: toBool(body.showLevel),
        showTotalSupportAmount: toBool(body.showTotalSupportAmount),
        showActivityLog: toBool(body.showActivityLog),
        showBadges: toBool(body.showBadges),
        updatedAt: new Date(),
      },
      create: {
        creatorProfileId: profile.id,
        showLevel: toBool(body.showLevel),
        showTotalSupportAmount: toBool(body.showTotalSupportAmount),
        showActivityLog: toBool(body.showActivityLog),
        showBadges: toBool(body.showBadges),
      },
    });

    return okJson({ updated: true });
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
