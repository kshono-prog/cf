import { notFound } from "next/navigation";

import { getCreatorProfileByUsername } from "@/lib/creatorProfile";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";

export async function loadPublicPageData(username: string) {
  const creatorResult = await getCreatorProfileByUsername(username);
  if (!creatorResult) notFound();

  const { creator, profile } = creatorResult;

  let projectId: string | null = null;
  let projectIdsByCurrency: { JPYC: string | null; USDC: string | null } = {
    JPYC: null,
    USDC: null,
  };

  try {
    projectIdsByCurrency = {
      JPYC: profile.activeProjectIdJpyc ?? null,
      USDC: profile.activeProjectIdUsdc ?? null,
    };

    if (!projectIdsByCurrency.JPYC || !projectIdsByCurrency.USDC) {
      const profileId = BigInt(profile.id);
      const owner = profile.walletAddress?.toLowerCase() ?? null;
      const projectWhereOr: Array<
        { creatorProfileId: bigint } | { ownerAddress: string }
      > = [{ creatorProfileId: profileId }];
      if (owner) {
        projectWhereOr.push({ ownerAddress: owner });
      }

      const [latestJpyc, latestUsdc] = await Promise.all([
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
      ]);

      if (!projectIdsByCurrency.JPYC) {
        projectIdsByCurrency.JPYC = latestJpyc?.id?.toString() ?? null;
      }

      if (!projectIdsByCurrency.USDC) {
        projectIdsByCurrency.USDC = latestUsdc?.id?.toString() ?? null;
      }
    }

    projectId =
      profile.activeProjectId ??
      projectIdsByCurrency.JPYC ??
      projectIdsByCurrency.USDC ??
      null;
  } catch (error) {
    console.error("Failed to resolve projectId:", error);
    projectId = null;
    projectIdsByCurrency = { JPYC: null, USDC: null };
  }

  return {
    creator,
    profile,
    projectId,
    projectIdsByCurrency,
  };
}
