import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  normalizeAddress,
  toBigIntOrThrow,
  toNonEmptyString,
} from "@/lib/api/guards";
import {
  toContactTemperature,
  toExternalContactSourceType,
  toExternalContactStatus,
  toExternalContactType,
} from "@/lib/managerDesk/contracts";
import {
  appendActionLogTx,
  requireCreatorAccess,
  resolveCreatorProfileIdByAddress,
  serializeExternalContact,
} from "@/lib/managerDesk/server";
import {
  requireOwnerSessionFromBody,
  requireOwnerSessionFromSearchParams,
} from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PostBody = {
  address?: unknown;
  creatorProfileId?: unknown;
  ownerManagerAssignmentId?: unknown;
  projectId?: unknown;
  contactType?: unknown;
  organizationName?: unknown;
  personName?: unknown;
  roleTitle?: unknown;
  email?: unknown;
  phone?: unknown;
  websiteUrl?: unknown;
  socialUrl?: unknown;
  locationText?: unknown;
  status?: unknown;
  temperature?: unknown;
  lastContactAt?: unknown;
  nextAction?: unknown;
  nextActionDueAt?: unknown;
  notes?: unknown;
  tags?: unknown;
  sourceType?: unknown;
  sourceRef?: unknown;
  relationshipStrengthScore?: unknown;
  lastOutcome?: unknown;
  isArchived?: unknown;
};

function parseCreatorProfileId(raw: string): bigint {
  return toBigIntOrThrow(raw, "CREATOR_PROFILE_ID_INVALID");
}

function toOptionalNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return undefined;
  return value;
}

function toOptionalScore(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const truncated = Math.trunc(value);
  if (truncated < 1 || truncated > 5) return undefined;
  return truncated;
}

function toOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return undefined;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    items.push(trimmed);
  }
  return items;
}

function toFlag(value: string | null): boolean {
  return value === "1" || value === "true";
}

function toLimit(value: string | null): number {
  if (!value) return 50;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  const truncated = Math.trunc(numeric);
  if (truncated < 1) return 1;
  if (truncated > 100) return 100;
  return truncated;
}

