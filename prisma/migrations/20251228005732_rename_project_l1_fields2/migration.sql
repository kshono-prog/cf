/*
  Warnings:

  - You are about to drop the column `defaultChainPolicy` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `ownerUserId` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "defaultChainPolicy",
DROP COLUMN "ownerUserId",
ADD COLUMN     "bridgedAt" TIMESTAMP(3),
ADD COLUMN     "eventBlockchainId" TEXT,
ADD COLUMN     "icttTokenAddress" TEXT,
ADD COLUMN     "icttTokenHome" TEXT,
ADD COLUMN     "icttTokenRemote" TEXT,
ADD COLUMN     "lastBridgeError" TEXT,
ADD COLUMN     "lastBridgeTxHashIcm" TEXT,
ADD COLUMN     "lastBridgeTxHashIctt" TEXT,
ADD COLUMN     "liquidityBlockchainId" TEXT,
ADD COLUMN     "teleporterMessenger" TEXT,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Project_eventBlockchainId_idx" ON "Project"("eventBlockchainId");

-- CreateIndex
CREATE INDEX "Project_liquidityBlockchainId_idx" ON "Project"("liquidityBlockchainId");
