import type {
  ActionActorType,
  ActionLog,
  ActionLogType,
  ActionLogVisibility,
  ActionTargetEntityType,
  ExternalContact,
  ManagerAssignment,
  ManagerNote,
  Meeting,
  MeetingVisibility,
  NoteVisibility,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type ManagerDeskDbClient = Prisma.TransactionClient | typeof prisma;

export type CreatorAccessRole = "CREATOR_OWNER" | "MANAGER";

export type CreatorAccessResult =
  | {
      ok: true;
      creatorProfileId: bigint;
      role: CreatorAccessRole;
      actorWalletAddress: string;
      managerAssignmentId: string | null;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

export type SerializedManagerAssignment = {
  id: string;
  creatorProfileId: string;
  managerWalletAddress: string;
  roleType: ManagerAssignment["roleType"];
  status: ManagerAssignment["status"];
  assignedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedManagerNote = {
  id: string;
  creatorProfileId: string;
  authoredByManagerWalletAddress: string;
  managerAssignmentId: string | null;
  projectId: string | null;
  externalContactId: string | null;
  relatedMeetingId: string | null;
  noteType: ManagerNote["noteType"];
  visibility: ManagerNote["visibility"];
  title: string;
  body: string;
  urgencyScore: number | null;
  followUpNeeded: boolean;
  followUpDueAt: string | null;
  aiSummary: string | null;
  aiTags: string[];
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedExternalContact = {
  id: string;
  creatorProfileId: string | null;
  ownerManagerWalletAddress: string | null;
  ownerManagerAssignmentId: string | null;
  projectId: string | null;
  contactType: ExternalContact["contactType"];
  organizationName: string;
  personName: string | null;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  socialUrl: string | null;
  locationText: string | null;
  status: ExternalContact["status"];
  temperature: ExternalContact["temperature"];
  lastContactAt: string | null;
  nextAction: string | null;
  nextActionDueAt: string | null;
  notes: string | null;
  tags: string[];
  sourceType: ExternalContact["sourceType"];
  sourceRef: string | null;
  relationshipStrengthScore: number | null;
  lastOutcome: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SerializedMeeting = {
  id: string;
  creatorProfileId: string;
  managerAssignmentId: string | null;
  projectId: string | null;
  createdByWalletAddress: string;
  meetingType: Meeting["meetingType"];
  status: Meeting["status"];
  visibility: Meeting["visibility"];
  title: string;
  scheduledAt: string;
  durationMinutes: number | null;
  locationText: string | null;
  agenda: string | null;
  notes: string | null;
  decisions: string | null;
  nextActionsSummary: string | null;
  aiSummary: string | null;
  nextMeetingSuggestionAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedActionLog = {
  id: string;
  creatorProfileId: string | null;
  projectId: string | null;
  managerAssignmentId: string | null;
  actorType: ActionLog["actorType"];
  actorWalletAddress: string | null;
  actionType: ActionLog["actionType"];
  title: string;
  targetEntityType: ActionLog["targetEntityType"];
  targetEntityId: string | null;
  summary: string | null;
  metadataJson: Prisma.JsonValue | null;
  visibility: ActionLog["visibility"];
  occurredAt: string;
  createdAt: string;
};

type AppendActionLogInput = {
  creatorProfileId?: bigint | null;
  projectId?: bigint | null;
  managerAssignmentId?: string | null;
  actorType: ActionActorType;
  actorWalletAddress?: string | null;
  actionType: ActionLogType;
  title: string;
  targetEntityType?: ActionTargetEntityType | null;
  targetEntityId?: string | null;
  summary?: string | null;
  metadataJson?: Prisma.InputJsonValue;
  visibility?: ActionLogVisibility;
  occurredAt?: Date;
};

function isAssignmentCurrentlyActive(assignment: {
  status: ManagerAssignment["status"];
  endedAt: Date | null;
}): boolean {
  if (assignment.status !== "ACTIVE") return false;
  if (!assignment.endedAt) return true;
  return assignment.endedAt.getTime() > Date.now();
}

export async function resolveCreatorProfileIdByAddress(
  address: string,
  db: ManagerDeskDbClient = prisma
): Promise<bigint | null> {
  const creator = await db.creatorProfile.findUnique({
    where: { walletAddress: address.toLowerCase() },
    select: { id: true },
  });
  return creator?.id ?? null;
}

export async function findActiveManagerAssignmentForCreator(
  args: {
    creatorProfileId: bigint;
    managerWalletAddress: string;
  },
  db: ManagerDeskDbClient = prisma
): Promise<ManagerAssignment | null> {
  const assignment = await db.managerAssignment.findFirst({
    where: {
      creatorProfileId: args.creatorProfileId,
      managerWalletAddress: args.managerWalletAddress.toLowerCase(),
      status: "ACTIVE",
    },
    orderBy: [{ roleType: "asc" }, { assignedAt: "desc" }],
  });

  if (!assignment) return null;
  return isAssignmentCurrentlyActive(assignment) ? assignment : null;
}

export async function requireCreatorAccess(
  args: {
    creatorProfileId: bigint;
    address: string;
  },
  db: ManagerDeskDbClient = prisma
): Promise<CreatorAccessResult> {
  const normalizedAddress = args.address.toLowerCase();
  const creator = await db.creatorProfile.findUnique({
    where: { id: args.creatorProfileId },
    select: {
      id: true,
      walletAddress: true,
    },
  });

  if (!creator) {
    return { ok: false, error: "CREATOR_NOT_FOUND", status: 404 };
  }

  if (creator.walletAddress?.toLowerCase() === normalizedAddress) {
    return {
      ok: true,
      creatorProfileId: creator.id,
      role: "CREATOR_OWNER",
      actorWalletAddress: normalizedAddress,
      managerAssignmentId: null,
    };
  }

  const assignment = await findActiveManagerAssignmentForCreator(
    {
      creatorProfileId: creator.id,
      managerWalletAddress: normalizedAddress,
    },
    db
  );

  if (!assignment) {
    return { ok: false, error: "FORBIDDEN_NOT_MANAGER", status: 403 };
  }

  return {
    ok: true,
    creatorProfileId: creator.id,
    role: "MANAGER",
    actorWalletAddress: normalizedAddress,
    managerAssignmentId: assignment.id,
  };
}

export async function requireCreatorOwnership(
  args: {
    creatorProfileId: bigint;
    address: string;
  },
  db: ManagerDeskDbClient = prisma
): Promise<CreatorAccessResult> {
  const access = await requireCreatorAccess(args, db);
  if (!access.ok) return access;
  if (access.role !== "CREATOR_OWNER") {
    return { ok: false, error: "FORBIDDEN_NOT_OWNER", status: 403 };
  }
  return access;
}

export function serializeManagerAssignment(
  row: ManagerAssignment
): SerializedManagerAssignment {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    managerWalletAddress: row.managerWalletAddress,
    roleType: row.roleType,
    status: row.status,
    assignedAt: row.assignedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeManagerNote(row: ManagerNote): SerializedManagerNote {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    authoredByManagerWalletAddress: row.authoredByManagerWalletAddress,
    managerAssignmentId: row.managerAssignmentId ?? null,
    projectId: row.projectId?.toString() ?? null,
    externalContactId: row.externalContactId ?? null,
    relatedMeetingId: row.relatedMeetingId ?? null,
    noteType: row.noteType,
    visibility: row.visibility,
    title: row.title,
    body: row.body,
    urgencyScore: row.urgencyScore ?? null,
    followUpNeeded: row.followUpNeeded,
    followUpDueAt: row.followUpDueAt?.toISOString() ?? null,
    aiSummary: row.aiSummary ?? null,
    aiTags: row.aiTags,
    isArchived: row.isArchived,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeExternalContact(
  row: ExternalContact
): SerializedExternalContact {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId?.toString() ?? null,
    ownerManagerWalletAddress: row.ownerManagerWalletAddress ?? null,
    ownerManagerAssignmentId: row.ownerManagerAssignmentId ?? null,
    projectId: row.projectId?.toString() ?? null,
    contactType: row.contactType,
    organizationName: row.organizationName,
    personName: row.personName ?? null,
    roleTitle: row.roleTitle ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    websiteUrl: row.websiteUrl ?? null,
    socialUrl: row.socialUrl ?? null,
    locationText: row.locationText ?? null,
    status: row.status,
    temperature: row.temperature,
    lastContactAt: row.lastContactAt?.toISOString() ?? null,
    nextAction: row.nextAction ?? null,
    nextActionDueAt: row.nextActionDueAt?.toISOString() ?? null,
    notes: row.notes ?? null,
    tags: row.tags,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef ?? null,
    relationshipStrengthScore: row.relationshipStrengthScore ?? null,
    lastOutcome: row.lastOutcome ?? null,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeMeeting(row: Meeting): SerializedMeeting {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId.toString(),
    managerAssignmentId: row.managerAssignmentId ?? null,
    projectId: row.projectId?.toString() ?? null,
    createdByWalletAddress: row.createdByWalletAddress,
    meetingType: row.meetingType,
    status: row.status,
    visibility: row.visibility,
    title: row.title,
    scheduledAt: row.scheduledAt.toISOString(),
    durationMinutes: row.durationMinutes ?? null,
    locationText: row.locationText ?? null,
    agenda: row.agenda ?? null,
    notes: row.notes ?? null,
    decisions: row.decisions ?? null,
    nextActionsSummary: row.nextActionsSummary ?? null,
    aiSummary: row.aiSummary ?? null,
    nextMeetingSuggestionAt: row.nextMeetingSuggestionAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeActionLog(row: ActionLog): SerializedActionLog {
  return {
    id: row.id,
    creatorProfileId: row.creatorProfileId?.toString() ?? null,
    projectId: row.projectId?.toString() ?? null,
    managerAssignmentId: row.managerAssignmentId ?? null,
    actorType: row.actorType,
    actorWalletAddress: row.actorWalletAddress ?? null,
    actionType: row.actionType,
    title: row.title,
    targetEntityType: row.targetEntityType ?? null,
    targetEntityId: row.targetEntityId ?? null,
    summary: row.summary ?? null,
    metadataJson: row.metadataJson,
    visibility: row.visibility,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export function canCreatorViewManagerNoteVisibility(
  visibility: NoteVisibility
): boolean {
  return visibility === "SHAREABLE_WITH_CREATOR";
}

export function canCreatorViewMeetingVisibility(
  visibility: MeetingVisibility
): boolean {
  return visibility === "CREATOR_VISIBLE";
}

export function canCreatorViewActionLogVisibility(
  visibility: ActionLogVisibility
): boolean {
  return visibility === "CREATOR_VISIBLE";
}

export async function appendActionLogTx(
  db: ManagerDeskDbClient,
  input: AppendActionLogInput
): Promise<ActionLog> {
  return db.actionLog.create({
    data: {
      creatorProfileId: input.creatorProfileId ?? null,
      projectId: input.projectId ?? null,
      managerAssignmentId: input.managerAssignmentId ?? null,
      actorType: input.actorType,
      actorWalletAddress: input.actorWalletAddress ?? null,
      actionType: input.actionType,
      title: input.title,
      targetEntityType: input.targetEntityType ?? null,
      targetEntityId: input.targetEntityId ?? null,
      summary: input.summary ?? null,
      ...(input.metadataJson !== undefined
        ? { metadataJson: input.metadataJson }
        : {}),
      visibility: input.visibility ?? "INTERNAL",
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}
