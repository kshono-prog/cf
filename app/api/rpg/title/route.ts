// app/api/rpg/title/route.ts
import { NextRequest, NextResponse } from "next/server";
import { okJson, errJson } from "@/lib/api/responses";
import { requireOwnerSession } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";
import { normalizeAddress, isRecord, toNonEmptyString } from "@/lib/api/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await requireOwnerSession(req);
  if (!session.ok) return session.response;

  let body: unknown;
  try { body = await req.json(); } catch { return errJson("RPG_400_VALIDATION_ERROR", 400, "Invalid JSON"); }
  if (!isRecord(body)) return errJson("RPG_400_VALIDATION_ERROR", 400);

  const titleCode = toNonEmptyString(body.titleCode);
  if (!titleCode) return errJson("RPG_400_VALIDATION_ERROR", 400, "titleCode required");

  try {
    const profile = await prisma.creatorProfile.findUnique({
      where: { walletAddress: normalizeAddress(session.address) },
      select: { id: true },
    });
    if (!profile) return errJson("PROFILE_NOT_FOUND", 404);

    const title = await prisma.rpgTitle.findUnique({ where: { titleCode, enabled: true } });
    if (!title) return errJson("RPG_404_NOT_FOUND", 404, "Title not found");

    const unlocked = await prisma.userRpgTitle.findUnique({
      where: { creatorProfileId_titleCode: { creatorProfileId: profile.id, titleCode } },
    });
    if (!unlocked) return errJson("RPG_403_LOCKED_BY_LEVEL", 403, "Title not unlocked");

    await prisma.userRpgProfile.upsert({
      where: { creatorProfileId: profile.id },
      update: { currentTitleCode: titleCode, updatedAt: new Date() },
      create: { creatorProfileId: profile.id, currentTitleCode: titleCode },
    });

    return okJson({ titleCode, titleName: title.nameJa });
  } catch (e: unknown) {
    return errJson("RPG_500_INTERNAL_ERROR", 500, e instanceof Error ? e.message : String(e));
  }
}
