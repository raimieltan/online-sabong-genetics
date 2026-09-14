# Graph Report - rooster-arena  (2026-09-09)

## Corpus Check
- 331 files · ~289,408 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2413 nodes · 5616 edges · 155 communities (132 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0554249`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- pve/service.ts
- BattleCanvas.tsx
- layout.tsx
- resolution.ts
- combatPresentation.test.ts
- AudioEngine
- chickenGenerator.ts
- medical/service.ts
- compilerOptions
- Strategy Fighter Phase A/B Implementation Plan
- lib/types.ts
- CombatPresentationController
- behavior.ts
- seed-deep-red-black-roster.ts
- training.ts
- chicken/[chickenId]/page.tsx
- ConditionMonitor.tsx
- events.ts
- deriveBehaviorProfile
- build_rooster.mjs
- getOrCreatePlayer
- BattleStage3D.tsx
- [id]/fight/[sessionId]/step/route.ts
- StatBlock
- marketplace.ts
- pedigree.ts
- session.ts
- liveCommentary.ts
- simulator.ts
- ChickenModel.tsx
- devDependencies
- roosterGenome.ts
- genetic-system.md
- genetics.ts
- ChickenCard.tsx
- ChickenPhysicsRig.tsx
- medical.test.ts
- roosterGenerator.ts
- dependencies
- validation-gate-sim.ts
- effectiveStat
- coopVillage.ts
- seed-god-chickens.ts
- battleReport.ts
- breedingPreview.ts
- growth.ts
- tournament/service.ts
- live/page.tsx
- thumbnailCache.ts
- BattleSession
- combat/state.ts
- Strategy Fighter — Design Spec
- coop-redesign-v2.md
- facilities/service.ts
- scripts
- playerStore.ts
- combat.ts
- CameraDirector
- combat-system-v2.md
- battle/[chickenId]/page.tsx
- 4. Animation implementations (curve sketches)
- gamefowl_dynasty_full_mechanics.md
- medical-route.test.ts
- ManageView.tsx
- fight/[chickenId]/page.tsx
- simulateFight
- combat/injuries.ts
- resolve/route.ts
- startBossFight
- Rooster Arena Project
- FacilityError
- CoopPage
- cameraDirector.ts
- 5. Combat — where it all converges
- package.json
- NOT DONE — remaining spec work
- training-sessions/route.ts
- test-ts-loader-hooks.mjs
- eslint.config.mjs
- next.config.ts
- testHelpers.ts
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
- medical/route.ts
- 65. CORE DESIGN RULES
- Training — Design Spec
- [bossId]/fight/[sessionId]/step/route.ts
- Genetics + Breeding (+ UI) — Design Spec
- MVP should contain:
- File Structure
- Component Design
- 6. Traits
- ChickenDetailPageContent
- clinic/page.tsx
- typescript
- 32. SPECIALIZED BLOODLINES
- CoopWorld.tsx
- 27. GENETIC RESEARCH
- 8. MUTATION SYSTEM
- Error Handling
- UI Theme (Tailwind + Custom CSS)
- 17. Fighting Styles
- 20. Critical Injuries
- 33. Monetization
- 36. Breeding Strategy
- CoopEnvironment.tsx
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
- [bossId]/page.tsx
- momentum.ts
- rehab.ts
- chickens/route.ts
- effort.ts
- CoopFilters.tsx
- villageIdle.ts
- aging.ts
- VillageChickenAI

## God Nodes (most connected - your core abstractions)
1. `getOrCreatePlayer()` - 97 edges
2. `Chicken` - 79 edges
3. `prisma` - 55 edges
4. `add()` - 44 edges
5. `StatBlock` - 37 edges
6. `BattleCanvas()` - 34 edges
7. `GENETIC_STAT_KEYS` - 34 edges
8. `effectiveStat()` - 27 edges
9. `combatBase()` - 26 edges
10. `easeOut()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `FighterVisual` --references--> `Chicken`  [EXTRACTED]
  components/BattleCanvas.tsx → lib/types.ts
- `POST()` --calls--> `canBreed()`  [EXTRACTED]
  app/api/breed/route.ts → lib/growth.ts
- `POST()` --calls--> `getOrCreatePlayer()`  [EXTRACTED]
  app/api/breed/route.ts → lib/player.ts
- `POST()` --calls--> `canAgeUp()`  [EXTRACTED]
  app/api/chickens/[id]/age-up/route.ts → lib/growth.ts
- `POST()` --calls--> `nextGrowthStage()`  [EXTRACTED]
  app/api/chickens/[id]/age-up/route.ts → lib/growth.ts

## Import Cycles
- None detected.

## Communities (155 total, 21 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.07
Nodes (87): base(), chargeAttack(), doubleKick(), flyingKick(), heavyKick(), jumpAttack(), peckAttack(), quickKick() (+79 more)

### Community 1 - "pve/service.ts"
Cohesion: 0.15
Nodes (19): GET(), bossPreview(), previousBossId(), PVE_BOSS_LIST, PVE_BOSSES, buildBossFighter(), clamp01(), clampProfile() (+11 more)

### Community 2 - "BattleCanvas.tsx"
Cohesion: 0.06
Nodes (37): aerialPose(), AttackPose, attackPoseFor(), attackStateForMove(), BattleCanvas(), bodyAttackPose(), clamp(), FighterVisual (+29 more)

### Community 3 - "layout.tsx"
Cohesion: 0.20
Nodes (8): bangers, cinzel, geistMono, geistSans, metadata, LINKS, Sidebar(), SOON_LINKS

### Community 4 - "resolution.ts"
Cohesion: 0.11
Nodes (31): adaptationCounterBonus(), experienceConfidenceBonus(), fatigueAccuracyPenalty(), fatigueDecisionPenalty(), fatigueStatMultiplier(), rollCriticalInjury(), clampPosition(), deriveContextState() (+23 more)

### Community 5 - "combatPresentation.test.ts"
Cohesion: 0.09
Nodes (35): BattlePersonality, NEUTRAL_PERSONALITY, PERSONALITIES, PersonalityArchetype, personalityForArchetype(), STYLE_TO_ARCHETYPE, ATTACK_CHOREOGRAPHY, ATTACK_PHASES (+27 more)

### Community 6 - "AudioEngine"
Cohesion: 0.10
Nodes (10): AudioContextCtor, AudioEngine, getAudioContextCtor(), VICTORY_FREQUENCIES, FakeAudioContext, makeFakeAudioNode(), makeFakeAudioParam(), makeFakeFilterNode() (+2 more)

### Community 7 - "chickenGenerator.ts"
Cohesion: 0.09
Nodes (38): POST(), BREED_IDS, BREED_PRESETS, BreedId, BreedPreset, pickRandomBreed(), createChicken(), CreateChickenInput (+30 more)

### Community 8 - "medical/service.ts"
Cohesion: 0.19
Nodes (17): MAX_HEALTH, canTreatSeverity(), CLINIC_LEVELS, CLINIC_MAX_LEVEL, CLINIC_UPGRADE_COST, clinicConfig(), ClinicLevelConfig, SEVERITY_RANK (+9 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 10 - "Strategy Fighter Phase A/B Implementation Plan"
Cohesion: 0.10
Nodes (19): Execution Handoff, Global Constraints, Self-Review Notes (already applied above, recorded per writing-plans skill), Strategy Fighter Phase A/B Implementation Plan, Task 10: `CombatInactivity` — graduated anti-stalemate pressure + `FORCE_ENGAGEMENT`, Task 11: Momentum wired to hit-stop (juice), Task 12: `simulateBattle` coach hook — CP regen + pending-command lifecycle, Task 13: Auto-Coach default policy (+11 more)

### Community 11 - "lib/types.ts"
Cohesion: 0.12
Nodes (16): seedEgg(), zeroBlock(), BattleLogEntry, BattleResult, Bet, ChickenSex, ChickenStatus, EggStatus (+8 more)

### Community 12 - "CombatPresentationController"
Cohesion: 0.17
Nodes (6): AttackPhase, getChoreography(), isAttackId(), CombatPresentationController, PresentationCallbacks, harness()

### Community 13 - "behavior.ts"
Cohesion: 0.15
Nodes (19): chooseAction(), clamp01(), driftBehaviorProfile(), Rng, scoreAction(), clamp01(), COMMAND_ACTIVE_TURNS, COMMAND_POINT_REGEN_TURNS (+11 more)

### Community 14 - "seed-deep-red-black-roster.ts"
Cohesion: 0.05
Nodes (42): Rng, CALM, IRON_STAMINA, creditXp(), XP_PER_SESSION, XP_POOLS_BY_CATEGORY, pickWeightedTrait(), RARITY_WEIGHT (+34 more)

### Community 15 - "training.ts"
Cohesion: 0.14
Nodes (23): POST(), declineMultiplier(), canAffordTraining(), applyDevelopment(), CATEGORY_PRIMARY_STAT, CATEGORY_TRADEOFF_STAT, ENERGY_PER_TRAIN, EV_PER_TRAIN (+15 more)

### Community 16 - "chicken/[chickenId]/page.tsx"
Cohesion: 0.12
Nodes (16): BEHAVIOR_ICON, EXPERIENCE_ICON, MUTATION_RARITY_COLOR, MUTATION_RARITY_GEM, PHYSICAL_ICON, SEX_ICON, STAT_ICON, Tab (+8 more)

### Community 17 - "ConditionMonitor.tsx"
Cohesion: 0.14
Nodes (23): remainingMinutes(), TrainingPageContent(), cancel(), refresh(), startTraining(), upgrade(), band(), BAR_TONE (+15 more)

### Community 18 - "events.ts"
Cohesion: 0.22
Nodes (7): CombatEvent, STYLE_POLICIES, StylePolicy, styleWeight(), COMBAT_ACTIONS, CombatContextState, CombatDistance

### Community 19 - "deriveBehaviorProfile"
Cohesion: 0.16
Nodes (17): deriveBehaviorProfile(), hasTrait(), clamp01(), clampProfile(), generatePveOpponent(), pickPveEncounter(), PVE_ENCOUNTER_LIST, PVE_ENCOUNTERS (+9 more)

### Community 20 - "build_rooster.mjs"
Cohesion: 0.14
Nodes (16): B, F(), feather(), gradY(), leg(), loft(), MATS, paint() (+8 more)

### Community 21 - "getOrCreatePlayer"
Cohesion: 0.09
Nodes (31): POST(), POST(), POST(), POST(), POST(), GET(), GET(), POST() (+23 more)

### Community 22 - "BattleStage3D.tsx"
Cohesion: 0.10
Nodes (22): ArenaGround(), useDirtTexture(), ArenaPhysics(), ANIM_PX_TO_WORLD, BattleStage3D(), DirectedCamera(), heuristicCue(), IDLE_LOOKAT (+14 more)

### Community 23 - "[id]/fight/[sessionId]/step/route.ts"
Cohesion: 0.27
Nodes (7): POST(), StepBody, applyFightOutcome(), endBattleSession(), getBattleSession(), sessions, MAX_TURNS

### Community 24 - "StatBlock"
Cohesion: 0.12
Nodes (22): POST(), seedChicken(), statBlock(), seedChicken(), statBlock(), seedChicken(), statBlock(), REDISTRIBUTE_CREDITS_PER_POINT (+14 more)

### Community 25 - "marketplace.ts"
Cohesion: 0.28
Nodes (11): POST(), GET(), generateListing(), listingToChicken(), MARKET_STOCK_SIZE, MarketListingRow, sellPrice(), seedChicken() (+3 more)

### Community 26 - "pedigree.ts"
Cohesion: 0.20
Nodes (12): findChildren(), GET(), lookup(), PedigreeResponse, isChampion(), PedigreeTreeNode(), buildAncestorTree(), computeDescendantStats() (+4 more)

### Community 27 - "session.ts"
Cohesion: 0.16
Nodes (17): BONUS_EV_ON_BREAKTHROUGH, BREAKTHROUGH_BASE_CHANCE, BREAKTHROUGH_MILESTONE_BONUS, checkOvertrainedTrigger(), crossedMilestone(), Rng, rollBreakthrough(), TRAINING_TRAIT_POOL (+9 more)

### Community 28 - "liveCommentary.ts"
Cohesion: 0.09
Nodes (24): handleImpact(), handleReplayEnd(), clampStepDelay(), COMMAND_LABEL, Phase, Snapshot, SparPage(), StartResponse (+16 more)

### Community 29 - "simulator.ts"
Cohesion: 0.11
Nodes (24): ACTION_DEFINITIONS, ALL_ACTIONS, legalActions(), LOW_COMMITMENT_ACTIONS, generateBattleAnalysis(), clampFatigue(), fatigueGain(), fatigueRecoveryPerTurn() (+16 more)

### Community 30 - "ChickenModel.tsx"
Cohesion: 0.17
Nodes (17): applyHenOverride(), applyProportions(), applyVisualTraits(), BONE_PARENT, ChickenModel(), DEFAULT_PHYSICAL_BLOCK, installPatternShader(), PATTERN_TYPES (+9 more)

### Community 31 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss (+11 more)

### Community 32 - "roosterGenome.ts"
Cohesion: 0.15
Nodes (16): applyGenome(), breed(), clamp(), DEFAULT_COLORS, defaultGenome(), gauss(), Genome, MaterialKey (+8 more)

### Community 33 - "genetic-system.md"
Cohesion: 0.03
Nodes (62): 11. MUTATION TRAITS, 13. MUTATION BLOODLINES, 14. GENERATIONAL BREEDING, 15. PEDIGREE SYSTEM, 16. INBREEDING SYSTEM, 17. GENETIC INSTABILITY, 18. POSITIVE AND NEGATIVE MUTATIONS, 19. GENETIC TRAITS VS ACTUAL STATS (+54 more)

### Community 34 - "genetics.ts"
Cohesion: 0.16
Nodes (26): POST(), clamp(), COLOR_KEYS, driftRgb(), hasAllele(), hexToRgb(), hslToRgb(), inheritColorHex() (+18 more)

### Community 35 - "ChickenCard.tsx"
Cohesion: 0.16
Nodes (17): OffspringPreview(), ParentCard(), ROLE_RIBBON, SEX_ICON, STAT_ICON, SEX_ICON, STAGE_COLOR, fetchMarket() (+9 more)

### Community 36 - "ChickenPhysicsRig.tsx"
Cohesion: 0.11
Nodes (26): FighterAnim, ChickenPhysicsHandle, ChickenPhysicsRig, ChickenPhysicsRigProps, KNOCKBACK_IMPULSE, KNOCKDOWN_RECOVER_MS, scaledRecoveryMs(), scaleSpec() (+18 more)

### Community 37 - "medical.test.ts"
Cohesion: 0.14
Nodes (18): recoverCondition(), TIER_STAT_MULTIPLIER, tickInjuryRecovery(), createIllness(), ILLNESS_LABELS, nextId(), RECOVERY_CYCLES, Rng (+10 more)

### Community 38 - "roosterGenerator.ts"
Cohesion: 0.22
Nodes (15): calculateOdds(), clamp(), COLOR_PALETTES, createRooster(), cryptoSafeId(), generateRandomRooster(), generateStatPool(), getStatTotal() (+7 more)

### Community 39 - "dependencies"
Cohesion: 0.12
Nodes (17): next, dependencies, next, @prisma/client, react, react-dom, @react-three/drei, @react-three/fiber (+9 more)

### Community 40 - "validation-gate-sim.ts"
Cohesion: 0.16
Nodes (17): POST(), StepBody, autoCoachPolicy(), CoachFn, CoachObservation, simulateBattle(), createSparSession(), endSparSession() (+9 more)

### Community 41 - "effectiveStat"
Cohesion: 0.23
Nodes (13): FighterPlate(), MatchupScreen(), mockOpponentRecord(), RANK_TITLE, rankTitle(), seededRng(), STAT_LABEL, StatCompareRow() (+5 more)

### Community 42 - "coopVillage.ts"
Cohesion: 0.23
Nodes (11): CoopChicken(), CENTER, hashString(), isChampion(), personalityModifiers, RING_SIZES, STYLE_MODIFIERS, VILLAGE_CAPACITY (+3 more)

### Community 43 - "seed-god-chickens.ts"
Cohesion: 0.21
Nodes (13): FightingStyle, BLOODLINES, godEvBlock(), godMutationGenome(), godPhysicalBlock(), godStatBlock(), main(), balancedStatBlock() (+5 more)

### Community 44 - "battleReport.ts"
Cohesion: 0.14
Nodes (13): BattleReportPanel(), EXPERIENCE_ICON, CombatResultsScreenProps, OUTCOME_LABEL, BattleReport, buildBattleReport(), nonZeroCategories(), FightOutcomeUpdate (+5 more)

### Community 45 - "breedingPreview.ts"
Cohesion: 0.24
Nodes (10): computeOffspringOdds(), atLeast(), passThroughMissChance(), wildMissChance(), dedupe(), OffspringOdds, WILD_RARITY_WEIGHT, WILD_TOTAL_WEIGHT (+2 more)

### Community 46 - "growth.ts"
Cohesion: 0.19
Nodes (15): BreedPageContent(), ChickenCard(), CoopSelectionPanel(), SEX_ICON, canFight(), BREEDABLE_STAGES, canAgeUp(), canBattle() (+7 more)

### Community 47 - "tournament/service.ts"
Cohesion: 0.07
Nodes (45): GET(), POST(), POST(), GET(), Phase, PLACEMENT_LABEL, TournamentPage(), currentOpponentEntrant() (+37 more)

### Community 48 - "live/page.tsx"
Cohesion: 0.14
Nodes (16): LiveMatchupResponse, LiveMode, LiveResolveResponse, MODE_LABEL, Phase, BettingPanel(), Props, ComicCommentary() (+8 more)

### Community 49 - "thumbnailCache.ts"
Cohesion: 0.16
Nodes (18): ChickenThumbnail(), SEX_EMOJI, cache, getThumbnail(), Listener, listeners, nextQueued(), queue (+10 more)

### Community 50 - "BattleSession"
Cohesion: 0.33
Nodes (7): POST(), POST(), BattleCanvasProps, PlayerCommand, createBattleSession(), BattleSession, CombatLogEntry

### Community 51 - "combat/state.ts"
Cohesion: 0.13
Nodes (21): ARCHETYPE_PROFILES, DecisionContext, emptyExperience(), emptyOpponentModel(), gainExperience(), updateOpponentModel(), applyMentalState(), clamp01() (+13 more)

### Community 52 - "Strategy Fighter — Design Spec"
Cohesion: 0.17
Nodes (11): Auto-Coach (first-class from Phase A), Cuts and reshapes from the original brainstorm (with reasoning), Deferred — not designed further until the gate above is passed, Design goal, Explicitly not addressed here, Phase A/B validation gate — the only thing that gets built before a decision, Phase A — Dynamic Styles (net-new), Phase B — Combat State (net-new + wiring) (+3 more)

### Community 53 - "coop-redesign-v2.md"
Cohesion: 0.04
Nodes (47): 10. Chicken Actions, 11. Visual Feedback, 12. Chicken Names, 13. Hut Variations, 14. Champion/Veteran Presentation, 15. Eggs, 16. Existing API Functionality, 17. Age Up (+39 more)

### Community 54 - "facilities/service.ts"
Cohesion: 0.17
Nodes (15): FacilityViewDTO, SessionDTO, isProgramUnlocked(), TRAINING_GYM_LEVELS, TRAINING_GYM_MAX_LEVEL, TRAINING_GYM_UPGRADES, TRAINING_PROGRAMS, FACILITY_TYPES (+7 more)

### Community 55 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, backfill:colors, build, db:up, dev, lint, postinstall, seed:god (+5 more)

### Community 56 - "playerStore.ts"
Cohesion: 0.22
Nodes (11): TopBar(), mockPlayer, emit(), getPlayerSnapshot(), Listener, listeners, PlayerSnapshot, refreshPlayer() (+3 more)

### Community 57 - "combat.ts"
Cohesion: 0.19
Nodes (12): battleAftermath, clamp(), BATTLE_SCARRED_TRAIT, evaluateBattleTraits(), hasTrait(), severeInjuryCount(), VETERAN_TRAIT, MAX_HEALTH (+4 more)

### Community 59 - "combat-system-v2.md"
Cohesion: 0.04
Nodes (46): 10. STAGGER, 11. KNOCKBACK, 12. KNOCKDOWN, 13. DEATH, 14. MISS / DODGE, 15. ATTACKER RECOVERY, 16. COMBAT PACING, 17. COMBO PRESENTATION (+38 more)

### Community 60 - "battle/[chickenId]/page.tsx"
Cohesion: 0.14
Nodes (8): BattlePage(), clampStepDelay(), COMMAND_LABEL, Phase, Snapshot, StartResponse, StepResponse, PveEncounterDefinition

### Community 61 - "4. Animation implementations (curve sketches)"
Cohesion: 0.05
Nodes (43): 10.1 Automated (Node built-in test runner, `lib/__tests__/animation.test.ts`), 10.2 Manual in the battle, 10. Testing, 11. Deliverables (final report must cover), 12. Non-goals, 1. Goal, 2.1 Rig, 2.2 Bone axes confirmed from working code (+35 more)

### Community 62 - "gamefowl_dynasty_full_mechanics.md"
Cohesion: 0.05
Nodes (41): 11. Chicken Growth, 13. Training Limits, 14. Vitamins and Consumables, 15. Combat System, 16. Combat Philosophy, 18. Combat AI, 21. Death and Legacy, 22. Animation System (+33 more)

### Community 63 - "medical-route.test.ts"
Cohesion: 0.36
Nodes (4): GET(), rosterMedicalOverview(), seedInjuredChicken(), statBlock()

### Community 64 - "ManageView.tsx"
Cohesion: 0.25
Nodes (9): CoopHUD(), CoopMode, EggGrid(), ManageView(), VillageView(), DEFAULT_COOP_FILTERS, filterChickens(), paginateVillage() (+1 more)

### Community 65 - "fight/[chickenId]/page.tsx"
Cohesion: 0.15
Nodes (9): BossFightPage(), COMMAND_LABEL, Phase, Snapshot, stars(), StartResponse, StepResponse, CombatResultsScreen() (+1 more)

### Community 66 - "simulateFight"
Cohesion: 0.22
Nodes (11): simulateFight(), clamp(), estimateOdds(), LiveOdds, toOdds(), a, b, r1 (+3 more)

### Community 67 - "combat/injuries.ts"
Cohesion: 0.28
Nodes (7): createInjuryRecord(), CRITICAL_HIT_ZONES, nextInjuryId(), RECOVERY_TURNS, Rng, rollInjurySeverity(), SEVERITY_LABELS

### Community 68 - "resolve/route.ts"
Cohesion: 0.24
Nodes (12): POST(), BetBody, POST(), POST(), ResolveBody, BATTLE_WIN_CREDITS, canAfford(), earnCredits() (+4 more)

### Community 69 - "startBossFight"
Cohesion: 0.24
Nodes (9): POST(), POST(), getBoss(), PveError, PveErrorCode, STATUS_BY_CODE, DevPveAction, runDevPveAction() (+1 more)

### Community 70 - "Rooster Arena Project"
Cohesion: 0.40
Nodes (5): Agent Rules, Claude Project Context, README, Rooster Arena Project, Serena Project Configuration

### Community 71 - "FacilityError"
Cohesion: 0.24
Nodes (9): POST(), POST(), FacilityError, FacilityErrorCode, STATUS_BY_CODE, cancelTrainingSession(), facilityView(), resolveCategory() (+1 more)

### Community 73 - "cameraDirector.ts"
Cohesion: 0.19
Nodes (11): BattleDebugOverlay(), BattleDebugState, makeDebugState(), CameraCue, CameraCueName, CameraDirectorOpts, CameraImpulse, CueFraming (+3 more)

### Community 74 - "5. Combat — where it all converges"
Cohesion: 0.08
Nodes (23): 1.1 StatBlock — the combat "IV" (genetic ceiling), 1.2 PhysicalBlock — 18 body-proportion genes, 1.3 MutationGenome — 6 catalog mutations, 1.4 Cosmetics — breed and color, 1. Genetics, 2.1 `resolvePhysicalProfile()` — 6 bounded multipliers (0.85–1.15, centered on 1.0), 2.2 `traitStatModifier()` — second, independent 0.85–1.15 multiplier per genetic stat, 2. Physical Profile — the genetics→combat compression layer (+15 more)

### Community 75 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 76 - "NOT DONE — remaining spec work"
Cohesion: 0.11
Nodes (17): Cross-cutting, Data model, DONE this session (tested, tsc + lint clean on new files), Medical / Clinic system (spec Phase 4–5), NOT DONE — remaining spec work, Phase 1 gaps — Core Training (spec §5–21, §76–82, §115), Phase 3 — Combat Experience → Training loop (spec §5, §70–72, §129–132), Phase 6 — Facilities split (spec §53–66, §102–105, §118, §122) (+9 more)

### Community 77 - "training-sessions/route.ts"
Cohesion: 0.30
Nodes (9): DevAction, POST(), GET(), POST(), isDevModeEnabled(), claimExpiredSessions(), getOrCreateTrainingGym(), startTrainingSession() (+1 more)

### Community 82 - "testHelpers.ts"
Cohesion: 0.33
Nodes (6): healChicken(), MAX_TURNS, rollHitZone(), makeChicken(), physicalBlock(), statBlock()

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

### Community 98 - "medical/route.ts"
Cohesion: 0.23
Nodes (14): Body, GET(), POST(), POST(), MedicalError, MedicalErrorCode, STATUS_BY_CODE, claimExpiredTreatments() (+6 more)

### Community 99 - "65. CORE DESIGN RULES"
Cohesion: 0.18
Nodes (11): 65. CORE DESIGN RULES, Rule 1, Rule 10, Rule 2, Rule 3, Rule 4, Rule 5, Rule 6 (+3 more)

### Community 100 - "Training — Design Spec"
Cohesion: 0.18
Nodes (10): API routes, Core logic (`lib/training.ts`), Data model, `POST /api/chickens/[id]/rest`, `POST /api/chickens/[id]/train`, Scope, Stat mapping, Testing (TDD) (+2 more)

### Community 101 - "[bossId]/fight/[sessionId]/step/route.ts"
Cohesion: 0.27
Nodes (9): POST(), StepBody, BossFightEntry, createBossFightSession(), endBossFightSession(), getBossFightSession(), sessions, finishBossFight() (+1 more)

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

### Community 107 - "ChickenDetailPageContent"
Cohesion: 0.22
Nodes (6): ChickenDetailPageContent(), handleSell(), LivePage(), placeBet(), summarizeCareer(), setPlayerCredits()

### Community 108 - "clinic/page.tsx"
Cohesion: 0.20
Nodes (6): ClinicDTO, ClinicPage(), PILL_TONE, RosterEntry, treatmentRemaining(), MedicalStatus

### Community 110 - "32. SPECIALIZED BLOODLINES"
Cohesion: 0.33
Nodes (6): 32. SPECIALIZED BLOODLINES, COLLECTION BLOODLINE, CRITICAL BLOODLINE, MUTATION BLOODLINE, SPEED BLOODLINE, TANK BLOODLINE

### Community 111 - "CoopWorld.tsx"
Cohesion: 0.27
Nodes (8): CoopCamera(), IDLE_POS, IDLE_TARGET, CoopHabitat(), HUT_COLORS, CoopWorld(), getVillageSlot(), habitatStyle

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

### Community 120 - "CoopEnvironment.tsx"
Cohesion: 0.22
Nodes (3): CoopEnvironment(), useVillageGroundTexture(), mulberry32()

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

### Community 146 - "[bossId]/page.tsx"
Cohesion: 0.27
Nodes (7): BATTLE_STAGES, BossDetailPage(), isEligible(), stars(), PveLadderPage(), stars(), BossListEntry

### Community 147 - "momentum.ts"
Cohesion: 0.27
Nodes (8): clampMomentum(), decayMomentum(), MOMENTUM_MAX, MOMENTUM_MIN, MOMENTUM_RISK_NUDGE_CAP, momentumDelta(), MomentumEvent, momentumRiskNudge()

### Community 148 - "rehab.ts"
Cohesion: 0.22
Nodes (8): isTrainingLocked(), LOCATION_LOCKS, REHAB_LABEL, REHAB_LADDER, rehabStage(), trainingLocks(), InjuryLocation, RehabStage

### Community 149 - "chickens/route.ts"
Cohesion: 0.39
Nodes (5): GET(), GET(), POST(), generateUniqueRandomChicken(), experienceInsights()

### Community 150 - "effort.ts"
Cohesion: 0.50
Nodes (6): effortHeadroom(), MAX_TRAINING_EFFORT_PER_STAT, MAX_TRAINING_EFFORT_TOTAL, redistributeEffort(), spendEffort(), totalSpent()

### Community 151 - "CoopFilters.tsx"
Cohesion: 0.33
Nodes (4): CoopFilters(), STATUS_OPTIONS, CoopFilterState, NO_FILTER

### Community 152 - "villageIdle.ts"
Cohesion: 0.33
Nodes (5): BASE_DURATION, STATE_SEQUENCE, VillageAnimState, VillageIdleConfig, VillageIdleFrame

### Community 153 - "aging.ts"
Cohesion: 0.47
Nodes (5): deriveLifeStage(), totalExperience(), VETERAN_STAGES, veteranExperienceBonus(), CareerLifeStage

## Knowledge Gaps
- **934 isolated node(s):** `StepBody`, `Body`, `DevAction`, `BetBody`, `ResolveBody` (+929 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1082 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Chicken` connect `getOrCreatePlayer` to `pve/service.ts`, `BattleCanvas.tsx`, `chickenGenerator.ts`, `medical/service.ts`, `lib/types.ts`, `training.ts`, `chicken/[chickenId]/page.tsx`, `ConditionMonitor.tsx`, `[bossId]/page.tsx`, `deriveBehaviorProfile`, `chickens/route.ts`, `BattleStage3D.tsx`, `aging.ts`, `marketplace.ts`, `liveCommentary.ts`, `simulator.ts`, `ChickenModel.tsx`, `ChickenCard.tsx`, `ChickenPhysicsRig.tsx`, `medical.test.ts`, `validation-gate-sim.ts`, `effectiveStat`, `coopVillage.ts`, `battleReport.ts`, `growth.ts`, `tournament/service.ts`, `live/page.tsx`, `thumbnailCache.ts`, `BattleSession`, `combat/state.ts`, `facilities/service.ts`, `combat.ts`, `battle/[chickenId]/page.tsx`, `ManageView.tsx`, `fight/[chickenId]/page.tsx`, `simulateFight`, `resolve/route.ts`, `testHelpers.ts`, `[bossId]/fight/[sessionId]/step/route.ts`, `CoopWorld.tsx`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `AudioEngine` to `BattleCanvas.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `getOrCreatePlayer()` connect `getOrCreatePlayer` to `pve/service.ts`, `chickenGenerator.ts`, `lib/types.ts`, `seed-deep-red-black-roster.ts`, `training.ts`, `chickens/route.ts`, `[id]/fight/[sessionId]/step/route.ts`, `StatBlock`, `marketplace.ts`, `genetics.ts`, `seed-god-chickens.ts`, `tournament/service.ts`, `BattleSession`, `medical-route.test.ts`, `resolve/route.ts`, `startBossFight`, `FacilityError`, `training-sessions/route.ts`, `medical/route.ts`, `[bossId]/fight/[sessionId]/step/route.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `StepBody`, `Body`, `DevAction` to the rest of the system?**
  _934 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06687647521636507 - nodes in this community are weakly interconnected._
- **Should `BattleCanvas.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0641025641025641 - nodes in this community are weakly interconnected._
- **Should `resolution.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._