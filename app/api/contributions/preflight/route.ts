import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { isSupportedChainId, type SupportedChainId } from "@/lib/chainConfig";
import { getTokenOnChain } from "@/lib/tokenRegistry";
import { isUuidString } from "@/lib/social";

export const dynamic = "force-dynamic";

type Currency = "JPYC" | "USDC";

type ContributionPreflightBody = {
  projectId?: unknown;
  purposeId?: unknown;
  postId?: unknown;
  chainId?: unknown;
  currency?: unknown;
};

function toCurrency(value: unknown): Currency | null {
  return value === "JPYC" || value === "USDC" ? value : null;
}

function toChainId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function isDbUnavailableError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : null;
    const message = (error.message ?? "").toLowerCase();

    return (
      code === "P2024" ||
      code === "P1017" ||
      code === "P1001" ||
      code === "P1008" ||
      message.includes("timed out fetching a new connection from the connection pool") ||
      message.includes("unable to check out connection from the pool")
    );
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timed out fetching a new connection from the connection pool") ||
      message.includes("unable to check out connection from the pool")
    );
  }

  return false;
}

function parseBody(raw: unknown):
  | {
      ok: true;
      projectIdStr: string;
      purposeIdStr: string | null | undefined;
      postIdStr: string | null | undefined;
      chainId: number;
      currency: Currency;
    }
  | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: "INVALID_JSON" };

  const body = raw as ContributionPreflightBody;
  const projectIdStr = toNonEmptyString(body.projectId);
  if (!projectIdStr) return { ok: false, error: "PROJECT_ID_REQUIRED" };

  let purposeIdStr: string | null | undefined = undefined;
  if (body.purposeId === null) {
    purposeIdStr = null;
  } else if (typeof body.purposeId === "string") {
    const trimmed = body.purposeId.trim();
    purposeIdStr = trimmed.length > 0 ? trimmed : null;
  } else if (typeof body.purposeId !== "undefined") {
    return { ok: false, error: "PURPOSE_ID_INVALID" };
  }

  let postIdStr: string | null | undefined = undefined;
  if (body.postId === null) {
    postIdStr = null;
  } else if (typeof body.postId === "string") {
    const trimmed = body.postId.trim();
    if (trimmed.length === 0) {
      postIdStr = null;
    } else if (!isUuidString(trimmed)) {
      return { ok: false, error: "POST_ID_INVALID" };
    } else {
      postIdStr = trimmed;
    }
  } else if (typeof body.postId !== "undefined") {
    return { ok: false, error: "POST_ID_INVALID" };
  }

  const chainId = toChainId(body.chainId);
  if (chainId == null) return { ok: false, error: "CHAIN_ID_REQUIRED" };

  const currency = toCurrency(body.currency);
  if (!currency) return { ok: false, error: "CURRENCY_REQUIRED" };

  return {
    ok: true,
    projectIdStr,
    purposeIdStr,
    postIdStr,
    chainId,
    currency,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = parseBody(raw);
    if (!parsed.ok) return errJson(parsed.error, 400);

    let projectId: bigint;
    try {
      projectId = toBigIntOrThrow(parsed.projectIdStr, "PROJECT_ID_INVALID");
    } catch {
      return errJson("PROJECT_ID_INVALID", 400);
    }

    if (!isSupportedChainId(parsed.chainId)) {
      return errJson("CHAIN_ID_NOT_ALLOWED", 400);
    }

    if (
      !getTokenOnChain(parsed.currency, parsed.chainId as SupportedChainId)
    ) {
      return errJson("TOKEN_NOT_CONFIGURED_ON_CHAIN", 400);
    }

    const project = await withPrismaRetry(() =>
      prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          currency: true,
          creatorProfileId: true,
          ownerAddress: true,
        },
      })
    );

    if (!project) return errJson("PROJECT_NOT_FOUND", 404);
    if (project.currency !== parsed.currency) {
      return errJson("PROJECT_CURRENCY_MISMATCH", 400);
    }

    if (typeof parsed.purposeIdStr === "string") {
      let purposeId: bigint;
      try {
        purposeId = toBigIntOrThrow(parsed.purposeIdStr, "PURPOSE_ID_INVALID");
      } catch {
        return errJson("PURPOSE_ID_INVALID", 400);
      }

      const purpose = await withPrismaRetry(() =>
        prisma.purpose.findUnique({
          where: { id: purposeId },
          select: { id: true, projectId: true },
        })
      );

      if (!purpose) return errJson("PURPOSE_NOT_FOUND", 404);
      if (purpose.projectId !== projectId) {
        return errJson("PURPOSE_PROJECT_MISMATCH", 400);
      }
    }

    if (parsed.postIdStr) {
      const postId = parsed.postIdStr;
      const post = await withPrismaRetry(() =>
        prisma.post.findUnique({
          where: { id: postId },
          select: {
            id: true,
            creatorProfileId: true,
            projectId: true,
            creatorProfile: {
              select: { walletAddress: true },
            },
          },
        })
      );

      if (!post) return errJson("POST_NOT_FOUND", 404);

      const projectMatchesCreator =
        (project.creatorProfileId !== null &&
          project.creatorProfileId === post.creatorProfileId) ||
        (project.creatorProfileId === null &&
          typeof project.ownerAddress === "string" &&
          typeof post.creatorProfile.walletAddress === "string" &&
          project.ownerAddress.toLowerCase() ===
            post.creatorProfile.walletAddress.toLowerCase());

      if (!projectMatchesCreator) {
        return errJson("POST_PROJECT_CREATOR_MISMATCH", 400);
      }

      if (post.projectId !== null && post.projectId !== projectId) {
        return errJson("POST_PROJECT_MISMATCH", 400);
      }
    }

    return okJson({
      ready: true,
      projectId: project.id.toString(),
      currency: parsed.currency,
      chainId: parsed.chainId,
    });
  } catch (error) {
    if (isDbUnavailableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: "DB_UNAVAILABLE",
          message:
            "現在サーバーが混み合っているため、送金後の記録を保証できません。時間をおいてもう一度お試しください。",
        },
        { status: 503 }
      );
    }

    console.error("CONTRIBUTION_PREFLIGHT_FAILED", error);
    return errJson("CONTRIBUTION_PREFLIGHT_FAILED", 500);
  }
}
