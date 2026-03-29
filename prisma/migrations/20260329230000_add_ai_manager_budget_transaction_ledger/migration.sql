CREATE TYPE "AiManagerBudgetTransactionDirection" AS ENUM (
  'CREDIT',
  'DEBIT'
);

CREATE TYPE "AiManagerBudgetTransactionType" AS ENUM (
  'OWNER_TOP_UP',
  'OWNER_DEDUCTION',
  'USAGE_SETTLEMENT'
);

CREATE TABLE "AiManagerBudgetTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiManagerAccountId" UUID NOT NULL,
  "creatorProfileId" BIGINT NOT NULL,
  "usageRecordId" UUID,
  "direction" "AiManagerBudgetTransactionDirection" NOT NULL,
  "transactionType" "AiManagerBudgetTransactionType" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'JPYC',
  "amount" DECIMAL(18,2) NOT NULL,
  "resultingAvailableAmount" DECIMAL(18,2) NOT NULL,
  "note" TEXT,
  "actorAddress" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiManagerBudgetTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiManagerBudgetTransaction_account_created_idx"
  ON "AiManagerBudgetTransaction"("aiManagerAccountId", "createdAt");

CREATE INDEX "AiManagerBudgetTransaction_creator_created_idx"
  ON "AiManagerBudgetTransaction"("creatorProfileId", "createdAt");

CREATE INDEX "AiManagerBudgetTransaction_usage_idx"
  ON "AiManagerBudgetTransaction"("usageRecordId");

ALTER TABLE "AiManagerBudgetTransaction"
  ADD CONSTRAINT "AiManagerBudgetTransaction_aiManagerAccountId_fkey"
  FOREIGN KEY ("aiManagerAccountId") REFERENCES "AiManagerAccount"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerBudgetTransaction"
  ADD CONSTRAINT "AiManagerBudgetTransaction_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerBudgetTransaction"
  ADD CONSTRAINT "AiManagerBudgetTransaction_usageRecordId_fkey"
  FOREIGN KEY ("usageRecordId") REFERENCES "AiManagerUsageRecord"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
