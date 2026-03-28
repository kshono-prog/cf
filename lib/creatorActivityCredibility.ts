import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";

export type CreatorActivityCredibility = {
  activeMonths: number;
  totalPostCount: number;
  goalAchievedCount: number;
  totalContributorCount: number;
  lastActiveAt: string | null;
  // Extended signals for 8-axis maturity
  meetingCount: number;
  externalContactCount: number;
  managerNoteCount: number;
  activeProjectMemberCount: number;
  repeatSupporterCount: number;
  stageEvidenceCount: number;
};

function buildEmptyCreatorActivityCredibility(): CreatorActivityCredibility {
  return {
    activeMonths: 0,
    totalPostCount: 0,
    goalAchievedCount: 0,
    totalContributorCount: 0,
    lastActiveAt: null,
    meetingCount: 0,
    externalContactCount: 0,
    managerNoteCount: 0,
    activeProjectMemberCount: 0,
    repeatSupporterCount: 0,
    stageEvidenceCount: 0,
  };
}

function buildCreatorActivityCredibility(args: {
  postAggregate: {
    _count: { _all: number };
    _min: { createdAt: Date | null };
    _max: { createdAt: Date | null };
  };
  goalAchievedCount: number;
  totalContributorCount: number;
  meetingCount: number;
  externalContactCount: number;
  managerNoteCount: number;
  activeProjectMemberCount: number;
  repeatSupporterCount: number;
  stageEvidenceCount: number;
}): CreatorActivityCredibility {
  const firstPostCreatedAt = args.postAggregate._min.createdAt;
  const lastPostCreatedAt = args.postAggregate._max.createdAt;
  const totalPostCount = args.postAggregate._count._all;

  const now = new Date();
  const activeMonths = firstPostCreatedAt
    ? Math.max(
        1,
        Math.ceil(
          (now.getTime() - firstPostCreatedAt.getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        )
      )
    : 0;

  return {
    activeMonths,
    totalPostCount,
    goalAchievedCount: args.goalAchievedCount,
    totalContributorCount: args.totalContributorCount,
    lastActiveAt: lastPostCreatedAt?.toISOString() ?? null,
    meetingCount: args.meetingCount,
    externalContactCount: args.externalContactCount,
    managerNoteCount: args.managerNoteCount,
    activeProjectMemberCount: args.activeProjectMemberCount,
    repeatSupporterCount: args.repeatSupporterCount,
    stageEvidenceCount: args.stageEvidenceCount,
  };
}

async function getCreatorActivityCredibilityUncached(
  creatorProfileId: bigint
): Promise<CreatorActivityCredibility> {
  try {
    const [
      postAggregate,
      goalAchievedCount,
      contributorAggregate,
      meetingCount,
      externalContactCount,
      managerNoteCount,
      activeProjectMemberCount,
      stageEvidenceCount,
    ] = await withPrismaRetry(() =>
      prisma.$transaction([
        prisma.post.aggregate({
          where: { creatorProfileId, status: "PUBLIC" },
          _count: { _all: true },
          _min: { createdAt: true },
          _max: { createdAt: true },
        }),
        prisma.goal.count({
          where: { project: { creatorProfileId }, achievedAt: { not: null } },
        }),
        prisma.contribution.groupBy({
          by: ["fromAddress"],
          where: { project: { creatorProfileId }, status: "CONFIRMED" },
          _count: { _all: true },
        }),
        prisma.meeting.count({
          where: { creatorProfileId },
        }),
        prisma.externalContact.count({
          where: { creatorProfileId, isArchived: false },
        }),
        prisma.managerNote.count({
          where: { creatorProfileId, isArchived: false },
        }),
        prisma.projectMember.count({
          where: {
            project: { creatorProfileId },
            status: "ACTIVE",
            role: { not: "OWNER" },
          },
        }),
        prisma.stageEvidence.count({
          where: { creatorProfileId },
        }),
      ])
    );

    const repeatSupporterCount = contributorAggregate.filter(
      (contributor) => contributor._count._all > 1
    ).length;

    return buildCreatorActivityCredibility({
      postAggregate,
      goalAchievedCount,
      totalContributorCount: contributorAggregate.length,
      meetingCount,
      externalContactCount,
      managerNoteCount,
      activeProjectMemberCount,
      repeatSupporterCount,
      stageEvidenceCount,
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return buildEmptyCreatorActivityCredibility();
    }
    throw error;
  }
}

const _getCreatorActivityCredibilityCached = unstable_cache(
  (idStr: string) => getCreatorActivityCredibilityUncached(BigInt(idStr)),
  ["creator-activity-credibility"],
  { revalidate: 120 }
);

export async function getCreatorActivityCredibility(
  creatorProfileId: bigint
): Promise<CreatorActivityCredibility> {
  return _getCreatorActivityCredibilityCached(creatorProfileId.toString());
}

export async function getPublicCreatorActivityCredibility(args: {
  creatorProfileId: bigint;
  goalAchievedCount: number;
  totalContributorCount: number;
  repeatSupporterCount: number;
  activeProjectMemberCount: number;
}): Promise<CreatorActivityCredibility> {
  try {
    const [
      postAggregate,
      meetingCount,
      externalContactCount,
      managerNoteCount,
      stageEvidenceCount,
    ] = await withPrismaRetry(() =>
      prisma.$transaction([
        prisma.post.aggregate({
          where: { creatorProfileId: args.creatorProfileId, status: "PUBLIC" },
          _count: { _all: true },
          _min: { createdAt: true },
          _max: { createdAt: true },
        }),
        prisma.meeting.count({
          where: { creatorProfileId: args.creatorProfileId },
        }),
        prisma.externalContact.count({
          where: { creatorProfileId: args.creatorProfileId, isArchived: false },
        }),
        prisma.managerNote.count({
          where: { creatorProfileId: args.creatorProfileId, isArchived: false },
        }),
        prisma.stageEvidence.count({
          where: { creatorProfileId: args.creatorProfileId },
        }),
      ])
    );

    return buildCreatorActivityCredibility({
      postAggregate,
      goalAchievedCount: args.goalAchievedCount,
      totalContributorCount: args.totalContributorCount,
      meetingCount,
      externalContactCount,
      managerNoteCount,
      activeProjectMemberCount: args.activeProjectMemberCount,
      repeatSupporterCount: args.repeatSupporterCount,
      stageEvidenceCount,
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return buildEmptyCreatorActivityCredibility();
    }
    throw error;
  }
}
