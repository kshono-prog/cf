/* app/api/projects/[projectId]/reward-tiers/[tierId]/route.ts */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import {
  aggregateRewardTierSupport,
  buildRewardTierProgressDto,
  serializeRewardTierWithProgress,
} from "@/lib/rewardTierService";
import { isRewardTierThresholdType } from "@/lib/rewardTierProgress";

export const dynamic = "force-dynamic";

type Params = { projectId: string; tierId: string };

function lower(v: string): string {
  return v.toLowerCase();
}

function toOptionalInt(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (typeof v === "undefined") return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  return undefined;
}

function toOptionalPositiveInt(v: unknown): number | null | undefined {
  const n = toOptionalInt(v);
  if (n === undefined) return undefined;
  if (n === null) return null;
  return n >= 0 ? n : undefined;
}

function toOptionalBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

function toOptionalString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "undefined") return undefined;
  if (typeof v === "string") return v.trim().length > 0 ? v.trim() : null;
  return undefined;
}

function toOptionalThresholdType(v: unknown):
  | "COUNT"
  | "AMOUNT"
  | null
  | undefined {
  if (v === null) return null;
  if (typeof v === "undefined") return undefined;
  if (isRewardTierThresholdType(v)) return v;
  return undefined;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId, tierId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");
    const tid = toBigIntOrThrow(tierId, "TIER_ID_INVALID");

    const tier = await prisma.rewardTier.findUnique({ where: { id: tid } });
    if (!tier || tier.projectId !== pid) {
      return errJson("REWARD_TIER_NOT_FOUND", 404);
    }

    const { confirmedSupportCount, confirmedSupportAmountJpyc } =
      await aggregateRewardTierSupport({ db: prisma, rewardTierId: tid });

    const progress = buildRewardTierProgressDto({
      tier,
      confirmedSupportCount,
      confirmedSupportAmountJpyc,
    });

    return okJson({
      ok: true,
      tier: serializeRewardTierWithProgress({ tier, progress }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "TIER_ID_INVALID") return errJson("TIER_ID_INVALID", 400);
    console.error("REWARD_TIER_GET_FAILED", e);
    return errJson("REWARD_TIER_GET_FAILED", 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> }) {
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

    const title = toNonEmptyString(body.title);
    const description = toOptionalString(body.description);
    const priceJpyc = toOptionalPositiveInt(body.priceJpyc);
    const quantityLimit = toOptionalPositiveInt(body.quantityLimit);
    const isPublished = toOptionalBool(body.isPublished);
    const sortOrder = toOptionalInt(body.sortOrder);
    const deliveryType = toOptionalString(body.deliveryType);
    const imageUrl = toOptionalString(body.imageUrl);
    const startThresholdType = toOptionalThresholdType(body.startThresholdType);
    const startThresholdValue = toOptionalPositiveInt(body.startThresholdValue);

    if (priceJpyc === null) return errJson("PRICE_INVALID", 400);
    if (
      startThresholdType &&
      startThresholdType !== null &&
      startThresholdValue === null
    ) {
      return errJson("THRESHOLD_VALUE_REQUIRED", 400);
    }

    const updated = await prisma.rewardTier.update({
      where: { id: tid },
      data: {
        ...(typeof title === "string" ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(typeof priceJpyc === "number" ? { priceJpyc } : {}),
        ...(quantityLimit !== undefined ? { quantityLimit } : {}),
        ...(typeof isPublished === "boolean" ? { isPublished } : {}),
        ...(typeof sortOrder === "number" ? { sortOrder } : {}),
        ...(deliveryType !== undefined ? { deliveryType } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(startThresholdType !== undefined ? { startThresholdType } : {}),
        ...(startThresholdValue !== undefined ? { startThresholdValue } : {}),
        updatedAt: new Date(),
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
      tier: serializeRewardTierWithProgress({ tier: updated, progress }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "TIER_ID_INVALID") return errJson("TIER_ID_INVALID", 400);
    console.error("REWARD_TIER_PATCH_FAILED", e);
    return errJson("REWARD_TIER_PATCH_FAILED", 500);
  }
}
