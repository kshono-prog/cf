import type { SummaryViewData } from "@/lib/mypage/accountPageTypes";
import { pickPublicSummaryLite, type PublicSummaryLite } from "@/lib/publicSummary";
import { getProjectSummaryView } from "@/lib/projectSummary";
import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import {
  resolveCreatorProjectSelection,
  serializeCreatorLatestProjectSummary,
  type CreatorLatestProjectSummary,
  type CreatorProjectIdsByCurrency,
} from "@/lib/serializers/creator";

export type PublicCreatorProjectData = {
  projectId: string | null;
  projectIdsByCurrency: CreatorProjectIdsByCurrency;
  summariesByCurrency: {
    JPYC: SummaryViewData | null;
    USDC: SummaryViewData | null;
  };
  activeSummary: SummaryViewData | null;
  publicSummary: PublicSummaryLite | null;
  latestProjectSummary: CreatorLatestProjectSummary | null;
};

function summaryBelongsToCreator(
  summary: SummaryViewData | null,
  creatorProfileId: string
): summary is SummaryViewData {
  return summary?.project.creatorProfileId === creatorProfileId;
}

async function loadSummaryForCreator(
  projectId: string | null,
  creatorProfileId: string
): Promise<SummaryViewData | null> {
  if (!projectId) return null;

  try {
    const summary = await getProjectSummaryView(BigInt(projectId));
    return summaryBelongsToCreator(summary, creatorProfileId) ? summary : null;
  } catch {
    return null;
  }
}

export async function resolvePublicCreatorProjectData(args: {
  creatorProfileId: bigint;
  activeProjectIdJpyc: string | null;
  activeProjectIdUsdc: string | null;
}): Promise<PublicCreatorProjectData> {
  const creatorProfileIdString = args.creatorProfileId.toString();
  const initialSelection = resolveCreatorProjectSelection({
    activeProjectIdJpyc: args.activeProjectIdJpyc,
    activeProjectIdUsdc: args.activeProjectIdUsdc,
  });

  const projectIdsByCurrency: CreatorProjectIdsByCurrency = {
    ...initialSelection.projectIdsByCurrency,
  };

  const backfillNeeded =
    !projectIdsByCurrency.JPYC || !projectIdsByCurrency.USDC;

  if (backfillNeeded) {
    const [latestJpyc, latestUsdc] = await Promise.all([
      !projectIdsByCurrency.JPYC
        ? withPrismaRetry(() =>
            prisma.project.findFirst({
              where: {
                creatorProfileId: args.creatorProfileId,
                currency: "JPYC",
              },
              select: { id: true },
              orderBy: { createdAt: "desc" },
            })
          )
        : Promise.resolve(null),
      !projectIdsByCurrency.USDC
        ? withPrismaRetry(() =>
            prisma.project.findFirst({
              where: {
                creatorProfileId: args.creatorProfileId,
                currency: "USDC",
              },
              select: { id: true },
              orderBy: { createdAt: "desc" },
            })
          )
        : Promise.resolve(null),
    ]).catch((error) => {
      if (isPrismaUnavailableError(error)) {
        console.warn("Failed to backfill public creator projects due to DB unavailability");
      } else {
        console.error("Failed to backfill public creator projects:", error);
      }
      return [null, null] as const;
    });

    if (!projectIdsByCurrency.JPYC) {
      projectIdsByCurrency.JPYC = latestJpyc?.id.toString() ?? null;
    }
    if (!projectIdsByCurrency.USDC) {
      projectIdsByCurrency.USDC = latestUsdc?.id.toString() ?? null;
    }
  }

  const [jpycSummary, usdcSummary] = await Promise.all([
    loadSummaryForCreator(projectIdsByCurrency.JPYC, creatorProfileIdString),
    loadSummaryForCreator(projectIdsByCurrency.USDC, creatorProfileIdString),
  ]);

  if (!jpycSummary) {
    projectIdsByCurrency.JPYC = null;
  }
  if (!usdcSummary) {
    projectIdsByCurrency.USDC = null;
  }

  const summariesByCurrency: PublicCreatorProjectData["summariesByCurrency"] = {
    JPYC: jpycSummary,
    USDC: usdcSummary,
  };

  let projectId = initialSelection.projectId;
  let activeSummary: SummaryViewData | null = null;

  if (projectId) {
    if (projectId === projectIdsByCurrency.JPYC) {
      activeSummary = summariesByCurrency.JPYC;
    } else if (projectId === projectIdsByCurrency.USDC) {
      activeSummary = summariesByCurrency.USDC;
    } else {
      activeSummary = await loadSummaryForCreator(projectId, creatorProfileIdString);
    }
  }

  if (!activeSummary) {
    projectId = projectIdsByCurrency.JPYC ?? projectIdsByCurrency.USDC ?? null;
    activeSummary =
      (projectId && projectId === projectIdsByCurrency.JPYC
        ? summariesByCurrency.JPYC
        : null) ??
      (projectId && projectId === projectIdsByCurrency.USDC
        ? summariesByCurrency.USDC
        : null);
  }

  const latestProjectSummary =
    serializeCreatorLatestProjectSummary(
      activeSummary ?? summariesByCurrency.JPYC ?? summariesByCurrency.USDC
    ) ?? null;

  return {
    projectId,
    projectIdsByCurrency,
    summariesByCurrency,
    activeSummary,
    publicSummary: activeSummary ? pickPublicSummaryLite(activeSummary) : null,
    latestProjectSummary,
  };
}
