DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'ActionLogType'
      AND e.enumlabel = 'MANAGER_ASSIGNMENT_CREATED'
  ) THEN
    ALTER TYPE "ActionLogType" ADD VALUE 'MANAGER_ASSIGNMENT_CREATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'ActionLogType'
      AND e.enumlabel = 'MANAGER_ASSIGNMENT_UPDATED'
  ) THEN
    ALTER TYPE "ActionLogType" ADD VALUE 'MANAGER_ASSIGNMENT_UPDATED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'ActionTargetEntityType'
      AND e.enumlabel = 'MANAGER_ASSIGNMENT'
  ) THEN
    ALTER TYPE "ActionTargetEntityType" ADD VALUE 'MANAGER_ASSIGNMENT';
  END IF;
END $$;

CREATE TYPE "MeetingType" AS ENUM (
  'WEEKLY_REVIEW',
  'RELEASE_CHECK',
  'OUTREACH_PROGRESS',
  'EVENT_PREP',
  'RETROSPECTIVE',
  'URGENT_RESPONSE',
  'OTHER'
);

CREATE TYPE "MeetingStatus" AS ENUM (
  'SCHEDULED',
  'COMPLETED',
  'CANCELED'
);

CREATE TYPE "MeetingVisibility" AS ENUM (
  'INTERNAL',
  'CREATOR_VISIBLE'
);

CREATE TABLE "Meeting" (
  "id" TEXT NOT NULL,
  "creatorProfileId" BIGINT NOT NULL,
  "managerAssignmentId" TEXT,
  "projectId" BIGINT,
  "createdByWalletAddress" TEXT NOT NULL,
  "meetingType" "MeetingType" NOT NULL DEFAULT 'OTHER',
  "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "visibility" "MeetingVisibility" NOT NULL DEFAULT 'CREATOR_VISIBLE',
  "title" TEXT NOT NULL,
  "scheduledAt" TIMESTAMPTZ(6) NOT NULL,
  "durationMinutes" INTEGER,
  "locationText" TEXT,
  "agenda" TEXT,
  "notes" TEXT,
  "decisions" TEXT,
  "nextActionsSummary" TEXT,
  "aiSummary" TEXT,
  "nextMeetingSuggestionAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Meeting_creatorProfileId_scheduledAt_idx"
ON "Meeting"("creatorProfileId", "scheduledAt");

CREATE INDEX "Meeting_managerAssignmentId_scheduledAt_idx"
ON "Meeting"("managerAssignmentId", "scheduledAt");

CREATE INDEX "Meeting_projectId_scheduledAt_idx"
ON "Meeting"("projectId", "scheduledAt");

CREATE INDEX "Meeting_status_scheduledAt_idx"
ON "Meeting"("status", "scheduledAt");

CREATE INDEX "Meeting_visibility_scheduledAt_idx"
ON "Meeting"("visibility", "scheduledAt");

ALTER TABLE "Meeting"
ADD CONSTRAINT "Meeting_creatorProfileId_fkey"
FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "Meeting"
ADD CONSTRAINT "Meeting_managerAssignmentId_fkey"
FOREIGN KEY ("managerAssignmentId") REFERENCES "ManagerAssignment"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "Meeting"
ADD CONSTRAINT "Meeting_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;
