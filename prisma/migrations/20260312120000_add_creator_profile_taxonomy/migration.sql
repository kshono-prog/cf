ALTER TABLE "CreatorProfile"
ADD COLUMN "creatorType" TEXT,
ADD COLUMN "creatorCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
