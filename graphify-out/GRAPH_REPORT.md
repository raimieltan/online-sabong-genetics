# Graph Report - rooster-arena  (2026-09-08)

## Corpus Check
- 257 files · ~247,918 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2029 nodes · 4443 edges · 146 communities (119 shown, 25 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69da38a7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- pve/service.ts
- BattleCanvas.tsx
- thumbnailCache.ts
- resolution.ts
- combatPresentation.test.ts
- AudioEngine
- chickenGenerator.ts
- medical/service.ts
- compilerOptions
- medical.test.ts
- lib/types.ts
- genetics.ts
- ManageView.tsx
- behavior.ts
- training.ts
- chicken/[chickenId]/page.tsx
- ConditionMonitor.tsx
- CombatPresentationController
- combat.ts
- build_rooster.mjs
- getOrCreatePlayer
- marketplace.ts
- StatBlock
- training/page.tsx
- marketplace-route.test.ts
- pedigree.ts
- facilities/service.ts
- liveCommentary.ts
- simulator.ts
- ChickenPhysicsRig.tsx
- devDependencies
- roosterGenome.ts
- genetic-system.md
- ChickenModel.tsx
- ParentCard.tsx
- BattleStage3D.tsx
- traits.ts
- roosterGenerator.ts
- dependencies
- db.ts
- MatchupScreen.tsx
- coopVillage.ts
- growth.ts
- Chicken
- combat.test.ts
- GrowthStage
- tournament.ts
- live/page.tsx
- cameraDirector.ts
- CoopEnvironment.tsx
- combatPresentation.ts
- villageIdle.ts
- coop-redesign-v2.md
- seed-god-chickens.ts
- scripts
- CoopWorld.tsx
- battlePersonality.ts
- CameraDirector
- combat-system-v2.md
- pve/route.ts
- 4. Animation implementations (curve sketches)
- gamefowl_dynasty_full_mechanics.md
- GENETIC_STAT_KEYS
- TrainingPageContent
- seed-monochrome-pairs.ts
- _smoke_combat_v2.ts
- market/page.tsx
- aging.ts
- backfill-color-jitter.ts
- Rooster Arena Project
- BattlePage
- CoopPage
- ChickenCard.tsx
- 5. Combat — where it all converges
- package.json
- NOT DONE — remaining spec work
- TournamentPage
- test-ts-loader-hooks.mjs
- eslint.config.mjs
- next.config.ts
- @types/react-dom
- postcss.config.mjs
- File Icon
- Globe Icon
- Next.js Logo
- Vercel Logo
- Window Icon
- File Structure
- Rooster Arena — Battle Simulator Design Spec
- Combat — Design Spec
- Global Constraints
- Global Constraints
- Training Phase 1 Foundation — Design Spec
- Hatching & Growth — Design Spec
- Rig genome integration — design spec
- VillageView.tsx
- 65. CORE DESIGN RULES
- Training — Design Spec
- effectiveStat
- Genetics + Breeding (+ UI) — Design Spec
- MVP should contain:
- File Structure
- Component Design
- 6. Traits
- ChickenDetailPageContent
- [bossId]/page.tsx
- ChickenViewer.tsx
- 32. SPECIALIZED BLOODLINES
- BossFightPage
- 27. GENETIC RESEARCH
- 8. MUTATION SYSTEM
- Error Handling
- UI Theme (Tailwind + Custom CSS)
- 17. Fighting Styles
- 20. Critical Injuries
- 33. Monetization
- 36. Breeding Strategy
- VillageChickenAI
- 10. MUTATIONS SHOULD NOT ALWAYS BE STRONGER
- Data Model (`lib/types.ts`)
- Deployment
- Performance Considerations
- Rooster Generation (`lib/roosterGenerator.ts`)
- 1. Game Overview
- Starter Package
- 32. Tournament Betting / Prediction
- 35. Genetic Discovery
- 4. Genetics System
- 12. SPONTANEOUS VS INHERITED MUTATIONS
- Storage (`lib/storage.ts`)
- Canvas Rendering (`components/BattleArena.tsx`)
- Testing Strategy
- 10. Bloodline System
- 49. Recommended Technical Architecture
- 7. Breeding System
- 52. TECHNICAL DATA MODEL
- 5. DOMINANT VS RECESSIVE GENES
- 🐔 CHICKEN BREEDING & GENETICS SYSTEM
- 12. Training System
- 19. Hitbox Combat
- 30. Battle Credits
- 8. Genetic Inheritance
- 9. Hens

## God Nodes (most connected - your core abstractions)
1. `getOrCreatePlayer()` - 76 edges
2. `Chicken` - 67 edges
3. `prisma` - 48 edges
4. `add()` - 40 edges
5. `BattleCanvas()` - 33 edges
6. `StatBlock` - 30 edges
7. `GENETIC_STAT_KEYS` - 27 edges
8. `generateRandomChicken()` - 25 edges
9. `inward()` - 23 edges
10. `smoothstep()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `FighterVisual` --references--> `Chicken`  [EXTRACTED]
  components/BattleCanvas.tsx → lib/types.ts
- `StatCompareRow()` --calls--> `effectiveStat()`  [EXTRACTED]
  components/battle/MatchupScreen.tsx → lib/combat/stats.ts
- `POST()` --calls--> `canBreed()`  [EXTRACTED]
  app/api/breed/route.ts → lib/growth.ts
- `POST()` --calls--> `getOrCreatePlayer()`  [EXTRACTED]
  app/api/breed/route.ts → lib/player.ts
- `POST()` --calls--> `inheritTraits()`  [EXTRACTED]
  app/api/breed/route.ts → lib/traits.ts

## Import Cycles
- None detected.

## Communities (146 total, 25 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.07
Nodes (82): base(), chargeAttack(), doubleKick(), flyingKick(), heavyKick(), jumpAttack(), peckAttack(), quickKick() (+74 more)

### Community 1 - "pve/service.ts"
Cohesion: 0.11
Nodes (30): POST(), GET(), PveLadderPage(), stars(), bossPreview(), getBoss(), previousBossId(), PVE_BOSS_LIST (+22 more)

### Community 2 - "BattleCanvas.tsx"
Cohesion: 0.08
Nodes (31): aerialPose(), AttackPose, attackPoseFor(), attackStateForMove(), BattleCanvas(), BattleCanvasProps, bodyAttackPose(), clamp() (+23 more)

### Community 3 - "thumbnailCache.ts"
Cohesion: 0.08
Nodes (28): bangers, cinzel, geistMono, geistSans, metadata, ChickenThumbnail(), SEX_EMOJI, cache (+20 more)

### Community 4 - "resolution.ts"
Cohesion: 0.08
Nodes (37): adaptationCounterBonus(), experienceConfidenceBonus(), fatigueAccuracyPenalty(), fatigueDecisionPenalty(), MOMENTUM_MAX, MOMENTUM_MIN, momentumDelta(), MomentumEvent (+29 more)

### Community 5 - "combatPresentation.test.ts"
Cohesion: 0.13
Nodes (22): ATTACK_CHOREOGRAPHY, ATTACK_PHASES, choreographyDuration(), DEFAULT_CHOREOGRAPHY, getChoreography(), HEAVY_STOP, HitStopProfile, impactTime() (+14 more)

### Community 6 - "AudioEngine"
Cohesion: 0.10
Nodes (10): AudioContextCtor, AudioEngine, getAudioContextCtor(), VICTORY_FREQUENCIES, FakeAudioContext, makeFakeAudioNode(), makeFakeAudioParam(), makeFakeFilterNode() (+2 more)

### Community 7 - "chickenGenerator.ts"
Cohesion: 0.11
Nodes (28): BREED_IDS, BREED_PRESETS, BreedId, BreedPreset, pickRandomBreed(), createChicken(), CreateChickenInput, cryptoSafeId() (+20 more)

### Community 8 - "medical/service.ts"
Cohesion: 0.11
Nodes (31): Body, POST(), GET(), POST(), canTreatSeverity(), CLINIC_LEVELS, CLINIC_MAX_LEVEL, CLINIC_UPGRADE_COST (+23 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 10 - "medical.test.ts"
Cohesion: 0.09
Nodes (26): conditionTier, recoverCondition(), TIER_STAT_MULTIPLIER, createIllness(), ILLNESS_LABELS, nextId(), RECOVERY_CYCLES, Rng (+18 more)

### Community 11 - "lib/types.ts"
Cohesion: 0.12
Nodes (17): getMutationDefinition(), MUTATION_IDS, MutationDefinition, BattleLogEntry, BattleResult, Bet, COMBAT_ACTIONS, COMBAT_EXPERIENCE_CATEGORIES (+9 more)

### Community 12 - "genetics.ts"
Cohesion: 0.19
Nodes (21): POST(), clamp(), COLOR_KEYS, driftRgb(), hasAllele(), hexToRgb(), hslToRgb(), inheritColorHex() (+13 more)

### Community 13 - "ManageView.tsx"
Cohesion: 0.29
Nodes (8): CoopFilters(), STATUS_OPTIONS, ManageView(), CoopFilterState, DEFAULT_COOP_FILTERS, filterChickens(), NO_FILTER, ChickenStatus

### Community 14 - "behavior.ts"
Cohesion: 0.11
Nodes (23): ACTION_DEFINITIONS, ALL_ACTIONS, LOW_COMMITMENT_ACTIONS, ARCHETYPE_PROFILES, chooseAction(), clamp01(), DecisionContext, deriveBehaviorProfile() (+15 more)

### Community 15 - "training.ts"
Cohesion: 0.19
Nodes (14): applyDevelopment(), CATEGORY_PRIMARY_STAT, CATEGORY_TRADEOFF_STAT, ENERGY_PER_TRAIN, EV_PER_TRAIN, TRAINING_FATIGUE_PER_SESSION, TRAINING_FATIGUE_REST_RECOVERY, TRAINING_POINT_COST (+6 more)

### Community 16 - "chicken/[chickenId]/page.tsx"
Cohesion: 0.12
Nodes (14): BEHAVIOR_ICON, EXPERIENCE_ICON, MUTATION_RARITY_COLOR, MUTATION_RARITY_GEM, PHYSICAL_ICON, SEX_ICON, STAT_ICON, Tab (+6 more)

### Community 17 - "ConditionMonitor.tsx"
Cohesion: 0.11
Nodes (24): ClinicDTO, ClinicPage(), PILL_TONE, RosterEntry, treatmentRemaining(), band(), BAR_TONE, ConditionMonitor() (+16 more)

### Community 18 - "CombatPresentationController"
Cohesion: 0.19
Nodes (5): AttackChoreography, AttackPhase, CombatPresentationController, PresentationCallbacks, harness()

### Community 19 - "combat.ts"
Cohesion: 0.15
Nodes (22): emptyExperience(), emptyOpponentModel(), FightOutcomeUpdate, generateMatchedOpponent(), totalEffectiveStats(), MAX_HEALTH, MAX_TURNS, clamp01() (+14 more)

### Community 20 - "build_rooster.mjs"
Cohesion: 0.14
Nodes (16): B, F(), feather(), gradY(), leg(), loft(), MATS, paint() (+8 more)

### Community 21 - "getOrCreatePlayer"
Cohesion: 0.18
Nodes (11): GET(), POST(), GET(), GET(), GET(), getOrCreateTrainingGym(), getOrCreatePlayer(), seedChicken() (+3 more)

### Community 22 - "marketplace.ts"
Cohesion: 0.54
Nodes (5): generateListing(), listingToChicken(), sellPrice(), seedListing(), chickenValue()

### Community 23 - "StatBlock"
Cohesion: 0.19
Nodes (11): POST(), POST(), hasActiveInjury(), finalHealthPercent(), healChicken(), tickInjuryRecovery(), seedChicken(), statBlock() (+3 more)

### Community 24 - "training/page.tsx"
Cohesion: 0.15
Nodes (12): FacilityViewDTO, SessionDTO, TRAINING_GYM_LEVELS, TRAINING_GYM_MAX_LEVEL, TRAINING_GYM_UPGRADES, FACILITY_TYPES, FacilityLevelConfig, FacilityType (+4 more)

### Community 25 - "marketplace-route.test.ts"
Cohesion: 0.16
Nodes (19): POST(), POST(), LiveMode, POST(), POST(), GET(), applyFightOutcome(), canFight() (+11 more)

### Community 26 - "pedigree.ts"
Cohesion: 0.20
Nodes (12): findChildren(), GET(), lookup(), PedigreeResponse, isChampion(), PedigreeTreeNode(), buildAncestorTree(), computeDescendantStats() (+4 more)

### Community 27 - "facilities/service.ts"
Cohesion: 0.14
Nodes (25): DevAction, POST(), POST(), POST(), GET(), POST(), declineMultiplier(), deriveLifeStage() (+17 more)

### Community 28 - "liveCommentary.ts"
Cohesion: 0.13
Nodes (18): LivePage(), handleImpact(), handleReplayEnd(), commentaryForBoutStart(), commentaryForImpact(), commentaryForResult(), CommentaryLine, CRIT_BURSTS (+10 more)

### Community 29 - "simulator.ts"
Cohesion: 0.13
Nodes (24): legalActions(), generateBattleAnalysis(), gainExperience(), updateOpponentModel(), clampFatigue(), fatigueGain(), fatigueRecoveryPerTurn(), fatigueStatMultiplier() (+16 more)

### Community 30 - "ChickenPhysicsRig.tsx"
Cohesion: 0.17
Nodes (18): FighterAnim, ChickenPhysicsRig, ChickenPhysicsRigProps, KNOCKBACK_IMPULSE, KNOCKDOWN_RECOVER_MS, scaledRecoveryMs(), scaleSpec(), bodyAxis() (+10 more)

### Community 31 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss (+11 more)

### Community 32 - "roosterGenome.ts"
Cohesion: 0.15
Nodes (16): applyGenome(), breed(), clamp(), DEFAULT_COLORS, defaultGenome(), gauss(), Genome, MaterialKey (+8 more)

### Community 33 - "genetic-system.md"
Cohesion: 0.03
Nodes (62): 11. MUTATION TRAITS, 13. MUTATION BLOODLINES, 14. GENERATIONAL BREEDING, 15. PEDIGREE SYSTEM, 16. INBREEDING SYSTEM, 17. GENETIC INSTABILITY, 18. POSITIVE AND NEGATIVE MUTATIONS, 19. GENETIC TRAITS VS ACTUAL STATS (+54 more)

### Community 34 - "ChickenModel.tsx"
Cohesion: 0.16
Nodes (17): applyHenOverride(), applyProportions(), applyVisualTraits(), BONE_PARENT, ChickenModel(), DEFAULT_PHYSICAL_BLOCK, installPatternShader(), PATTERN_TYPES (+9 more)

### Community 35 - "ParentCard.tsx"
Cohesion: 0.24
Nodes (7): BreedPageContent(), ParentCard(), ROLE_RIBBON, SEX_ICON, STAT_ICON, canBreed(), topRarity()

### Community 36 - "BattleStage3D.tsx"
Cohesion: 0.13
Nodes (16): ArenaGround(), useDirtTexture(), ArenaPhysics(), ANIM_PX_TO_WORLD, BattleStage3D(), CameraCue, DirectedCamera(), heuristicCue() (+8 more)

### Community 37 - "traits.ts"
Cohesion: 0.25
Nodes (8): CALM, IRON_STAMINA, inheritTraits(), pickWeightedTrait(), RARITY_WEIGHT, Rng, TRAIT_POOL, Trait

### Community 38 - "roosterGenerator.ts"
Cohesion: 0.24
Nodes (14): calculateOdds(), clamp(), COLOR_PALETTES, createRooster(), cryptoSafeId(), generateRandomRooster(), generateStatPool(), getStatTotal() (+6 more)

### Community 39 - "dependencies"
Cohesion: 0.12
Nodes (17): next, dependencies, next, @prisma/client, react, react-dom, @react-three/drei, @react-three/fiber (+9 more)

### Community 40 - "db.ts"
Cohesion: 0.16
Nodes (13): POST(), GET(), GET(), POST(), POST(), generateUniqueChickName(), generateUniqueRandomChicken(), globalForPrisma (+5 more)

### Community 41 - "MatchupScreen.tsx"
Cohesion: 0.22
Nodes (11): Phase, FighterPlate(), MatchupScreen(), mockOpponentRecord(), RANK_TITLE, rankTitle(), seededRng(), STAT_LABEL (+3 more)

### Community 42 - "coopVillage.ts"
Cohesion: 0.23
Nodes (11): CoopChicken(), CENTER, getVillageSlot(), hashString(), personalityModifiers, RING_SIZES, STYLE_MODIFIERS, VILLAGE_CAPACITY (+3 more)

### Community 43 - "growth.ts"
Cohesion: 0.23
Nodes (13): ChickenCard(), CoopSelectionPanel(), SEX_ICON, isChampion(), BREEDABLE_STAGES, canAgeUp(), canBattle(), canRetire() (+5 more)

### Community 44 - "Chicken"
Cohesion: 0.23
Nodes (10): FightResponse, Phase, Phase, PLACEMENT_LABEL, ROUND_LABELS, CombatResultsScreen(), CombatResultsScreenProps, OUTCOME_LABEL (+2 more)

### Community 45 - "combat.test.ts"
Cohesion: 0.57
Nodes (3): makeChicken(), physicalBlock(), statBlock()

### Community 46 - "GrowthStage"
Cohesion: 0.22
Nodes (8): POST(), POST(), retireChicken(), seedChicken(), zeroBlock(), seedChicken(), zeroBlock(), GrowthStage

### Community 47 - "tournament.ts"
Cohesion: 0.24
Nodes (9): handleFight(), opponent(), opponents(), generateBracketOpponents(), PRIZE_TOKENS, runTournament(), TOURNAMENT_SIZE, TournamentPlacement (+1 more)

### Community 48 - "live/page.tsx"
Cohesion: 0.20
Nodes (10): LiveMode, LiveNextResponse, MODE_LABEL, Phase, ComicCommentary(), ComicCommentaryProps, CommentaryBurst, KIND_CLASS (+2 more)

### Community 49 - "cameraDirector.ts"
Cohesion: 0.21
Nodes (10): BattleDebugOverlay(), BattleDebugState, makeDebugState(), CameraCueName, CameraDirectorOpts, CameraImpulse, CueFraming, CUES (+2 more)

### Community 50 - "CoopEnvironment.tsx"
Cohesion: 0.22
Nodes (3): CoopEnvironment(), useVillageGroundTexture(), mulberry32()

### Community 51 - "combatPresentation.ts"
Cohesion: 0.15
Nodes (16): Flash, ImpactVFX, ImpactVFXHandle, Shard, BattlePersonality, AttackId, cameraCueForResult(), FighterSide (+8 more)

### Community 52 - "villageIdle.ts"
Cohesion: 0.33
Nodes (5): BASE_DURATION, STATE_SEQUENCE, VillageAnimState, VillageIdleConfig, VillageIdleFrame

### Community 53 - "coop-redesign-v2.md"
Cohesion: 0.04
Nodes (47): 10. Chicken Actions, 11. Visual Feedback, 12. Chicken Names, 13. Hut Variations, 14. Champion/Veteran Presentation, 15. Eggs, 16. Existing API Functionality, 17. Age Up (+39 more)

### Community 54 - "seed-god-chickens.ts"
Cohesion: 0.29
Nodes (9): FIGHTING_STYLES, PHYSICAL_TRAIT_KEYS, PHYSICAL_TRAIT_RANGE, BLOODLINES, godEvBlock(), godMutationGenome(), godPhysicalBlock(), godStatBlock() (+1 more)

### Community 55 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, backfill:colors, build, db:up, dev, lint, postinstall, seed:god (+3 more)

### Community 56 - "CoopWorld.tsx"
Cohesion: 0.29
Nodes (7): CoopCamera(), IDLE_POS, IDLE_TARGET, CoopHabitat(), HUT_COLORS, CoopWorld(), habitatStyle

### Community 57 - "battlePersonality.ts"
Cohesion: 0.29
Nodes (6): NEUTRAL_PERSONALITY, PERSONALITIES, PersonalityArchetype, personalityForArchetype(), STYLE_TO_ARCHETYPE, FightingStyle

### Community 59 - "combat-system-v2.md"
Cohesion: 0.04
Nodes (46): 10. STAGGER, 11. KNOCKBACK, 12. KNOCKDOWN, 13. DEATH, 14. MISS / DODGE, 15. ATTACKER RECOVERY, 16. COMBAT PACING, 17. COMBO PRESENTATION (+38 more)

### Community 60 - "pve/route.ts"
Cohesion: 0.60
Nodes (3): POST(), isDevModeEnabled(), DevPveAction

### Community 61 - "4. Animation implementations (curve sketches)"
Cohesion: 0.05
Nodes (43): 10.1 Automated (Node built-in test runner, `lib/__tests__/animation.test.ts`), 10.2 Manual in the battle, 10. Testing, 11. Deliverables (final report must cover), 12. Non-goals, 1. Goal, 2.1 Rig, 2.2 Bone axes confirmed from working code (+35 more)

### Community 62 - "gamefowl_dynasty_full_mechanics.md"
Cohesion: 0.05
Nodes (41): 11. Chicken Growth, 13. Training Limits, 14. Vitamins and Consumables, 15. Combat System, 16. Combat Philosophy, 18. Combat AI, 21. Death and Legacy, 22. Animation System (+33 more)

### Community 63 - "GENETIC_STAT_KEYS"
Cohesion: 0.24
Nodes (7): POST(), seedChicken(), statBlock(), seedChicken(), statBlock(), canAffordTraining(), GENETIC_STAT_KEYS

### Community 64 - "TrainingPageContent"
Cohesion: 0.53
Nodes (6): remainingMinutes(), TrainingPageContent(), cancel(), refresh(), startTraining(), upgrade()

### Community 65 - "seed-monochrome-pairs.ts"
Cohesion: 0.48
Nodes (6): balancedStatBlock(), baselinePhysicalBlock(), main(), PAIRS, solidColorScheme(), zeroStatBlock()

### Community 66 - "_smoke_combat_v2.ts"
Cohesion: 0.33
Nodes (6): a, b, r1, r2, runN(), seededRng()

### Community 67 - "market/page.tsx"
Cohesion: 0.38
Nodes (6): fetchMarket(), MarketPage(), handleBuy(), SEX_ICON, MarketListingRow, RARITY_BORDER

### Community 68 - "aging.ts"
Cohesion: 0.50
Nodes (4): totalExperience(), VETERAN_STAGES, veteranExperienceBonus(), CareerLifeStage

### Community 69 - "backfill-color-jitter.ts"
Cohesion: 0.73
Nodes (5): jitterColorScheme(), backfillChickens(), backfillEggs(), backfillMarketListings(), main()

### Community 70 - "Rooster Arena Project"
Cohesion: 0.40
Nodes (5): Agent Rules, Claude Project Context, README, Rooster Arena Project, Serena Project Configuration

### Community 73 - "ChickenCard.tsx"
Cohesion: 0.16
Nodes (17): OffspringPreview(), SEX_ICON, STAGE_COLOR, computeOffspringOdds(), atLeast(), passThroughMissChance(), wildMissChance(), dedupe() (+9 more)

### Community 74 - "5. Combat — where it all converges"
Cohesion: 0.08
Nodes (23): 1.1 StatBlock — the combat "IV" (genetic ceiling), 1.2 PhysicalBlock — 18 body-proportion genes, 1.3 MutationGenome — 6 catalog mutations, 1.4 Cosmetics — breed and color, 1. Genetics, 2.1 `resolvePhysicalProfile()` — 6 bounded multipliers (0.85–1.15, centered on 1.0), 2.2 `traitStatModifier()` — second, independent 0.85–1.15 multiplier per genetic stat, 2. Physical Profile — the genetics→combat compression layer (+15 more)

### Community 75 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 76 - "NOT DONE — remaining spec work"
Cohesion: 0.11
Nodes (17): Cross-cutting, Data model, DONE this session (tested, tsc + lint clean on new files), Medical / Clinic system (spec Phase 4–5), NOT DONE — remaining spec work, Phase 1 gaps — Core Training (spec §5–21, §76–82, §115), Phase 3 — Combat Experience → Training loop (spec §5, §70–72, §129–132), Phase 6 — Facilities split (spec §53–66, §102–105, §118, §122) (+9 more)

### Community 90 - "File Structure"
Cohesion: 0.12
Nodes (16): Execution Handoff, Facilities System — Phase 1: Training Facility Foundation — Implementation Plan, File Structure, Global Constraints, Self-Review Notes, Task 10: Wire up navigation and retire the instant per-stat Train buttons, Task 11: Full verification pass, Task 1: Prisma schema — `Facility` and `TrainingSession` (+8 more)

### Community 91 - "Rooster Arena — Battle Simulator Design Spec"
Cohesion: 0.12
Nodes (16): Architecture, Audio Engine (`lib/audioEngine.ts`), Battle Mechanics (`lib/battleEngine.ts`), BattleEngine Class Design, Compliance & Safety, Core Formula Sheet, Dependencies, File Structure (+8 more)

### Community 92 - "Combat — Design Spec"
Cohesion: 0.12
Nodes (15): API routes, Combat AI / simulation (`lib/combat.ts`, server-side), Combat — Design Spec, Data model, Effective stats, Fighting styles, Hitbox + injuries, Injury recovery (+7 more)

### Community 93 - "Global Constraints"
Cohesion: 0.13
Nodes (14): Genetics + Breeding (+ UI) Implementation Plan, Global Constraints, Task 10: Nav + Coop page, Task 11: Breed page, Task 12: Manual verification, Task 1: Add the `Egg` type, Task 2: Docker Postgres + Prisma schema + migration, Task 3: Prisma client singleton + player helper (+6 more)

### Community 94 - "Global Constraints"
Cohesion: 0.13
Nodes (14): Global Constraints, Self-Review Notes, Task 10: `RoosterTraining` errors + DB service (`lib/training/errors.ts`, `lib/training/service.ts`), Task 11: Wire intensity + `RoosterTraining` into the train route, add the redistribute route, Task 1: Types for the Phase 1 training model, Task 2: `RoosterTraining` Prisma model + migration, Task 3: XP pool crediting (`lib/training/xp.ts`), Task 4: Default state factory + Training Potential (`lib/training/state.ts`, `lib/training/potential.ts`) (+6 more)

### Community 95 - "Training Phase 1 Foundation — Design Spec"
Cohesion: 0.13
Nodes (14): API surface, Breakthroughs (`lib/training/breakthroughs.ts`), Data model, Error handling, Intensity (`lib/training/intensity.ts`), Mechanics, Migration, Scope (+6 more)

### Community 96 - "Hatching & Growth — Design Spec"
Cohesion: 0.15
Nodes (12): API, Data model, Egg → Chicken mapping on hatch, Growth logic (`lib/growth.ts`), `GrowthStage`, Hatching & Growth — Design Spec, `POST /api/chickens/[id]/age-up`, `POST /api/chickens/[id]/retire` (+4 more)

### Community 97 - "Rig genome integration — design spec"
Cohesion: 0.17
Nodes (11): Animation gains (`lib/animation/physicalGenetics.ts`), Breed archetypes (new `lib/breeds.ts`), Color inheritance (`lib/genetics.ts`), Combat coupling (`lib/physicalProfile.ts`, `lib/combat.ts`), Context, Data model (`lib/types.ts`), Mutations (`lib/mutations.ts`), Persistence migration (`prisma/schema.prisma`) (+3 more)

### Community 98 - "VillageView.tsx"
Cohesion: 0.31
Nodes (6): CoopHUD(), CoopMode, EggGrid(), VillageView(), paginateVillage(), Egg

### Community 99 - "65. CORE DESIGN RULES"
Cohesion: 0.18
Nodes (11): 65. CORE DESIGN RULES, Rule 1, Rule 10, Rule 2, Rule 3, Rule 4, Rule 5, Rule 6 (+3 more)

### Community 100 - "Training — Design Spec"
Cohesion: 0.18
Nodes (10): API routes, Core logic (`lib/training.ts`), Data model, `POST /api/chickens/[id]/rest`, `POST /api/chickens/[id]/train`, Scope, Stat mapping, Testing (TDD) (+2 more)

### Community 101 - "effectiveStat"
Cohesion: 0.36
Nodes (9): effectiveStat(), maxHealth(), mutationStatMultiplier(), growthFactor(), clamp(), PhysicalProfile, resolvePhysicalProfile(), toModifier() (+1 more)

### Community 102 - "Genetics + Breeding (+ UI) — Design Spec"
Cohesion: 0.20
Nodes (9): 1. Architecture, 2. Data model (Prisma schema), 3. Genetics inheritance algorithm, 4. Traits, 5. API routes, 6. UI, 7. Testing, Context (+1 more)

### Community 103 - "MVP should contain:"
Cohesion: 0.22
Nodes (9): 54. MVP, Breeding, Chickens, Combat, Economy, Genetics, MVP should contain:, Progression (+1 more)

### Community 104 - "File Structure"
Cohesion: 0.25
Nodes (7): File Structure, Global Constraints, Rooster Arena MVP Implementation Plan, Task 1: Foundation Libraries, Task 2: Selection and Betting UI, Task 3: Battle Arena, Log, Results, and Page Integration, Task 4: Manual Runtime Verification and Polish Fixes

### Community 105 - "Component Design"
Cohesion: 0.25
Nodes (8): `app/page.tsx` — Game State Machine, `BattleArena.tsx`, `BattleLog.tsx`, `BettingPanel.tsx`, Component Design, `ResultsScreen.tsx`, `RoosterSelector.tsx`, `StatsDisplay.tsx` (Reusable)

### Community 106 - "6. Traits"
Cohesion: 0.25
Nodes (8): 6. Traits, Calm, Counter Fighter, Glass Cannon, Heavy Striker, Iron Stamina, Quick Starter, Survivor

### Community 108 - "[bossId]/page.tsx"
Cohesion: 0.47
Nodes (4): BATTLE_STAGES, BossDetailPage(), isEligible(), stars()

### Community 109 - "ChickenViewer.tsx"
Cohesion: 0.47
Nodes (5): acquireCanvasSlot(), ChickenViewer(), releaseCanvasSlot(), SEX_EMOJI, waiters

### Community 110 - "32. SPECIALIZED BLOODLINES"
Cohesion: 0.33
Nodes (6): 32. SPECIALIZED BLOODLINES, COLLECTION BLOODLINE, CRITICAL BLOODLINE, MUTATION BLOODLINE, SPEED BLOODLINE, TANK BLOODLINE

### Community 112 - "27. GENETIC RESEARCH"
Cohesion: 0.40
Nodes (5): 27. GENETIC RESEARCH, Advanced, Beginner, Endgame, Intermediate

### Community 113 - "8. MUTATION SYSTEM"
Cohesion: 0.40
Nodes (5): 8. MUTATION SYSTEM, Color Mutations, Extreme Mutations, Fantasy Mutations, Physical Mutations

### Community 114 - "Error Handling"
Cohesion: 0.40
Nodes (5): Audio, Battle Logic, Canvas Rendering, Error Handling, LocalStorage

### Community 115 - "UI Theme (Tailwind + Custom CSS)"
Cohesion: 0.40
Nodes (5): Color Palette, Components, Layout, Typography, UI Theme (Tailwind + Custom CSS)

### Community 116 - "17. Fighting Styles"
Cohesion: 0.40
Nodes (5): 17. Fighting Styles, Aggressive, Balanced, Counter, Endurance

### Community 117 - "20. Critical Injuries"
Cohesion: 0.40
Nodes (5): 20. Critical Injuries, Critical Injury, Fatal Injury, Minor Injury, Serious Injury

### Community 118 - "33. Monetization"
Cohesion: 0.40
Nodes (5): 33. Monetization, Battle Pass, Convenience, Cosmetics, Premium Facilities

### Community 119 - "36. Breeding Strategy"
Cohesion: 0.40
Nodes (5): 36. Breeding Strategy, Counter Bloodline, Endurance Bloodline, Power Bloodline, Speed Bloodline

### Community 121 - "10. MUTATIONS SHOULD NOT ALWAYS BE STRONGER"
Cohesion: 0.50
Nodes (4): 10. MUTATIONS SHOULD NOT ALWAYS BE STRONGER, Cosmetic mutation, Mixed mutation, Specialized mutation

### Community 122 - "Data Model (`lib/types.ts`)"
Cohesion: 0.50
Nodes (4): Battle Log Entry, Battle Result, Data Model (`lib/types.ts`), Rooster Type

### Community 123 - "Deployment"
Cohesion: 0.50
Nodes (4): Build Output, Deployment, Environment Variables, Vercel (Recommended)

### Community 124 - "Performance Considerations"
Cohesion: 0.50
Nodes (4): Bundle Size, Canvas Optimization, Memory, Performance Considerations

### Community 125 - "Rooster Generation (`lib/roosterGenerator.ts`)"
Cohesion: 0.50
Nodes (4): Color Palette (Dark Neon Theme), Preset Roosters, Random Generation, Rooster Generation (`lib/roosterGenerator.ts`)

### Community 126 - "1. Game Overview"
Cohesion: 0.50
Nodes (4): 1. Game Overview, Core Fantasy, Gamefowl Dynasty — Full Game Mechanics, High-Level Pillars

### Community 127 - "Starter Package"
Cohesion: 0.50
Nodes (4): 2. New Player Experience, Important Design Principle, Starter Chickens, Starter Package

### Community 128 - "32. Tournament Betting / Prediction"
Cohesion: 0.50
Nodes (4): 32. Tournament Betting / Prediction, Option A — No wagering, Option B — Separate tournament tokens, Option C — Regulated Gaming

### Community 129 - "35. Genetic Discovery"
Cohesion: 0.50
Nodes (4): 35. Genetic Discovery, Advanced Laboratory, Basic Inspection, Genetic Analysis

### Community 130 - "4. Genetics System"
Cohesion: 0.50
Nodes (4): 4. Genetics System, EV — Effort/Training Value, Important Rule, IV — Individual Value

### Community 131 - "12. SPONTANEOUS VS INHERITED MUTATIONS"
Cohesion: 0.67
Nodes (3): 12. SPONTANEOUS VS INHERITED MUTATIONS, A. Spontaneous Mutation, B. Inherited Mutation

### Community 132 - "Storage (`lib/storage.ts`)"
Cohesion: 0.67
Nodes (3): Battle History (Optional Enhancement), Credits System, Storage (`lib/storage.ts`)

### Community 133 - "Canvas Rendering (`components/BattleArena.tsx`)"
Cohesion: 0.67
Nodes (3): Canvas Rendering (`components/BattleArena.tsx`), Canvas Setup, Rooster Drawing (`drawRooster()`)

### Community 134 - "Testing Strategy"
Cohesion: 0.67
Nodes (3): Manual Testing Checklist, Testing Strategy, Unit Tests (Future)

### Community 135 - "10. Bloodline System"
Cohesion: 0.67
Nodes (3): 10. Bloodline System, Bloodline Statistics, Dynasty System

### Community 136 - "49. Recommended Technical Architecture"
Cohesion: 0.67
Nodes (3): 49. Recommended Technical Architecture, Backend, Client

### Community 137 - "7. Breeding System"
Cohesion: 0.67
Nodes (3): 7. Breeding System, Breeding Inputs, Breeding Process

## Knowledge Gaps
- **821 isolated node(s):** `Body`, `DevAction`, `LiveMode`, `Phase`, `SEX_ICON` (+816 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 945 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Chicken` connect `Chicken` to `pve/service.ts`, `BattleCanvas.tsx`, `thumbnailCache.ts`, `chickenGenerator.ts`, `medical/service.ts`, `medical.test.ts`, `lib/types.ts`, `ManageView.tsx`, `behavior.ts`, `training.ts`, `chicken/[chickenId]/page.tsx`, `ConditionMonitor.tsx`, `combat.ts`, `getOrCreatePlayer`, `marketplace.ts`, `StatBlock`, `training/page.tsx`, `marketplace-route.test.ts`, `facilities/service.ts`, `simulator.ts`, `ChickenPhysicsRig.tsx`, `ChickenModel.tsx`, `ParentCard.tsx`, `BattleStage3D.tsx`, `db.ts`, `MatchupScreen.tsx`, `coopVillage.ts`, `growth.ts`, `combat.test.ts`, `GrowthStage`, `tournament.ts`, `live/page.tsx`, `CoopWorld.tsx`, `GENETIC_STAT_KEYS`, `aging.ts`, `ChickenCard.tsx`, `VillageView.tsx`, `effectiveStat`, `[bossId]/page.tsx`, `ChickenViewer.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `AudioEngine` to `BattleCanvas.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `getOrCreatePlayer()` connect `getOrCreatePlayer` to `pve/service.ts`, `seed-monochrome-pairs.ts`, `medical/service.ts`, `db.ts`, `genetics.ts`, `GrowthStage`, `seed-god-chickens.ts`, `StatBlock`, `marketplace-route.test.ts`, `facilities/service.ts`, `pve/route.ts`, `GENETIC_STAT_KEYS`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `BattleCanvas()` (e.g. with `.now()` and `.reset()`) actually correct?**
  _`BattleCanvas()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Body`, `DevAction`, `LiveMode` to the rest of the system?**
  _821 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06956521739130435 - nodes in this community are weakly interconnected._
- **Should `pve/service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10661268556005399 - nodes in this community are weakly interconnected._