-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chicken" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "fatherId" TEXT,
    "motherId" TEXT,
    "bloodlineId" TEXT NOT NULL,
    "iv" JSONB NOT NULL,
    "ev" JSONB NOT NULL,
    "traits" JSONB NOT NULL,
    "age" INTEGER NOT NULL,
    "health" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "record" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chicken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Egg" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fatherId" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "bloodlineId" TEXT NOT NULL,
    "generation" INTEGER NOT NULL,
    "sex" TEXT NOT NULL,
    "iv" JSONB NOT NULL,
    "traits" JSONB NOT NULL,
    "laidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "Egg_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Chicken" ADD CONSTRAINT "Chicken_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Egg" ADD CONSTRAINT "Egg_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
