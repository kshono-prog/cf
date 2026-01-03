-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" BIGSERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "profileText" TEXT,
    "avatarUrl" TEXT,
    "qrcodeUrl" TEXT,
    "externalUrl" TEXT,
    "goalTitle" TEXT,
    "goalTargetJpyc" INTEGER,
    "themeColor" TEXT,
    "walletAddress" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activeProjectId" BIGINT,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorSocialLink" (
    "id" BIGSERIAL NOT NULL,
    "profileId" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorYoutubeVideo" (
    "id" BIGSERIAL NOT NULL,
    "profileId" BIGINT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorYoutubeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" BIGSERIAL NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "goalAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMPTZ(6),
    "placeName" TEXT,
    "placeUrl" TEXT,
    "ticketUrl" TEXT,
    "goalAmountJpyc" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "amountJpyc" INTEGER NOT NULL,
    "txHash" TEXT,
    "chainId" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaucetConfig" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minJpyc" INTEGER NOT NULL DEFAULT 100,
    "requirePolZero" BOOLEAN NOT NULL DEFAULT true,
    "claimAmountPol" TEXT NOT NULL DEFAULT '0.02',
    "nonceTtlMinutes" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaucetConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaucetWallet" (
    "id" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaucetWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasClaim" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "amountPol" TEXT NOT NULL,
    "txHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GasClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GasSupportNonce" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GasSupportNonce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" BIGSERIAL NOT NULL,
    "purposeId" BIGINT NOT NULL,
    "recipientType" TEXT NOT NULL DEFAULT 'ADDRESS',
    "recipientAddress" TEXT NOT NULL,
    "amountType" TEXT NOT NULL DEFAULT 'FIXED',
    "amountJpyc" INTEGER,
    "ratioBps" INTEGER,
    "chainId" INTEGER,
    "l1Key" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" BIGINT NOT NULL,
    "purposeId" BIGINT,
    "chainId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amountRaw" DECIMAL(78,0) NOT NULL,
    "decimals" INTEGER NOT NULL,
    "amountDecimal" DECIMAL(38,18),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "targetAmountJpyc" INTEGER NOT NULL,
    "deadline" TIMESTAMPTZ(6),
    "achievedAt" TIMESTAMPTZ(6),
    "settlementPolicy" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" BIGSERIAL NOT NULL,
    "ownerAddress" TEXT,
    "ownerUserId" TEXT,
    "creatorProfileId" BIGINT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "defaultChainPolicy" JSONB NOT NULL DEFAULT '{}',
    "purposeMode" TEXT NOT NULL DEFAULT 'OPTIONAL',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventChainId" INTEGER,
    "liquidityChainId" INTEGER,
    "eventContract" TEXT,
    "liquidityRecipient" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purpose" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goalId" BIGINT NOT NULL,
    "triggerTxHash" TEXT,
    "executedByType" TEXT,
    "executedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "executedAt" TIMESTAMPTZ(6),
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" BIGSERIAL NOT NULL,
    "projectId" BIGINT NOT NULL,
    "label" TEXT NOT NULL,
    "amountJpyc" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_username_key" ON "CreatorProfile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_walletAddress_key" ON "CreatorProfile"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_email_key" ON "CreatorProfile"("email");

-- CreateIndex
CREATE INDEX "CreatorSocialLink_profileId_idx" ON "CreatorSocialLink"("profileId");

-- CreateIndex
CREATE INDEX "CreatorYoutubeVideo_profileId_idx" ON "CreatorYoutubeVideo"("profileId");

-- CreateIndex
CREATE INDEX "Event_creatorProfileId_idx" ON "Event"("creatorProfileId");

-- CreateIndex
CREATE INDEX "Tip_creatorProfileId_idx" ON "Tip"("creatorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FaucetConfig_chainId_key" ON "FaucetConfig"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "FaucetWallet_address_key" ON "FaucetWallet"("address");

-- CreateIndex
CREATE INDEX "FaucetWallet_chain_active_idx" ON "FaucetWallet"("chainId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "GasClaim_address_key" ON "GasClaim"("address");

-- CreateIndex
CREATE UNIQUE INDEX "GasClaim_txHash_key" ON "GasClaim"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "GasSupportNonce_address_key" ON "GasSupportNonce"("address");

-- CreateIndex
CREATE INDEX "Allocation_chainId_idx" ON "Allocation"("chainId");

-- CreateIndex
CREATE INDEX "Allocation_purposeId_idx" ON "Allocation"("purposeId");

-- CreateIndex
CREATE UNIQUE INDEX "Contribution_txHash_unique" ON "Contribution"("txHash");

-- CreateIndex
CREATE INDEX "Contribution_chainId_idx" ON "Contribution"("chainId");

-- CreateIndex
CREATE INDEX "Contribution_createdAt_idx" ON "Contribution"("createdAt");

-- CreateIndex
CREATE INDEX "Contribution_from_idx" ON "Contribution"("fromAddress");

-- CreateIndex
CREATE INDEX "Contribution_projectId_idx" ON "Contribution"("projectId");

-- CreateIndex
CREATE INDEX "Contribution_purposeId_idx" ON "Contribution"("purposeId");

-- CreateIndex
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");

-- CreateIndex
CREATE INDEX "Contribution_to_idx" ON "Contribution"("toAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_projectId_unique" ON "Goal"("projectId");

-- CreateIndex
CREATE INDEX "Goal_projectId_idx" ON "Goal"("projectId");

-- CreateIndex
CREATE INDEX "Project_creatorProfileId_idx" ON "Project"("creatorProfileId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Purpose_order_idx" ON "Purpose"("projectId", "orderIndex");

-- CreateIndex
CREATE INDEX "Purpose_projectId_idx" ON "Purpose"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Purpose_project_code_unique" ON "Purpose"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_goalId_unique" ON "Settlement"("goalId");

-- CreateIndex
CREATE INDEX "Settlement_executedAt_idx" ON "Settlement"("executedAt");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- CreateIndex
CREATE INDEX "BudgetItem_projectId_orderIndex_idx" ON "BudgetItem"("projectId", "orderIndex");

-- AddForeignKey
ALTER TABLE "CreatorSocialLink" ADD CONSTRAINT "CreatorSocialLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorYoutubeVideo" ADD CONSTRAINT "CreatorYoutubeVideo_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_purposeId_fkey" FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Purpose" ADD CONSTRAINT "Purpose_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
