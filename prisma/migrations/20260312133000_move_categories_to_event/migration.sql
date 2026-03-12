ALTER TABLE "CreatorProfile"
DROP COLUMN "creatorCategories";

ALTER TABLE "Event"
ADD COLUMN "eventCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
