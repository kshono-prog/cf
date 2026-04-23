/* app/api/projects/[projectId]/payment-intents/route.ts */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  createPaymentIntentDraft,
  toPaymentIntentListItem,
} from "@/lib/paymentIntents";
import { isAddress, getAddress } from "viem";

export const dynamic = "force-dynamic";

const DEFAULT_PAYMENT_INTENT_TTL_MS = 30 * 60_000; // 30 分

type Params = { projectId: string };

function toOptionalString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function toChainId(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.floor(v);
}

export async function GET(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");

    const url = new URL(req.url);
    const rewardTierIdStr = url.searchParams.get("rewardTierId");
    const statusFilter = url.searchParams.get("status");
    const limitRaw = url.searchParams.get("limit");
    const limit =
      limitRaw && Number.isFinite(Number(limitRaw))
        ? Math.min(200, Math.max(1, Math.floor(Number(limitRaw))))
        : 50;

    const rewardTierId = rewardTierIdStr
      ? toBigIntOrThrow(rewardTierIdStr, "TIER_ID_INVALID")
      : null;

    const intents = await prisma.paymentIntent.findMany({
      where: {
        projectId: pid,
        ...(rewardTierId !== null ? { rewardTierId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        rewardTier: {
          select: {
            id: true,
            title: true,
            priceJpyc: true,
            currency: true,
            productionStatus: true,
          },
        },
        contribution: {
          select: {
            id: true,
            status: true,
            txHash: true,
            fromAddress: true,
            toAddress: true,
            confirmedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const now = new Date();
    const items = intents.map((intent) =>
      toPaymentIntentListItem({
        id: intent.id,
        projectId: intent.projectId,
        storedStatus: intent.status,
        expectedAmountJpyc: intent.expectedAmountJpyc,
        currency: intent.currency,
        chainId: intent.chainId,
        quantity: intent.quantity,
        customerLabel: intent.customerLabel,
        expiresAt: intent.expiresAt,
        canceledAt: intent.canceledAt,
        createdAt: intent.createdAt,
        rewardTier: intent.rewardTier,
        contribution: intent.contribution,
        now,
      })
    );

    return okJson({ ok: true, items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "TIER_ID_INVALID") return errJson("TIER_ID_INVALID", 400);
    console.error("PAYMENT_INTENT_LIST_FAILED", e);
    return errJson("PAYMENT_INTENT_LIST_FAILED", 500);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");

    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) return errJson("BODY_INVALID", 400);

    const rewardTierIdStr = toNonEmptyString(body.rewardTierId);
    if (!rewardTierIdStr) return errJson("REWARD_TIER_ID_REQUIRED", 400);
    const rewardTierId = toBigIntOrThrow(rewardTierIdStr, "TIER_ID_INVALID");

    const quantityRaw = body.quantity;
    const quantity =
      typeof quantityRaw === "number" &&
      Number.isFinite(quantityRaw) &&
      quantityRaw > 0
        ? Math.floor(quantityRaw)
        : 1;

    const chainId = toChainId(body.chainId);
    if (!chainId) return errJson("CHAIN_ID_REQUIRED", 400);

    const currency = toOptionalString(body.currency);
    if (!currency) return errJson("CURRENCY_REQUIRED", 400);

    const recipientAddressRaw = toOptionalString(body.recipientAddress);
    if (!recipientAddressRaw || !isAddress(recipientAddressRaw)) {
      return errJson("RECIPIENT_ADDRESS_INVALID", 400);
    }
    const recipientAddress = getAddress(recipientAddressRaw);

    const customerLabel = toOptionalString(body.customerLabel);
    const note = toOptionalString(body.note);
    const purposeIdStr = toOptionalString(body.purposeId);
    const purposeId = purposeIdStr
      ? toBigIntOrThrow(purposeIdStr, "PURPOSE_ID_INVALID")
      : null;

    const project = await prisma.project.findUnique({
      where: { id: pid },
      select: { id: true, currency: true, ownerAddress: true },
    });
    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    if (project.currency !== currency) {
      return errJson("PROJECT_CURRENCY_MISMATCH", 400);
    }

    const tier = await prisma.rewardTier.findUnique({
      where: { id: rewardTierId },
    });
    if (!tier || tier.projectId !== pid) {
      return errJson("REWARD_TIER_NOT_FOUND", 404);
    }
    if (!tier.isPublished) {
      return errJson("REWARD_TIER_NOT_PUBLISHED", 400);
    }
    if (
      tier.productionStatus === "CANCELED" ||
      tier.productionStatus === "COMPLETED"
    ) {
      return errJson("REWARD_TIER_CLOSED", 400);
    }

    if (purposeId !== null) {
      const purpose = await prisma.purpose.findUnique({
        where: { id: purposeId },
        select: { projectId: true },
      });
      if (!purpose || purpose.projectId !== pid) {
        return errJson("PURPOSE_MISMATCH", 400);
      }
    }

    const expiresAt = new Date(Date.now() + DEFAULT_PAYMENT_INTENT_TTL_MS);
    const draft = createPaymentIntentDraft({
      rewardTier: {
        id: tier.id,
        priceJpyc: tier.priceJpyc,
        currency: tier.currency,
        title: tier.title,
      },
      quantity,
      chainId,
      recipientAddress,
      currency,
      customerLabel,
      note,
      purposeId,
      expiresAt,
    });

    const created = await prisma.paymentIntent.create({
      data: {
        projectId: pid,
        rewardTierId: tier.id,
        purposeId: draft.purposeId,
        expectedAmountJpyc: draft.expectedAmountJpyc,
        currency: draft.currency,
        chainId: draft.chainId,
        recipientAddress: draft.recipientAddress,
        quantity: draft.quantity,
        customerLabel: draft.customerLabel,
        note: draft.note,
        status: "OPEN",
        expiresAt: draft.expiresAt,
        items: {
          create: {
            itemName: draft.itemName,
            unitPriceJpyc: draft.unitPriceJpyc,
            quantity: draft.quantity,
            subtotalJpyc: draft.subtotalJpyc,
          },
        },
      },
      include: {
        rewardTier: {
          select: {
            id: true,
            title: true,
            priceJpyc: true,
            currency: true,
            productionStatus: true,
          },
        },
        contribution: {
          select: {
            id: true,
            status: true,
            txHash: true,
            fromAddress: true,
            toAddress: true,
            confirmedAt: true,
          },
        },
        items: true,
      },
    });

    return okJson({
      ok: true,
      paymentIntent: {
        id: created.id,
        projectId: created.projectId.toString(),
        rewardTierId: created.rewardTierId ? created.rewardTierId.toString() : null,
        purposeId: created.purposeId ? created.purposeId.toString() : null,
        expectedAmountJpyc: created.expectedAmountJpyc,
        currency: created.currency,
        chainId: created.chainId,
        recipientAddress: created.recipientAddress,
        quantity: created.quantity,
        customerLabel: created.customerLabel,
        note: created.note,
        status: created.status,
        contributionId: created.contributionId,
        expiresAt: created.expiresAt ? created.expiresAt.toISOString() : null,
        createdAt: created.createdAt.toISOString(),
        items: created.items.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          unitPriceJpyc: item.unitPriceJpyc,
          quantity: item.quantity,
          subtotalJpyc: item.subtotalJpyc,
        })),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    if (msg === "TIER_ID_INVALID") return errJson("TIER_ID_INVALID", 400);
    if (msg === "PURPOSE_ID_INVALID") return errJson("PURPOSE_ID_INVALID", 400);
    console.error("PAYMENT_INTENT_CREATE_FAILED", e);
    return errJson("PAYMENT_INTENT_CREATE_FAILED", 500);
  }
}
