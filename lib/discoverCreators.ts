import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { getProjectSummaryView } from "@/lib/projectSummary";
import {
  buildSupportProfileView,
  type SupportProfileView,
  type SupportProjectView,
} from "@/lib/supportProfileView";
import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";
import { loadRecruitingProjectViews } from "@/lib/recruitingProjects";

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
  goalTitle: string | null;
  walletAddress: string | null;
  activeProjectId: bigint | null;
  activeProjectIdJpyc: bigint | null;
  activeProjectIdUsdc: bigint | null;
  id: bigint;
};

function toProjectIdString(value: bigint | null): string | null {
  return value != null ? value.toString() : null;
}

async function loadSummaryIfPresent(
  projectId: string | null
): Promise<SummaryViewData | null> {
  if (!projectId) return null;

  try {
    return await getProjectSummaryView(BigInt(projectId));
  } catch {
    return null;
  }
}

async function buildDiscoverCreator(row: CreatorRow): Promise<DiscoverCreator> {
  const projectIdsByCurrency = {
    JPYC: toProjectIdString(row.activeProjectIdJpyc),
    USDC: toProjectIdString(row.activeProjectIdUsdc),
  };
  const activeProjectId = toProjectIdString(row.activeProjectId);

  const [jpycSummary, usdcSummary, activeSummary, recruitingProjects] =
    await Promise.all([
    loadSummaryIfPresent(projectIdsByCurrency.JPYC),
    loadSummaryIfPresent(projectIdsByCurrency.USDC),
    activeProjectId &&
    activeProjectId !== projectIdsByCurrency.JPYC &&
    activeProjectId !== projectIdsByCurrency.USDC
      ? loadSummaryIfPresent(activeProjectId)
      : Promise.resolve(null),
    loadRecruitingProjectViews({
      creatorProfileId: row.id,
      ownerAddress: row.walletAddress,
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
        goalTitle: row.goalTitle ?? null,
        profile: row.profileText ?? null,
      },
      activeProjectId,
      projectIdsByCurrency,
      summariesByCurrency: {
        JPYC: jpycSummary,
        USDC: usdcSummary,
      },
      activeSummary,
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
        goalTitle: true,
        walletAddress: true,
        activeProjectId: true,
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
