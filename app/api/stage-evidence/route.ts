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

const STAGE_IDS = [
  "SEED",
  "EARLY",
  "EMERGING",
  "PROFESSIONALIZING",
  "ESTABLISHED",
] as const;

const EVIDENCE_TYPES = [
  "PERFORMANCE",
  "ACHIEVEMENT",
  "RECOGNITION",
  "CONTRACT",
  "MEDIA",
  "OTHER",
] as const;

type StageId = (typeof STAGE_IDS)[number];
type EvidenceType = (typeof EVIDENCE_TYPES)[number];

function toStageId(value: unknown): StageId | null {
  if (typeof value !== "string") return null;
  return STAGE_IDS.includes(value as StageId) ? (value as StageId) : null;
}

function toEvidenceType(value: unknown): EvidenceType | null {
  if (typeof value !== "string") return null;
  return EVIDENCE_TYPES.includes(value as EvidenceType)
    ? (value as EvidenceType)
    : null;
}

function toIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeStageEvidence(row: {
  id: string;
  creatorProfileId: bigint;
  stageId: string;
  evidenceType: string;
  value: string;
  verifiedAt: Date;
  recordedBy: string | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    stageId: row.stageId,
    evidenceType: row.evidenceType,
    value: row.value,
    verifiedAt: row.verifiedAt.toISOString(),
    recordedBy: row.recordedBy,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
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

    const rows = await prisma.stageEvidence.findMany({
      where: { creatorProfileId },
      orderBy: { verifiedAt: "desc" },
      take: 50,
    });

    return okJson({ stageEvidences: rows.map(serializeStageEvidence), count: rows.length });
  } catch (error) {
    console.error("STAGE_EVIDENCE_GET_FAILED", error);
    return errJson("STAGE_EVIDENCE_GET_FAILED", 500);
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

    const stageId = toStageId(raw.stageId);
    if (!stageId) return errJson("STAGE_ID_INVALID", 400);

    const value = toNonEmptyString(raw.value);
    if (!value) return errJson("VALUE_REQUIRED", 400);

    const verifiedAt = toIsoDate(raw.verifiedAt) ?? new Date();
    const evidenceType = toEvidenceType(raw.evidenceType) ?? "OTHER";
    const notes = toNonEmptyString(raw.notes) ?? null;

    const created = await prisma.stageEvidence.create({
      data: {
        creatorProfileId,
        stageId,
        evidenceType,
        value,
        verifiedAt,
        recordedBy: ownerSession.address,
        notes,
      },
    });

    return okJson({ created: true, stageEvidence: serializeStageEvidence(created) }, 201);
  } catch (error) {
    console.error("STAGE_EVIDENCE_POST_FAILED", error);
    return errJson("STAGE_EVIDENCE_POST_FAILED", 500);
  }
}
