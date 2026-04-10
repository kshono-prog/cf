import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

import {
  getPublicAiManagerProfileByCreatorProfileId,
  getPublicAiManagerRecentSupportActivitiesByCreatorProfileId,
} from "@/lib/aiManager/publicProfile";
import {
  buildPublicSupportActionThemes,
  type PublicSupportActionTheme,
} from "@/lib/aiManager/supportActionThemes";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";
import type {
  SerializedPublicAiManagerProfile,
  SerializedPublicAiManagerSupportActivity,
} from "@/lib/serializers/aiManager";
import type { PublicSummaryLite } from "@/lib/publicSummary";
import type { SupportProfileView, SupportProjectView } from "@/lib/supportProfileView";
import { loadPublicProfileProjectData } from "@/lib/publicProfileProjectData";

type PublicPageData = {
  creator: NonNullable<Awaited<ReturnType<typeof getCreatorProfileByUsername>>>["creator"];
  profile: NonNullable<Awaited<ReturnType<typeof getCreatorProfileByUsername>>>["profile"];
  projectId: string | null;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  publicSummary: PublicSummaryLite | null;
  publicAiManager: SerializedPublicAiManagerProfile | null;
  recentSupportActivities: SerializedPublicAiManagerSupportActivity[];
  supportActionThemes: PublicSupportActionTheme[];
  supportProfileView: SupportProfileView;
  recruitingProjects: SupportProjectView[];
};

function normalizePublicPageData(result: PublicPageData): PublicPageData {
  return {
    ...result,
    recentSupportActivities: Array.isArray(result.recentSupportActivities)
      ? result.recentSupportActivities
      : [],
    supportActionThemes: Array.isArray(result.supportActionThemes)
      ? result.supportActionThemes
      : [],
    recruitingProjects: Array.isArray(result.recruitingProjects)
      ? result.recruitingProjects
      : [],
  };
}

const globalForPublicPageData = globalThis as unknown as {
  publicPageDataStaleByKey?: Map<string, PublicPageData>;
};

function getPublicPageDataStaleMap(): Map<string, PublicPageData> {
  if (!globalForPublicPageData.publicPageDataStaleByKey) {
    globalForPublicPageData.publicPageDataStaleByKey = new Map();
  }

  return globalForPublicPageData.publicPageDataStaleByKey;
}

async function loadPublicPageDataUncached(
  username: string,
  includePublicSummary: boolean
): Promise<PublicPageData | null> {
  const creatorResult = await getCreatorProfileByUsername(username);
  if (!creatorResult) return null;

  const { creator, profile } = creatorResult;
  const creatorProfileId = BigInt(profile.id);
  const [projectData, publicAiManager] = await Promise.all([
    loadPublicProfileProjectData({
      creatorProfileId,
      activeProjectIdJpyc: profile.activeProjectIdJpyc ?? null,
      activeProjectIdUsdc: profile.activeProjectIdUsdc ?? null,
      creator,
    }),
    getPublicAiManagerProfileByCreatorProfileId(creatorProfileId),
  ]);
  const recentSupportActivities = publicAiManager
    ? await getPublicAiManagerRecentSupportActivitiesByCreatorProfileId(
        creatorProfileId
      )
    : [];
  const supportActionThemes = buildPublicSupportActionThemes({
    username,
    projects: projectData.supportActionProjects,
  });

  return normalizePublicPageData({
    creator,
    profile,
    projectId: projectData.projectId,
    projectIdsByCurrency: projectData.projectIdsByCurrency,
    publicSummary: includePublicSummary ? projectData.publicSummary : null,
    publicAiManager,
    recentSupportActivities,
    supportActionThemes,
    recruitingProjects: projectData.recruitingProjects,
    supportProfileView: projectData.supportProfileView,
  });
}

const getPublicPageDataCached = unstable_cache(
  async (username: string, includePublicSummary: boolean) => {
    const staleMap = getPublicPageDataStaleMap();
    const staleKey = `${username}:${includePublicSummary ? "1" : "0"}`;

    try {
      const result = await loadPublicPageDataUncached(username, includePublicSummary);
      if (result) {
        staleMap.set(staleKey, result);
      }
      return result;
    } catch (error) {
      if (isPrismaUnavailableError(error)) {
        const stale = staleMap.get(staleKey);
        if (stale) {
          return stale;
        }
      }

      throw error;
    }
  },
  ["public-page-data-v2"],
  { revalidate: 120 }
);

export async function loadPublicPageData(
  username: string,
  options?: { includePublicSummary?: boolean }
) {
  const includePublicSummary = options?.includePublicSummary === true;
  const result = await getPublicPageDataCached(username, includePublicSummary);
  if (!result) notFound();
  return normalizePublicPageData(result);
}
