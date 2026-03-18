import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import { getProjectSummaryView } from "@/lib/projectSummary";
import { pickPublicSummaryLite, type PublicSummaryLite } from "@/lib/publicSummary";
import {
  buildSupportProfileView,
  type SupportProfileView,
  type SupportProjectView,
} from "@/lib/supportProfileView";
import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";
import { loadRecruitingProjectViews } from "@/lib/recruitingProjects";

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

  let projectId: string | null = null;
  let projectIdsByCurrency: { JPYC: string | null; USDC: string | null } = {
    JPYC: null,
    USDC: null,
  };
  let publicSummary: PublicSummaryLite | null = null;
  let recruitingProjects: SupportProjectView[] = [];
  const summariesByCurrency: {
    JPYC: SummaryViewData | null;
    USDC: SummaryViewData | null;
  } = {
    JPYC: null,
    USDC: null,
  };
  let activeSummary: SummaryViewData | null = null;
  const profileId = BigInt(profile.id);
  const owner = profile.walletAddress?.toLowerCase() ?? null;
  const projectWhereOr: Array<
    { creatorProfileId: bigint } | { ownerAddress: string }
  > = [{ creatorProfileId: profileId }];

  if (owner) {
    projectWhereOr.push({ ownerAddress: owner });
  }

  projectIdsByCurrency = {
    JPYC: profile.activeProjectIdJpyc ?? null,
    USDC: profile.activeProjectIdUsdc ?? null,
  };

  const backfillNeeded =
    !projectIdsByCurrency.JPYC || !projectIdsByCurrency.USDC;

  const backfillPromise = backfillNeeded
    ? Promise.all([
        !projectIdsByCurrency.JPYC
          ? withPrismaRetry(() =>
              prisma.project.findFirst({
                where: { OR: projectWhereOr, currency: "JPYC" },
                select: { id: true },
                orderBy: { createdAt: "desc" },
              })
            )
          : Promise.resolve(null),
        !projectIdsByCurrency.USDC
          ? withPrismaRetry(() =>
              prisma.project.findFirst({
                where: { OR: projectWhereOr, currency: "USDC" },
                select: { id: true },
                orderBy: { createdAt: "desc" },
              })
            )
          : Promise.resolve(null),
      ]).catch((error) => {
        if (isPrismaUnavailableError(error)) {
          console.warn("Failed to backfill projectIds due to DB unavailability");
        } else {
          console.error("Failed to backfill projectIds:", error);
        }
        return [null, null] as [null, null];
      })
    : Promise.resolve([null, null] as [null, null]);

  const recruitingPromise = loadRecruitingProjectViews({
    creatorProfileId: profileId,
    ownerAddress: owner,
  }).catch((error) => {
    if (isPrismaUnavailableError(error)) {
      console.warn("Failed to load recruiting projects due to DB unavailability");
    } else {
      console.error("Failed to load recruiting projects:", error);
    }
    return [] as SupportProjectView[];
  });

  const [[latestJpyc, latestUsdc], resolvedRecruitingProjects] =
    await Promise.all([backfillPromise, recruitingPromise]);

  recruitingProjects = resolvedRecruitingProjects;

  if (!projectIdsByCurrency.JPYC) {
    projectIdsByCurrency.JPYC = latestJpyc?.id?.toString() ?? null;
  }
  if (!projectIdsByCurrency.USDC) {
    projectIdsByCurrency.USDC = latestUsdc?.id?.toString() ?? null;
  }

  projectId =
    profile.activeProjectId ??
    projectIdsByCurrency.JPYC ??
    projectIdsByCurrency.USDC ??
    null;

  if (includePublicSummary && projectId) {
    try {
      const summaryTargets = await Promise.all(
        (["JPYC", "USDC"] as const).map(async (currency) => {
          const nextProjectId = projectIdsByCurrency[currency];
          if (!nextProjectId) return [currency, null] as const;

          return [
            currency,
            await getProjectSummaryView(BigInt(nextProjectId)),
          ] as const;
        })
      );

      for (const [currency, summary] of summaryTargets) {
        summariesByCurrency[currency] = summary;
      }

      const activeCurrency =
        (["JPYC", "USDC"] as const).find(
          (currency) => projectIdsByCurrency[currency] === projectId
        ) ?? null;

      activeSummary = activeCurrency
        ? (summariesByCurrency[activeCurrency] ?? null)
        : (summariesByCurrency.JPYC ?? summariesByCurrency.USDC ?? null);

      publicSummary = activeSummary ? pickPublicSummaryLite(activeSummary) : null;
    } catch (error) {
      if (isPrismaUnavailableError(error)) {
        console.warn("Failed to load public summary due to DB unavailability");
      } else {
        console.error("Failed to load public summary:", error);
      }
    }
  }

  return {
    creator,
    profile,
    projectId,
    projectIdsByCurrency,
    publicSummary,
    recruitingProjects,
    supportProfileView: buildSupportProfileView({
      creator,
      activeProjectId: projectId,
      projectIdsByCurrency,
      summariesByCurrency,
      activeSummary,
    }),
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
