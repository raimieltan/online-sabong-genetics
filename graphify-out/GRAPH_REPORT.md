# Graph Report - rooster-arena  (2026-09-09)

## Corpus Check
- 331 files · ~289,855 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2412 nodes · 5614 edges · 161 communities (138 shown, 21 thin omitted)
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
- command.ts
- seed-deep-red-black-roster.ts
- training.ts
- chicken/[chickenId]/page.tsx
- clinic/page.tsx
- behavior.ts
- combat.ts
- build_rooster.mjs
- getOrCreatePlayer
- BattleStage3D.tsx
- tournament/service.ts
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
- rarity.ts
- ChickenPhysicsRig.tsx
- medical.test.ts
- roosterGenerator.ts
- dependencies
- deriveBehaviorProfile
- battle/[chickenId]/page.tsx
- coopVillage.ts
- seed-god-chickens.ts
- battleReport.ts
- seed-strategy-fighter-roster.ts
- growth.ts
- tournament.ts
- live/page.tsx
- thumbnailCache.ts
- Chicken
- combat/state.ts
- Strategy Fighter — Design Spec
- coop-redesign-v2.md
- facilities/service.ts
- scripts
- playerStore.ts
- Trait
- CameraDirector
- combat-system-v2.md
- BattlePage
- 4. Animation implementations (curve sketches)
- gamefowl_dynasty_full_mechanics.md
- GrowthStage
- VillageView.tsx
- fight/[chickenId]/page.tsx
- _smoke_combat_v2.ts
- combat/injuries.ts
- [id]/fight/[sessionId]/step/route.ts
- [bossId]/fight/[sessionId]/step/route.ts
- Rooster Arena Project
- FacilityError
- CoopPage
- cameraDirector.ts
- 5. Combat — where it all converges
- package.json
- NOT DONE — remaining spec work
- defaultTrainingState
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
- CombatAction
- Genetics + Breeding (+ UI) — Design Spec
- MVP should contain:
- File Structure
- Component Design
- 6. Traits
- simulateFight
- marketplace-route.test.ts
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
- TournamentPage
- rehab.ts
- db.ts
- effort.ts
- ManageView.tsx
- villageIdle.ts
- balance-sim.ts
- retire-route.test.ts
- InjuryRecord
- seed-monochrome-pairs.ts
- train/route.ts
- TrainingPageContent
- combat/tells.ts
- backfill-color-jitter.ts

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
- `POST()` --calls--> `canBreed()`  [EXTRACTED]
  app/api/breed/route.ts → lib/growth.ts
- `POST()` --calls--> `getOrCreatePlayer()`  [EXTRACTED]
  app/api/breed/route.ts → lib/player.ts
- `POST()` --calls--> `canAgeUp()`  [EXTRACTED]
  app/api/chickens/[id]/age-up/route.ts → lib/growth.ts
- `POST()` --calls--> `nextGrowthStage()`  [EXTRACTED]
  app/api/chickens/[id]/age-up/route.ts → lib/growth.ts
- `POST()` --calls--> `getOrCreatePlayer()`  [EXTRACTED]
  app/api/chickens/[id]/age-up/route.ts → lib/player.ts

## Import Cycles
- None detected.

## Communities (161 total, 21 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.07
Nodes (88): base(), chargeAttack(), doubleKick(), flyingKick(), heavyKick(), jumpAttack(), peckAttack(), quickKick() (+80 more)

### Community 1 - "pve/service.ts"
Cohesion: 0.15
Nodes (19): previousBossId(), PVE_BOSS_LIST, PVE_BOSSES, BossFightEntry, createBossFightSession(), endBossFightSession(), sessions, buildBossFighter() (+11 more)

### Community 2 - "BattleCanvas.tsx"
Cohesion: 0.06
Nodes (40): aerialPose(), AttackPose, attackPoseFor(), attackStateForMove(), BattleCanvas(), bodyAttackPose(), clamp(), FloatingText (+32 more)

