-- AlterTable
ALTER TABLE "BridgeRun" ADD COLUMN     "bridgeTxHash" TEXT,
ADD COLUMN     "confirmReason" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMPTZ(6),
ADD COLUMN     "sourceReceiptBlockNumber" TEXT;

-- CreateIndex
CREATE INDEX "BridgeRun_bridgeTxHash_idx" ON "BridgeRun"("bridgeTxHash");

-- CreateIndex
CREATE INDEX "BridgeRun_confirmedAt_idx" ON "BridgeRun"("confirmedAt");
