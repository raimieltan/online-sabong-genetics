-- AlterTable
ALTER TABLE "Chicken" ADD COLUMN     "colorScheme" JSONB NOT NULL DEFAULT '{"body":"#8b6f47","head":"#6b5637","comb":"#ff0000","tail":"#a0826d","feet":"#ff8c00"}',
ADD COLUMN     "fightingStyle" TEXT NOT NULL DEFAULT 'balanced',
ADD COLUMN     "injured" BOOLEAN NOT NULL DEFAULT false;
