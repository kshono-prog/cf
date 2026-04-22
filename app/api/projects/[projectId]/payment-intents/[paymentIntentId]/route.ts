/* app/api/projects/[projectId]/payment-intents/[paymentIntentId]/route.ts */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { toBigIntOrThrow } from "@/lib/api/guards";
import { toPaymentIntentDetailDto } from "@/lib/paymentIntents";
import { isUuidString } from "@/lib/social";

export const dynamic = "force-dynamic";

type Params = { projectId: string; paymentIntentId: string };

export async function GET(_req: NextRequest, ctx: { params: Promise<Params> }) {
  try {
    const { projectId, paymentIntentId } = await ctx.params;
    const pid = toBigIntOrThrow(projectId, "PROJECT_ID_INVALID");
    if (!isUuidString(paymentIntentId)) {
      return errJson("PAYMENT_INTENT_ID_INVALID", 400);
    }

    const intent = await prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
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
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!intent || intent.projectId !== pid) {
      return errJson("PAYMENT_INTENT_NOT_FOUND", 404);
    }

    const dto = toPaymentIntentDetailDto({
      id: intent.id,
      projectId: intent.projectId,
      storedStatus: intent.status,
      expectedAmountJpyc: intent.expectedAmountJpyc,
      currency: intent.currency,
      chainId: intent.chainId,
      quantity: intent.quantity,
      customerLabel: intent.customerLabel,
      recipientAddress: intent.recipientAddress,
      note: intent.note,
      purposeId: intent.purposeId,
      expiresAt: intent.expiresAt,
      canceledAt: intent.canceledAt,
      createdAt: intent.createdAt,
      rewardTier: intent.rewardTier,
      contribution: intent.contribution,
      items: intent.items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        unitPriceJpyc: item.unitPriceJpyc,
        quantity: item.quantity,
        subtotalJpyc: item.subtotalJpyc,
      })),
    });

    return okJson({ ok: true, paymentIntent: dto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "PROJECT_ID_INVALID") return errJson("PROJECT_ID_INVALID", 400);
    console.error("PAYMENT_INTENT_GET_FAILED", e);
    return errJson("PAYMENT_INTENT_GET_FAILED", 500);
  }
}
