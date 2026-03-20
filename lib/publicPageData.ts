import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import type { PublicSummaryLite } from "@/lib/publicSummary";
import type { SupportProfileView, SupportProjectView } from "@/lib/supportProfileView";
import { loadPublicProfileProjectData } from "@/lib/publicProfileProjectData";

type PublicPageData = {
  creator: NonNullable<Awaited<ReturnType<typeof getCreatorProfileByUsername>>>["creator"];
  profile: NonNullable<Awaited<ReturnType<typeof getCreatorProfileByUsername>>>["profile"];
  projectId: string | null;
  projectIdsByCurrency: { JPYC: string | null; USDC: string | null };
  publicSummary: PublicSummaryLite | null;
  supportProfileView: SupportProfileView;
  recruitingProjects: SupportProjectView[];
};

async function loadPublicPageDataUncached(
  username: string,
  includePublicSummary: boolean
): Promise<PublicPageData | null> {
  const creatorResult = await getCreatorProfileByUsername(username);
  if (!creatorResult) return null;

  const { creator, profile } = creatorResult;
  const projectData = await loadPublicProfileProjectData({
    creatorProfileId: BigInt(profile.id),
    activeProjectIdJpyc: profile.activeProjectIdJpyc ?? null,
    activeProjectIdUsdc: profile.activeProjectIdUsdc ?? null,
    creator,
  });

  return {
    creator,
    profile,
    projectId: projectData.projectId,
    projectIdsByCurrency: projectData.projectIdsByCurrency,
    publicSummary: includePublicSummary ? projectData.publicSummary : null,
    recruitingProjects: projectData.recruitingProjects,
    supportProfileView: projectData.supportProfileView,
  };
}

const getPublicPageDataCached = unstable_cache(
  async (username: string, includePublicSummary: boolean) =>
    loadPublicPageDataUncached(username, includePublicSummary),
  ["public-page-data"],
  { revalidate: 120 }
);

export async function loadPublicPageData(
  username: string,
  options?: { includePublicSummary?: boolean }
) {
  const includePublicSummary = options?.includePublicSummary === true;
  const result = await getPublicPageDataCached(username, includePublicSummary);
  if (!result) notFound();
  return result;
}
