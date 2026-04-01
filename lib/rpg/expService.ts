// lib/rpg/expService.ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DAILY_EXP_CAP = 300;

export type ExpEventInput = {
  creatorProfileId: bigint;
  eventType: string;
  occurredAt: Date;
  idempotencyKey: string;
  payloadJson?: Record<string, unknown>;
};

export type ExpEventResult = {
  accepted: boolean;
  awardedExp: number;
  dailyAwardedExp: number;
  dailyCap: number;
  leveledUp: boolean;
  newLevel: number;
};

export async function awardExp(input: ExpEventInput): Promise<ExpEventResult> {
  const { creatorProfileId, eventType, occurredAt, idempotencyKey, payloadJson = {} } = input;

  // idempotency check
  const existing = await prisma.rpgExpEvent.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return { accepted: false, awardedExp: 0, dailyAwardedExp: 0, dailyCap: DAILY_EXP_CAP, leveledUp: false, newLevel: 0 };
  }

  // Get rule
  const rule = await prisma.rpgExpRule.findUnique({ where: { eventType, enabled: true } });
  if (!rule) {
    return { accepted: false, awardedExp: 0, dailyAwardedExp: 0, dailyCap: DAILY_EXP_CAP, leveledUp: false, newLevel: 0 };
  }

  const dateKey = new Date(occurredAt.toISOString().slice(0, 10));

  // Get or create daily summary
  const dailySummary = await prisma.rpgDailyExpSummary.findUnique({
    where: { creatorProfileId_date: { creatorProfileId, date: dateKey } },
  });
  const dailySoFar = dailySummary?.awardedExp ?? 0;

  if (dailySoFar >= DAILY_EXP_CAP) {
    return { accepted: false, awardedExp: 0, dailyAwardedExp: dailySoFar, dailyCap: DAILY_EXP_CAP, leveledUp: false, newLevel: 0 };
  }

  // Check daily limit count for this event type
  if (rule.dailyLimitCount !== null) {
    const todayCount = await prisma.rpgExpEvent.count({
      where: {
        creatorProfileId,
        eventType,
        occurredAt: { gte: dateKey, lt: new Date(dateKey.getTime() + 86400000) },
      },
    });
    if (todayCount >= rule.dailyLimitCount) {
      return { accepted: false, awardedExp: 0, dailyAwardedExp: dailySoFar, dailyCap: DAILY_EXP_CAP, leveledUp: false, newLevel: 0 };
    }
  }

  // Handle first-support bonus
  let awardedExp = rule.baseExp;
  if (eventType === "SUPPORT_CREATED" && payloadJson.isFirstSupport === true) {
    awardedExp = 60; // first support total
  }

  // Clamp to daily cap
  const remaining = DAILY_EXP_CAP - dailySoFar;
  awardedExp = Math.min(awardedExp, remaining);

  // Get current profile
  let profile = await prisma.userRpgProfile.findUnique({ where: { creatorProfileId } });
  if (!profile) {
    profile = await prisma.userRpgProfile.create({
      data: { creatorProfileId },
    });
  }

  const prevLevel = profile.level;
  const newCurrentExp = profile.currentExp + awardedExp;
  const newTotalExp = profile.totalExp + awardedExp;

  // Compute new level
  const { newLevel, newCurrentExpAfterLevelUp } = await computeLevel(profile.level, newCurrentExp);
  const leveledUp = newLevel > prevLevel;

  // Transact: save event + daily summary + update profile
  await prisma.$transaction(async (tx) => {
    await tx.rpgExpEvent.create({
      data: {
        creatorProfileId,
        eventType,
        awardedExp,
        occurredAt,
        idempotencyKey,
        payloadJson: payloadJson as Prisma.InputJsonValue,
      },
    });

    await tx.rpgDailyExpSummary.upsert({
      where: { creatorProfileId_date: { creatorProfileId, date: dateKey } },
      update: { awardedExp: dailySoFar + awardedExp, updatedAt: new Date() },
      create: { creatorProfileId, date: dateKey, awardedExp },
    });

    await tx.userRpgProfile.update({
      where: { creatorProfileId },
      data: {
        currentExp: newCurrentExpAfterLevelUp,
        totalExp: newTotalExp,
        level: newLevel,
        updatedAt: new Date(),
      },
    });

    if (leveledUp) {
      await tx.rpgActivityLog.create({
        data: {
          creatorProfileId,
          eventType: "LEVEL_UP",
          messageJa: `Lv.${newLevel}に到達しました`,
          metadataJson: { newLevel, prevLevel },
          occurredAt: new Date(),
        },
      });
      // Unlock title if applicable
      const titleToUnlock = await tx.rpgTitle.findFirst({
        where: { unlockLevel: newLevel, enabled: true },
      });
      if (titleToUnlock) {
        await tx.userRpgTitle.upsert({
          where: { creatorProfileId_titleCode: { creatorProfileId, titleCode: titleToUnlock.titleCode } },
          update: {},
          create: { creatorProfileId, titleCode: titleToUnlock.titleCode },
        });
      }
    }
  });

  return {
    accepted: true,
    awardedExp,
    dailyAwardedExp: dailySoFar + awardedExp,
    dailyCap: DAILY_EXP_CAP,
    leveledUp,
    newLevel,
  };
}

async function computeLevel(currentLevel: number, currentExp: number): Promise<{ newLevel: number; newCurrentExpAfterLevelUp: number }> {
  let level = currentLevel;
  let exp = currentExp;

  // Try to level up
  while (level < 50) {
    const req = await prisma.rpgLevelRequirement.findUnique({ where: { level } });
    if (!req) break;
    if (exp >= req.requiredExp) {
      exp -= req.requiredExp;
      level += 1;
    } else {
      break;
    }
  }

  return { newLevel: level, newCurrentExpAfterLevelUp: exp };
}
