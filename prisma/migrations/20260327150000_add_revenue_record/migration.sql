-- CreateTable
CREATE TABLE "RevenueRecord" (
    "id" TEXT NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "projectId" BIGINT,
    "source" TEXT NOT NULL DEFAULT 'OTHER',
    "amountDecimal" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RevenueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueRecord_creatorProfileId_occurredAt_idx" ON "RevenueRecord"("creatorProfileId", "occurredAt");

-- CreateIndex
CREATE INDEX "RevenueRecord_projectId_occurredAt_idx" ON "RevenueRecord"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "RevenueRecord_source_occurredAt_idx" ON "RevenueRecord"("source", "occurredAt");

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
