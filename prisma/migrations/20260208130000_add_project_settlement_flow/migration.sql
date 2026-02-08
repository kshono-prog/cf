-- CreateEnum
CREATE TYPE "ProjectSettlementStatus" AS ENUM ('NOT_READY', 'BRIDGING', 'READY_FOR_DISTRIBUTION', 'DISTRIBUTED');

-- CreateEnum
CREATE TYPE "BridgeSourceChain" AS ENUM ('POLYGON', 'ETHEREUM');

-- CreateEnum
CREATE TYPE "BridgeDestinationChain" AS ENUM ('AVALANCHE');

-- CreateEnum
CREATE TYPE "BridgeStepStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementToken" AS ENUM ('JPYC', 'USDC');

-- CreateEnum
CREATE TYPE "DistributionEntryStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DistributionExecutionResult" AS ENUM ('PARTIAL_SUCCESS', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "ProjectSettlement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" BIGINT NOT NULL,
    "status" "ProjectSettlementStatus" NOT NULL DEFAULT 'NOT_READY',
    "bridgedTotalAtomic" DECIMAL(78, 0) NOT NULL DEFAULT 0,
    "distributedTotalAtomic" DECIMAL(78, 0) NOT NULL DEFAULT 0,
    "readyAt" TIMESTAMPTZ(6),
    "distributedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBridgeStep" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" BIGINT NOT NULL,
    "sourceChain" "BridgeSourceChain" NOT NULL,
    "destinationChain" "BridgeDestinationChain" NOT NULL DEFAULT 'AVALANCHE',
    "token" "SettlementToken" NOT NULL,
    "status" "BridgeStepStatus" NOT NULL DEFAULT 'PENDING',
    "bridgedAmountAtomic" DECIMAL(78, 0) NOT NULL DEFAULT 0,
    "txHash" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "recordedByWallet" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectBridgeStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" BIGINT NOT NULL,
    "recipientAddressChecksum" TEXT NOT NULL,
    "token" "SettlementToken" NOT NULL,
    "amountAtomic" DECIMAL(78, 0) NOT NULL,
    "memo" TEXT,
    "status" "DistributionEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMPTZ(6),
    "txHash" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionExecution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" BIGINT NOT NULL,
    "initiatedByWallet" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(6),
    "result" "DistributionExecutionResult" NOT NULL DEFAULT 'PARTIAL_SUCCESS',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DistributionExecutionItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "executionId" UUID NOT NULL,
    "distributionEntryId" UUID NOT NULL,
    "status" "DistributionEntryStatus" NOT NULL,
    "txHash" TEXT,
    "errorReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributionExecutionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSettlement_projectId_key" ON "ProjectSettlement"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSettlement_status_idx" ON "ProjectSettlement"("status");

-- CreateIndex
CREATE INDEX "ProjectSettlement_createdAt_idx" ON "ProjectSettlement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBridgeStep_project_source_dest_token_key" ON "ProjectBridgeStep"("projectId", "sourceChain", "destinationChain", "token");

-- CreateIndex
CREATE INDEX "ProjectBridgeStep_project_status_idx" ON "ProjectBridgeStep"("projectId", "status");

-- CreateIndex
CREATE INDEX "DistributionEntry_project_order_idx" ON "DistributionEntry"("projectId", "orderIndex");

-- CreateIndex
CREATE INDEX "DistributionEntry_project_status_idx" ON "DistributionEntry"("projectId", "status");

-- CreateIndex
CREATE INDEX "DistributionEntry_txHash_idx" ON "DistributionEntry"("txHash");

-- CreateIndex
CREATE INDEX "DistributionExecution_project_started_idx" ON "DistributionExecution"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "DistributionExecutionItem_execution_idx" ON "DistributionExecutionItem"("executionId");

-- CreateIndex
CREATE INDEX "DistributionExecutionItem_entry_idx" ON "DistributionExecutionItem"("distributionEntryId");

-- AddForeignKey
ALTER TABLE "ProjectSettlement" ADD CONSTRAINT "ProjectSettlement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ProjectBridgeStep" ADD CONSTRAINT "ProjectBridgeStep_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DistributionEntry" ADD CONSTRAINT "DistributionEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DistributionExecution" ADD CONSTRAINT "DistributionExecution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DistributionExecutionItem" ADD CONSTRAINT "DistributionExecutionItem_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "DistributionExecution"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "DistributionExecutionItem" ADD CONSTRAINT "DistributionExecutionItem_distributionEntryId_fkey" FOREIGN KEY ("distributionEntryId") REFERENCES "DistributionEntry"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
