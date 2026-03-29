import { NextRequest, NextResponse } from "next/server";
import { isHash } from "viem";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import { findCreatorByOwnerAddress } from "@/lib/aiManager/ownerAccess";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { serializeAiManagerAccount } from "@/lib/serializers/aiManager";
import { AI_MANAGER_ACCOUNT_SELECT } from "@/lib/aiManager/accountReadModel";
import { getAiManagerReconciliationSummary } from "@/lib/aiManager/reconciliation";
import {
  confirmAiManagerX402PaymentAttempt,
  failAiManagerX402PaymentAttempt,
  recordAiManagerPaymentAttemptEvent,
  resolveAiManagerX402PaymentAttemptReplay,
} from "@/lib/aiManager/paymentAttempts";
import { isUuidString } from "@/lib/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaymentAttemptBody = {
  address?: unknown;
  paymentAttemptId?: unknown;
  action?: unknown;
  txHash?: unknown;
  note?: unknown;
};

function parsePaymentAttemptAction(
  value: unknown
): "CONFIRM_X402" | "MARK_FAILED" | null {
  return value === "CONFIRM_X402" || value === "MARK_FAILED" ? value : null;
}

function parsePaymentAttemptId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!isUuidString(trimmed)) return null;
  return trimmed;
}

function parseOptionalTxHash(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_INVALID");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!isHash(trimmed)) {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_INVALID");
  }
  return trimmed;
}

function parseOptionalNote(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_NOTE_INVALID");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 240) {
    throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_NOTE_INVALID");
  }
  return trimmed;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PaymentAttemptBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const paymentAttemptId = parsePaymentAttemptId(body.paymentAttemptId);
    if (!paymentAttemptId) {
      return errJson("AI_MANAGER_PAYMENT_ATTEMPT_ID_INVALID", 400);
    }

    const action = parsePaymentAttemptAction(body.action);
    if (!action) {
      return errJson("AI_MANAGER_PAYMENT_ATTEMPT_ACTION_INVALID", 400);
    }

    const txHash = parseOptionalTxHash(body.txHash);
    if (action === "CONFIRM_X402" && !txHash) {
      return errJson("AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_REQUIRED", 400);
    }

    const note = parseOptionalNote(body.note);
    const creator = await findCreatorByOwnerAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const account = await prisma.aiManagerAccount.findUnique({
      where: {
        creatorProfileId: creator.id,
      },
      select: {
        id: true,
      },
    });
    if (!account) {
      return errJson("AI_MANAGER_NOT_FOUND", 404);
    }

    const now = new Date();
    let idempotentReplay = false;
    await prisma.$transaction(async (tx) => {
      const replay = await resolveAiManagerX402PaymentAttemptReplay({
        db: tx,
        paymentAttemptId,
        aiManagerAccountId: account.id,
        requestedStatus: action === "CONFIRM_X402" ? "CONFIRMED" : "FAILED",
        requestedTxHash: txHash,
      });
      if (replay) {
        idempotentReplay = true;
        await recordAiManagerPaymentAttemptEvent({
          db: tx,
          aiManagerAccountId: account.id,
          paymentAttemptId,
          source: "OWNER_REVIEW",
          eventType: "SETTLEMENT_REPLAYED",
          status: replay.status,
          txHash: replay.txHash,
          detail:
            action === "CONFIRM_X402"
              ? "Duplicate owner confirmation accepted as idempotent replay."
              : "Duplicate owner failure mark accepted as idempotent replay.",
          createdAt: now,
        });
        return;
      }

      if (action === "CONFIRM_X402") {
        const confirmedTxHash = txHash;
        if (!confirmedTxHash) {
          throw new Error("AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_REQUIRED");
        }

        await confirmAiManagerX402PaymentAttempt({
          db: tx,
          paymentAttemptId,
          aiManagerAccountId: account.id,
          txHash: confirmedTxHash,
          confirmedAt: now,
          source: "OWNER_REVIEW",
        });

        return;
      }

      const failureReason =
        note ?? "x402 settlement was not confirmed by owner.";

      await failAiManagerX402PaymentAttempt({
        db: tx,
        paymentAttemptId,
        aiManagerAccountId: account.id,
        failureReason,
        failedAt: now,
        source: "OWNER_REVIEW",
      });
    });

    const row = await prisma.aiManagerAccount.findUnique({
      where: { creatorProfileId: creator.id },
      select: AI_MANAGER_ACCOUNT_SELECT,
    });
    if (!row) return errJson("AI_MANAGER_NOT_FOUND", 404);

    return okJson({
      account: serializeAiManagerAccount({
        row,
        ownerControlWalletAddress: creator.walletAddress ?? null,
        reconciliation: await getAiManagerReconciliationSummary({
          aiManagerAccountId: row.id,
        }),
      }),
      operation: {
        action,
        paymentAttemptId,
        idempotentReplay,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "AI_MANAGER_PAYMENT_ATTEMPT_NOTE_INVALID":
        case "AI_MANAGER_PAYMENT_ATTEMPT_TX_HASH_INVALID":
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
    console.error("CREATOR_AI_MANAGER_PAYMENT_ATTEMPT_POST_FAILED", error);
    return errJson("CREATOR_AI_MANAGER_PAYMENT_ATTEMPT_POST_FAILED", 500);
  }
}
