-- AlterTable
ALTER TABLE "Chicken" ADD COLUMN     "breed" TEXT,
ALTER COLUMN "colorScheme" SET DEFAULT '{"body":"#8b6f47","hackle":"#c9a24f","wings":"#4c1708","tail":"#a0826d","comb":"#b8100f","beak":"#d9a83a","shanks":"#cc9e33","pattern":"SOLID","patternColor":"#4a3521"}',
ALTER COLUMN "physical" SET DEFAULT '{"scale":1,"bodyGirth":1,"bodyLength":1,"chest":1,"neckLength":1,"neckThick":1,"headSize":1,"combSize":1,"wattleSize":1,"beakLength":1,"wingSpan":1,"wingSize":1,"legLength":1,"legThick":1,"footSize":1,"tailLength":1,"tailSpread":1,"tailArc":1}';

-- AlterTable
ALTER TABLE "Egg" ADD COLUMN     "breed" TEXT,
ADD COLUMN     "colorScheme" JSONB NOT NULL DEFAULT '{"body":"#8b6f47","hackle":"#c9a24f","wings":"#4c1708","tail":"#a0826d","comb":"#b8100f","beak":"#d9a83a","shanks":"#cc9e33","pattern":"SOLID","patternColor":"#4a3521"}',
ALTER COLUMN "physical" SET DEFAULT '{"scale":1,"bodyGirth":1,"bodyLength":1,"chest":1,"neckLength":1,"neckThick":1,"headSize":1,"combSize":1,"wattleSize":1,"beakLength":1,"wingSpan":1,"wingSize":1,"legLength":1,"legThick":1,"footSize":1,"tailLength":1,"tailSpread":1,"tailArc":1}';

-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "breed" TEXT,
ALTER COLUMN "physical" SET DEFAULT '{"scale":1,"bodyGirth":1,"bodyLength":1,"chest":1,"neckLength":1,"neckThick":1,"headSize":1,"combSize":1,"wattleSize":1,"beakLength":1,"wingSpan":1,"wingSize":1,"legLength":1,"legThick":1,"footSize":1,"tailLength":1,"tailSpread":1,"tailArc":1}';

-- Backfill existing rows to the new 18-trait physical / 7-material color
-- shape. Old data has no meaningful values for the new axes/fields anyway
-- (dev-stage game, no real users to protect), so existing birds simply reset
-- to baseline-1 physical genetics and a default color scheme.
UPDATE "Chicken" SET
  "physical" = '{"scale":1,"bodyGirth":1,"bodyLength":1,"chest":1,"neckLength":1,"neckThick":1,"headSize":1,"combSize":1,"wattleSize":1,"beakLength":1,"wingSpan":1,"wingSize":1,"legLength":1,"legThick":1,"footSize":1,"tailLength":1,"tailSpread":1,"tailArc":1}',
  "colorScheme" = '{"body":"#8b6f47","hackle":"#c9a24f","wings":"#4c1708","tail":"#a0826d","comb":"#b8100f","beak":"#d9a83a","shanks":"#cc9e33","pattern":"SOLID","patternColor":"#4a3521"}';

UPDATE "Egg" SET
  "physical" = '{"scale":1,"bodyGirth":1,"bodyLength":1,"chest":1,"neckLength":1,"neckThick":1,"headSize":1,"combSize":1,"wattleSize":1,"beakLength":1,"wingSpan":1,"wingSize":1,"legLength":1,"legThick":1,"footSize":1,"tailLength":1,"tailSpread":1,"tailArc":1}';

UPDATE "MarketListing" SET
  "physical" = '{"scale":1,"bodyGirth":1,"bodyLength":1,"chest":1,"neckLength":1,"neckThick":1,"headSize":1,"combSize":1,"wattleSize":1,"beakLength":1,"wingSpan":1,"wingSize":1,"legLength":1,"legThick":1,"footSize":1,"tailLength":1,"tailSpread":1,"tailArc":1}',
  "colorScheme" = '{"body":"#8b6f47","hackle":"#c9a24f","wings":"#4c1708","tail":"#a0826d","comb":"#b8100f","beak":"#d9a83a","shanks":"#cc9e33","pattern":"SOLID","patternColor":"#4a3521"}';