async function resolveTargetCreatorProfileId(
  address: string,
  creatorProfileIdRaw: string | null
): Promise<bigint | null> {
  if (creatorProfileIdRaw) {
    return parseCreatorProfileId(creatorProfileIdRaw);
  }
  return resolveCreatorProfileIdByAddress(address);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const ownerSession = await requireOwnerSessionFromSearchParams(
      req,
      searchParams
    );
    if (!ownerSession.ok) return ownerSession.response;

    const targetCreatorProfileId = await resolveTargetCreatorProfileId(
      ownerSession.address,
      toNonEmptyString(searchParams.get("creatorProfileId"))
    );
    if (!targetCreatorProfileId) {
      return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId: targetCreatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const statusRaw = searchParams.get("status");
    const status =
      statusRaw == null ? null : toExternalContactStatus(statusRaw);
    if (statusRaw && !status) return errJson("STATUS_INVALID", 400);

    const contactTypeRaw = searchParams.get("contactType");
    const contactType =
      contactTypeRaw == null ? null : toExternalContactType(contactTypeRaw);
    if (contactTypeRaw && !contactType) {
      return errJson("CONTACT_TYPE_INVALID", 400);
    }

    const includeArchived = toFlag(searchParams.get("includeArchived"));

    const rows = await prisma.externalContact.findMany({
      where: {
        creatorProfileId: targetCreatorProfileId,
        ...(status ? { status } : {}),
        ...(contactType ? { contactType } : {}),
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [
        { nextActionDueAt: "asc" },
        { updatedAt: "desc" },
      ],
      take: toLimit(searchParams.get("limit")),
    });

    return okJson({
      contacts: rows.map(serializeExternalContact),
      count: rows.length,
      accessRole: access.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    console.error("EXTERNAL_CONTACTS_GET_FAILED", error);
    return errJson("EXTERNAL_CONTACTS_GET_FAILED", 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PostBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const targetCreatorProfileId = await resolveTargetCreatorProfileId(
      ownerSession.address,
      toNonEmptyString(body.creatorProfileId)
    );
    if (!targetCreatorProfileId) {
      return errJson("CREATOR_PROFILE_ID_REQUIRED", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId: targetCreatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const contactType = toExternalContactType(body.contactType);
    if (!contactType) return errJson("CONTACT_TYPE_INVALID", 400);

    const organizationName = toNonEmptyString(body.organizationName);
    if (!organizationName) return errJson("ORGANIZATION_NAME_REQUIRED", 400);

    const ownerManagerAssignmentId =
      toOptionalNullableString(body.ownerManagerAssignmentId) ??
      access.managerAssignmentId;
    if (
      body.ownerManagerAssignmentId !== undefined &&
      ownerManagerAssignmentId === undefined
    ) {
      return errJson("OWNER_MANAGER_ASSIGNMENT_ID_INVALID", 400);
    }

    const projectIdRaw = toOptionalNullableString(body.projectId);
    const projectId =
      projectIdRaw === undefined
        ? null
        : projectIdRaw === null
        ? null
        : toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");

    const status = toExternalContactStatus(body.status) ?? "NEW";
    if (body.status !== undefined && !toExternalContactStatus(body.status)) {
      return errJson("STATUS_INVALID", 400);
    }

    const temperature = toContactTemperature(body.temperature) ?? "UNKNOWN";
    if (
      body.temperature !== undefined &&
      !toContactTemperature(body.temperature)
    ) {
      return errJson("TEMPERATURE_INVALID", 400);
    }

    const lastContactAt = toOptionalDate(body.lastContactAt);
    if (body.lastContactAt !== undefined && lastContactAt === undefined) {
      return errJson("LAST_CONTACT_AT_INVALID", 400);
    }

    const nextActionDueAt = toOptionalDate(body.nextActionDueAt);
    if (body.nextActionDueAt !== undefined && nextActionDueAt === undefined) {
      return errJson("NEXT_ACTION_DUE_AT_INVALID", 400);
    }

    const tags = toOptionalStringArray(body.tags);
    if (body.tags !== undefined && tags === undefined) {
      return errJson("TAGS_INVALID", 400);
    }

    const sourceType =
      toExternalContactSourceType(body.sourceType) ?? "MANUAL";
    if (
      body.sourceType !== undefined &&
      !toExternalContactSourceType(body.sourceType)
    ) {
      return errJson("SOURCE_TYPE_INVALID", 400);
    }

    const relationshipStrengthScore = toOptionalScore(
      body.relationshipStrengthScore
    );
    if (
      body.relationshipStrengthScore !== undefined &&
      relationshipStrengthScore === undefined
    ) {
      return errJson("RELATIONSHIP_STRENGTH_SCORE_INVALID", 400);
    }

    const isArchived = toOptionalBoolean(body.isArchived) ?? false;
    if (body.isArchived !== undefined && toOptionalBoolean(body.isArchived) === undefined) {
      return errJson("IS_ARCHIVED_INVALID", 400);
    }

    const created = await prisma.$transaction(async (tx) => {
      if (ownerManagerAssignmentId) {
        const assignment = await tx.managerAssignment.findUnique({
          where: { id: ownerManagerAssignmentId },
        });
        if (
          !assignment ||
          assignment.creatorProfileId !== targetCreatorProfileId ||
          (access.role === "MANAGER" &&
            assignment.managerWalletAddress !== normalizeAddress(ownerSession.address))
        ) {
          throw new Error("MANAGER_ASSIGNMENT_INVALID");
        }
      }

      if (projectId) {
        const project = await tx.project.findFirst({
          where: {
            id: projectId,
            creatorProfileId: targetCreatorProfileId,
          },
          select: { id: true },
        });
        if (!project) throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
      }

      const contact = await tx.externalContact.create({
        data: {
          creatorProfileId: targetCreatorProfileId,
          ownerManagerWalletAddress: ownerSession.address,
          ownerManagerAssignmentId,
          projectId,
          contactType,
          organizationName,
          personName: toOptionalNullableString(body.personName) ?? null,
          roleTitle: toOptionalNullableString(body.roleTitle) ?? null,
          email: toOptionalNullableString(body.email) ?? null,
          phone: toOptionalNullableString(body.phone) ?? null,
          websiteUrl: toOptionalNullableString(body.websiteUrl) ?? null,
          socialUrl: toOptionalNullableString(body.socialUrl) ?? null,
          locationText: toOptionalNullableString(body.locationText) ?? null,
          status,
          temperature,
          lastContactAt: lastContactAt ?? null,
          nextAction: toOptionalNullableString(body.nextAction) ?? null,
          nextActionDueAt: nextActionDueAt ?? null,
          notes: toOptionalNullableString(body.notes) ?? null,
          tags: tags ?? [],
          sourceType,
          sourceRef: toOptionalNullableString(body.sourceRef) ?? null,
          relationshipStrengthScore: relationshipStrengthScore ?? null,
          lastOutcome: toOptionalNullableString(body.lastOutcome) ?? null,
          isArchived,
        },
      });

      await appendActionLogTx(tx, {
        creatorProfileId: targetCreatorProfileId,
        projectId,
        managerAssignmentId: ownerManagerAssignmentId,
        actorType: access.role === "MANAGER" ? "MANAGER" : "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType: "CONTACT_CREATED",
        title: organizationName,
        targetEntityType: "EXTERNAL_CONTACT",
        targetEntityId: contact.id,
        summary: `${contactType} contact created.`,
        metadataJson: {
          contactType,
          status,
          temperature,
        },
        visibility: "INTERNAL",
      });

      return contact;
    });

    return okJson(
      {
        created: true,
        contact: serializeExternalContact(created),
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "CREATOR_PROFILE_ID_INVALID") {
      return errJson("CREATOR_PROFILE_ID_INVALID", 400);
    }
    if (message === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    if (message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "MANAGER_ASSIGNMENT_INVALID") {
      return errJson("MANAGER_ASSIGNMENT_INVALID", 400);
    }
    console.error("EXTERNAL_CONTACTS_POST_FAILED", error);
    return errJson("EXTERNAL_CONTACTS_POST_FAILED", 500);
  }
}
