-- Separate JPYC/USDC project flows without FX conversion
ALTER TABLE "Project"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'JPYC';

CREATE INDEX "Project_creatorProfileId_currency_idx"
ON "Project"("creatorProfileId", "currency");

ALTER TABLE "CreatorProfile"
ADD COLUMN "activeProjectIdJpyc" BIGINT,
ADD COLUMN "activeProjectIdUsdc" BIGINT;

CREATE INDEX "CreatorProfile_activeProjectIdJpyc_idx"
ON "CreatorProfile"("activeProjectIdJpyc");

CREATE INDEX "CreatorProfile_activeProjectIdUsdc_idx"
ON "CreatorProfile"("activeProjectIdUsdc");

ALTER TABLE "CreatorProfile"
ADD CONSTRAINT "CreatorProfile_activeProjectIdJpyc_fkey"
FOREIGN KEY ("activeProjectIdJpyc") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreatorProfile"
ADD CONSTRAINT "CreatorProfile_activeProjectIdUsdc_fkey"
FOREIGN KEY ("activeProjectIdUsdc") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
