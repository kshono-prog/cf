-- CreateTable: RewardTier
CREATE TABLE "RewardTier" (
    "id"                    BIGSERIAL      NOT NULL,
    "projectId"             BIGINT         NOT NULL,
    "title"                 TEXT           NOT NULL,
    "description"           TEXT,
    "priceJpyc"             INTEGER        NOT NULL,
    "currency"              TEXT           NOT NULL DEFAULT 'JPYC',
    "quantityLimit"         INTEGER,
    "soldCount"             INTEGER        NOT NULL DEFAULT 0,
    "isPublished"           BOOLEAN        NOT NULL DEFAULT false,
    "sortOrder"             INTEGER        NOT NULL DEFAULT 0,
    "deliveryType"          TEXT,
    "imageUrl"              TEXT,
    "startThresholdType"    TEXT,
    "startThresholdValue"   INTEGER,
    "productionStatus"      TEXT           NOT NULL DEFAULT 'NOT_STARTED',
    "productionStartedAt"   TIMESTAMPTZ(6),
    "productionCompletedAt" TIMESTAMPTZ(6),
    "createdAt"             TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updatedAt"             TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "RewardTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: RewardTier
CREATE INDEX "RewardTier_project_published_sort_idx"
    ON "RewardTier"("projectId", "isPublished", "sortOrder");
CREATE INDEX "RewardTier_project_production_idx"
    ON "RewardTier"("projectId", "productionStatus");

-- AddForeignKey: RewardTier.projectId -> Project
ALTER TABLE "RewardTier"
    ADD CONSTRAINT "RewardTier_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

-- CreateTable: PaymentIntent
CREATE TABLE "PaymentIntent" (
    "id"                 UUID           NOT NULL DEFAULT gen_random_uuid(),
    "projectId"          BIGINT         NOT NULL,
    "rewardTierId"       BIGINT,
    "purposeId"          BIGINT,
    "expectedAmountJpyc" INTEGER        NOT NULL,
    "currency"           TEXT           NOT NULL DEFAULT 'JPYC',
    "chainId"            INTEGER        NOT NULL,
    "recipientAddress"   TEXT           NOT NULL,
    "quantity"           INTEGER        NOT NULL DEFAULT 1,
    "customerLabel"      TEXT,
    "note"               TEXT,
    "status"             TEXT           NOT NULL DEFAULT 'OPEN',
    "contributionId"     UUID,
    "expiresAt"          TIMESTAMPTZ(6),
    "canceledAt"         TIMESTAMPTZ(6),
    "createdAt"          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updatedAt"          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PaymentIntent
CREATE UNIQUE INDEX "PaymentIntent_contributionId_key"
    ON "PaymentIntent"("contributionId");
CREATE INDEX "PaymentIntent_project_status_created_idx"
    ON "PaymentIntent"("projectId", "status", "createdAt");
CREATE INDEX "PaymentIntent_tier_status_idx"
    ON "PaymentIntent"("rewardTierId", "status");
CREATE INDEX "PaymentIntent_purpose_idx"
    ON "PaymentIntent"("purposeId");

-- AddForeignKey: PaymentIntent relations
ALTER TABLE "PaymentIntent"
    ADD CONSTRAINT "PaymentIntent_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "PaymentIntent"
    ADD CONSTRAINT "PaymentIntent_rewardTierId_fkey"
    FOREIGN KEY ("rewardTierId") REFERENCES "RewardTier"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "PaymentIntent"
    ADD CONSTRAINT "PaymentIntent_purposeId_fkey"
    FOREIGN KEY ("purposeId") REFERENCES "Purpose"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "PaymentIntent"
    ADD CONSTRAINT "PaymentIntent_contributionId_fkey"
    FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;

-- CreateTable: PaymentIntentItem
CREATE TABLE "PaymentIntentItem" (
    "id"              UUID           NOT NULL DEFAULT gen_random_uuid(),
    "paymentIntentId" UUID           NOT NULL,
    "itemName"        TEXT           NOT NULL,
    "unitPriceJpyc"   INTEGER        NOT NULL,
    "quantity"        INTEGER        NOT NULL DEFAULT 1,
    "subtotalJpyc"    INTEGER        NOT NULL,
    "metadataJson"    JSONB          NOT NULL DEFAULT '{}',
    "createdAt"       TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "PaymentIntentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PaymentIntentItem
CREATE INDEX "PaymentIntentItem_intent_idx"
    ON "PaymentIntentItem"("paymentIntentId");

-- AddForeignKey: PaymentIntentItem
ALTER TABLE "PaymentIntentItem"
    ADD CONSTRAINT "PaymentIntentItem_paymentIntentId_fkey"
    FOREIGN KEY ("paymentIntentId") REFERENCES "PaymentIntent"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
