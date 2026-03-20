import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isPrismaUnavailableError, withPrismaRetry } from "@/lib/prismaRetry";
import { errJson, jsonResponse, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import { isSupportedChainId, type SupportedChainId } from "@/lib/chainConfig";
import { getTokenOnChain } from "@/lib/tokenRegistry";
import { isUuidString } from "@/lib/social";

import { toCurrency, type CurrencyCode } from "@/lib/currencyUtils";

export const dynamic = "force-dynamic";

type Currency = CurrencyCode;

type ContributionPreflightBody = {
  projectId?: unknown;
  purposeId?: unknown;
  postId?: unknown;
  chainId?: unknown;
  currency?: unknown;
  fromAddress?: unknown;
  toAddress?: unknown;
  amount?: unknown;
  amountRaw?: unknown;
  decimals?: unknown;
};

function toChainId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function normalizeTo18(amountHuman: string): string {
  const sanitized = amountHuman.replace(/[^\d.]/g, "");
  if (!sanitized) return "0.000000000000000000";

  const [intRaw, decimalRaw = ""] = sanitized.split(".");
  const intPart = intRaw.length > 0 ? intRaw : "0";
  const decimalPart = (decimalRaw + "0".repeat(18)).slice(0, 18);

  let normalizedInt = "0";
  try {
    normalizedInt = String(BigInt(intPart));
  } catch {
    normalizedInt = "0";
  }

  return `${normalizedInt}.${decimalPart}`;
}

function parseBody(raw: unknown):
  | {
      ok: true;
      projectIdStr: string;
      purposeIdStr: string | null | undefined;
      postIdStr: string | null | undefined;
      chainId: number;
      currency: Currency;
      fromAddress: string;
      toAddress: string;
      amountHuman: string;
      amountRaw: string;
      decimals: number;
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

  const fromAddress = toNonEmptyString(body.fromAddress);
  if (!fromAddress) return { ok: false, error: "FROM_ADDRESS_REQUIRED" };

  const toAddress = toNonEmptyString(body.toAddress);
  if (!toAddress) return { ok: false, error: "TO_ADDRESS_REQUIRED" };

  const amountHuman = toNonEmptyString(body.amount);
  if (!amountHuman) return { ok: false, error: "AMOUNT_REQUIRED" };

  const amountRaw = toNonEmptyString(body.amountRaw);
  if (!amountRaw) return { ok: false, error: "AMOUNT_RAW_REQUIRED" };

  if (typeof body.decimals !== "number" || !Number.isFinite(body.decimals)) {
    return { ok: false, error: "DECIMALS_REQUIRED" };
  }

  return {
    ok: true,
    projectIdStr,
    purposeIdStr,
    postIdStr,
    chainId,
    currency,
    fromAddress,
    toAddress,
    amountHuman,
    amountRaw,
    decimals: body.decimals,
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

    const reservationKey = `reserved:${crypto.randomUUID()}`;
    const reserved = await withPrismaRetry(() =>
      prisma.contribution.create({
        data: {
          projectId,
          purposeId:
            parsed.purposeIdStr === null
              ? null
              : typeof parsed.purposeIdStr === "string"
              ? BigInt(parsed.purposeIdStr)
              : null,
          chainId: parsed.chainId,
          currency: parsed.currency,
          txHash: reservationKey,
          fromAddress: parsed.fromAddress,
          toAddress: parsed.toAddress,
          amountRaw: parsed.amountRaw,
          decimals: parsed.decimals,
          amountDecimal: normalizeTo18(parsed.amountHuman),
          status: "RESERVED",
          confirmedAt: null,
        },
        select: {
          id: true,
          projectId: true,
        },
      })
    );

    return okJson({
      ready: true,
      contributionId: reserved.id,
      projectId: reserved.projectId.toString(),
      currency: parsed.currency,
      chainId: parsed.chainId,
    });
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      return jsonResponse(
        {
          ok: false,
          error: "DB_UNAVAILABLE",
          message:
            "現在サーバーが混み合っているため、送金後の記録を保証できません。時間をおいてもう一度お試しください。",
        },
        503
      );
    }

    console.error("CONTRIBUTION_PREFLIGHT_FAILED", error);
    return errJson("CONTRIBUTION_PREFLIGHT_FAILED", 500);
  }
}
