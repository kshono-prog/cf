CREATE TYPE "ManagerAssignmentRole" AS ENUM (
  'PRIMARY',
  'SUPPORTING'
);

CREATE TYPE "ManagerAssignmentStatus" AS ENUM (
  'ACTIVE',
  'PAUSED',
  'ENDED'
);

CREATE TYPE "ManagerNoteType" AS ENUM (
  'GENERAL',
  'VENUE_SCOUT',
  'SALES_MEETING',
  'NEGOTIATION',
  'CREATOR_STATUS',
  'EVENT_OPERATION',
  'RISK',
  'FOLLOW_UP'
);

CREATE TYPE "NoteVisibility" AS ENUM (
  'MANAGER_ONLY',
  'INTERNAL_TEAM',
  'SHAREABLE_WITH_CREATOR'
);

CREATE TYPE "ExternalContactType" AS ENUM (
  'VENUE',
  'ORGANIZER',
  'MEDIA',
  'BRAND',
  'COMPANY',
  'COLLABORATOR',
  'AGENCY',
  'SPONSOR',
  'OTHER'
);

CREATE TYPE "ExternalContactStatus" AS ENUM (
  'NEW',
  'CONTACTED',
  'REPLIED',
  'MEETING_SCHEDULED',
  'IN_DISCUSSION',
  'NEGOTIATING',
  'ON_HOLD',
  'WON',
  'LOST',
  'ONGOING'
);

CREATE TYPE "ContactTemperature" AS ENUM (
  'UNKNOWN',
  'COLD',
  'NEUTRAL',
  'WARM',
  'HOT'
);

CREATE TYPE "ExternalContactSourceType" AS ENUM (
  'MANUAL',
  'IMPORTED',
  'AI_SUGGESTED'
);

CREATE TYPE "ActionActorType" AS ENUM (
  'CREATOR',
  'MANAGER',
  'AI_OFFICE',
  'SYSTEM'
);

CREATE TYPE "ActionLogType" AS ENUM (
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'GOAL_UPDATED',
  'GOAL_ACHIEVED',
  'MEETING_CREATED',
  'MEETING_COMPLETED',
  'MANAGER_NOTE_CREATED',
  'MANAGER_NOTE_UPDATED',
  'CONTACT_CREATED',
  'CONTACT_UPDATED',
  'CONTACT_ACTIVITY_RECORDED',
  'TASK_CREATED',
  'TASK_COMPLETED',
  'AI_SUGGESTION_CREATED',
  'AI_SUGGESTION_ACCEPTED',
  'AI_SUGGESTION_REJECTED',
  'DRAFT_CREATED',
  'DRAFT_UPDATED',
  'OPPORTUNITY_LINKED',
  'STATUS_CHANGED',
  'OTHER'
);

CREATE TYPE "ActionLogVisibility" AS ENUM (
  'INTERNAL',
  'CREATOR_VISIBLE',
  'SYSTEM_ONLY'
);

CREATE TYPE "ActionTargetEntityType" AS ENUM (
  'PROJECT',
  'GOAL',
  'MEETING',
  'MANAGER_NOTE',
  'EXTERNAL_CONTACT',
  'TASK',
  'DRAFT',
  'OPPORTUNITY',
  'OTHER'
);

