import { unstable_cache } from "next/cache";

import { getPublicCreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import { getInitialPublicFeedListByCreatorId } from "@/lib/feedList";
import { loadPublicPageData } from "@/lib/publicPageData";
import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";
import { withPrismaRetry } from "@/lib/prismaRetry";

const PUBLIC_PROFILE_INITIAL_FEED_LIMIT = 12;
const PUBLIC_PROFILE_PAGE_READ_MODEL_HOT_CACHE_TTL_MS = 60 * 1000;

export type PublicProfilePageReadModel = {
  pageData: Awaited<ReturnType<typeof loadPublicPageData>>;
  initialFeed: Awaited<ReturnType<typeof getInitialPublicFeedListByCreatorId>>;
  credibility: Awaited<ReturnType<typeof getPublicCreatorActivityCredibility>>;
};

function normalizePublicProfilePageReadModel(
  value: PublicProfilePageReadModel
): PublicProfilePageReadModel {
  return {
    ...value,
    pageData: {
      ...value.pageData,
      recentSupportActivities: Array.isArray(
        value.pageData.recentSupportActivities
      )
        ? value.pageData.recentSupportActivities
        : [],
      supportActionThemes: Array.isArray(value.pageData.supportActionThemes)
        ? value.pageData.supportActionThemes
        : [],
      recruitingProjects: Array.isArray(value.pageData.recruitingProjects)
        ? value.pageData.recruitingProjects
        : [],
    },
  };
}

type PublicProfileCredibilitySeed = {
  goalAchievedCount: number;
  totalContributorCount: number;
  repeatSupporterCount: number;
  activeProjectMemberCount: number;
};

const globalForPublicProfilePageReadModel = globalThis as unknown as {
  publicProfilePageReadModelStaleByUsername?: Map<
    string,
    PublicProfilePageReadModel
  >;
  publicProfilePageReadModelHotByUsername?: Map<
    string,
    {
      value: PublicProfilePageReadModel;
      cachedAt: number;
    }
  >;
};

function getPublicProfilePageReadModelStaleMap(): Map<
  string,
  PublicProfilePageReadModel
> {
  if (!globalForPublicProfilePageReadModel.publicProfilePageReadModelStaleByUsername) {
    globalForPublicProfilePageReadModel.publicProfilePageReadModelStaleByUsername =
      new Map();
  }

  return globalForPublicProfilePageReadModel.publicProfilePageReadModelStaleByUsername;
}

function getPublicProfilePageReadModelHotMap(): Map<
  string,
  {
    value: PublicProfilePageReadModel;
    cachedAt: number;
  }
> {
  if (!globalForPublicProfilePageReadModel.publicProfilePageReadModelHotByUsername) {
    globalForPublicProfilePageReadModel.publicProfilePageReadModelHotByUsername =
      new Map();
  }

  return globalForPublicProfilePageReadModel.publicProfilePageReadModelHotByUsername;
}

async function loadPublicProfileCredibilitySeed(
  creatorProfileId: bigint
): Promise<PublicProfileCredibilitySeed> {
  try {
    const [goalAchievedCount, contributorAggregate, activeProjectMemberCount] =
      await withPrismaRetry(() =>
        prisma.$transaction([
          prisma.goal.count({
            where: {
              project: { creatorProfileId },
              achievedAt: { not: null },
            },
          }),
          prisma.contribution.groupBy({
            by: ["fromAddress"],
            where: {
              project: { creatorProfileId },
              status: "CONFIRMED",
            },
            _count: { _all: true },
          }),
          prisma.projectMember.count({
            where: {
              project: { creatorProfileId },
              status: "ACTIVE",
            },
          }),
        ])
      );

    return {
      goalAchievedCount,
      totalContributorCount: contributorAggregate.length,
      repeatSupporterCount: contributorAggregate.filter(
        (contributor) => contributor._count._all > 1
      ).length,
      activeProjectMemberCount,
    };
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return {
        goalAchievedCount: 0,
        totalContributorCount: 0,
        repeatSupporterCount: 0,
        activeProjectMemberCount: 0,
      };
    }

    throw error;
  }
}

async function loadPublicProfilePageReadModelUncached(
  username: string
): Promise<PublicProfilePageReadModel> {
  const pageData = await loadPublicPageData(username);
  const creatorProfileId = BigInt(pageData.profile.id);

  const [initialFeed, credibilitySeed] = await Promise.all([
    getInitialPublicFeedListByCreatorId(
      pageData.profile.id,
      PUBLIC_PROFILE_INITIAL_FEED_LIMIT
    ),
    loadPublicProfileCredibilitySeed(creatorProfileId),
  ]);
  const credibility = await getPublicCreatorActivityCredibility({
    creatorProfileId,
    goalAchievedCount: credibilitySeed.goalAchievedCount,
    totalContributorCount: credibilitySeed.totalContributorCount,
    repeatSupporterCount: credibilitySeed.repeatSupporterCount,
    activeProjectMemberCount: credibilitySeed.activeProjectMemberCount,
  });

  return {
    pageData,
    initialFeed,
    credibility,
  };
}

const getPublicProfilePageReadModelCached = unstable_cache(
  async (username: string) => loadPublicProfilePageReadModelUncached(username),
  ["public-profile-page-read-model-v2"],
  { revalidate: 120 }
);

export async function loadPublicProfilePageReadModel(
  username: string
): Promise<PublicProfilePageReadModel> {
  const staleMap = getPublicProfilePageReadModelStaleMap();
  const hotMap = getPublicProfilePageReadModelHotMap();
  const hotEntry = hotMap.get(username);

  if (
    hotEntry &&
    Date.now() - hotEntry.cachedAt < PUBLIC_PROFILE_PAGE_READ_MODEL_HOT_CACHE_TTL_MS
  ) {
    return hotEntry.value;
  }

  try {
    const result = await getPublicProfilePageReadModelCached(username);
    const normalized = normalizePublicProfilePageReadModel(result);
    staleMap.set(username, normalized);
    hotMap.set(username, { value: normalized, cachedAt: Date.now() });
    return normalized;
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      const stale = staleMap.get(username);
      if (stale) {
        return normalizePublicProfilePageReadModel(stale);
      }
    }

    throw error;
  }
}
