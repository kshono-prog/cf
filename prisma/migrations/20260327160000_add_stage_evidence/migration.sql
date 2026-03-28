-- CreateTable
CREATE TABLE "StageEvidence" (
    "id" TEXT NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "stageId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL DEFAULT 'OTHER',
    "value" TEXT NOT NULL,
    "verifiedAt" TIMESTAMPTZ(6) NOT NULL,
    "recordedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StageEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StageEvidence_creatorProfileId_stageId_idx" ON "StageEvidence"("creatorProfileId", "stageId");

-- CreateIndex
CREATE INDEX "StageEvidence_creatorProfileId_verifiedAt_idx" ON "StageEvidence"("creatorProfileId", "verifiedAt");

-- AddForeignKey
ALTER TABLE "StageEvidence" ADD CONSTRAINT "StageEvidence_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
