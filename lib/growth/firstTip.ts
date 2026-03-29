import { normalizeAddress } from "@/lib/api/guards";
import { prisma } from "@/lib/prisma";

function buildExistingFirstTipEventConditions(args: {
  username: string | null;
  walletAddress: string | null;
}): Array<{ username?: string; walletAddress?: string }> {
  const conditions: Array<{ username?: string; walletAddress?: string }> = [];

  if (args.username) {
    conditions.push({ username: args.username });
  }

  if (args.walletAddress) {
    conditions.push({ walletAddress: normalizeAddress(args.walletAddress) });
  }

  return conditions;
}

export async function recordFirstTipReceivedIfNeeded(args: {
  contributionId: string;
  now?: Date;
}): Promise<boolean> {
  const confirmedContribution = await prisma.contribution.findUnique({
    where: { id: args.contributionId },
    select: {
      id: true,
      projectId: true,
      confirmedAt: true,
      status: true,
      project: {
        select: {
          creatorProfileId: true,
          creatorProfile: {
            select: {
              username: true,
              walletAddress: true,
            },
          },
        },
      },
    },
  });

  if (
    !confirmedContribution ||
    confirmedContribution.status !== "CONFIRMED" ||
    !confirmedContribution.project.creatorProfileId
  ) {
    return false;
  }

  const priorConfirmedContributionCount = await prisma.contribution.count({
    where: {
      id: { not: confirmedContribution.id },
      status: "CONFIRMED",
      project: {
        creatorProfileId: confirmedContribution.project.creatorProfileId,
      },
    },
  });

  if (priorConfirmedContributionCount > 0) {
    return false;
  }

  const username = confirmedContribution.project.creatorProfile?.username ?? null;
  const walletAddress =
    confirmedContribution.project.creatorProfile?.walletAddress ?? null;
  const existingEventConditions = buildExistingFirstTipEventConditions({
    username,
    walletAddress,
  });

  if (existingEventConditions.length > 0) {
    const existingEvent = await prisma.growthEvent.findFirst({
      where: {
        event: "first_tip_received",
        OR: existingEventConditions,
      },
      select: { id: true },
    });

    if (existingEvent) {
      return false;
    }
  }

  await prisma.growthEvent.create({
    data: {
      event: "first_tip_received",
      username,
      walletAddress: walletAddress ? normalizeAddress(walletAddress) : null,
      projectId: confirmedContribution.projectId.toString(),
      metadata: {
        contributionId: confirmedContribution.id,
        confirmedAt:
          confirmedContribution.confirmedAt?.toISOString() ??
          (args.now ?? new Date()).toISOString(),
      },
    },
  });

  return true;
}
