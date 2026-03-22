-- Add approvalState and consumedByStep columns to AgentTask
-- These were in schema.prisma but never migrated to the database.

ALTER TABLE "AgentTask" ADD COLUMN IF NOT EXISTS "approvalState" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "AgentTask" ADD COLUMN IF NOT EXISTS "consumedByStep" TEXT;
