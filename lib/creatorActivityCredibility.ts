import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export type CreatorActivityCredibility = {
  activeMonths: number;
  totalPostCount: number;
  goalAchievedCount: number;
  totalContributorCount: number;
  lastActiveAt: string | null;
};

async function getCreatorActivityCredibilityUncached(
  creatorProfileId: bigint
): Promise<CreatorActivityCredibility> {
  const firstPost = await prisma.post.findFirst({
    where: { creatorProfileId, status: "PUBLIC" },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  const totalPostCount = await prisma.post.count({
    where: { creatorProfileId, status: "PUBLIC" },
  });

  const goalAchievedCount = await prisma.goal.count({
    where: { project: { creatorProfileId }, achievedAt: { not: null } },
  });

  const contributorAggregate = await prisma.contribution.groupBy({
    by: ["fromAddress"],
    where: { project: { creatorProfileId }, status: "CONFIRMED" },
    _count: { _all: true },
  });

  const now = new Date();
  const activeMonths = firstPost
    ? Math.max(
        1,
        Math.ceil(
          (now.getTime() - firstPost.createdAt.getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        )
      )
    : 0;

  const lastPost =
    totalPostCount > 0
      ? await prisma.post.findFirst({
          where: { creatorProfileId, status: "PUBLIC" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
      : null;

  return {
    activeMonths,
    totalPostCount,
    goalAchievedCount,
    totalContributorCount: contributorAggregate.length,
    lastActiveAt: lastPost?.createdAt.toISOString() ?? null,
  };
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
