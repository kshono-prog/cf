import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import {
  serializePublicAiManagerProfile,
  serializePublicAiManagerSupportActivities,
  type SerializedPublicAiManagerProfile,
  type SerializedPublicAiManagerSupportActivity,
} from "@/lib/serializers/aiManager";

export async function getPublicAiManagerProfileByCreatorProfileId(
  creatorProfileId: bigint
): Promise<SerializedPublicAiManagerProfile | null> {
  try {
    const account = await withPrismaRetry(() =>
      prisma.aiManagerAccount.findUnique({
        where: { creatorProfileId },
        select: {
          status: true,
          displayName: true,
          slug: true,
          avatarAssetUrl: true,
          intro: true,
          archetype: true,
          publicVisibility: true,
          primaryLanguage: true,
          tone: true,
          supportStyle: true,
          disclosurePolicy: true,
          specialties: true,
          updatedAt: true,
        },
      })
    );

    if (!account) return null;
    return serializePublicAiManagerProfile(account);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getPublicAiManagerProfileByCreatorAndSlug(args: {
  creatorProfileId: bigint;
  slug: string;
}): Promise<SerializedPublicAiManagerProfile | null> {
  try {
    const account = await withPrismaRetry(() =>
      prisma.aiManagerAccount.findUnique({
        where: { creatorProfileId: args.creatorProfileId },
        select: {
          status: true,
          displayName: true,
          slug: true,
          avatarAssetUrl: true,
          intro: true,
          archetype: true,
          publicVisibility: true,
          primaryLanguage: true,
          tone: true,
          supportStyle: true,
          disclosurePolicy: true,
          specialties: true,
          updatedAt: true,
        },
      })
    );

    if (!account || account.slug !== args.slug) return null;
    return serializePublicAiManagerProfile(account);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getPublicAiManagerRecentSupportActivitiesByCreatorProfileId(
  creatorProfileId: bigint
): Promise<SerializedPublicAiManagerSupportActivity[]> {
  try {
    const account = await withPrismaRetry(() =>
      prisma.aiManagerAccount.findUnique({
        where: { creatorProfileId },
        select: {
          status: true,
          publicVisibility: true,
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

    if (
      !account ||
      account.status !== "ACTIVE" ||
      account.publicVisibility !== "PUBLIC_BADGED"
    ) {
      return [];
    }

    return serializePublicAiManagerSupportActivities(account.usageRecords);
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return [];
    }

    throw error;
  }
}
