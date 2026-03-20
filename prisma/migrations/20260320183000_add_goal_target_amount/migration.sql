ALTER TABLE "Goal"
ADD COLUMN "targetAmount" INTEGER;

UPDATE "Goal"
SET "targetAmount" = "targetAmountJpyc"
WHERE "targetAmount" IS NULL;

ALTER TABLE "Goal"
ALTER COLUMN "targetAmount" SET NOT NULL;
