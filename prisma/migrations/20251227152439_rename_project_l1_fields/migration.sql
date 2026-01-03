/*
  Warnings:

  - You are about to drop the column `eventChainId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `eventContract` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `liquidityRecipient` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "eventChainId",
DROP COLUMN "eventContract",
DROP COLUMN "liquidityRecipient",
ADD COLUMN     "eventFundingChainId" INTEGER,
ADD COLUMN     "eventFundingSourceAddress" TEXT,
ADD COLUMN     "eventVaultAddress" TEXT,
ADD COLUMN     "liquidityRecipientAddress" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
