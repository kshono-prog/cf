-- CreateTable
CREATE TABLE "CreatorFollow" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "followerProfileId" BIGINT NOT NULL,
    "followingProfileId" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorFollow_follower_following_key" ON "CreatorFollow"("followerProfileId", "followingProfileId");

-- CreateIndex
CREATE INDEX "CreatorFollow_follower_created_idx" ON "CreatorFollow"("followerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorFollow_following_created_idx" ON "CreatorFollow"("followingProfileId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreatorFollow" ADD CONSTRAINT "CreatorFollow_followerProfileId_fkey" FOREIGN KEY ("followerProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CreatorFollow" ADD CONSTRAINT "CreatorFollow_followingProfileId_fkey" FOREIGN KEY ("followingProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
