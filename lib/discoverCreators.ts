import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import {
  buildSupportProfileView,
  type SupportProfileView,
  type SupportProjectView,
} from "@/lib/supportProfileView";
import { loadRecruitingProjectViews } from "@/lib/recruitingProjects";
import { resolvePublicCreatorProjectData } from "@/lib/publicCreatorProjects";

export type DiscoverCreator = {
  username: string;
  displayName: string;
  profile: string | null;
  avatarUrl: string | null;
  supportProfileView: SupportProfileView;
  recruitingProjects: SupportProjectView[];
};

type CreatorRow = {
  username: string;
  displayName: string | null;
  profileText: string | null;
  avatarUrl: string | null;
  activeProjectIdJpyc: bigint | null;
  activeProjectIdUsdc: bigint | null;
  id: bigint;
};

async function buildDiscoverCreator(row: CreatorRow): Promise<DiscoverCreator> {
  const [projectData, recruitingProjects] = await Promise.all([
    resolvePublicCreatorProjectData({
      creatorProfileId: row.id,
      activeProjectIdJpyc: row.activeProjectIdJpyc?.toString() ?? null,
      activeProjectIdUsdc: row.activeProjectIdUsdc?.toString() ?? null,
    }),
    loadRecruitingProjectViews({
      creatorProfileId: row.id,
    }),
  ]);

  return {
    username: row.username,
    displayName: row.displayName ?? row.username,
    profile: row.profileText ?? null,
    avatarUrl: row.avatarUrl ?? null,
    recruitingProjects,
    supportProfileView: buildSupportProfileView({
      creator: {
        displayName: row.displayName ?? row.username,
        profile: row.profileText ?? null,
      },
      activeProjectId: projectData.projectId,
      projectIdsByCurrency: projectData.projectIdsByCurrency,
      summariesByCurrency: projectData.summariesByCurrency,
      activeSummary: projectData.activeSummary,
    }),
  };
}

async function getDiscoverCreatorsUncached(limit: number): Promise<DiscoverCreator[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 30);

  const rows = await withPrismaRetry(() =>
    prisma.creatorProfile.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
      select: {
        id: true,
        username: true,
        displayName: true,
        profileText: true,
        avatarUrl: true,
        activeProjectIdJpyc: true,
        activeProjectIdUsdc: true,
      },
    })
  );

  return Promise.all(rows.map((row) => buildDiscoverCreator(row)));
}

const getDiscoverCreatorsCached = unstable_cache(
  async (limit: number) => getDiscoverCreatorsUncached(limit),
  ["discover-creators-v3"],
  { revalidate: 60 }
);

export async function getDiscoverCreators(limit: number): Promise<DiscoverCreator[]> {
  return getDiscoverCreatorsCached(limit);
}
