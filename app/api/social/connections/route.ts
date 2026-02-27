import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  toAddressOrNull,
  toNonEmptyString,
} from "@/lib/api/guards";

export const dynamic = "force-dynamic";

type Platform = "YOUTUBE" | "X" | "INSTAGRAM" | "TIKTOK";

const ALLOWED_PLATFORMS: readonly Platform[] = [
  "YOUTUBE",
  "X",
  "INSTAGRAM",
  "TIKTOK",
] as const;

type PostBody = {
  address?: unknown;
  platform?: unknown;
  accountHandle?: unknown;
  accountId?: unknown;
};

function toPlatform(v: unknown): Platform | null {
  if (typeof v !== "string") return null;
  return ALLOWED_PLATFORMS.includes(v as Platform) ? (v as Platform) : null;
}

function normalizeHandle(input: string): string {
  const s = input.trim();
  return s.startsWith("@") ? s.slice(1) : s;
}

function serializeConnection(row: {
  id: string;
  platform: string;
  accountHandle: string;
  accountId: string | null;
  status: string;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    platform: row.platform,
    accountHandle: row.accountHandle,
    accountId: row.accountId,
    status: row.status,
    tokenExpiresAt: row.tokenExpiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveCreatorProfileIdByAddress(address: string): Promise<bigint | null> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });
  return creator?.id ?? null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const addressRaw = searchParams.get("address");
    const address = toAddressOrNull(addressRaw);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    const profileId = await resolveCreatorProfileIdByAddress(address);
    if (!profileId) return errJson("CREATOR_NOT_FOUND", 404);

    const rows = await prisma.socialConnection.findMany({
      where: { creatorProfileId: profileId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        accountHandle: true,
        accountId: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return okJson({
      connections: rows.map(serializeConnection),
      count: rows.length,
    });
  } catch (e) {
    console.error("SOCIAL_CONNECTIONS_GET_FAILED", e);
    return errJson("SOCIAL_CONNECTIONS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const body = raw as PostBody;

    const address = toAddressOrNull(body.address);
    if (!address) return errJson("ADDRESS_REQUIRED", 400);

    const platform = toPlatform(body.platform);
    if (!platform) return errJson("PLATFORM_INVALID", 400);

    const accountHandleRaw = toNonEmptyString(body.accountHandle);
    if (!accountHandleRaw) return errJson("ACCOUNT_HANDLE_REQUIRED", 400);

    const accountHandle = normalizeHandle(accountHandleRaw);
    if (!accountHandle) return errJson("ACCOUNT_HANDLE_REQUIRED", 400);

    const accountId = toNonEmptyString(body.accountId);

    const profileId = await resolveCreatorProfileIdByAddress(address);
    if (!profileId) return errJson("CREATOR_NOT_FOUND", 404);

    const now = new Date();

    const row = await prisma.socialConnection.upsert({
      where: {
        platform_accountHandle: {
          platform,
          accountHandle,
        },
      },
      create: {
        creatorProfileId: profileId,
        platform,
        accountHandle,
        accountId: accountId ?? null,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      update: {
        creatorProfileId: profileId,
        accountId: accountId ?? null,
        status: "ACTIVE",
        updatedAt: now,
      },
      select: {
        id: true,
        platform: true,
        accountHandle: true,
        accountId: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return okJson({
      created: true,
      connection: serializeConnection(row),
    });
  } catch (e) {
    console.error("SOCIAL_CONNECTIONS_POST_FAILED", e);
    return errJson("SOCIAL_CONNECTIONS_POST_FAILED", 500);
  }
}
