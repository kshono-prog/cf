// lib/rpg/badgeService.ts
import { prisma } from "@/lib/prisma";

export async function checkAndAwardBadge(
  creatorProfileId: bigint,
  badgeCode: string
): Promise<boolean> {
  const existing = await prisma.userRpgBadge.findUnique({
    where: { creatorProfileId_badgeCode: { creatorProfileId, badgeCode } },
  });
  if (existing) return false;

  const badge = await prisma.rpgBadge.findUnique({ where: { badgeCode, enabled: true } });
  if (!badge) return false;

  await prisma.$transaction(async (tx) => {
    await tx.userRpgBadge.create({ data: { creatorProfileId, badgeCode } });
    await tx.rpgActivityLog.create({
      data: {
        creatorProfileId,
        eventType: "BADGE_EARNED",
        messageJa: `バッジ「${badge.nameJa}」を獲得しました`,
        metadataJson: { badgeCode },
        occurredAt: new Date(),
      },
    });
  });

  return true;
}

export async function evaluateBadgesAfterSupport(
  creatorProfileId: bigint,
  projectId: bigint,
  totalSupportCount: number,
  sameProjectSupportCount: number
): Promise<void> {
  void projectId; // reserved for future NEW_PROJECT_3 badge evaluation
  // FIRST_SUPPORT
  if (totalSupportCount === 1) {
    await checkAndAwardBadge(creatorProfileId, "FIRST_SUPPORT");
  }
  // SUPPORT_5
  if (totalSupportCount >= 5) {
    await checkAndAwardBadge(creatorProfileId, "SUPPORT_5");
  }
  // SAME_PROJECT_3
  if (sameProjectSupportCount >= 3) {
    await checkAndAwardBadge(creatorProfileId, "SAME_PROJECT_3");
  }
}

export async function evaluateBadgesAfterLogin(
  creatorProfileId: bigint,
  consecutiveDays: number
): Promise<void> {
  if (consecutiveDays >= 3) await checkAndAwardBadge(creatorProfileId, "LOGIN_3DAYS");
  if (consecutiveDays >= 7) await checkAndAwardBadge(creatorProfileId, "LOGIN_7DAYS");
}

export async function evaluateBadgesAfterLevelUp(
  creatorProfileId: bigint,
  newLevel: number
): Promise<void> {
  if (newLevel >= 10) await checkAndAwardBadge(creatorProfileId, "LEVEL_10");
}
