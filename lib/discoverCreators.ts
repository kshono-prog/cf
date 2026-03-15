import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";

export type DiscoverCreator = {
  username: string;
  displayName: string;
  profile: string | null;
  avatarUrl: string | null;
  supportTitle: string | null;
  supportDescription: string | null;
  supportTargetJpyc: number | null;
};

async function getDiscoverCreatorsUncached(limit: number): Promise<DiscoverCreator[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 30);

  const rows = await withPrismaRetry(() =>
    prisma.creatorProfile.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
      select: {
        username: true,
        displayName: true,
        profileText: true,
        avatarUrl: true,
        goalTitle: true,
        goalTargetJpyc: true,
      },
    })
  );

  return rows.map((row) => ({
    username: row.username,
    displayName: row.displayName ?? row.username,
    profile: row.profileText ?? null,
    avatarUrl: row.avatarUrl ?? null,
    supportTitle: row.goalTitle ?? null,
    supportDescription: row.profileText ?? null,
    supportTargetJpyc: row.goalTargetJpyc ?? null,
  }));
}

const getDiscoverCreatorsCached = unstable_cache(
  async (limit: number) => getDiscoverCreatorsUncached(limit),
  ["discover-creators-v2"],
  { revalidate: 60 }
);

export async function getDiscoverCreators(limit: number): Promise<DiscoverCreator[]> {
  return getDiscoverCreatorsCached(limit);
}
