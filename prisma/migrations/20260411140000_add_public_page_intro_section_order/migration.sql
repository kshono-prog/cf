ALTER TABLE "PublicPageConfig"
ADD COLUMN "introSectionOrder" TEXT[] DEFAULT ARRAY[]::TEXT[];
