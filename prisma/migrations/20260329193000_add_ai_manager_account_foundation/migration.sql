CREATE TYPE "AiManagerAccountStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ARCHIVED'
);

CREATE TYPE "AiManagerArchetype" AS ENUM (
  'GENTLE_SUPPORTER',
  'PRODUCER',
  'ANALYST',
  'PROMOTER',
  'FAN_GUIDE'
);

CREATE TYPE "AiManagerPublicVisibility" AS ENUM (
  'OWNER_ONLY',
  'PUBLIC_BADGED',
  'PRIVATE'
);

CREATE TYPE "AiManagerTone" AS ENUM (
  'POLITE',
  'FRIENDLY',
  'ELEGANT',
  'ENERGETIC',
  'COOL'
);

CREATE TYPE "AiManagerSupportStyle" AS ENUM (
  'ENCOURAGING',
  'CALM',
  'DATA_DRIVEN',
  'PROMOTIONAL'
);

CREATE TYPE "AiManagerDisclosurePolicy" AS ENUM (
  'ALWAYS_DISCLOSE_AI',
  'DISCLOSE_ON_PUBLIC_ACTION'
);

CREATE TYPE "AiManagerBillingMode" AS ENUM (
  'MANUAL_TOPUP',
  'AUTO_PAY_WITH_CAP'
);

CREATE TYPE "AiManagerPaymentRail" AS ENUM (
  'X402_PREFERRED',
  'INTERNAL_LEDGER_FALLBACK'
);

CREATE TYPE "AiManagerFreeTierScope" AS ENUM (
  'BRIEFING_AND_LIGHT_DRAFTS'
);

CREATE TABLE "AiManagerAccount" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "creatorProfileId" BIGINT NOT NULL,
  "status" "AiManagerAccountStatus" NOT NULL DEFAULT 'DRAFT',
  "displayName" TEXT NOT NULL,
  "slug" TEXT,
  "avatarAssetUrl" TEXT,
  "intro" TEXT,
  "archetype" "AiManagerArchetype" NOT NULL DEFAULT 'GENTLE_SUPPORTER',
  "publicVisibility" "AiManagerPublicVisibility" NOT NULL DEFAULT 'OWNER_ONLY',
  "primaryLanguage" TEXT NOT NULL DEFAULT 'ja',
  "tone" "AiManagerTone" NOT NULL DEFAULT 'FRIENDLY',
  "supportStyle" "AiManagerSupportStyle" NOT NULL DEFAULT 'ENCOURAGING',
  "disclosurePolicy" "AiManagerDisclosurePolicy" NOT NULL DEFAULT 'ALWAYS_DISCLOSE_AI',
  "managerActivityWalletAddress" TEXT,
  "budgetWalletAddress" TEXT,
  "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "forbiddenTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "brandGuardrails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiManagerAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiManagerAccount_creatorProfileId_key" UNIQUE ("creatorProfileId")
);

CREATE TABLE "AiManagerBillingPolicy" (
  "aiManagerAccountId" UUID NOT NULL,
  "billingMode" "AiManagerBillingMode" NOT NULL DEFAULT 'MANUAL_TOPUP',
  "preferredRail" "AiManagerPaymentRail" NOT NULL DEFAULT 'X402_PREFERRED',
  "currency" TEXT NOT NULL DEFAULT 'JPYC',
  "freeTierEnabled" BOOLEAN NOT NULL DEFAULT true,
  "freeTierScope" "AiManagerFreeTierScope" NOT NULL DEFAULT 'BRIEFING_AND_LIGHT_DRAFTS',
  "autoPayEnabled" BOOLEAN NOT NULL DEFAULT false,
  "monthlyJpycCap" INTEGER NOT NULL DEFAULT 3000,
  "dailyJpycCap" INTEGER NOT NULL DEFAULT 300,
  "perActionJpycCap" INTEGER NOT NULL DEFAULT 100,
  "allowedBillableCapabilities" TEXT[] NOT NULL DEFAULT ARRAY['POST_DRAFTING', 'FAN_REPLY_ASSIST', 'PROGRESS_SUMMARY', 'WEB_RESEARCH']::TEXT[],
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiManagerBillingPolicy_pkey" PRIMARY KEY ("aiManagerAccountId")
);

CREATE TABLE "AiManagerBudgetBalance" (
  "aiManagerAccountId" UUID NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'JPYC',
  "availableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "reservedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiManagerBudgetBalance_pkey" PRIMARY KEY ("aiManagerAccountId")
);

CREATE INDEX "AiManagerAccount_status_visibility_idx"
  ON "AiManagerAccount"("status", "publicVisibility");

ALTER TABLE "AiManagerAccount"
  ADD CONSTRAINT "AiManagerAccount_creatorProfileId_fkey"
  FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerBillingPolicy"
  ADD CONSTRAINT "AiManagerBillingPolicy_aiManagerAccountId_fkey"
  FOREIGN KEY ("aiManagerAccountId") REFERENCES "AiManagerAccount"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "AiManagerBudgetBalance"
  ADD CONSTRAINT "AiManagerBudgetBalance_aiManagerAccountId_fkey"
  FOREIGN KEY ("aiManagerAccountId") REFERENCES "AiManagerAccount"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
