import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import { findCreatorByOwnerAddress } from "@/lib/aiManager/ownerAccess";
import { getAiManagerReconciliationSummary } from "@/lib/aiManager/reconciliation";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { serializeAiManagerAccount } from "@/lib/serializers/aiManager";
import { AI_MANAGER_ACCOUNT_SELECT } from "@/lib/aiManager/accountReadModel";
import { isUuidString } from "@/lib/social";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BudgetBody = {
  address?: unknown;
  action?: unknown;
  amount?: unknown;
  note?: unknown;
  fundingEvidenceId?: unknown;
};

function parseBudgetAction(value: unknown): "TOP_UP" | "DEDUCT" | null {
  return value === "TOP_UP" || value === "DEDUCT" ? value : null;
}

function parseBudgetAmount(value: unknown): Prisma.Decimal | null {
  const normalized =
    typeof value === "number"
      ? value.toFixed(2)
      : typeof value === "string"
        ? value.trim()
        : null;
  if (!normalized) return null;
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const amount = new Prisma.Decimal(normalized);
  if (amount.lte(0)) return null;
  if (amount.gt(new Prisma.Decimal("1000000"))) return null;
  return amount;
}

function parseOptionalNote(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("AI_MANAGER_BUDGET_NOTE_INVALID");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 240) {
    throw new Error("AI_MANAGER_BUDGET_NOTE_INVALID");
  }
  return trimmed;
}

function parseOptionalFundingEvidenceId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_ID_INVALID");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!isUuidString(trimmed)) {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_ID_INVALID");
  }
  return trimmed;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as BudgetBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const action = parseBudgetAction(body.action);
    if (!action) return errJson("AI_MANAGER_BUDGET_ACTION_INVALID", 400);

    const amount = parseBudgetAmount(body.amount);
    if (!amount) return errJson("AI_MANAGER_BUDGET_AMOUNT_INVALID", 400);

    const note = parseOptionalNote(body.note);
    const fundingEvidenceId = parseOptionalFundingEvidenceId(
      body.fundingEvidenceId
    );
    const creator = await findCreatorByOwnerAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    if (action !== "TOP_UP" && fundingEvidenceId) {
      return errJson("AI_MANAGER_FUNDING_EVIDENCE_ACTION_INVALID", 400);
    }

    const existing = await prisma.aiManagerAccount.findUnique({
      where: { creatorProfileId: creator.id },
      select: {
        id: true,
        creatorProfileId: true,
        budgetBalance: {
          select: {
            currency: true,
            availableAmount: true,
          },
        },
      },
    });
    if (!existing || !existing.budgetBalance) {
      return errJson("AI_MANAGER_NOT_FOUND", 404);
    }
    const budgetCurrency = existing.budgetBalance.currency;

    if (
      action === "DEDUCT" &&
      existing.budgetBalance.availableAmount.lt(amount)
    ) {
      return errJson("AI_MANAGER_BUDGET_INSUFFICIENT", 409);
    }

    await prisma.$transaction(async (tx) => {
      if (fundingEvidenceId) {
        const evidence = await tx.aiManagerFundingEvidence.findUnique({
          where: {
            id: fundingEvidenceId,
          },
          select: {
            id: true,
            aiManagerAccountId: true,
            status: true,
            currency: true,
            amount: true,
            matchedBudgetTransactionId: true,
          },
        });
        if (!evidence || evidence.aiManagerAccountId !== existing.id) {
          throw new Error("AI_MANAGER_FUNDING_EVIDENCE_NOT_FOUND");
        }
        if (
          evidence.status !== "SELF_REPORTED" ||
          evidence.matchedBudgetTransactionId
        ) {
          throw new Error("AI_MANAGER_FUNDING_EVIDENCE_ALREADY_MATCHED");
        }
        if (
          evidence.currency !== budgetCurrency ||
          !evidence.amount.eq(amount)
        ) {
          throw new Error("AI_MANAGER_FUNDING_EVIDENCE_AMOUNT_MISMATCH");
        }
      }

      const updatedBalance = await tx.aiManagerBudgetBalance.update({
        where: {
          aiManagerAccountId: existing.id,
        },
        data: {
          availableAmount:
            action === "TOP_UP"
              ? { increment: amount }
              : { decrement: amount },
        },
        select: {
          availableAmount: true,
          currency: true,
        },
      });

      const budgetTransaction = await tx.aiManagerBudgetTransaction.create({
        data: {
          aiManagerAccountId: existing.id,
          creatorProfileId: creator.id,
          direction: action === "TOP_UP" ? "CREDIT" : "DEBIT",
          transactionType:
            action === "TOP_UP" ? "OWNER_TOP_UP" : "OWNER_DEDUCTION",
          currency: updatedBalance.currency,
          amount,
          resultingAvailableAmount: updatedBalance.availableAmount,
          note,
          actorAddress: ownerSession.address,
        },
        select: {
          id: true,
        },
      });

      if (fundingEvidenceId) {
        await tx.aiManagerFundingEvidence.update({
          where: {
            id: fundingEvidenceId,
          },
          data: {
            status: "MATCHED_TO_LEDGER",
            matchedBudgetTransactionId: budgetTransaction.id,
            matchedAt: new Date(),
          },
        });
      }
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
        amount: amount.toString(),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "AI_MANAGER_BUDGET_NOTE_INVALID":
        case "AI_MANAGER_FUNDING_EVIDENCE_ID_INVALID":
          return errJson(error.message, 400);
        case "AI_MANAGER_FUNDING_EVIDENCE_NOT_FOUND":
          return errJson(error.message, 404);
        case "AI_MANAGER_FUNDING_EVIDENCE_ALREADY_MATCHED":
        case "AI_MANAGER_FUNDING_EVIDENCE_AMOUNT_MISMATCH":
          return errJson(error.message, 409);
        default:
          break;
      }
    }
    console.error("CREATOR_AI_MANAGER_BUDGET_POST_FAILED", error);
    return errJson("CREATOR_AI_MANAGER_BUDGET_POST_FAILED", 500);
  }
}
