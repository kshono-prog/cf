import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  errMyPageMutationResponse,
  okMyPageMutationResponse,
} from "@/lib/mypageApiResponses";
import { requireOwnerSession } from "@/lib/ownerAuthSession";

export const dynamic = "force-dynamic";

function asAddress(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const normalized = input.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errMyPageMutationResponse("INVALID_JSON", 400);
    }

    const walletAddress = asAddress((body as { address?: unknown }).address);
    if (!walletAddress) {
      return errMyPageMutationResponse("ADDRESS_REQUIRED", 400);
    }
    const ownerSession = await requireOwnerSession(req, walletAddress);
    if (!ownerSession.ok) return ownerSession.response;

    const creator = await prisma.creatorProfile.findUnique({
      where: { walletAddress },
      select: {
        id: true,
        status: true,
      },
    });

    if (!creator) {
      return errMyPageMutationResponse("USER_PROFILE_NOT_FOUND", 404);
    }

    if (creator.status !== "PUBLISHED") {
      await prisma.creatorProfile.update({
        where: { id: creator.id },
        data: { status: "PUBLISHED" },
      });
    }

    return okMyPageMutationResponse(walletAddress);
  } catch (e: unknown) {
    console.error("CREATOR_APPLY_ERROR", e);
    return errMyPageMutationResponse(
      "CREATOR_APPLY_FAILED",
      500,
      e instanceof Error ? e.message : String(e)
    );
  }
}
