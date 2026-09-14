-- CreateTable
CREATE TABLE "PveProgress" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "clearCount" INTEGER NOT NULL DEFAULT 0,
    "firstClearedAt" TIMESTAMP(3),
    "firstClearChickenId" TEXT,
    "lastClearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PveProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PveProgress_playerId_bossId_key" ON "PveProgress"("playerId", "bossId");

-- AddForeignKey
ALTER TABLE "PveProgress" ADD CONSTRAINT "PveProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
