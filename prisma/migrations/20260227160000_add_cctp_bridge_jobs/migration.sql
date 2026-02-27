CREATE TYPE "CctpBridgeJobStatus" AS ENUM (
  'PENDING',
  'BURN_SUBMITTED',
  'ATTESTATION_READY',
  'MINT_SUBMITTED',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE "CctpBridgeJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "projectId" BIGINT NOT NULL,
  "currency" "SettlementToken" NOT NULL DEFAULT 'USDC',
  "sourceChain" "BridgeSourceChain" NOT NULL,
  "destinationChain" "BridgeDestinationChain" NOT NULL DEFAULT 'AVALANCHE',
  "status" "CctpBridgeJobStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "goalAchievedAt" TIMESTAMPTZ(6) NOT NULL,
  "burnAmountAtomic" DECIMAL(78, 0),
  "burnTxHash" TEXT,
  "burnMessageHash" TEXT,
  "attestation" TEXT,
  "attestationFetchedAt" TIMESTAMPTZ(6),
  "mintTxHash" TEXT,
  "failureReason" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 8,
  "nextRetryAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "CctpBridgeJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CctpBridgeJob_idempotencyKey_key"
ON "CctpBridgeJob"("idempotencyKey");

CREATE INDEX "CctpBridgeJob_project_created_idx"
ON "CctpBridgeJob"("projectId", "createdAt");

CREATE INDEX "CctpBridgeJob_project_status_idx"
ON "CctpBridgeJob"("projectId", "status");

CREATE INDEX "CctpBridgeJob_status_retry_idx"
ON "CctpBridgeJob"("status", "nextRetryAt");

ALTER TABLE "CctpBridgeJob"
ADD CONSTRAINT "CctpBridgeJob_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
