import { NextRequest, NextResponse } from "next/server";

import { errJson, okJson } from "@/lib/api/responses";
import {
  isRecord,
  normalizeAddress,
  toBigIntOrThrow,
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
  serializeExternalContact,
} from "@/lib/managerDesk/server";
import { requireOwnerSessionFromBody } from "@/lib/ownerAuthSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { contactId: string };

type PatchBody = {
  address?: unknown;
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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<Params> }
): Promise<NextResponse> {
  try {
    const { contactId } = await ctx.params;
    if (!contactId) return errJson("CONTACT_ID_REQUIRED", 400);

    const raw: unknown = await req.json().catch(() => null);
    if (!isRecord(raw)) return errJson("INVALID_JSON", 400);
    const body = raw as PatchBody;

    const ownerSession = await requireOwnerSessionFromBody(req, raw);
    if (!ownerSession.ok) return ownerSession.response;

    const current = await prisma.externalContact.findUnique({
      where: { id: contactId },
    });
    if (!current) return errJson("EXTERNAL_CONTACT_NOT_FOUND", 404);
    if (!current.creatorProfileId) {
      return errJson("EXTERNAL_CONTACT_CREATOR_NOT_SET", 400);
    }

    const access = await requireCreatorAccess({
      creatorProfileId: current.creatorProfileId,
      address: ownerSession.address,
    });
    if (!access.ok) return errJson(access.error, access.status);

    const ownerManagerAssignmentId = toOptionalNullableString(
      body.ownerManagerAssignmentId
    );
    if (
      body.ownerManagerAssignmentId !== undefined &&
      ownerManagerAssignmentId === undefined
    ) {
      return errJson("OWNER_MANAGER_ASSIGNMENT_ID_INVALID", 400);
    }

    const projectIdRaw = toOptionalNullableString(body.projectId);
    const projectId =
      projectIdRaw === undefined
        ? undefined
        : projectIdRaw === null
        ? null
        : toBigIntOrThrow(projectIdRaw, "PROJECT_ID_INVALID");

    const contactType =
      body.contactType === undefined
        ? undefined
        : toExternalContactType(body.contactType);
    if (body.contactType !== undefined && !contactType) {
      return errJson("CONTACT_TYPE_INVALID", 400);
    }

    const status =
      body.status === undefined
        ? undefined
        : toExternalContactStatus(body.status);
    if (body.status !== undefined && !status) {
      return errJson("STATUS_INVALID", 400);
    }

    const temperature =
      body.temperature === undefined
        ? undefined
        : toContactTemperature(body.temperature);
    if (body.temperature !== undefined && !temperature) {
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
      body.sourceType === undefined
        ? undefined
        : toExternalContactSourceType(body.sourceType);
    if (body.sourceType !== undefined && !sourceType) {
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

    const isArchived = toOptionalBoolean(body.isArchived);
    if (body.isArchived !== undefined && isArchived === undefined) {
      return errJson("IS_ARCHIVED_INVALID", 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (ownerManagerAssignmentId !== undefined && ownerManagerAssignmentId !== null) {
        const assignment = await tx.managerAssignment.findUnique({
          where: { id: ownerManagerAssignmentId },
        });
        if (
          !assignment ||
          assignment.creatorProfileId !== current.creatorProfileId ||
          (access.role === "MANAGER" &&
            assignment.managerWalletAddress !== normalizeAddress(ownerSession.address))
        ) {
          throw new Error("MANAGER_ASSIGNMENT_INVALID");
        }
      }

      if (projectId !== undefined && projectId !== null) {
        const project = await tx.project.findFirst({
          where: {
            id: projectId,
            creatorProfileId: current.creatorProfileId,
          },
          select: { id: true },
        });
        if (!project) throw new Error("PROJECT_NOT_FOUND_OR_FORBIDDEN");
      }

      const contact = await tx.externalContact.update({
        where: { id: contactId },
        data: {
          ...(ownerManagerAssignmentId !== undefined
            ? { ownerManagerAssignmentId }
            : {}),
          ...(projectId !== undefined ? { projectId } : {}),
          ...(contactType ? { contactType } : {}),
          ...(toOptionalNullableString(body.organizationName) !== undefined
            ? {
                organizationName:
                  toOptionalNullableString(body.organizationName) ??
                  current.organizationName,
              }
            : {}),
          ...(toOptionalNullableString(body.personName) !== undefined
            ? { personName: toOptionalNullableString(body.personName) }
            : {}),
          ...(toOptionalNullableString(body.roleTitle) !== undefined
            ? { roleTitle: toOptionalNullableString(body.roleTitle) }
            : {}),
          ...(toOptionalNullableString(body.email) !== undefined
            ? { email: toOptionalNullableString(body.email) }
            : {}),
          ...(toOptionalNullableString(body.phone) !== undefined
            ? { phone: toOptionalNullableString(body.phone) }
            : {}),
          ...(toOptionalNullableString(body.websiteUrl) !== undefined
            ? { websiteUrl: toOptionalNullableString(body.websiteUrl) }
            : {}),
          ...(toOptionalNullableString(body.socialUrl) !== undefined
            ? { socialUrl: toOptionalNullableString(body.socialUrl) }
            : {}),
          ...(toOptionalNullableString(body.locationText) !== undefined
            ? { locationText: toOptionalNullableString(body.locationText) }
            : {}),
          ...(status ? { status } : {}),
          ...(temperature ? { temperature } : {}),
          ...(lastContactAt !== undefined ? { lastContactAt } : {}),
          ...(toOptionalNullableString(body.nextAction) !== undefined
            ? { nextAction: toOptionalNullableString(body.nextAction) }
            : {}),
          ...(nextActionDueAt !== undefined ? { nextActionDueAt } : {}),
          ...(toOptionalNullableString(body.notes) !== undefined
            ? { notes: toOptionalNullableString(body.notes) }
            : {}),
          ...(tags !== undefined ? { tags } : {}),
          ...(sourceType ? { sourceType } : {}),
          ...(toOptionalNullableString(body.sourceRef) !== undefined
            ? { sourceRef: toOptionalNullableString(body.sourceRef) }
            : {}),
          ...(relationshipStrengthScore !== undefined
            ? { relationshipStrengthScore }
            : {}),
          ...(toOptionalNullableString(body.lastOutcome) !== undefined
            ? { lastOutcome: toOptionalNullableString(body.lastOutcome) }
            : {}),
          ...(isArchived !== undefined ? { isArchived } : {}),
          ownerManagerWalletAddress: ownerSession.address,
        },
      });

      await appendActionLogTx(tx, {
        creatorProfileId: contact.creatorProfileId,
        projectId: contact.projectId,
        managerAssignmentId: contact.ownerManagerAssignmentId,
        actorType: access.role === "MANAGER" ? "MANAGER" : "CREATOR",
        actorWalletAddress: ownerSession.address,
        actionType: "CONTACT_UPDATED",
        title: contact.organizationName,
        targetEntityType: "EXTERNAL_CONTACT",
        targetEntityId: contact.id,
        summary: "External contact updated.",
        metadataJson: {
          contactType: contact.contactType,
          status: contact.status,
          temperature: contact.temperature,
          isArchived: contact.isArchived,
        },
        visibility: "INTERNAL",
      });

      return contact;
    });

    return okJson({
      contact: serializeExternalContact(updated),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "PROJECT_ID_INVALID") {
      return errJson("PROJECT_ID_INVALID", 400);
    }
    if (message === "PROJECT_NOT_FOUND_OR_FORBIDDEN") {
      return errJson("PROJECT_NOT_FOUND_OR_FORBIDDEN", 404);
    }
    if (message === "MANAGER_ASSIGNMENT_INVALID") {
      return errJson("MANAGER_ASSIGNMENT_INVALID", 400);
    }
    console.error("EXTERNAL_CONTACT_PATCH_FAILED", error);
    return errJson("EXTERNAL_CONTACT_PATCH_FAILED", 500);
  }
}
