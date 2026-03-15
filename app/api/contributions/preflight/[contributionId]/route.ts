import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { errJson, okJson } from "@/lib/api/responses";
import { isUuidString } from "@/lib/social";

type Params = {
  contributionId: string;
};

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  const { contributionId } = await ctx.params;
  if (!isUuidString(contributionId)) {
    return errJson("CONTRIBUTION_ID_INVALID", 400);
  }

  const existing = await withPrismaRetry(() =>
    prisma.contribution.findUnique({
      where: { id: contributionId },
      select: { id: true, status: true, txHash: true },
    })
  );

  if (!existing) {
    return errJson("CONTRIBUTION_NOT_FOUND", 404);
  }

  if (existing.status === "CONFIRMED") {
    return okJson({ cancelled: false, alreadyConfirmed: true });
  }

  await withPrismaRetry(() =>
    prisma.contribution.update({
      where: { id: contributionId },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
    })
  );

  return okJson({ cancelled: true });
}
