import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { prisma } from "@/lib/prisma";
import { getCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { deriveCreatorStage } from "@/lib/creatorStage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatYearMonth(d: Date): string {
  const y = d.getFullYear().toString();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    if (!username) return errJson("USERNAME_REQUIRED", 400);

    const creator = await prisma.creatorProfile.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        displayName: true,
        creatorType: true,
        ecosystemRole: true,
        profileText: true,
        externalUrl: true,
        createdAt: true,
      },
    });
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const creatorProfileId = creator.id;
    const now = new Date();
    const since6Months = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

    const [
      credibility,
      revenueByMonth,
      approvedTasks,
      stageEvidences,
      projects,
    ] = await Promise.all([
      getCreatorActivityCredibility(creatorProfileId),
      prisma.revenueRecord.groupBy({
        by: ["occurredAt"],
        where: {
          creatorProfileId,
          occurredAt: { gte: since6Months },
        },
        _sum: { amountDecimal: true },
        _count: { _all: true },
      }),
      prisma.agentTask.count({
        where: {
          creatorProfileId,
          status: "APPROVED",
        },
      }),
      prisma.stageEvidence.findMany({
        where: { creatorProfileId },
        orderBy: { verifiedAt: "desc" },
        take: 5,
        select: { evidenceType: true, value: true, stageId: true, verifiedAt: true },
      }),
      prisma.project.count({
        where: { creatorProfileId },
      }),
    ]);

    const stageResult = deriveCreatorStage(credibility);

    // Group revenue by YYYY-MM
    const revenueMonthMap = new Map<string, number>();
    for (const row of revenueByMonth) {
      if (!row.occurredAt) continue;
      const key = formatYearMonth(startOfMonth(row.occurredAt));
      const prev = revenueMonthMap.get(key) ?? 0;
      revenueMonthMap.set(key, prev + Number(row._sum.amountDecimal ?? 0));
    }
    const revenueMonthly = Array.from(revenueMonthMap.entries())
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return okJson({
      ok: true,
      generatedAt: now.toISOString(),
      creator: {
        displayName: creator.displayName,
        creatorType: creator.creatorType,
        ecosystemRole: creator.ecosystemRole,
        profileText: creator.profileText,
        memberSince: creator.createdAt.toISOString(),
      },
      activity: {
        activeMonths: credibility.activeMonths,
        totalPostCount: credibility.totalPostCount,
        totalContributorCount: credibility.totalContributorCount,
        goalAchievedCount: credibility.goalAchievedCount,
        projectCount: projects,
        approvedTaskCount: approvedTasks,
      },
      stage: {
        stageId: stageResult.stage,
        stageLabel: stageResult.stageLabel,
        maturity: stageResult.maturity,
      },
      revenueMonthly,
      stageEvidences: stageEvidences.map((e) => ({
        evidenceType: e.evidenceType,
        value: e.value,
        stageId: e.stageId,
        verifiedAt: e.verifiedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("CREATOR_ACTIVITY_REPORT_FAILED", error);
    return errJson("CREATOR_ACTIVITY_REPORT_FAILED", 500);
  }
}
