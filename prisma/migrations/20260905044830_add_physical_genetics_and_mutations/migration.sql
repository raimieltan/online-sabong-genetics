-- AlterTable
ALTER TABLE "Chicken" ADD COLUMN     "mutations" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "physical" JSONB NOT NULL DEFAULT '{"body":1,"neck":1,"legs":1,"tail":1,"wings":1}',
ALTER COLUMN "colorScheme" SET DEFAULT '{"feathers":"#8b6f47","details":"#ff0000","eyes":"#050505","tail":"#a0826d","pattern":"SOLID","patternColor":"#4a3521"}';

-- AlterTable
ALTER TABLE "Egg" ADD COLUMN     "mutations" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "physical" JSONB NOT NULL DEFAULT '{"body":1,"neck":1,"legs":1,"tail":1,"wings":1}';

-- AlterTable
ALTER TABLE "MarketListing" ADD COLUMN     "mutations" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "physical" JSONB NOT NULL DEFAULT '{"body":1,"neck":1,"legs":1,"tail":1,"wings":1}';
