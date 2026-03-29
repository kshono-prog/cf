import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { getPublicAiManagerProfileByCreatorAndSlug } from "@/lib/aiManager/publicProfile";
import { getActiveSupportProject, type SupportProfileView, type SupportProjectView } from "@/lib/supportProfileView";
import { loadPublicProfilePageReadModel } from "@/lib/publicProfilePageReadModel";
import type { CreatorActivityCredibility } from "@/lib/creatorActivityCredibility";
import {
  serializePublicAiManagerSupportActivities,
  type SerializedPublicAiManagerSupportActivity,
} from "@/lib/serializers/aiManager";

type PublicAiManagerPageData = {
  creator: NonNullable<Awaited<ReturnType<typeof getCreatorProfileByUsername>>>["creator"];
  profile: NonNullable<Awaited<ReturnType<typeof getCreatorProfileByUsername>>>["profile"];
  aiManager: NonNullable<
    Awaited<ReturnType<typeof getPublicAiManagerProfileByCreatorAndSlug>>
  >;
  supportProfileView: SupportProfileView;
  activeSupportProject: SupportProjectView | null;
  recruitingProjects: SupportProjectView[];
  credibility: CreatorActivityCredibility;
  recentSupportActivities: SerializedPublicAiManagerSupportActivity[];
};

export const loadPublicAiManagerPageData = cache(
  async (
    creatorUsername: string,
    managerSlug: string
  ): Promise<PublicAiManagerPageData | null> => {
    const creatorResult = await getCreatorProfileByUsername(creatorUsername);
    if (!creatorResult) return null;

    const aiManager = await getPublicAiManagerProfileByCreatorAndSlug({
      creatorProfileId: BigInt(creatorResult.profile.id),
      slug: managerSlug,
    });
    if (!aiManager) return null;

    const recentSupportActivitySource = await withPrismaRetry(() =>
      prisma.aiManagerAccount.findUnique({
        where: { creatorProfileId: BigInt(creatorResult.profile.id) },
        select: {
          slug: true,
          usageRecords: {
            orderBy: {
              createdAt: "desc",
            },
            take: 6,
            select: {
              billingState: true,
              createdAt: true,
              agentTask: {
                select: {
                  taskType: true,
                },
              },
            },
          },
        },
      })
    );

    const publicReadModel = await loadPublicProfilePageReadModel(creatorUsername);

    return {
      creator: creatorResult.creator,
      profile: creatorResult.profile,
      aiManager,
      supportProfileView: publicReadModel.pageData.supportProfileView,
      activeSupportProject: getActiveSupportProject(
        publicReadModel.pageData.supportProfileView
      ),
      recruitingProjects: publicReadModel.pageData.recruitingProjects,
      credibility: publicReadModel.credibility,
      recentSupportActivities:
        recentSupportActivitySource?.slug === managerSlug
          ? serializePublicAiManagerSupportActivities(
              recentSupportActivitySource.usageRecords
            )
          : [],
    };
  }
);
