CREATE TYPE "AiManagerPaymentAttemptEventSource" AS ENUM (
  'BILLING_SYSTEM',
  'OWNER_REVIEW',
  'X402_CONNECTOR'
);

CREATE TYPE "AiManagerPaymentAttemptEventType" AS ENUM (
  'ATTEMPT_CREATED',
  'SETTLEMENT_CONFIRMED',
  'SETTLEMENT_FAILED',
  'SETTLEMENT_REPLAYED'
);

CREATE TABLE "AiManagerPaymentAttemptEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "aiManagerAccountId" UUID NOT NULL,
  "paymentAttemptId" UUID NOT NULL,
  "source" "AiManagerPaymentAttemptEventSource" NOT NULL,
  "eventType" "AiManagerPaymentAttemptEventType" NOT NULL,
  "status" "AiManagerPaymentAttemptStatus" NOT NULL,
  "txHash" TEXT,
  "detail" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiManagerPaymentAttemptEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiManagerPaymentAttemptEvent_account_created_idx"
  ON "AiManagerPaymentAttemptEvent"("aiManagerAccountId", "createdAt");

CREATE INDEX "AiManagerPaymentAttemptEvent_attempt_created_idx"
  ON "AiManagerPaymentAttemptEvent"("paymentAttemptId", "createdAt");

CREATE INDEX "AiManagerPaymentAttemptEvent_source_created_idx"
  ON "AiManagerPaymentAttemptEvent"("source", "createdAt");

CREATE INDEX "AiManagerPaymentAttemptEvent_type_created_idx"
  ON "AiManagerPaymentAttemptEvent"("eventType", "createdAt");

ALTER TABLE "AiManagerPaymentAttemptEvent"
  ADD CONSTRAINT "AiManagerPaymentAttemptEvent_aiManagerAccountId_fkey"
  FOREIGN KEY ("aiManagerAccountId") REFERENCES "AiManagerAccount"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerPaymentAttemptEvent"
  ADD CONSTRAINT "AiManagerPaymentAttemptEvent_paymentAttemptId_fkey"
  FOREIGN KEY ("paymentAttemptId") REFERENCES "AiManagerPaymentAttempt"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
