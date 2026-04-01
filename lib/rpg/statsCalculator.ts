// lib/rpg/statsCalculator.ts
import { prisma } from "@/lib/prisma";

export type RpgStats = {
  supportPower: number;
  consistency: number;
  discovery: number;
  empathy: number;
  growth: number;
  calculatedAt: string;
  windowDays: number;
};

const WINDOW_DAYS = 30;

function clamp100(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

export async function calculateStats(creatorProfileId: bigint): Promise<RpgStats> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000);

  const expEvents = await prisma.rpgExpEvent.findMany({
    where: { creatorProfileId, occurredAt: { gte: since } },
    select: { eventType: true, awardedExp: true },
  });

  const supportCreated = expEvents.filter((e) => e.eventType === "SUPPORT_CREATED").length;
  const commentCreated = expEvents.filter((e) => e.eventType === "COMMENT_CREATED").length;
  const reactionAdded = expEvents.filter((e) => e.eventType === "REACTION_ADDED").length;
  const loginDays = expEvents.filter((e) => e.eventType === "LOGIN_DAILY").length;
  const streakBonus = expEvents.filter((e) => e.eventType === "SUPPORT_STREAK_BONUS").length;
  const goalReached = expEvents.filter((e) => e.eventType === "SUPPORTED_PROJECT_GOAL_REACHED").length;
  const projectViewed = expEvents.filter((e) => e.eventType === "PROJECT_VIEWED").length;

  return {
    supportPower: clamp100(supportCreated * 10),
    consistency: clamp100(loginDays * 3 + streakBonus * 15),
    discovery: clamp100(projectViewed * 5),
    empathy: clamp100(commentCreated * 8 + reactionAdded * 2),
    growth: clamp100(goalReached * 20),
    calculatedAt: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
  };
}
