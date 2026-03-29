import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { prisma } from "@/lib/prisma";
import { getAiManagerBillingEnv } from "@/lib/env";
import { getAiManagerReconciliationSummary } from "@/lib/aiManager/reconciliation";
import { resolveAiManagerPlatformOperationsPayee } from "@/lib/aiManager/payeeRegistry";
import {
  authorizeAiManagerX402ConnectorRequest,
  parseAiManagerX402ConnectorSettlementPayload,
  validateAiManagerX402ConnectorPayee,
} from "@/lib/aiManager/x402Connector";
import {
  confirmAiManagerX402PaymentAttempt,
  failAiManagerX402PaymentAttempt,
  recordAiManagerPaymentAttemptEvent,
  resolveAiManagerX402PaymentAttemptReplay,
} from "@/lib/aiManager/paymentAttempts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const requestId = req.headers.get("x-request-id");
    const env = getAiManagerBillingEnv();
    const authError = authorizeAiManagerX402ConnectorRequest({
      authorizationHeader: req.headers.get("authorization"),
      expectedToken: env.x402ConnectorToken,
    });
    if (authError === "AI_MANAGER_X402_CONNECTOR_DISABLED") {
      return errJson(authError, 503);
    }
    if (authError) {
      return errJson(authError, 401);
    }

    const raw: unknown = await req.json().catch(() => null);
    const payload = parseAiManagerX402ConnectorSettlementPayload(raw);

    const verifiedPayee = resolveAiManagerPlatformOperationsPayee({
      platformOperationsWalletAddress: env.platformOperationsWalletAddress,
      x402EndpointUrl: env.x402EndpointUrl,
    });
    const payeeError = validateAiManagerX402ConnectorPayee({
      payload,
      verifiedPayee,
    });
    if (payeeError) {
      return errJson(payeeError, 409);
    }

    const now = new Date();
    let aiManagerAccountId: string | null = null;
    let idempotentReplay = false;

    await prisma.$transaction(async (tx) => {
      const paymentAttempt = await tx.aiManagerPaymentAttempt.findUnique({
        where: {
          id: payload.paymentAttemptId,
        },
        select: {
          usageRecord: {
            select: {
              aiManagerAccountId: true,
            },
          },
        },
      });

      if (!paymentAttempt) {
        throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND");
      }

      const currentAiManagerAccountId =
        paymentAttempt.usageRecord.aiManagerAccountId;
      aiManagerAccountId = currentAiManagerAccountId;

      const replay = await resolveAiManagerX402PaymentAttemptReplay({
        db: tx,
        paymentAttemptId: payload.paymentAttemptId,
        aiManagerAccountId: currentAiManagerAccountId,
        requestedStatus: payload.status,
        requestedTxHash: payload.txHash,
      });
      if (replay) {
        idempotentReplay = true;
        await recordAiManagerPaymentAttemptEvent({
          db: tx,
          aiManagerAccountId: currentAiManagerAccountId,
          paymentAttemptId: payload.paymentAttemptId,
          source: "X402_CONNECTOR",
          eventType: "SETTLEMENT_REPLAYED",
          status: replay.status,
          txHash: replay.txHash,
          detail:
            payload.status === "CONFIRMED"
              ? "Duplicate confirmed connector callback accepted as idempotent replay."
              : "Duplicate failed connector callback accepted as idempotent replay.",
          createdAt: now,
        });
        return;
      }

      if (payload.status === "CONFIRMED") {
        await confirmAiManagerX402PaymentAttempt({
          db: tx,
          paymentAttemptId: payload.paymentAttemptId,
          aiManagerAccountId: currentAiManagerAccountId,
          txHash: payload.txHash ?? "",
          confirmedAt: now,
          source: "X402_CONNECTOR",
        });
        return;
      }

      await failAiManagerX402PaymentAttempt({
        db: tx,
        paymentAttemptId: payload.paymentAttemptId,
        aiManagerAccountId: currentAiManagerAccountId,
        failureReason:
          payload.failureReason ??
          "x402 settlement was rejected by external connector.",
        failedAt: now,
        source: "X402_CONNECTOR",
      });
    });

    if (!aiManagerAccountId) {
      return errJson("AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND", 404);
    }

    console.info("AI_MANAGER_X402_SETTLEMENT_INGESTED", {
      requestId,
      paymentAttemptId: payload.paymentAttemptId,
      status: payload.status,
      idempotentReplay,
      aiManagerAccountId,
      payeeId: verifiedPayee.id,
    });

    return okJson({
      operation: {
        paymentAttemptId: payload.paymentAttemptId,
        status: payload.status,
        payeeId: verifiedPayee.id,
        idempotentReplay,
      },
      reconciliation: await getAiManagerReconciliationSummary({
        aiManagerAccountId,
      }),
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "INVALID_JSON":
        case "AI_MANAGER_X402_CONNECTOR_PAYMENT_ATTEMPT_ID_INVALID":
        case "AI_MANAGER_X402_CONNECTOR_STATUS_INVALID":
        case "AI_MANAGER_X402_CONNECTOR_TX_HASH_INVALID":
        case "AI_MANAGER_X402_CONNECTOR_TX_HASH_REQUIRED":
        case "AI_MANAGER_X402_CONNECTOR_FAILURE_REASON_INVALID":
        case "AI_MANAGER_X402_CONNECTOR_PAYEE_WALLET_INVALID":
          return errJson(error.message, 400);
        case "AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND":
          return errJson(error.message, 404);
        case "AI_MANAGER_PAYMENT_ATTEMPT_RAIL_INVALID":
        case "AI_MANAGER_PAYMENT_ATTEMPT_STATE_INVALID":
        case "AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_DUPLICATE":
          return errJson(error.message, 409);
        default:
          break;
      }
    }

    console.error("INTERNAL_AI_MANAGER_X402_SETTLEMENT_POST_FAILED", error);
    return errJson("INTERNAL_AI_MANAGER_X402_SETTLEMENT_POST_FAILED", 500);
  }
}
