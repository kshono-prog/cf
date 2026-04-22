-- CreateTable
CREATE TABLE "PublicPageConfig" (
    "id" BIGSERIAL NOT NULL,
    "creatorProfileId" BIGINT NOT NULL,
    "heroImageUrl" TEXT,
    "backgroundColor" TEXT,
    "centerSectionOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hiddenCenterSectionKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rightSectionOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hiddenRightSectionKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicPageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicPageConfig_creatorProfileId_key" ON "PublicPageConfig"("creatorProfileId");

-- AddForeignKey
ALTER TABLE "PublicPageConfig" ADD CONSTRAINT "PublicPageConfig_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
