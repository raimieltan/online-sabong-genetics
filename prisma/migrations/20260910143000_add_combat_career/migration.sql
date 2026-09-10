ALTER TABLE "Chicken"
ADD COLUMN "combatCareer" JSONB NOT NULL DEFAULT '{"version":1,"fightsProcessed":0,"telemetry":{},"evolutionTraits":[],"signatures":[],"rivalries":[],"awakenings":[],"recentDevelopment":[]}';