CREATE TABLE "ManagerAssignment" (
  "id" TEXT NOT NULL,
  "creatorProfileId" BIGINT NOT NULL,
  "managerWalletAddress" TEXT NOT NULL,
  "roleType" "ManagerAssignmentRole" NOT NULL DEFAULT 'PRIMARY',
  "status" "ManagerAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "endedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "ManagerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagerNote" (
  "id" TEXT NOT NULL,
  "creatorProfileId" BIGINT NOT NULL,
  "authoredByManagerWalletAddress" TEXT NOT NULL,
  "managerAssignmentId" TEXT,
  "projectId" BIGINT,
  "externalContactId" TEXT,
  "relatedMeetingId" TEXT,
  "noteType" "ManagerNoteType" NOT NULL,
  "visibility" "NoteVisibility" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "urgencyScore" INTEGER,
  "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
  "followUpDueAt" TIMESTAMPTZ(6),
  "aiSummary" TEXT,
  "aiTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "ManagerNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalContact" (
  "id" TEXT NOT NULL,
  "creatorProfileId" BIGINT,
  "ownerManagerWalletAddress" TEXT,
  "ownerManagerAssignmentId" TEXT,
  "projectId" BIGINT,
  "contactType" "ExternalContactType" NOT NULL,
  "organizationName" TEXT NOT NULL,
  "personName" TEXT,
  "roleTitle" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "websiteUrl" TEXT,
  "socialUrl" TEXT,
  "locationText" TEXT,
  "status" "ExternalContactStatus" NOT NULL DEFAULT 'NEW',
  "temperature" "ContactTemperature" NOT NULL DEFAULT 'UNKNOWN',
  "lastContactAt" TIMESTAMPTZ(6),
  "nextAction" TEXT,
  "nextActionDueAt" TIMESTAMPTZ(6),
  "notes" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourceType" "ExternalContactSourceType" NOT NULL DEFAULT 'MANUAL',
  "sourceRef" TEXT,
  "relationshipStrengthScore" INTEGER,
  "lastOutcome" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "ExternalContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActionLog" (
  "id" TEXT NOT NULL,
  "creatorProfileId" BIGINT,
  "projectId" BIGINT,
  "managerAssignmentId" TEXT,
  "actorType" "ActionActorType" NOT NULL,
  "actorWalletAddress" TEXT,
  "actionType" "ActionLogType" NOT NULL,
  "title" TEXT NOT NULL,
  "targetEntityType" "ActionTargetEntityType",
  "targetEntityId" TEXT,
  "summary" TEXT,
  "metadataJson" JSONB,
  "visibility" "ActionLogVisibility" NOT NULL DEFAULT 'INTERNAL',
  "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagerAssignment_creatorProfileId_status_idx"
ON "ManagerAssignment"("creatorProfileId", "status");

CREATE INDEX "ManagerAssignment_managerWalletAddress_status_idx"
ON "ManagerAssignment"("managerWalletAddress", "status");

CREATE INDEX "ManagerAssignment_creatorProfileId_roleType_status_idx"
ON "ManagerAssignment"("creatorProfileId", "roleType", "status");

CREATE INDEX "ManagerNote_creatorProfileId_createdAt_idx"
ON "ManagerNote"("creatorProfileId", "createdAt");

CREATE INDEX "ManagerNote_managerAssignmentId_createdAt_idx"
ON "ManagerNote"("managerAssignmentId", "createdAt");

CREATE INDEX "ManagerNote_externalContactId_idx"
ON "ManagerNote"("externalContactId");

CREATE INDEX "ManagerNote_projectId_idx"
ON "ManagerNote"("projectId");

CREATE INDEX "ManagerNote_followUpDueAt_idx"
ON "ManagerNote"("followUpDueAt");

CREATE INDEX "ManagerNote_noteType_visibility_createdAt_idx"
ON "ManagerNote"("noteType", "visibility", "createdAt");

CREATE INDEX "ExternalContact_creatorProfileId_status_idx"
ON "ExternalContact"("creatorProfileId", "status");

CREATE INDEX "ExternalContact_ownerManagerWalletAddress_status_idx"
ON "ExternalContact"("ownerManagerWalletAddress", "status");

CREATE INDEX "ExternalContact_ownerManagerAssignmentId_status_idx"
ON "ExternalContact"("ownerManagerAssignmentId", "status");

CREATE INDEX "ExternalContact_projectId_idx"
ON "ExternalContact"("projectId");

CREATE INDEX "ExternalContact_contactType_status_idx"
ON "ExternalContact"("contactType", "status");

CREATE INDEX "ExternalContact_nextActionDueAt_idx"
ON "ExternalContact"("nextActionDueAt");

CREATE INDEX "ExternalContact_organizationName_idx"
ON "ExternalContact"("organizationName");

CREATE INDEX "ActionLog_creatorProfileId_occurredAt_idx"
ON "ActionLog"("creatorProfileId", "occurredAt");

CREATE INDEX "ActionLog_projectId_occurredAt_idx"
ON "ActionLog"("projectId", "occurredAt");

CREATE INDEX "ActionLog_managerAssignmentId_occurredAt_idx"
ON "ActionLog"("managerAssignmentId", "occurredAt");

CREATE INDEX "ActionLog_actorType_occurredAt_idx"
ON "ActionLog"("actorType", "occurredAt");

CREATE INDEX "ActionLog_actionType_occurredAt_idx"
ON "ActionLog"("actionType", "occurredAt");

CREATE INDEX "ActionLog_targetEntityType_targetEntityId_idx"
ON "ActionLog"("targetEntityType", "targetEntityId");

ALTER TABLE "ManagerAssignment"
ADD CONSTRAINT "ManagerAssignment_creatorProfileId_fkey"
FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "ManagerNote"
ADD CONSTRAINT "ManagerNote_creatorProfileId_fkey"
FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "ManagerNote"
ADD CONSTRAINT "ManagerNote_managerAssignmentId_fkey"
FOREIGN KEY ("managerAssignmentId") REFERENCES "ManagerAssignment"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ManagerNote"
ADD CONSTRAINT "ManagerNote_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ManagerNote"
ADD CONSTRAINT "ManagerNote_externalContactId_fkey"
FOREIGN KEY ("externalContactId") REFERENCES "ExternalContact"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ExternalContact"
ADD CONSTRAINT "ExternalContact_creatorProfileId_fkey"
FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ExternalContact"
ADD CONSTRAINT "ExternalContact_ownerManagerAssignmentId_fkey"
FOREIGN KEY ("ownerManagerAssignmentId") REFERENCES "ManagerAssignment"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ExternalContact"
ADD CONSTRAINT "ExternalContact_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ActionLog"
ADD CONSTRAINT "ActionLog_creatorProfileId_fkey"
FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ActionLog"
ADD CONSTRAINT "ActionLog_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "ActionLog"
ADD CONSTRAINT "ActionLog_managerAssignmentId_fkey"
FOREIGN KEY ("managerAssignmentId") REFERENCES "ManagerAssignment"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