### Community 3 - "layout.tsx"
Cohesion: 0.15
Nodes (12): bangers, cinzel, geistMono, geistSans, metadata, nextQueued(), resolveThumbnail(), subscribeQueue() (+4 more)

### Community 4 - "resolution.ts"
Cohesion: 0.11
Nodes (30): adaptationCounterBonus(), fatigueDecisionPenalty(), rollCriticalInjury(), momentumDelta(), clampPosition(), deriveContextState(), DISTANCE_ORDER, POSITION_MAX (+22 more)

### Community 5 - "combatPresentation.test.ts"
Cohesion: 0.08
Nodes (35): BattlePersonality, NEUTRAL_PERSONALITY, PERSONALITIES, PersonalityArchetype, personalityForArchetype(), STYLE_TO_ARCHETYPE, ATTACK_CHOREOGRAPHY, ATTACK_PHASES (+27 more)

### Community 6 - "AudioEngine"
Cohesion: 0.10
Nodes (10): AudioContextCtor, AudioEngine, getAudioContextCtor(), VICTORY_FREQUENCIES, FakeAudioContext, makeFakeAudioNode(), makeFakeAudioParam(), makeFakeFilterNode() (+2 more)

### Community 7 - "chickenGenerator.ts"
Cohesion: 0.11
Nodes (29): BREED_IDS, BREED_PRESETS, BreedId, BreedPreset, pickRandomBreed(), createChicken(), CreateChickenInput, cryptoSafeId() (+21 more)

