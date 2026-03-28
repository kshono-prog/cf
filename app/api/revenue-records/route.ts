import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import { isRecord, toBigIntOrThrow, toNonEmptyString } from "@/lib/api/guards";
import {
  requireCreatorAccess,
  resolveCreatorProfileIdByAddress,
} from "@/lib/managerDesk/server";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REVENUE_SOURCES = [
  "CONTRIBUTION",
  "MERCHANDISE",
  "EVENT",
  "BRAND_DEAL",
  "GRANT",
  "ROYALTY",
  "OTHER",
] as const;

type RevenueSource = (typeof REVENUE_SOURCES)[number];

function toRevenueSource(value: unknown): RevenueSource | null {
  if (typeof value !== "string") return null;
  return REVENUE_SOURCES.includes(value as RevenueSource)
    ? (value as RevenueSource)
    : null;
}

function toPositiveDecimal(value: unknown): string | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
}

function toIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toLimit(value: string | null): number {
  if (!value) return 50;
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1) return 50;
  return Math.min(n, 100);
}

function serializeRevenueRecord(row: {
  id: string;
  creatorProfileId: bigint;
  projectId: bigint | null;
  source: string;
  amountDecimal: { toString(): string };
  currency: string;
  occurredAt: Date;
  title: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    projectId: row.projectId?.toString() ?? null,
    source: row.source,
    amountDecimal: row.amountDecimal.toString(),
    currency: row.currency,
    occurredAt: row.occurredAt.toISOString(),
    title: row.title,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(req, searchParams);
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileIdRaw = toNonEmptyString(searchParams.get("creatorProfileId"));
    let creatorProfileId: bigint | null = null;
    if (creatorProfileIdRaw) {
      try {
        creatorProfileId = toBigIntOrThrow(creatorProfileIdRaw, "CREATOR_PROFILE_ID_INVALID");
      } catch {
        return errJson("CREATOR_PROFILE_ID_INVALID", 400);
      }
    } else {
      creatorProfileId = await resolveCreatorProfileIdByAddress(ownerSession.address);
    }
    if (!creatorProfileId) return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);

    const access = await requireCreatorAccess({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const rows = await prisma.revenueRecord.findMany({
      where: { creatorProfileId },
      orderBy: { occurredAt: "desc" },
      take: toLimit(searchParams.get("limit")),
    });

    return okJson({ revenueRecords: rows.map(serializeRevenueRecord), count: rows.length });
  } catch (error) {
    console.error("REVENUE_RECORDS_GET_FAILED", error);
    return errJson("REVENUE_RECORDS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const creatorProfileIdRaw = toNonEmptyString(raw.creatorProfileId);
    let creatorProfileId: bigint | null = null;
    if (creatorProfileIdRaw) {
      try {
        creatorProfileId = toBigIntOrThrow(creatorProfileIdRaw, "CREATOR_PROFILE_ID_INVALID");
      } catch {
        return errJson("CREATOR_PROFILE_ID_INVALID", 400);
      }
    } else {
      creatorProfileId = await resolveCreatorProfileIdByAddress(ownerSession.address);
    }
    if (!creatorProfileId) return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);

    const access = await requireCreatorAccess({
      creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const title = toNonEmptyString(raw.title);
    if (!title) return errJson("TITLE_REQUIRED", 400);

    const amountStr = toPositiveDecimal(raw.amountDecimal);
    if (!amountStr) return errJson("AMOUNT_INVALID", 400);

    const occurredAt = toIsoDate(raw.occurredAt);
    if (!occurredAt) return errJson("OCCURRED_AT_INVALID", 400);

    const source = toRevenueSource(raw.source) ?? "OTHER";
    const currency = toNonEmptyString(raw.currency) ?? "JPY";
    const note = toNonEmptyString(raw.note) ?? null;

    const projectIdRaw = toNonEmptyString(raw.projectId);
    let projectId: bigint | null = null;
    if (projectIdRaw) {
      try {
        projectId = toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");
      } catch {
        return errJson("PROJECT_ID_INVALID", 400);
      }
    }

    const created = await prisma.revenueRecord.create({
      data: {
        creatorProfileId,
        projectId,
        source,
        amountDecimal: amountStr,
        currency,
        occurredAt,
        title,
        note,
      },
    });

    return okJson({ created: true, revenueRecord: serializeRevenueRecord(created) }, 201);
  } catch (error) {
    console.error("REVENUE_RECORDS_POST_FAILED", error);
    return errJson("REVENUE_RECORDS_POST_FAILED", 500);
  }
}
