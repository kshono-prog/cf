-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorProfileId" BIGINT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountHandle" TEXT NOT NULL,
    "accountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accessTokenRef" TEXT,
    "refreshTokenRef" TEXT,
    "tokenExpiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentMetricSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorProfileId" BIGINT NOT NULL,
    "projectId" BIGINT,
    "socialConnectionId" UUID,
    "platform" TEXT NOT NULL,
    "contentExternalId" TEXT NOT NULL,
    "contentUrl" TEXT,
    "postedAt" TIMESTAMPTZ(6),
    "capturedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "rawJson" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ContentMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorProfileId" BIGINT NOT NULL,
    "projectId" BIGINT,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "inputJson" JSONB NOT NULL DEFAULT '{}',
    "outputJson" JSONB NOT NULL DEFAULT '{}',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_platform_handle_key" ON "SocialConnection"("platform", "accountHandle");

-- CreateIndex
CREATE INDEX "SocialConnection_creator_platform_status_idx" ON "SocialConnection"("creatorProfileId", "platform", "status");

-- CreateIndex
CREATE INDEX "ContentMetricSnapshot_creator_captured_idx" ON "ContentMetricSnapshot"("creatorProfileId", "capturedAt");

-- CreateIndex
CREATE INDEX "ContentMetricSnapshot_project_platform_captured_idx" ON "ContentMetricSnapshot"("projectId", "platform", "capturedAt");

-- CreateIndex
CREATE INDEX "ContentMetricSnapshot_connection_idx" ON "ContentMetricSnapshot"("socialConnectionId");

-- CreateIndex
CREATE INDEX "AgentTask_creator_status_created_idx" ON "AgentTask"("creatorProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTask_project_type_created_idx" ON "AgentTask"("projectId", "taskType", "createdAt");

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ContentMetricSnapshot" ADD CONSTRAINT "ContentMetricSnapshot_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ContentMetricSnapshot" ADD CONSTRAINT "ContentMetricSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ContentMetricSnapshot" ADD CONSTRAINT "ContentMetricSnapshot_socialConnectionId_fkey" FOREIGN KEY ("socialConnectionId") REFERENCES "SocialConnection"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
