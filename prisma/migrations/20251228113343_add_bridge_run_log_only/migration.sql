-- CreateTable
CREATE TABLE "BridgeRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" BIGINT NOT NULL,
    "mode" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "eventFundingChainId" INTEGER NOT NULL,
    "liquidityChainId" INTEGER NOT NULL,
    "sourceAddress" TEXT NOT NULL,
    "vaultAddress" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "dbConfirmedTotalAmountDecimal" TEXT,
    "vaultBalanceRaw" TEXT,
    "vaultBalanceFormatted" TEXT,
    "recipientBalanceRaw" TEXT,
    "recipientBalanceFormatted" TEXT,
    "deltaHintJson" JSONB NOT NULL DEFAULT '{}',
    "force" BOOLEAN NOT NULL DEFAULT false,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BridgeRun_projectId_idx" ON "BridgeRun"("projectId");

-- CreateIndex
CREATE INDEX "BridgeRun_createdAt_idx" ON "BridgeRun"("createdAt");

-- CreateIndex
CREATE INDEX "BridgeRun_mode_idx" ON "BridgeRun"("mode");

-- AddForeignKey
ALTER TABLE "BridgeRun" ADD CONSTRAINT "BridgeRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
