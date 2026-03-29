import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAddress, isAddress, isHash } from "viem";

import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import { isRecord } from "@/lib/api/guards";
import { AI_MANAGER_ACCOUNT_SELECT } from "@/lib/aiManager/accountReadModel";
import { findCreatorByOwnerAddress } from "@/lib/aiManager/ownerAccess";
import { getAiManagerReconciliationSummary } from "@/lib/aiManager/reconciliation";
import { getAiManagerBillingEnv } from "@/lib/env";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { serializeAiManagerAccount } from "@/lib/serializers/aiManager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FundingEvidenceBody = {
  address?: unknown;
  txHash?: unknown;
  amount?: unknown;
  note?: unknown;
  fromWalletAddress?: unknown;
};

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

function parseRequiredTxHash(value: unknown): `0x${string}` {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_REQUIRED");
  }
  const trimmed = value.trim();
  if (!isHash(trimmed)) {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_INVALID");
  }
  return trimmed;
}

function parseOptionalNote(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_NOTE_INVALID");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > 240) {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_NOTE_INVALID");
  }
  return trimmed;
}

function parseOptionalAddress(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_FROM_WALLET_INVALID");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!isAddress(trimmed, { strict: false })) {
    throw new Error("AI_MANAGER_FUNDING_EVIDENCE_FROM_WALLET_INVALID");
  }
  return getAddress(trimmed);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as FundingEvidenceBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const txHash = parseRequiredTxHash(body.txHash);
    const amount = parseBudgetAmount(body.amount);
    if (!amount) {
      return errJson("AI_MANAGER_FUNDING_EVIDENCE_AMOUNT_INVALID", 400);
    }
    const note = parseOptionalNote(body.note);
    const fromWalletAddress = parseOptionalAddress(body.fromWalletAddress);

    const creator = await findCreatorByOwnerAddress(ownerSession.address);
    if (!creator) return errJson("CREATOR_NOT_FOUND", 404);

    const account = await prisma.aiManagerAccount.findUnique({
      where: { creatorProfileId: creator.id },
      select: {
        id: true,
        budgetWalletAddress: true,
        billingPolicy: {
          select: {
            currency: true,
          },
        },
      },
    });
    if (!account) {
      return errJson("AI_MANAGER_NOT_FOUND", 404);
    }
    if (!account.budgetWalletAddress) {
      return errJson("AI_MANAGER_BUDGET_WALLET_REQUIRED", 409);
    }

    const duplicate = await prisma.aiManagerFundingEvidence.findUnique({
      where: {
        txHash,
      },
      select: {
        id: true,
      },
    });
    if (duplicate) {
      return errJson("AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_DUPLICATE", 409);
    }

    const env = getAiManagerBillingEnv();

    await prisma.aiManagerFundingEvidence.create({
      data: {
        aiManagerAccountId: account.id,
        creatorProfileId: creator.id,
        status: "SELF_REPORTED",
        chainId: env.platformOperationsChainId,
        currency: account.billingPolicy?.currency ?? "JPYC",
        amount,
        txHash,
        fromWalletAddress,
        toWalletAddress: account.budgetWalletAddress,
        reportedByAddress: ownerSession.address,
        note,
      },
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
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_REQUIRED":
        case "AI_MANAGER_FUNDING_EVIDENCE_TX_HASH_INVALID":
        case "AI_MANAGER_FUNDING_EVIDENCE_NOTE_INVALID":
        case "AI_MANAGER_FUNDING_EVIDENCE_FROM_WALLET_INVALID":
          return errJson(error.message, 400);
        default:
          break;
      }
    }
    console.error("CREATOR_AI_MANAGER_FUNDING_EVIDENCE_POST_FAILED", error);
    return errJson("CREATOR_AI_MANAGER_FUNDING_EVIDENCE_POST_FAILED", 500);
  }
}
