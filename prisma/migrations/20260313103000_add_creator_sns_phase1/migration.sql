-- CreateTable
CREATE TABLE "Post" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorProfileId" BIGINT NOT NULL,
    "projectId" BIGINT,
    "authorType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mediaType" TEXT,
    "mediaUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiAgentId" UUID,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "tipCount" INTEGER NOT NULL DEFAULT 0,
    "tipAmountJpyc" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "tipAmountUsdc" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reply" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "parentReplyId" UUID,
    "authorType" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiAgentId" UUID,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplyLike" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "replyId" UUID NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReplyLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTip" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "contributionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "profileClickCount" INTEGER NOT NULL DEFAULT 0,
    "likeCountSnapshot" INTEGER NOT NULL DEFAULT 0,
    "replyCountSnapshot" INTEGER NOT NULL DEFAULT 0,
    "tipCountSnapshot" INTEGER NOT NULL DEFAULT 0,
    "tipJpycSnapshot" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "tipUsdcSnapshot" DECIMAL(38,18) NOT NULL DEFAULT 0,
    "engagementScore" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAgent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorProfileId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "configJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPromotionJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorProfileId" BIGINT NOT NULL,
    "aiAgentId" UUID,
    "postId" UUID,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "inputJson" JSONB NOT NULL DEFAULT '{}',
    "outputJson" JSONB NOT NULL DEFAULT '{}',
    "executionCostUsd" DECIMAL(18,6),
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "billingStatus" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPromotionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_status_visibility_created_idx" ON "Post"("status", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "Post_creator_status_visibility_created_idx" ON "Post"("creatorProfileId", "status", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "Post_project_status_visibility_created_idx" ON "Post"("projectId", "status", "visibility", "createdAt");

-- CreateIndex
CREATE INDEX "Post_aiAgent_idx" ON "Post"("aiAgentId");

-- CreateIndex
CREATE INDEX "Reply_post_created_idx" ON "Reply"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Reply_creator_created_idx" ON "Reply"("creatorProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Reply_parent_created_idx" ON "Reply"("parentReplyId", "createdAt");

-- CreateIndex
CREATE INDEX "Reply_aiAgent_idx" ON "Reply"("aiAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_post_creator_key" ON "PostLike"("postId", "creatorProfileId");

-- CreateIndex
CREATE INDEX "PostLike_creator_idx" ON "PostLike"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ReplyLike_reply_creator_key" ON "ReplyLike"("replyId", "creatorProfileId");

-- CreateIndex
CREATE INDEX "ReplyLike_creator_idx" ON "ReplyLike"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTip_post_contribution_key" ON "PostTip"("postId", "contributionId");

-- CreateIndex
CREATE INDEX "PostTip_contribution_idx" ON "PostTip"("contributionId");

-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_postId_key" ON "PostAnalytics"("postId");

-- CreateIndex
CREATE INDEX "AiAgent_creator_role_status_idx" ON "AiAgent"("creatorProfileId", "role", "status");

-- CreateIndex
CREATE INDEX "AiPromotionJob_creator_status_created_idx" ON "AiPromotionJob"("creatorProfileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AiPromotionJob_agent_created_idx" ON "AiPromotionJob"("aiAgentId", "createdAt");

-- CreateIndex
CREATE INDEX "AiPromotionJob_post_created_idx" ON "AiPromotionJob"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "Reply"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReplyLike" ADD CONSTRAINT "ReplyLike_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "Reply"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ReplyLike" ADD CONSTRAINT "ReplyLike_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostTip" ADD CONSTRAINT "PostTip_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostTip" ADD CONSTRAINT "PostTip_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AiAgent" ADD CONSTRAINT "AiAgent_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AiPromotionJob" ADD CONSTRAINT "AiPromotionJob_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AiPromotionJob" ADD CONSTRAINT "AiPromotionJob_aiAgentId_fkey" FOREIGN KEY ("aiAgentId") REFERENCES "AiAgent"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AiPromotionJob" ADD CONSTRAINT "AiPromotionJob_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
