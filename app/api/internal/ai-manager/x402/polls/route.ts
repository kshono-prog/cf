import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { prisma } from "@/lib/prisma";
import { getAiManagerBillingEnv } from "@/lib/env";
import { getAiManagerReconciliationSummary } from "@/lib/aiManager/reconciliation";
import { resolveAiManagerPlatformOperationsPayee } from "@/lib/aiManager/payeeRegistry";
import {
  authorizeAiManagerX402ConnectorRequest,
  parseAiManagerX402ConnectorPendingObservationPayload,
  validateAiManagerX402ConnectorPayee,
} from "@/lib/aiManager/x402Connector";
import { recordAiManagerX402PendingObservation } from "@/lib/aiManager/paymentAttempts";

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
    const payload = parseAiManagerX402ConnectorPendingObservationPayload(raw);

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

    const observedAt = new Date();
    let aiManagerAccountId: string | null = null;
    let recorded = false;

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
      const result = await recordAiManagerX402PendingObservation({
        db: tx,
        paymentAttemptId: payload.paymentAttemptId,
        aiManagerAccountId: currentAiManagerAccountId,
        observedAt,
        detail: payload.detail,
      });
      recorded = result.recorded;
    });

    if (!aiManagerAccountId) {
      return errJson("AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND", 404);
    }

    console.info("AI_MANAGER_X402_POLL_INGESTED", {
      requestId,
      paymentAttemptId: payload.paymentAttemptId,
      aiManagerAccountId,
      payeeId: verifiedPayee.id,
      recorded,
    });

    return okJson({
      operation: {
        paymentAttemptId: payload.paymentAttemptId,
        status: "PENDING",
        payeeId: verifiedPayee.id,
        recorded,
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
        case "AI_MANAGER_X402_CONNECTOR_PENDING_DETAIL_INVALID":
        case "AI_MANAGER_X402_CONNECTOR_PAYEE_WALLET_INVALID":
          return errJson(error.message, 400);
        case "AI_MANAGER_PAYMENT_ATTEMPT_NOT_FOUND":
          return errJson(error.message, 404);
        case "AI_MANAGER_PAYMENT_ATTEMPT_RAIL_INVALID":
        case "AI_MANAGER_PAYMENT_ATTEMPT_STATE_INVALID":
          return errJson(error.message, 409);
        default:
          break;
      }
    }

    console.error("INTERNAL_AI_MANAGER_X402_POLL_POST_FAILED", error);
    return errJson("INTERNAL_AI_MANAGER_X402_POLL_POST_FAILED", 500);
  }
}
