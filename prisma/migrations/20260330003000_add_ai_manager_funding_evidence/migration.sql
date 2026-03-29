CREATE TYPE "AiManagerFundingEvidenceStatus" AS ENUM (
  'SELF_REPORTED',
  'MATCHED_TO_LEDGER',
  'REJECTED'
);

CREATE TABLE "AiManagerFundingEvidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiManagerAccountId" UUID NOT NULL,
  "creatorProfileId" BIGINT NOT NULL,
  "matchedBudgetTransactionId" UUID,
  "status" "AiManagerFundingEvidenceStatus" NOT NULL DEFAULT 'SELF_REPORTED',
  "chainId" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'JPYC',
  "amount" DECIMAL(18,2) NOT NULL,
  "txHash" TEXT NOT NULL,
  "fromWalletAddress" TEXT,
  "toWalletAddress" TEXT NOT NULL,
  "reportedByAddress" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "matchedAt" TIMESTAMPTZ(6),
  CONSTRAINT "AiManagerFundingEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiManagerFundingEvidence_matchedBudgetTransactionId_key"
  ON "AiManagerFundingEvidence"("matchedBudgetTransactionId");

CREATE UNIQUE INDEX "AiManagerFundingEvidence_txHash_key"
  ON "AiManagerFundingEvidence"("txHash");

CREATE INDEX "AiManagerFundingEvidence_account_created_idx"
  ON "AiManagerFundingEvidence"("aiManagerAccountId", "createdAt");

CREATE INDEX "AiManagerFundingEvidence_creator_created_idx"
  ON "AiManagerFundingEvidence"("creatorProfileId", "createdAt");

CREATE INDEX "AiManagerFundingEvidence_status_created_idx"
  ON "AiManagerFundingEvidence"("status", "createdAt");

ALTER TABLE "AiManagerFundingEvidence"
  ADD CONSTRAINT "AiManagerFundingEvidence_aiManagerAccountId_fkey"
  FOREIGN KEY ("aiManagerAccountId") REFERENCES "AiManagerAccount"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerFundingEvidence"
  ADD CONSTRAINT "AiManagerFundingEvidence_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerFundingEvidence"
  ADD CONSTRAINT "AiManagerFundingEvidence_matchedBudgetTransactionId_fkey"
  FOREIGN KEY ("matchedBudgetTransactionId") REFERENCES "AiManagerBudgetTransaction"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
