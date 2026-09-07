-- AlterTable
ALTER TABLE "Chicken" ADD COLUMN     "behavior" JSONB NOT NULL DEFAULT '{"aggression":0.55,"caution":0.45,"patience":0.5,"riskTolerance":0.5,"pressurePreference":0.55,"counterPreference":0.4,"recoveryPreference":0.4,"persistence":0.5}',
ADD COLUMN     "condition" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "experience" JSONB NOT NULL DEFAULT '{"offensive":0,"defensive":0,"evasion":0,"counter":0,"pressure":0,"recovery":0,"adaptation":0}',
ADD COLUMN     "injuries" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "trainingState" JSONB NOT NULL DEFAULT '{"trainingPoints":100,"trainingFatigue":0,"history":[]}';
