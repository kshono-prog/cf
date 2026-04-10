import { NextRequest } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toOptionalString } from "@/lib/api/guards";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import {
  buildCreatorProfileQrTargetUrl,
  resolveCreatorProfileQrCodePersistence,
} from "@/lib/profileQrCodeServer";
import { prisma } from "@/lib/prisma";
import { withPrismaRetry } from "@/lib/prismaRetry";
import { resolveBaseUrlFromHeaders } from "@/utils/baseUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json().catch(() => null);
    if (!isRecord(body)) {
      return errJson("INVALID_JSON", 400);
    }

    const ownerSession = await requireOwnerSessionFromBody(req, body, ["address"]);
    if (!ownerSession.ok) {
      return ownerSession.response;
    }

    const force = body.force === true;
    const creator = await withPrismaRetry(() =>
      prisma.creatorProfile.findUnique({
        where: { walletAddress: ownerSession.address },
        select: {
          id: true,
          username: true,
          qrcodeUrl: true,
        },
      })
    );

    if (!creator) {
      return errJson("CREATOR_NOT_FOUND", 404);
    }

    const persistence = resolveCreatorProfileQrCodePersistence({
      username: creator.username,
      currentQrcodeUrl: creator.qrcodeUrl,
      force,
    });

    if (persistence.shouldPersist) {
      await withPrismaRetry(() =>
        prisma.creatorProfile.update({
          where: { id: creator.id },
          data: { qrcodeUrl: persistence.qrcodeUrl },
        })
      );
    }

    const baseUrl = resolveBaseUrlFromHeaders(req.headers);
    const targetUrl = buildCreatorProfileQrTargetUrl({
      username: creator.username,
      baseUrl,
    });

    return okJson({
      qrcodeUrl: persistence.qrcodeUrl,
      reused: persistence.reused,
      targetUrl,
      username: creator.username,
      address: toOptionalString(body.address) ?? ownerSession.address,
    });
  } catch (error: unknown) {
    console.error("CREATOR_QRCODE_ENSURE_FAILED", error);
    return errJson(
      "CREATOR_QRCODE_ENSURE_FAILED",
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
