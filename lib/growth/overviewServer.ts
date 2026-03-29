import { Prisma } from "@prisma/client";

import { normalizeAddress } from "@/lib/api/guards";
import {
  GROWTH_EVENT_LABELS,
  GROWTH_OVERVIEW_MILESTONE_EVENTS,
  type GrowthOverviewData,
} from "@/lib/growth/overview";
import { isGrowthEventName } from "@/lib/growth/server";
import { prisma } from "@/lib/prisma";
import { getMeStatusByAddress } from "@/lib/mypageMe";

function buildGrowthEventWhere(args: {
  username: string | null;
  walletAddress: string | null;
}): Prisma.GrowthEventWhereInput | null {
  const conditions: Prisma.GrowthEventWhereInput[] = [];

  if (args.username) {
    conditions.push({ username: args.username });
  }

  if (args.walletAddress) {
    conditions.push({ walletAddress: normalizeAddress(args.walletAddress) });
  }

  if (conditions.length === 0) {
    return null;
  }

  return conditions.length === 1 ? conditions[0] : { OR: conditions };
}

export async function getCreatorGrowthOverview(
  addressRaw: string
): Promise<GrowthOverviewData> {
  const walletAddress = normalizeAddress(addressRaw);
  const me = await getMeStatusByAddress(walletAddress);
  const username = me.creator?.username ?? me.user?.username ?? null;
  const eventWhere = buildGrowthEventWhere({
    username,
    walletAddress,
  });

  const [groupedEvents, recentEvents, creatorProfile] = await Promise.all([
    eventWhere
      ? prisma.growthEvent.groupBy({
          by: ["event"],
          where: eventWhere,
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : Promise.resolve([]),
    eventWhere
      ? prisma.growthEvent.findMany({
          where: eventWhere,
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            event: true,
            createdAt: true,
            projectId: true,
          },
        })
      : Promise.resolve([]),
    prisma.creatorProfile.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        username: true,
        walletAddress: true,
      },
    }),
  ]);

  const groupedByEvent = new Map<
    string,
    {
      count: number;
      lastAt: string | null;
    }
  >();

  for (const row of groupedEvents) {
    groupedByEvent.set(row.event, {
      count: row._count._all,
      lastAt: row._max.createdAt ? row._max.createdAt.toISOString() : null,
    });
  }

  const contributionStats = creatorProfile
    ? await prisma.contribution.aggregate({
        where: {
          status: "CONFIRMED",
          project: {
            creatorProfileId: creatorProfile.id,
          },
        },
        _count: { _all: true },
        _min: { confirmedAt: true },
        _max: { confirmedAt: true },
      })
    : null;

  const milestones = GROWTH_OVERVIEW_MILESTONE_EVENTS.map((event) => {
    const stats = groupedByEvent.get(event);

    return {
      event,
      label: GROWTH_EVENT_LABELS[event],
      completed: Boolean(stats && stats.count > 0),
      count: stats?.count ?? 0,
      lastAt: stats?.lastAt ?? null,
    };
  });

  const milestoneCompletionCount = milestones.filter(
    (milestone) => milestone.completed
  ).length;
  const firstTipReceivedEvent = groupedByEvent.get("first_tip_received");
  const firstTipReceivedAt =
    firstTipReceivedEvent?.lastAt ??
    contributionStats?._min.confirmedAt?.toISOString() ??
    null;
  const serializedRecentEvents: GrowthOverviewData["recentEvents"] = [];

  for (const event of recentEvents) {
    if (!isGrowthEventName(event.event)) {
      continue;
    }

    serializedRecentEvents.push({
      event: event.event,
      label: GROWTH_EVENT_LABELS[event.event],
      createdAt: event.createdAt.toISOString(),
      projectId: event.projectId,
    });
  }

  return {
    username: creatorProfile?.username ?? username,
    walletAddress: creatorProfile?.walletAddress ?? walletAddress,
    milestoneCompletionCount,
    milestoneTotalCount: milestones.length,
    firstTipReceivedAt,
    latestConfirmedContributionAt:
      contributionStats?._max.confirmedAt?.toISOString() ?? null,
    metrics: {
      ownerPublicPageViewCount:
        groupedByEvent.get("public_page_viewed_by_owner")?.count ?? 0,
      shareDraftGeneratedCount:
        groupedByEvent.get("share_drafts_generated")?.count ?? 0,
      shareCopiedCount: groupedByEvent.get("share_copied")?.count ?? 0,
      sharePostLoggedCount:
        groupedByEvent.get("share_post_logged")?.count ?? 0,
      confirmedContributionCount: contributionStats?._count._all ?? 0,
    },
    milestones,
    recentEvents: serializedRecentEvents,
  };
}
