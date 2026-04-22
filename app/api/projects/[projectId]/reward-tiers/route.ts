/* app/api/projects/[projectId]/reward-tiers/route.ts */
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

type Params = { projectId: string };

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

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");
    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);

    const url = new URL(req.url);
    const publishedOnly = url.searchParams.get("publishedOnly") === "true";

    const tiers = await prisma.rewardTier.findMany({
      where: {
        projectId: pid,
        ...(publishedOnly ? { isPublished: true } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    const items = await Promise.all(
      tiers.map(async (tier) => {
        const { confirmedSupportCount, confirmedSupportAmountJpyc } =
          await aggregateRewardTierSupport({
            db: prisma,
            rewardTierId: tier.id,
          });
        const progress = buildRewardTierProgressDto({
          tier,
          confirmedSupportCount,
          confirmedSupportAmountJpyc,
        });
        return serializeRewardTierWithProgress({ tier, progress });
      })
    );

    return okJson({ ok: true, items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("REWARD_TIER_LIST_FAILED", e);
    return errJson("REWARD_TIER_LIST_FAILED", 500);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) return errJson("BODY_INVALID", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, body);
    if (!ownerSession.ok) return ownerSession.response;

    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, ownerAddress: true, currency: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    const owner = project.ownerAddress ? lower(project.ownerAddress) : null;
    if (!owner || owner !== ownerSession.address) {
      return errJson("FORBIDDEN_NOT_OWNER", 403);
    }

    const title = toNonEmptyString(body.title);
    if (!title) return errJson("TITLE_REQUIRED", 400);

    const priceNum = toOptionalPositiveInt(body.priceJpyc);
    if (typeof priceNum !== "number" || priceNum <= 0) {
      return errJson("PRICE_INVALID", 400);
    }

    const description = toOptionalString(body.description);
    const currency =
      toOptionalString(body.currency) === null
        ? null
        : toOptionalString(body.currency);
    const quantityLimit = toOptionalPositiveInt(body.quantityLimit);
    const isPublished = toOptionalBool(body.isPublished);
    const sortOrder = toOptionalInt(body.sortOrder);
    const deliveryType = toOptionalString(body.deliveryType);
    const imageUrl = toOptionalString(body.imageUrl);
    const startThresholdType = toOptionalThresholdType(body.startThresholdType);
    const startThresholdValue = toOptionalPositiveInt(body.startThresholdValue);

    // threshold の整合性
    if (
      startThresholdType &&
      startThresholdType !== null &&
      (typeof startThresholdValue !== "number" || startThresholdValue <= 0)
    ) {
      return errJson("THRESHOLD_VALUE_REQUIRED", 400);
    }

    const created = await prisma.rewardTier.create({
      data: {
        projectId: pid,
        title,
        description: description === undefined ? null : description,
        priceJpyc: priceNum,
        currency: currency ?? project.currency ?? "JPYC",
        quantityLimit: quantityLimit === undefined ? null : quantityLimit,
        isPublished: isPublished ?? false,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        deliveryType: deliveryType === undefined ? null : deliveryType,
        imageUrl: imageUrl === undefined ? null : imageUrl,
        startThresholdType:
          startThresholdType === undefined ? null : startThresholdType,
        startThresholdValue:
          typeof startThresholdValue === "number"
            ? startThresholdValue
            : null,
      },
    });

    const progress = buildRewardTierProgressDto({
      tier: created,
      confirmedSupportCount: 0,
      confirmedSupportAmountJpyc: 0,
    });

    return okJson({
      ok: true,
      tier: serializeRewardTierWithProgress({ tier: created, progress }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("REWARD_TIER_CREATE_FAILED", e);
    return errJson("REWARD_TIER_CREATE_FAILED", 500);
  }
}
