/* app/api/projects/[projectId]/reward-tiers/[tierId]/complete-production/route.ts */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toBigIntOrThrow } from "@/lib/api/guards";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import {
  aggregateRewardTierSupport,
  buildRewardTierProgressDto,
  serializeRewardTierWithProgress,
} from "@/lib/rewardTierService";

export const dynamic = "force-dynamic";

type Params = { projectId: string; tierId: string };

function lower(v: string): string {
  return v.toLowerCase();
}

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId, tierId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");
    const tid = toBigIntOrThrow(tierId, "TIER_ID_INVALID");

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) return errJson("BODY_INVALID", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, body);
    if (!ownerSession.ok) return ownerSession.response;

    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, ownerAddress: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    const owner = project.ownerAddress ? lower(project.ownerAddress) : null;
    if (!owner || owner !== ownerSession.address) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const current = await prisma.rewardTier.findUnique({ where: { id: tid } });
    if (!current || current.projectId !== pid) {
      return errJson("REWARD_TIER_NOT_FOUND", 404);
    }

    if (current.productionStatus !== "IN_PROGRESS") {
      return errJson("PRODUCTION_NOT_IN_PROGRESS", 409);
    }

    const now = new Date();
    const updated = await prisma.rewardTier.update({
      where: { id: tid },
      data: {
        productionStatus: "COMPLETED",
        productionCompletedAt: now,
        updatedAt: now,
      },
    });

    const { confirmedSupportCount, confirmedSupportAmountJpyc } =
      await aggregateRewardTierSupport({ db: prisma, rewardTierId: tid });
    const progress = buildRewardTierProgressDto({
      tier: updated,
      confirmedSupportCount,
      confirmedSupportAmountJpyc,
    });

    return okJson({
      ok: true,
      productionStatus: "COMPLETED",
      tier: serializeRewardTierWithProgress({ tier: updated, progress }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "TIER_ID_INVALID") return errJson("TIER_ID_INVALID", 400);
    console.error("REWARD_TIER_COMPLETE_PRODUCTION_FAILED", e);
    return errJson("REWARD_TIER_COMPLETE_PRODUCTION_FAILED", 500);
  }
}
