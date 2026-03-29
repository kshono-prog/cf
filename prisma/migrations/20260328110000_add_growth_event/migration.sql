-- CreateTable
CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "username" TEXT,
    "walletAddress" TEXT,
    "projectId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrowthEvent_event_createdAt_idx" ON "GrowthEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_username_createdAt_idx" ON "GrowthEvent"("username", "createdAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_walletAddress_createdAt_idx" ON "GrowthEvent"("walletAddress", "createdAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_projectId_createdAt_idx" ON "GrowthEvent"("projectId", "createdAt");
