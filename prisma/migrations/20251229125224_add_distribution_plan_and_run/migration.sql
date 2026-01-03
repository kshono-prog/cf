-- CreateTable
CREATE TABLE "DistributionRun" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "projectId" BIGINT NOT NULL,
    "mode" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "planJson" JSONB NOT NULL DEFAULT '{}',
    "txHashes" JSONB NOT NULL DEFAULT '[]',
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributionRun_projectId_idx" ON "DistributionRun"("projectId");

-- CreateIndex
CREATE INDEX "DistributionRun_createdAt_idx" ON "DistributionRun"("createdAt");

-- CreateIndex
CREATE INDEX "DistributionRun_mode_idx" ON "DistributionRun"("mode");

-- AddForeignKey
ALTER TABLE "DistributionRun" ADD CONSTRAINT "DistributionRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "Project"
ADD COLUMN "distributionPlan" JSONB NOT NULL DEFAULT '{}'::jsonb;