### Community 8 - "medical/service.ts"
Cohesion: 0.22
Nodes (15): canTreatSeverity(), CLINIC_LEVELS, CLINIC_MAX_LEVEL, CLINIC_UPGRADE_COST, clinicConfig(), ClinicLevelConfig, SEVERITY_RANK, severityRank() (+7 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 10 - "Strategy Fighter Phase A/B Implementation Plan"
Cohesion: 0.10
Nodes (19): Execution Handoff, Global Constraints, Self-Review Notes (already applied above, recorded per writing-plans skill), Strategy Fighter Phase A/B Implementation Plan, Task 10: `CombatInactivity` — graduated anti-stalemate pressure + `FORCE_ENGAGEMENT`, Task 11: Momentum wired to hit-stop (juice), Task 12: `simulateBattle` coach hook — CP regen + pending-command lifecycle, Task 13: Auto-Coach default policy (+11 more)

### Community 11 - "lib/types.ts"
Cohesion: 0.12
Nodes (23): mutationStatMultiplier(), getMutationDefinition(), MUTATION_IDS, MUTATION_POOL, MutationDefinition, clamp(), resolvePhysicalProfile(), toModifier() (+15 more)

### Community 12 - "CombatPresentationController"
Cohesion: 0.17
Nodes (6): BattleDebugState, AttackChoreography, AttackPhase, CombatPresentationController, PresentationCallbacks, harness()

### Community 13 - "command.ts"
Cohesion: 0.18
Nodes (13): clamp01(), COMMAND_ACTIVE_TURNS, COMMAND_POINT_REGEN_TURNS, COMMAND_POINTS_MAX, COMMAND_TARGET_ACTIONS, complianceFactor(), CombatIdentity, deriveCombatIdentity() (+5 more)

### Community 14 - "seed-deep-red-black-roster.ts"
Cohesion: 0.10
Nodes (20): XP_PER_SESSION, XP_POOLS_BY_CATEGORY, RoosterTrainingState, XpPool, Bred, buildTrainingState(), CINDERFALL_SCHEME, EMBER_WARD_SCHEME (+12 more)

### Community 15 - "training.ts"
Cohesion: 0.13
Nodes (23): declineMultiplier(), deriveLifeStage(), totalExperience(), VETERAN_STAGES, veteranExperienceBonus(), applyDevelopment(), CATEGORY_PRIMARY_STAT, CATEGORY_TRADEOFF_STAT (+15 more)

### Community 16 - "chicken/[chickenId]/page.tsx"
Cohesion: 0.09
Nodes (18): BEHAVIOR_ICON, ChickenDetailPageContent(), handleSell(), EXPERIENCE_ICON, MUTATION_RARITY_COLOR, MUTATION_RARITY_GEM, PHYSICAL_ICON, SEX_ICON (+10 more)

### Community 17 - "clinic/page.tsx"
Cohesion: 0.11
Nodes (24): ClinicDTO, ClinicPage(), PILL_TONE, RosterEntry, treatmentRemaining(), band(), BAR_TONE, ConditionMonitor() (+16 more)

### Community 18 - "behavior.ts"
Cohesion: 0.20
Nodes (12): chooseAction(), Rng, scoreAction(), commandActionModifier(), inactivityPressureBonus(), shouldForceEngagement(), STALEMATE_TURNS, STYLE_POLICIES (+4 more)

### Community 19 - "combat.ts"
Cohesion: 0.16
Nodes (18): clamp01(), driftBehaviorProfile(), healChicken(), generateMatchedOpponent(), totalEffectiveStats(), MAX_HEALTH, MAX_TURNS, clamp01() (+10 more)

### Community 20 - "build_rooster.mjs"
Cohesion: 0.14
Nodes (16): B, F(), feather(), gradY(), leg(), loft(), MATS, paint() (+8 more)

### Community 21 - "getOrCreatePlayer"
Cohesion: 0.17
Nodes (11): POST(), GET(), GET(), GET(), GET(), getOrCreateTrainingGym(), getOrCreatePlayer(), seedChicken() (+3 more)

### Community 22 - "BattleStage3D.tsx"
Cohesion: 0.10
Nodes (22): ArenaGround(), useDirtTexture(), ArenaPhysics(), ANIM_PX_TO_WORLD, BattleStage3D(), DirectedCamera(), heuristicCue(), IDLE_LOOKAT (+14 more)

### Community 23 - "tournament/service.ts"
Cohesion: 0.17
Nodes (18): POST(), GET(), hasActiveInjury(), finalHealthPercent(), createTournament(), STATUS, TournamentError, TournamentErrorCode (+10 more)

### Community 24 - "StatBlock"
Cohesion: 0.15
Nodes (16): POST(), seedInjuredChicken(), statBlock(), seedChicken(), statBlock(), seedChicken(), statBlock(), REDISTRIBUTE_CREDITS_PER_POINT (+8 more)

### Community 25 - "marketplace.ts"
Cohesion: 0.20
Nodes (14): GET(), fetchMarket(), MarketPage(), handleBuy(), SEX_ICON, generateListing(), listingToChicken(), MARKET_STOCK_SIZE (+6 more)

### Community 26 - "pedigree.ts"
Cohesion: 0.22
Nodes (11): findChildren(), GET(), lookup(), PedigreeResponse, isChampion(), PedigreeTreeNode(), buildAncestorTree(), computeDescendantStats() (+3 more)

### Community 27 - "session.ts"
Cohesion: 0.16
Nodes (17): BONUS_EV_ON_BREAKTHROUGH, BREAKTHROUGH_BASE_CHANCE, BREAKTHROUGH_MILESTONE_BONUS, checkOvertrainedTrigger(), crossedMilestone(), Rng, rollBreakthrough(), TRAINING_TRAIT_POOL (+9 more)

### Community 28 - "liveCommentary.ts"
Cohesion: 0.09
Nodes (24): handleImpact(), handleReplayEnd(), clampStepDelay(), COMMAND_LABEL, Phase, Snapshot, SparPage(), StartResponse (+16 more)

### Community 29 - "simulator.ts"
Cohesion: 0.11
Nodes (23): BattleCanvasProps, generateBattleAnalysis(), clampFatigue(), fatigueAccuracyPenalty(), fatigueGain(), fatigueRecoveryPerTurn(), fatigueStatMultiplier(), clampMomentum() (+15 more)

### Community 30 - "ChickenModel.tsx"
Cohesion: 0.18
Nodes (16): applyHenOverride(), applyProportions(), applyVisualTraits(), BONE_PARENT, ChickenModel(), DEFAULT_PHYSICAL_BLOCK, installPatternShader(), PATTERN_TYPES (+8 more)

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
Cohesion: 0.21
Nodes (21): POST(), clamp(), COLOR_KEYS, driftRgb(), hasAllele(), hexToRgb(), hslToRgb(), inheritColorHex() (+13 more)

### Community 35 - "rarity.ts"
Cohesion: 0.12
Nodes (20): OffspringPreview(), BreedPageContent(), ParentCard(), ROLE_RIBBON, SEX_ICON, STAT_ICON, computeOffspringOdds(), atLeast() (+12 more)

### Community 36 - "ChickenPhysicsRig.tsx"
Cohesion: 0.14
Nodes (22): FighterAnim, ChickenPhysicsHandle, ChickenPhysicsRig, ChickenPhysicsRigProps, KNOCKBACK_IMPULSE, KNOCKDOWN_RECOVER_MS, scaleSpec(), bodyAxis() (+14 more)

### Community 37 - "medical.test.ts"
Cohesion: 0.15
Nodes (17): recoverCondition(), TIER_STAT_MULTIPLIER, tickInjuryRecovery(), createIllness(), ILLNESS_LABELS, nextId(), RECOVERY_CYCLES, Rng (+9 more)

### Community 38 - "roosterGenerator.ts"
Cohesion: 0.22
Nodes (15): calculateOdds(), clamp(), COLOR_PALETTES, createRooster(), cryptoSafeId(), generateRandomRooster(), generateStatPool(), getStatTotal() (+7 more)

### Community 39 - "dependencies"
Cohesion: 0.12
Nodes (17): next, dependencies, next, @prisma/client, react, react-dom, @react-three/drei, @react-three/fiber (+9 more)

### Community 40 - "deriveBehaviorProfile"
Cohesion: 0.16
Nodes (17): POST(), StepBody, autoCoachPolicy(), deriveBehaviorProfile(), hasTrait(), CoachFn, CoachObservation, simulateBattle() (+9 more)

### Community 41 - "battle/[chickenId]/page.tsx"
Cohesion: 0.14
Nodes (17): COMMAND_LABEL, Phase, Snapshot, StartResponse, StepResponse, FighterPlate(), MatchupScreen(), mockOpponentRecord() (+9 more)

### Community 42 - "coopVillage.ts"
Cohesion: 0.24
Nodes (10): CoopChicken(), CENTER, hashString(), personalityModifiers, RING_SIZES, STYLE_MODIFIERS, VILLAGE_CAPACITY, VILLAGE_SCALE (+2 more)

### Community 43 - "seed-god-chickens.ts"
Cohesion: 0.29
Nodes (9): FIGHTING_STYLES, PHYSICAL_TRAIT_KEYS, PHYSICAL_TRAIT_RANGE, BLOODLINES, godEvBlock(), godMutationGenome(), godPhysicalBlock(), godStatBlock() (+1 more)

### Community 44 - "battleReport.ts"
Cohesion: 0.14
Nodes (13): BattleReportPanel(), EXPERIENCE_ICON, CombatResultsScreenProps, OUTCOME_LABEL, BattleReport, nonZeroCategories(), FightOutcomeUpdate, CATEGORY_TO_TRAINING (+5 more)

### Community 45 - "seed-strategy-fighter-roster.ts"
Cohesion: 0.13
Nodes (16): Rng, AGGRESSIVE_SCHEME, ALL_TRAITS, Archetype, ARCHETYPES, BALANCED_SCHEME, buildTrainingState(), COUNTER_SCHEME (+8 more)

### Community 46 - "growth.ts"
Cohesion: 0.21
Nodes (13): ChickenCard(), SEX_ICON, STAGE_COLOR, CoopSelectionPanel(), SEX_ICON, BREEDABLE_STAGES, canAgeUp(), canBattle() (+5 more)

### Community 47 - "tournament.ts"
Cohesion: 0.12
Nodes (23): GET(), POST(), Phase, PLACEMENT_LABEL, TournamentView, fakeResult(), playerAlwaysLosesFight(), playerAlwaysWinsFight() (+15 more)

### Community 48 - "live/page.tsx"
Cohesion: 0.14
Nodes (16): LiveMatchupResponse, LiveMode, LiveResolveResponse, MODE_LABEL, Phase, BettingPanel(), Props, ComicCommentary() (+8 more)

### Community 49 - "thumbnailCache.ts"
Cohesion: 0.20
Nodes (14): ChickenThumbnail(), SEX_EMOJI, cache, getThumbnail(), Listener, listeners, queue, queuedSubjects (+6 more)

### Community 50 - "Chicken"
Cohesion: 0.20
Nodes (13): POST(), POST(), POST(), StartBody, FighterVisual, canFight(), PlayerCommand, createBattleSession() (+5 more)

### Community 51 - "combat/state.ts"
Cohesion: 0.17
Nodes (18): ARCHETYPE_PROFILES, DecisionContext, emptyExperience(), emptyOpponentModel(), experienceConfidenceBonus(), gainExperience(), updateOpponentModel(), applyMentalState() (+10 more)

### Community 52 - "Strategy Fighter — Design Spec"
Cohesion: 0.17
Nodes (11): Auto-Coach (first-class from Phase A), Cuts and reshapes from the original brainstorm (with reasoning), Deferred — not designed further until the gate above is passed, Design goal, Explicitly not addressed here, Phase A/B validation gate — the only thing that gets built before a decision, Phase A — Dynamic Styles (net-new), Phase B — Combat State (net-new + wiring) (+3 more)

### Community 53 - "coop-redesign-v2.md"
Cohesion: 0.04
Nodes (47): 10. Chicken Actions, 11. Visual Feedback, 12. Chicken Names, 13. Hut Variations, 14. Champion/Veteran Presentation, 15. Eggs, 16. Existing API Functionality, 17. Age Up (+39 more)

### Community 54 - "facilities/service.ts"
Cohesion: 0.18
Nodes (16): FacilityViewDTO, SessionDTO, isProgramUnlocked(), TRAINING_GYM_LEVELS, TRAINING_GYM_MAX_LEVEL, TRAINING_GYM_UPGRADES, TRAINING_PROGRAMS, FACILITY_TYPES (+8 more)

### Community 55 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, backfill:colors, build, db:up, dev, lint, postinstall, seed:god (+5 more)

### Community 56 - "playerStore.ts"
Cohesion: 0.22
Nodes (11): TopBar(), mockPlayer, emit(), getPlayerSnapshot(), Listener, listeners, PlayerSnapshot, refreshPlayer() (+3 more)

### Community 57 - "Trait"
Cohesion: 0.15
Nodes (13): BATTLE_SCARRED_TRAIT, evaluateBattleTraits(), hasTrait(), severeInjuryCount(), VETERAN_TRAIT, CALM, IRON_STAMINA, pickWeightedTrait() (+5 more)

### Community 59 - "combat-system-v2.md"
Cohesion: 0.04
Nodes (46): 10. STAGGER, 11. KNOCKBACK, 12. KNOCKDOWN, 13. DEATH, 14. MISS / DODGE, 15. ATTACKER RECOVERY, 16. COMBAT PACING, 17. COMBO PRESENTATION (+38 more)

### Community 61 - "4. Animation implementations (curve sketches)"
Cohesion: 0.05
Nodes (43): 10.1 Automated (Node built-in test runner, `lib/__tests__/animation.test.ts`), 10.2 Manual in the battle, 10. Testing, 11. Deliverables (final report must cover), 12. Non-goals, 1. Goal, 2.1 Rig, 2.2 Bone axes confirmed from working code (+35 more)

### Community 62 - "gamefowl_dynasty_full_mechanics.md"
Cohesion: 0.05
Nodes (41): 11. Chicken Growth, 13. Training Limits, 14. Vitamins and Consumables, 15. Combat System, 16. Combat Philosophy, 18. Combat AI, 21. Death and Legacy, 22. Animation System (+33 more)

### Community 63 - "GrowthStage"
Cohesion: 0.18
Nodes (8): POST(), seedChicken(), zeroBlock(), seedChicken(), statBlock(), seedChicken(), statBlock(), GrowthStage

### Community 64 - "VillageView.tsx"
Cohesion: 0.27
Nodes (7): CoopHUD(), CoopMode, EggGrid(), ManageView(), VillageView(), paginateVillage(), Egg

### Community 65 - "fight/[chickenId]/page.tsx"
Cohesion: 0.17
Nodes (8): BossFightPage(), COMMAND_LABEL, Phase, Snapshot, stars(), StartResponse, StepResponse, BossFightResult

### Community 66 - "_smoke_combat_v2.ts"
Cohesion: 0.33
Nodes (6): a, b, r1, r2, runN(), seededRng()

### Community 67 - "combat/injuries.ts"
Cohesion: 0.24
Nodes (8): createInjuryRecord(), CRITICAL_HIT_ZONES, nextInjuryId(), RECOVERY_TURNS, Rng, rollInjurySeverity(), SEVERITY_LABELS, InjurySeverity

### Community 68 - "[id]/fight/[sessionId]/step/route.ts"
Cohesion: 0.20
Nodes (16): POST(), POST(), StepBody, POST(), POST(), ResolveBody, applyFightOutcome(), buildBattleReport() (+8 more)

### Community 69 - "[bossId]/fight/[sessionId]/step/route.ts"
Cohesion: 0.17
Nodes (17): POST(), POST(), StepBody, POST(), bossPreview(), getBoss(), getBossFightSession(), PveError (+9 more)

### Community 70 - "Rooster Arena Project"
Cohesion: 0.40
Nodes (5): Agent Rules, Claude Project Context, README, Rooster Arena Project, Serena Project Configuration

### Community 71 - "FacilityError"
Cohesion: 0.24
Nodes (9): POST(), POST(), FacilityError, FacilityErrorCode, STATUS_BY_CODE, cancelTrainingSession(), facilityView(), resolveCategory() (+1 more)

### Community 73 - "cameraDirector.ts"
Cohesion: 0.20
Nodes (10): BattleDebugOverlay(), makeDebugState(), CameraCue, CameraCueName, CameraDirectorOpts, CameraImpulse, CueFraming, CUES (+2 more)

### Community 74 - "5. Combat — where it all converges"
Cohesion: 0.08
Nodes (23): 1.1 StatBlock — the combat "IV" (genetic ceiling), 1.2 PhysicalBlock — 18 body-proportion genes, 1.3 MutationGenome — 6 catalog mutations, 1.4 Cosmetics — breed and color, 1. Genetics, 2.1 `resolvePhysicalProfile()` — 6 bounded multipliers (0.85–1.15, centered on 1.0), 2.2 `traitStatModifier()` — second, independent 0.85–1.15 multiplier per genetic stat, 2. Physical Profile — the genetics→combat compression layer (+15 more)

### Community 75 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 76 - "NOT DONE — remaining spec work"
Cohesion: 0.11
Nodes (17): Cross-cutting, Data model, DONE this session (tested, tsc + lint clean on new files), Medical / Clinic system (spec Phase 4–5), NOT DONE — remaining spec work, Phase 1 gaps — Core Training (spec §5–21, §76–82, §115), Phase 3 — Combat Experience → Training loop (spec §5, §70–72, §129–132), Phase 6 — Facilities split (spec §53–66, §102–105, §118, §122) (+9 more)

### Community 77 - "defaultTrainingState"
Cohesion: 0.29
Nodes (9): DevAction, POST(), GET(), POST(), isDevModeEnabled(), claimExpiredSessions(), startTrainingSession(), canAffordTrainingPoints() (+1 more)

### Community 82 - "testHelpers.ts"
Cohesion: 0.24
Nodes (8): makeChicken(), physicalBlock(), statBlock(), discoverPotential(), potentialBand(), Rng, rollTrainingPotential(), defaultRoosterTrainingState()

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
Cohesion: 0.21
Nodes (16): Body, GET(), POST(), GET(), POST(), MedicalError, MedicalErrorCode, STATUS_BY_CODE (+8 more)

### Community 99 - "65. CORE DESIGN RULES"
Cohesion: 0.18
Nodes (11): 65. CORE DESIGN RULES, Rule 1, Rule 10, Rule 2, Rule 3, Rule 4, Rule 5, Rule 6 (+3 more)

### Community 100 - "Training — Design Spec"
Cohesion: 0.18
Nodes (10): API routes, Core logic (`lib/training.ts`), Data model, `POST /api/chickens/[id]/rest`, `POST /api/chickens/[id]/train`, Scope, Stat mapping, Testing (TDD) (+2 more)

### Community 101 - "CombatAction"
Cohesion: 0.18
Nodes (10): ACTION_DEFINITIONS, ALL_ACTIONS, legalActions(), LOW_COMMITMENT_ACTIONS, CombatEvent, actionDurationMs(), exchangeDurationMs(), PhysicalProfile (+2 more)

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

### Community 107 - "simulateFight"
Cohesion: 0.27
Nodes (9): POST(), simulateFight(), LiveMatchup, LiveMode, pickLiveMatchup(), clamp(), estimateOdds(), LiveOdds (+1 more)

### Community 108 - "marketplace-route.test.ts"
Cohesion: 0.36
Nodes (7): BetBody, POST(), POST(), canAfford(), spendCredits(), seedChicken(), statBlock()

### Community 110 - "32. SPECIALIZED BLOODLINES"
Cohesion: 0.33
Nodes (6): 32. SPECIALIZED BLOODLINES, COLLECTION BLOODLINE, CRITICAL BLOODLINE, MUTATION BLOODLINE, SPEED BLOODLINE, TANK BLOODLINE

### Community 111 - "CoopWorld.tsx"
Cohesion: 0.24
Nodes (9): CoopCamera(), IDLE_POS, IDLE_TARGET, CoopHabitat(), HUT_COLORS, CoopWorld(), getVillageSlot(), habitatStyle (+1 more)

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

### Community 147 - "TournamentPage"
Cohesion: 0.29
Nodes (4): TournamentPage(), currentOpponentEntrant(), handleFight(), roundLabel()

### Community 148 - "rehab.ts"
Cohesion: 0.22
Nodes (8): isTrainingLocked(), LOCATION_LOCKS, REHAB_LABEL, REHAB_LADDER, rehabStage(), trainingLocks(), InjuryLocation, RehabStage

### Community 149 - "db.ts"
Cohesion: 0.17
Nodes (13): GET(), GET(), POST(), POST(), generateUniqueChickName(), generateUniqueRandomChicken(), globalForPrisma, prisma (+5 more)

### Community 150 - "effort.ts"
Cohesion: 0.50
Nodes (6): effortHeadroom(), MAX_TRAINING_EFFORT_PER_STAT, MAX_TRAINING_EFFORT_TOTAL, redistributeEffort(), spendEffort(), totalSpent()

### Community 151 - "ManageView.tsx"
Cohesion: 0.27
Nodes (8): CoopFilters(), STATUS_OPTIONS, CoopFilterState, DEFAULT_COOP_FILTERS, filterChickens(), NO_FILTER, ChickenSex, ChickenStatus

### Community 152 - "villageIdle.ts"
Cohesion: 0.25
Nodes (6): BASE_DURATION, STATE_SEQUENCE, VillageAnimState, VillageChickenAI, VillageIdleConfig, VillageIdleFrame

### Community 153 - "balance-sim.ts"
Cohesion: 0.39
Nodes (7): ActionTally, buildFighter(), formatMix(), N, runMatchup(), seededRng(), tallyActions()

### Community 154 - "retire-route.test.ts"
Cohesion: 0.43
Nodes (4): POST(), retireChicken(), seedChicken(), zeroBlock()

### Community 155 - "InjuryRecord"
Cohesion: 0.43
Nodes (3): battleAftermath, clamp(), InjuryRecord

### Community 156 - "seed-monochrome-pairs.ts"
Cohesion: 0.48
Nodes (6): balancedStatBlock(), baselinePhysicalBlock(), main(), PAIRS, solidColorScheme(), zeroStatBlock()

### Community 157 - "train/route.ts"
Cohesion: 0.53
Nodes (5): POST(), canTrain(), canAffordTraining(), overtrainingInjuryChance(), TRAINING_INTENSITIES

### Community 158 - "TrainingPageContent"
Cohesion: 0.53
Nodes (6): remainingMinutes(), TrainingPageContent(), cancel(), refresh(), startTraining(), upgrade()

### Community 159 - "combat/tells.ts"
Cohesion: 0.40
Nodes (5): AGGRESSION_ACTIONS, isRiskyCommit(), PATIENCE_ACTIONS, selectTell(), TellKind

### Community 160 - "backfill-color-jitter.ts"
Cohesion: 0.73
Nodes (5): jitterColorScheme(), backfillChickens(), backfillEggs(), backfillMarketListings(), main()

## Knowledge Gaps
- **934 isolated node(s):** `StepBody`, `Body`, `DevAction`, `BetBody`, `ResolveBody` (+929 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1082 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Chicken` connect `Chicken` to `pve/service.ts`, `BattleCanvas.tsx`, `chickenGenerator.ts`, `medical/service.ts`, `lib/types.ts`, `training.ts`, `chicken/[chickenId]/page.tsx`, `clinic/page.tsx`, `[bossId]/page.tsx`, `combat.ts`, `getOrCreatePlayer`, `db.ts`, `ManageView.tsx`, `BattleStage3D.tsx`, `marketplace.ts`, `retire-route.test.ts`, `tournament/service.ts`, `liveCommentary.ts`, `train/route.ts`, `simulator.ts`, `ChickenModel.tsx`, `balance-sim.ts`, `rarity.ts`, `ChickenPhysicsRig.tsx`, `medical.test.ts`, `deriveBehaviorProfile`, `battle/[chickenId]/page.tsx`, `coopVillage.ts`, `battleReport.ts`, `growth.ts`, `tournament.ts`, `live/page.tsx`, `thumbnailCache.ts`, `combat/state.ts`, `facilities/service.ts`, `VillageView.tsx`, `fight/[chickenId]/page.tsx`, `[id]/fight/[sessionId]/step/route.ts`, `testHelpers.ts`, `simulateFight`, `CoopWorld.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `AudioEngine` to `BattleCanvas.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `getOrCreatePlayer()` connect `getOrCreatePlayer` to `seed-deep-red-black-roster.ts`, `db.ts`, `tournament/service.ts`, `StatBlock`, `retire-route.test.ts`, `seed-monochrome-pairs.ts`, `train/route.ts`, `genetics.ts`, `seed-god-chickens.ts`, `seed-strategy-fighter-roster.ts`, `tournament.ts`, `Chicken`, `facilities/service.ts`, `GrowthStage`, `[id]/fight/[sessionId]/step/route.ts`, `[bossId]/fight/[sessionId]/step/route.ts`, `FacilityError`, `defaultTrainingState`, `medical/route.ts`, `simulateFight`, `marketplace-route.test.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `StepBody`, `Body`, `DevAction` to the rest of the system?**
  _934 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06606451612903226 - nodes in this community are weakly interconnected._
- **Should `pve/service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14855072463768115 - nodes in this community are weakly interconnected._
- **Should `BattleCanvas.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0632996632996633 - nodes in this community are weakly interconnected._