-- AlterTable
ALTER TABLE "Player" ADD COLUMN "authUserId" UUID,
ADD COLUMN "displayName" TEXT,
ADD COLUMN "onboardingState" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "provisionedAt" TIMESTAMP(3),
ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Player_authUserId_key" ON "Player"("authUserId");
