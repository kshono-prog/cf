-- CreateTable
CREATE TABLE "AgentTaskAuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentTaskId" UUID NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "projectId" BIGINT,
    "action" TEXT NOT NULL,
    "actorAddress" TEXT,
    "metaJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTaskAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentTaskAuditLog_task_created_idx" ON "AgentTaskAuditLog"("agentTaskId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTaskAuditLog_creator_created_idx" ON "AgentTaskAuditLog"("creatorProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTaskAuditLog_project_created_idx" ON "AgentTaskAuditLog"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentTaskAuditLog" ADD CONSTRAINT "AgentTaskAuditLog_agentTaskId_fkey" FOREIGN KEY ("agentTaskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AgentTaskAuditLog" ADD CONSTRAINT "AgentTaskAuditLog_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AgentTaskAuditLog" ADD CONSTRAINT "AgentTaskAuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
