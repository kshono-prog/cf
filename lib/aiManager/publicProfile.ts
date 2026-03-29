import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import {
  serializePublicAiManagerProfile,
  type SerializedPublicAiManagerProfile,
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
