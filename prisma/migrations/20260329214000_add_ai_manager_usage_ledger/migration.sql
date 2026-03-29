CREATE TYPE "AiManagerBillingPolicyStatus" AS ENUM (
  'ACTIVE',
  'PAUSED'
);

CREATE TYPE "AiManagerBillableCapability" AS ENUM (
  'POST_DRAFTING',
  'FAN_REPLY_ASSIST',
  'PROGRESS_SUMMARY',
  'WEB_RESEARCH'
);

CREATE TYPE "AiManagerUsageBillingState" AS ENUM (
  'METERED',
  'PAYMENT_PENDING',
  'SETTLED',
  'FAILED',
  'WAIVED'
);

CREATE TYPE "AiManagerPaymentAttemptRail" AS ENUM (
  'X402',
  'INTERNAL_LEDGER'
);

CREATE TYPE "AiManagerPaymentAttemptStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'FAILED'
);

ALTER TABLE "AiManagerBillingPolicy"
  ADD COLUMN "status" "AiManagerBillingPolicyStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "pausedAt" TIMESTAMPTZ(6),
  ADD COLUMN "pauseReason" TEXT;

CREATE TABLE "AiManagerUsageRecord" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiManagerAccountId" UUID NOT NULL,
  "creatorProfileId" BIGINT NOT NULL,
  "projectId" BIGINT,
  "agentTaskId" UUID,
  "capability" "AiManagerBillableCapability" NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'JPYC',
  "chargeAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "providerCostUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "platformFeeUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "totalChargeUsd" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "billingState" "AiManagerUsageBillingState" NOT NULL DEFAULT 'METERED',
  "failureReason" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiManagerUsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiManagerPaymentAttempt" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "usageRecordId" UUID NOT NULL,
  "rail" "AiManagerPaymentAttemptRail" NOT NULL,
  "payerWalletAddress" TEXT,
  "payeeWalletAddress" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'JPYC',
  "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "txHash" TEXT,
  "status" "AiManagerPaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMPTZ(6),
  CONSTRAINT "AiManagerPaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiManagerUsageRecord_account_created_idx"
  ON "AiManagerUsageRecord"("aiManagerAccountId", "createdAt");

CREATE INDEX "AiManagerUsageRecord_creator_created_idx"
  ON "AiManagerUsageRecord"("creatorProfileId", "createdAt");

CREATE INDEX "AiManagerUsageRecord_project_created_idx"
  ON "AiManagerUsageRecord"("projectId", "createdAt");

CREATE INDEX "AiManagerUsageRecord_agent_task_idx"
  ON "AiManagerUsageRecord"("agentTaskId");

CREATE INDEX "AiManagerUsageRecord_state_created_idx"
  ON "AiManagerUsageRecord"("billingState", "createdAt");

CREATE INDEX "AiManagerPaymentAttempt_usage_created_idx"
  ON "AiManagerPaymentAttempt"("usageRecordId", "createdAt");

CREATE INDEX "AiManagerPaymentAttempt_status_created_idx"
  ON "AiManagerPaymentAttempt"("status", "createdAt");

CREATE INDEX "AiManagerPaymentAttempt_tx_hash_idx"
  ON "AiManagerPaymentAttempt"("txHash");

ALTER TABLE "AiManagerUsageRecord"
  ADD CONSTRAINT "AiManagerUsageRecord_aiManagerAccountId_fkey"
  FOREIGN KEY ("aiManagerAccountId") REFERENCES "AiManagerAccount"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerUsageRecord"
  ADD CONSTRAINT "AiManagerUsageRecord_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerUsageRecord"
  ADD CONSTRAINT "AiManagerUsageRecord_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "AiManagerUsageRecord"
  ADD CONSTRAINT "AiManagerUsageRecord_agentTaskId_fkey"
  FOREIGN KEY ("agentTaskId") REFERENCES "AgentTask"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "AiManagerPaymentAttempt"
  ADD CONSTRAINT "AiManagerPaymentAttempt_usageRecordId_fkey"
  FOREIGN KEY ("usageRecordId") REFERENCES "AiManagerUsageRecord"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
