import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { prisma } from "@/lib/prisma";
import { getAiManagerBillingEnv } from "@/lib/env";
import { getTokenOnChain } from "@/lib/tokenRegistry";
import { buildAiManagerFundingInstructions } from "@/lib/aiManager/funding";
import { findCreatorByOwnerAddress } from "@/lib/aiManager/ownerAccess";
import { requireOwnerSessionFromSearchParams } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

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
            preferredRail: true,
          },
        },
      },
    });
    if (!account || !account.billingPolicy) {
      return errJson("AI_MANAGER_NOT_FOUND", 404);
    }

    const env = getAiManagerBillingEnv();
    const token = getTokenOnChain("JPYC", env.platformOperationsChainId);

    return okJson({
      funding: buildAiManagerFundingInstructions({
        aiManagerAccountId: account.id,
        ownerControlWalletAddress: creator.walletAddress ?? null,
        budgetWalletAddress: account.budgetWalletAddress,
        preferredRail: account.billingPolicy.preferredRail,
        currency: account.billingPolicy.currency,
        platformOperationsWalletAddress: env.platformOperationsWalletAddress,
        platformOperationsChainId: env.platformOperationsChainId,
        x402EndpointUrl: env.x402EndpointUrl,
        settlementTokenAddress: token?.address ?? null,
      }),
    });
  } catch (error) {
    console.error("CREATOR_AI_MANAGER_FUNDING_GET_FAILED", error);
    return errJson("CREATOR_AI_MANAGER_FUNDING_GET_FAILED", 500);
  }
}
