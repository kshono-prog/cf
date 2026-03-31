import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  requireCreatorOwnership,
  resolveCreatorProfileIdByAddress,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";
import type { FanEngagementTimeline } from "@/lib/fanEngagement/engagementTimeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function maskAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(req, searchParams);
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileId = await resolveCreatorProfileIdByAddress(ownerSession.address);
    if (!creatorProfileId) {
      return errJson("CREATOR_PROFILE_NOT_FOUND", 404);
    }

    const ownership = await requireCreatorOwnership({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!ownership.ok) return errJson(ownership.error, ownership.status);

    const projects = await prisma.project.findMany({
      where: { creatorProfileId },
      select: { id: true },
    });

    if (projects.length === 0) {
      const empty: FanEngagementTimeline = {
        recentContributions: [],
        totalContributorCount: 0,
        weekHighlight: null,
        thankNeededCount: 0,
        generatedAt: new Date().toISOString(),
      };
      return okJson({ ...empty, ok: true });
    }

    const projectIds = projects.map((p: { id: bigint }) => p.id);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    const contributions = await prisma.contribution.findMany({
      where: {
        projectId: { in: projectIds },
        status: "CONFIRMED",
        confirmedAt: { not: null },
      },
      orderBy: { confirmedAt: "desc" },
      take: 20,
      select: {
        id: true,
        fromAddress: true,
        confirmedAt: true,
        message: true,
      },
    });

    type ContributionRow = {
      id: string;
      fromAddress: string;
      confirmedAt: Date | null;
      message: string | null;
    };

    const uniqueAddresses = new Set(
      (contributions as ContributionRow[]).map((c) => c.fromAddress)
    );
    const totalContributorCount = uniqueAddresses.size;

    const recentContributions = (contributions as ContributionRow[]).slice(0, 5).map((c) => ({
      id: c.id,
      confirmedAt: c.confirmedAt ? c.confirmedAt.toISOString() : new Date().toISOString(),
      maskedAddress: maskAddress(c.fromAddress),
      message: c.message ?? null,
    }));

    const thisWeekCount = (contributions as ContributionRow[]).filter(
      (c) => c.confirmedAt && c.confirmedAt >= sevenDaysAgo
    ).length;
    const weekHighlight =
      thisWeekCount > 0
        ? `今週 ${thisWeekCount} 件の応援がありました。`
        : null;

    const thankNeededCount = (contributions as ContributionRow[]).filter(
      (c) => c.confirmedAt && c.confirmedAt >= thirtyDaysAgo
    ).length;

    const result: FanEngagementTimeline = {
      recentContributions,
      totalContributorCount,
      weekHighlight,
      thankNeededCount,
      generatedAt: new Date().toISOString(),
    };

    return okJson({ ...result, ok: true });
  } catch (error) {
    console.error("MYPAGE_FAN_ENGAGEMENT_GET_FAILED", error);
    return errJson("MYPAGE_FAN_ENGAGEMENT_GET_FAILED", 500);
  }
}
