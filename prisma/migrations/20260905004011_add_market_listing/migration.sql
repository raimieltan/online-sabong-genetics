-- CreateTable
CREATE TABLE "MarketListing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "fatherId" TEXT,
    "motherId" TEXT,
    "bloodlineId" TEXT NOT NULL,
    "iv" JSONB NOT NULL,
    "traits" JSONB NOT NULL,
    "fightingStyle" TEXT NOT NULL,
    "colorScheme" JSONB NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);
