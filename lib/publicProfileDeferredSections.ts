import { getAllGoalAchievementImpacts } from "@/lib/goalAchievementImpact";
import {
  getPublicNextGoalReveal,
  getPublicProfilePageEnhancements,
} from "@/lib/publicProfileEnhancement";
import { isPrismaUnavailableError } from "@/lib/prismaRetry";
import { getLatestSupporterResultReportSummary } from "@/lib/supporterResultReportSummary";
import type { SupportProjectView } from "@/lib/supportProfileView";

type PublicProfileDeferredSections = {
  enhancements: Awaited<ReturnType<typeof getPublicProfilePageEnhancements>>;
  impacts: Awaited<ReturnType<typeof getAllGoalAchievementImpacts>>;
  reportSummary: Awaited<ReturnType<typeof getLatestSupporterResultReportSummary>>;
  nextGoalReveal: Awaited<ReturnType<typeof getPublicNextGoalReveal>>;
};

function buildEmptyDeferredSections(): PublicProfileDeferredSections {
  return {
    enhancements: {
      recentSupporters: { recentContributors: [], totalContributorCount: 0 },
      supporterWall: { supporters: [], totalSupporterCount: 0 },
      contributorMetrics: { totalContributorCount: 0, repeatSupporterCount: 0 },
      activityHeatmap: null,
      microTestimonials: { testimonials: [] },
      supporterTrust: null,
      revenueProof: null,
      teamMembers: null,
    },
    impacts: [],
    reportSummary: null,
    nextGoalReveal: null,
  };
}

export async function loadPublicProfileDeferredSections(args: {
  creatorProfileId: string;
  activeSupportProject: SupportProjectView | null;
}): Promise<PublicProfileDeferredSections> {
  const creatorProfileId = BigInt(args.creatorProfileId);

  try {
    const enhancements = await getPublicProfilePageEnhancements(creatorProfileId);
    const impacts = await getAllGoalAchievementImpacts(creatorProfileId);
    const reportSummary = await getLatestSupporterResultReportSummary(
      creatorProfileId
    );
    const nextGoalReveal = await getPublicNextGoalReveal(args.activeSupportProject);

    return {
      enhancements,
      impacts,
      reportSummary,
      nextGoalReveal,
    };
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return buildEmptyDeferredSections();
    }

    throw error;
  }
}
