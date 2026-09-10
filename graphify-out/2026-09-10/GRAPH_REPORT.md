# Graph Report - rooster-arena  (2026-09-10)

## Corpus Check
- 376 files · ~1,402,436 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3055 nodes · 6729 edges · 198 communities (167 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71ada3c4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- animations/index.ts
- pve/service.ts
- BattleCanvas.tsx
- deriveBehaviorProfile
- resolution.ts
- seed-deep-red-black-roster.ts
- AudioEngine
- chickenGenerator.ts
- combat-v2/engine.ts
- compilerOptions
- Strategy Fighter Phase A/B Implementation Plan
- roosterGenerator.ts
- combatPresentation.ts
- command.ts
- visual-style.md
- combat/injuries.ts
- chicken/[chickenId]/page.tsx
- ConditionMonitor.tsx
- tournament-flow-spec.md
- tournament-ui-spec.md
- build_rooster.mjs
- post-fight-flow.md
- BattleStage3D.tsx
- CameraDirector
- training/service.ts
- StatBlock
- pedigree.ts
- training/session.ts
- liveCommentary.ts
- simulator.ts
- testHelpers.ts
- devDependencies
- roosterGenome.ts
- genetic-system.md
- facilities/service.ts
- game-shell.md
- ChickenPhysicsRig.tsx
- medical.test.ts
- CombatAction
- dependencies
- BattleSession
- MatchupScreen.tsx
- coopVillage.ts
- medical-route.test.ts
- battleReport.ts
- seed-strategy-fighter-roster.ts
- market/page.tsx
- medical/service.ts
- battle-matchup.md
- thumbnailCache.ts
- pve_campaign_revamp.md
- tournament/service.ts
- Strategy Fighter — Design Spec
- coop-redesign-v2.md
- tournament/[chickenId]/page.tsx
- scripts
- playerStore.ts
- collision.ts
- combat.ts
- combat-system-v2.md
- CombatPresentationController
- 4. Animation implementations (curve sketches)
- gamefowl_dynasty_full_mechanics.md
- aftermath.ts
- simulateFight
- getOrCreatePlayer
- pve/route.ts
- fight/[chickenId]/page.tsx
- training.ts
- ImpactVFX.tsx
- Rooster Arena Project
- pve_ui_revamp.md
- Sidebar.tsx
- cameraDirector.ts
- 5. Combat — where it all converges
- package.json
- NOT DONE — remaining spec work
- Continuous combat V2 — live authority
- test-ts-loader-hooks.mjs
- combatPresentation.test.ts
- eslint.config.mjs
- next.config.ts
- ManageView.tsx
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
- ChickenCard.tsx
- 65. CORE DESIGN RULES
- Training — Design Spec
- arenaRoam.ts
- Genetics + Breeding (+ UI) — Design Spec
- MVP should contain:
- File Structure
- Component Design
- 6. Traits
- lib/types.ts
- typescript
- 32. SPECIALIZED BLOODLINES
- stylePolicy.ts
- 27. GENETIC RESEARCH
- 8. MUTATION SYSTEM
- Error Handling
- UI Theme (Tailwind + Custom CSS)
- 17. Fighting Styles
- 20. Critical Injuries
- 33. Monetization
- 36. Breeding Strategy
- combat-v2/types.ts
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
- live/page.tsx
- ChickenViewer.tsx
- tournament.ts
- behavior.ts
- validation-gate-sim.ts
- chickens/[id]/fight/[sessionId]/step/route.ts
- [bossId]/fight/[sessionId]/step/route.ts
- training/page.tsx
- pve/types.ts
- seed-god-chickens.ts
- FightingStyle
- TournamentPage
- 5. Screen 3 — Boss Encounter
- 31. UX Principle
- LiveCombatV2Session
- 5. Campaign Node Types
- Suggested sequence
- momentum.ts
- aerial-clash.md
- rehab.ts
- liveSession.ts
- constants.ts
- 3. Screen 1 — PvE Campaign Home
- campaign.ts
- GENETIC_STAT_KEYS
- 8. Boss Archetypes as Combat Lessons
- 24. UI Style System
- 25. Background Strategy
- bosses/route.ts
- 6. Circuit / Chapter Presentation
- 30. Increasing Stakes Per Round
- 10. Fighter Card States
- 23. Reusable Components
- 29. Tournament Round Naming
- 49. Initial V1 Scope
- 31. Buttons
- 5. Typography
- Tournament Feature Revamp — Flow Specification
- 11. Bracket Screen
- 19. Fight Result UI
- 6. Tournament Circuit Screen
- 35. Recommended MVP Scope
- 6. Screen 4 — Scout Report
- 7. Screen 5 — Fighter Selection
- 29. Implementation Priority
- 30. What Should Be Removed
- 4. Screen 2 — Circuit / Chapter Detail
- 9. Screen 7 — Tale of the Tape
- 12. Screen 10 — Victory / Defeat Result
- PvE Campaign Revamp — The Road to Glory
- 4. Campaign Map
- 9. Boss Encounter Screen

## God Nodes (most connected - your core abstractions)
1. `getOrCreatePlayer()` - 101 edges
2. `Chicken` - 90 edges
3. `prisma` - 56 edges
4. `add()` - 46 edges
5. `StatBlock` - 37 edges
6. `GENETIC_STAT_KEYS` - 34 edges
7. `BattleCanvas()` - 33 edges
8. `effectiveStat()` - 30 edges
9. `combatBase()` - 26 edges
10. `easeOut()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `placeBet()` --calls--> `setPlayerCredits()`  [EXTRACTED]
  app/live/page.tsx → lib/playerStore.ts
- `FighterVisual` --references--> `Chicken`  [EXTRACTED]
  components/BattleCanvas.tsx → lib/types.ts
- `POST()` --calls--> `canBreed()`  [EXTRACTED]
  app/api/breed/route.ts → lib/growth.ts
- `POST()` --calls--> `getOrCreatePlayer()`  [EXTRACTED]
  app/api/breed/route.ts → lib/player.ts
- `POST()` --calls--> `getOrCreatePlayer()`  [EXTRACTED]
  app/api/chickens/[id]/age-up/route.ts → lib/player.ts

## Import Cycles
- None detected.

## Communities (198 total, 29 thin omitted)

### Community 0 - "animations/index.ts"
Cohesion: 0.06
Nodes (100): applyHenOverride(), applyProportions(), applyVisualTraits(), BONE_PARENT, ChickenModel(), DEFAULT_PHYSICAL_BLOCK, installPatternShader(), PATTERN_TYPES (+92 more)

### Community 1 - "pve/service.ts"
Cohesion: 0.20
Nodes (14): bossPreview(), getBoss(), previousBossId(), PVE_BOSS_LIST, PVE_BOSSES, campaignPresentation(), buildBossFighter(), clamp01() (+6 more)

### Community 2 - "BattleCanvas.tsx"
Cohesion: 0.08
Nodes (30): aerialPose(), AttackPose, attackPoseFor(), attackStateForMove(), BattleCanvas(), bodyAttackPose(), clamp(), FighterVisual (+22 more)

### Community 3 - "deriveBehaviorProfile"
Cohesion: 0.31
Nodes (9): deriveBehaviorProfile(), hasTrait(), ActionTally, buildFighter(), formatMix(), N, runMatchup(), seededRng() (+1 more)

### Community 4 - "resolution.ts"
Cohesion: 0.11
Nodes (28): adaptationCounterBonus(), experienceConfidenceBonus(), fatigueDecisionPenalty(), clampPosition(), deriveContextState(), DISTANCE_ORDER, POSITION_MAX, POSITION_MIN (+20 more)

### Community 5 - "seed-deep-red-black-roster.ts"
Cohesion: 0.08
Nodes (46): POST(), clamp(), COLOR_KEYS, driftRgb(), hasAllele(), hexToRgb(), hslToRgb(), inheritColorHex() (+38 more)

### Community 6 - "AudioEngine"
Cohesion: 0.11
Nodes (10): AudioContextCtor, AudioEngine, getAudioContextCtor(), VICTORY_FREQUENCIES, FakeAudioContext, makeFakeAudioNode(), makeFakeAudioParam(), makeFakeFilterNode() (+2 more)

### Community 7 - "chickenGenerator.ts"
Cohesion: 0.11
Nodes (30): POST(), BREED_IDS, BREED_PRESETS, BreedId, BreedPreset, pickRandomBreed(), createChicken(), CreateChickenInput (+22 more)

### Community 8 - "combat-v2/engine.ts"
Cohesion: 0.26
Nodes (24): aerialImpact(), aerialPhase(), clamp(), quantize(), decide(), distance(), emit(), free() (+16 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 10 - "Strategy Fighter Phase A/B Implementation Plan"
Cohesion: 0.10
Nodes (19): Execution Handoff, Global Constraints, Self-Review Notes (already applied above, recorded per writing-plans skill), Strategy Fighter Phase A/B Implementation Plan, Task 10: `CombatInactivity` — graduated anti-stalemate pressure + `FORCE_ENGAGEMENT`, Task 11: Momentum wired to hit-stop (juice), Task 12: `simulateBattle` coach hook — CP regen + pending-command lifecycle, Task 13: Auto-Coach default policy (+11 more)

### Community 11 - "roosterGenerator.ts"
Cohesion: 0.22
Nodes (15): calculateOdds(), clamp(), COLOR_PALETTES, createRooster(), cryptoSafeId(), generateRandomRooster(), generateStatPool(), getStatTotal() (+7 more)

### Community 12 - "combatPresentation.ts"
Cohesion: 0.15
Nodes (18): BattlePersonality, ATTACK_CHOREOGRAPHY, ATTACK_PHASES, AttackId, choreographyDuration(), DEFAULT_CHOREOGRAPHY, getChoreography(), HEAVY_STOP (+10 more)

### Community 13 - "command.ts"
Cohesion: 0.17
Nodes (15): clamp01(), COMMAND_ACTIVE_TURNS, COMMAND_POINT_REGEN_TURNS, COMMAND_POINTS_MAX, COMMAND_TARGET_ACTIONS, commandActionModifier(), commandTargetsAction(), complianceFactor() (+7 more)

### Community 14 - "visual-style.md"
Cohesion: 0.05
Nodes (39): 10. NAVIGATION, 11. RESOURCE PILLS, 12. FIGHTER PANELS, 13. MODALS, 14. GAME SCENE FIRST, 15. DEPTH SYSTEM, 16. SHADOWS, 17. BACKDROP BLUR (+31 more)

### Community 15 - "combat/injuries.ts"
Cohesion: 0.24
Nodes (8): createInjuryRecord(), CRITICAL_HIT_ZONES, nextInjuryId(), RECOVERY_TURNS, Rng, rollCriticalInjury(), rollInjurySeverity(), SEVERITY_LABELS

### Community 16 - "chicken/[chickenId]/page.tsx"
Cohesion: 0.08
Nodes (22): BattlePage(), handleFight(), BEHAVIOR_ICON, ChickenDetailPageContent(), handleSell(), EXPERIENCE_ICON, MUTATION_RARITY_COLOR, MUTATION_RARITY_GEM (+14 more)

### Community 17 - "ConditionMonitor.tsx"
Cohesion: 0.15
Nodes (11): ClinicPage(), band(), BAR_TONE, ConditionMonitor(), inverseBand(), PILL_TONE, Tone, conditionTier (+3 more)

### Community 18 - "tournament-flow-spec.md"
Cohesion: 0.04
Nodes (46): 10. Phase 6 — Bracket Draw, 11. Round Lifecycle, 12. Phase 7 — Round Hub, 13. Phase 8 — Opponent Scouting, 14. Phase 9 — Pre-Fight Matchup, 15. Phase 10 — Battle, 16. Phase 11 — Immediate Fight Result, 17. Phase 12 — Tournament Consequences (+38 more)

### Community 19 - "tournament-ui-spec.md"
Cohesion: 0.05
Nodes (39): 12. Bracket Visual Rules, 13. Bracket Fighter Chip, 14. Your Match Panel, 15. Tabs Within Active Tournament, 16. Round Hub UI, 17. Opponent Scouting UI, 18. Matchup Screen, 1. Visual Direction (+31 more)

### Community 20 - "build_rooster.mjs"
Cohesion: 0.14
Nodes (16): B, F(), feather(), gradY(), leg(), loft(), MATS, paint() (+8 more)

### Community 21 - "post-fight-flow.md"
Cohesion: 0.06
Nodes (32): Animation Ownership, Boss, Camera Cues, Championship, Combat Experience and Development, Critical Architecture Rule, Defeat Flow, Defeated Fighter (+24 more)

### Community 22 - "BattleStage3D.tsx"
Cohesion: 0.09
Nodes (23): ArenaEnvironment(), ArenaGround(), useDirtTexture(), ArenaPhysics(), ANIM_PX_TO_WORLD, BattleStage3D(), DirectedCamera(), heuristicCue() (+15 more)

### Community 24 - "training/service.ts"
Cohesion: 0.18
Nodes (17): POST(), seedChicken(), statBlock(), effortHeadroom(), MAX_TRAINING_EFFORT_PER_STAT, MAX_TRAINING_EFFORT_TOTAL, REDISTRIBUTE_CREDITS_PER_POINT, redistributeEffort() (+9 more)

### Community 25 - "StatBlock"
Cohesion: 0.17
Nodes (19): POST(), BetBody, POST(), POST(), GET(), BATTLE_WIN_CREDITS, canAfford(), earnCredits() (+11 more)

### Community 26 - "pedigree.ts"
Cohesion: 0.16
Nodes (14): findChildren(), GET(), lookup(), PedigreeResponse, isChampion(), PedigreeTreeNode(), buildAncestorTree(), computeDescendantStats() (+6 more)

### Community 27 - "training/session.ts"
Cohesion: 0.11
Nodes (25): BONUS_EV_ON_BREAKTHROUGH, BREAKTHROUGH_BASE_CHANCE, BREAKTHROUGH_MILESTONE_BONUS, checkOvertrainedTrigger(), crossedMilestone(), Rng, rollBreakthrough(), TRAINING_TRAIT_POOL (+17 more)

### Community 28 - "liveCommentary.ts"
Cohesion: 0.08
Nodes (28): LivePage(), handleImpact(), handleReplayEnd(), placeBet(), clampStepDelay(), COMMAND_LABEL, Phase, Snapshot (+20 more)

### Community 29 - "simulator.ts"
Cohesion: 0.11
Nodes (24): generateBattleAnalysis(), gainExperience(), updateOpponentModel(), clampFatigue(), fatigueAccuracyPenalty(), fatigueGain(), fatigueRecoveryPerTurn(), fatigueStatMultiplier() (+16 more)

### Community 30 - "testHelpers.ts"
Cohesion: 0.30
Nodes (4): makeChicken(), physicalBlock(), statBlock(), chickenValue()

### Community 31 - "devDependencies"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss (+11 more)

### Community 32 - "roosterGenome.ts"
Cohesion: 0.15
Nodes (16): applyGenome(), breed(), clamp(), DEFAULT_COLORS, defaultGenome(), gauss(), Genome, MaterialKey (+8 more)

### Community 33 - "genetic-system.md"
Cohesion: 0.03
Nodes (62): 11. MUTATION TRAITS, 13. MUTATION BLOODLINES, 14. GENERATIONAL BREEDING, 15. PEDIGREE SYSTEM, 16. INBREEDING SYSTEM, 17. GENETIC INSTABILITY, 18. POSITIVE AND NEGATIVE MUTATIONS, 19. GENETIC TRAITS VS ACTUAL STATS (+54 more)

### Community 34 - "facilities/service.ts"
Cohesion: 0.13
Nodes (23): POST(), POST(), isProgramUnlocked(), TRAINING_GYM_LEVELS, TRAINING_GYM_MAX_LEVEL, TRAINING_GYM_UPGRADES, TRAINING_PROGRAMS, FacilityError (+15 more)

### Community 35 - "game-shell.md"
Cohesion: 0.06
Nodes (32): 10. Full-Bleed Screens, 11. Management Screens, 12. Immersive Mode, 13. Battle Flow, 14. Matchup Shell Behavior, 15. Battle Shell Behavior, 16. Result Shell Behavior, 17. Ranch/Home (+24 more)

### Community 36 - "ChickenPhysicsRig.tsx"
Cohesion: 0.13
Nodes (23): FighterAnim, ChickenPhysicsHandle, ChickenPhysicsRig, ChickenPhysicsRigProps, KNOCKBACK_IMPULSE, KNOCKDOWN_RECOVER_MS, scaledRecoveryMs(), scaleSpec() (+15 more)

### Community 37 - "medical.test.ts"
Cohesion: 0.16
Nodes (18): recoverCondition(), tickInjuryRecovery(), createIllness(), ILLNESS_LABELS, nextId(), RECOVERY_CYCLES, Rng, rollIllness() (+10 more)

### Community 38 - "CombatAction"
Cohesion: 0.18
Nodes (10): ACTION_DEFINITIONS, ALL_ACTIONS, legalActions(), LOW_COMMITMENT_ACTIONS, CombatEvent, actionDurationMs(), exchangeDurationMs(), PhysicalProfile (+2 more)

### Community 39 - "dependencies"
Cohesion: 0.12
Nodes (17): next, dependencies, next, @prisma/client, react, react-dom, @react-three/drei, @react-three/fiber (+9 more)

### Community 40 - "BattleSession"
Cohesion: 0.18
Nodes (12): POST(), StepBody, POST(), BattleCanvasProps, PlayerCommand, BattleSession, createSparSession(), endSparSession() (+4 more)

### Community 41 - "MatchupScreen.tsx"
Cohesion: 0.30
Nodes (10): FighterHud(), FighterPlate(), mockOpponentRecord(), RANK_TITLE, rankTitle(), seededRng(), STAT_LABEL, StatCompareRow() (+2 more)

### Community 42 - "coopVillage.ts"
Cohesion: 0.07
Nodes (27): CoopCamera(), IDLE_POS, IDLE_TARGET, CoopChicken(), CoopEnvironment(), useVillageGroundTexture(), CoopHabitat(), HUT_COLORS (+19 more)

### Community 43 - "medical-route.test.ts"
Cohesion: 0.17
Nodes (18): Body, GET(), POST(), GET(), POST(), MedicalError, MedicalErrorCode, STATUS_BY_CODE (+10 more)

### Community 44 - "battleReport.ts"
Cohesion: 0.10
Nodes (21): FightResponse, Phase, MatchupScreen(), NEXT, PostFightOverlay(), PostFightState, Props, signed() (+13 more)

### Community 45 - "seed-strategy-fighter-roster.ts"
Cohesion: 0.11
Nodes (21): BATTLE_SCARRED_TRAIT, evaluateBattleTraits(), hasTrait(), severeInjuryCount(), VETERAN_TRAIT, Rng, AGGRESSIVE_SCHEME, ALL_TRAITS (+13 more)

### Community 46 - "market/page.tsx"
Cohesion: 0.43
Nodes (5): fetchMarket(), MarketPage(), handleBuy(), SEX_ICON, PageHeader()

### Community 47 - "medical/service.ts"
Cohesion: 0.16
Nodes (20): ClinicDTO, PILL_TONE, RosterEntry, treatmentRemaining(), canTreatSeverity(), CLINIC_LEVELS, CLINIC_MAX_LEVEL, CLINIC_UPGRADE_COST (+12 more)

### Community 48 - "battle-matchup.md"
Cohesion: 0.07
Nodes (27): 10. RECENT FORM, 11. PRIMARY FIGHT ACTION, 12. PRE-FIGHT STRATEGY INTEGRATION, 13. CONTEXT-SPECIFIC DATA, 14. MATCHUP TRANSITION, 15. FIGHT START TRANSITION, 16. RESPONSIVENESS, 17. COMPONENT ARCHITECTURE (+19 more)

### Community 49 - "thumbnailCache.ts"
Cohesion: 0.16
Nodes (18): ChickenThumbnail(), SEX_EMOJI, cache, getThumbnail(), Listener, listeners, nextQueued(), queue (+10 more)

### Community 50 - "pve_campaign_revamp.md"
Cohesion: 0.06
Nodes (31): 10. Scout Report Instead of Raw Stats, 11. Fighter Selection Revamp, 12. Matchup Assessment, 13. Remove the Current Generic Start Battle Page, 14. Pre-Fight Sequence, 15. Venue Establishing Shot, 16. Opponent Introduction, 17. Player Fighter Introduction (+23 more)

### Community 51 - "tournament/service.ts"
Cohesion: 0.14
Nodes (24): GET(), POST(), POST(), GET(), hasActiveInjury(), currentOpponent(), STATUS, TournamentError (+16 more)

### Community 52 - "Strategy Fighter — Design Spec"
Cohesion: 0.17
Nodes (11): Auto-Coach (first-class from Phase A), Cuts and reshapes from the original brainstorm (with reasoning), Deferred — not designed further until the gate above is passed, Design goal, Explicitly not addressed here, Phase A/B validation gate — the only thing that gets built before a decision, Phase A — Dynamic Styles (net-new), Phase B — Combat State (net-new + wiring) (+3 more)

### Community 53 - "coop-redesign-v2.md"
Cohesion: 0.04
Nodes (47): 10. Chicken Actions, 11. Visual Feedback, 12. Chicken Names, 13. Hut Variations, 14. Champion/Veteran Presentation, 15. Eggs, 16. Existing API Functionality, 17. Age Up (+39 more)

### Community 54 - "tournament/[chickenId]/page.tsx"
Cohesion: 0.14
Nodes (14): LiveSnapshot, Phase, PLACEMENT_LABEL, TournamentView, CircuitStep, eligibility(), TournamentCircuitPage(), TournamentBracket() (+6 more)

### Community 55 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, backfill:colors, build, db:up, dev, lint, postinstall, seed:god (+5 more)

### Community 56 - "playerStore.ts"
Cohesion: 0.13
Nodes (17): bangers, cinzel, geistMono, geistSans, metadata, NAV_ITEMS, TopBar(), mockPlayer (+9 more)

### Community 57 - "collision.ts"
Cohesion: 0.25
Nodes (12): CollisionDebugVolumes(), bodyClearanceRadius(), bodyRadius(), HitZone, hurtboxes(), HurtboxOffset, hurtboxOffsets(), HurtSphere (+4 more)

### Community 58 - "combat.ts"
Cohesion: 0.12
Nodes (28): FightOutcomeUpdate, finalHealthPercent(), healChicken(), generateMatchedOpponent(), totalEffectiveStats(), MAX_HEALTH, MAX_TURNS, clamp01() (+20 more)

### Community 59 - "combat-system-v2.md"
Cohesion: 0.04
Nodes (46): 10. STAGGER, 11. KNOCKBACK, 12. KNOCKDOWN, 13. DEATH, 14. MISS / DODGE, 15. ATTACKER RECOVERY, 16. COMBAT PACING, 17. COMBO PRESENTATION (+38 more)

### Community 60 - "CombatPresentationController"
Cohesion: 0.16
Nodes (7): AttackChoreography, AttackPhase, hitStopFor(), cameraCueForResult(), CombatPresentationController, PresentationCallbacks, harness()

### Community 61 - "4. Animation implementations (curve sketches)"
Cohesion: 0.05
Nodes (43): 10.1 Automated (Node built-in test runner, `lib/__tests__/animation.test.ts`), 10.2 Manual in the battle, 10. Testing, 11. Deliverables (final report must cover), 12. Non-goals, 1. Goal, 2.1 Rig, 2.2 Bone axes confirmed from working code (+35 more)

### Community 62 - "gamefowl_dynasty_full_mechanics.md"
Cohesion: 0.05
Nodes (41): 11. Chicken Growth, 13. Training Limits, 14. Vitamins and Consumables, 15. Combat System, 16. Combat Philosophy, 18. Combat AI, 21. Death and Legacy, 22. Animation System (+33 more)

### Community 64 - "simulateFight"
Cohesion: 0.28
Nodes (7): simulateFight(), a, b, r1, r2, runN(), seededRng()

### Community 65 - "getOrCreatePlayer"
Cohesion: 0.09
Nodes (35): POST(), POST(), POST(), GET(), GET(), POST(), GET(), GET() (+27 more)

### Community 66 - "pve/route.ts"
Cohesion: 0.25
Nodes (7): POST(), POST(), PveError, PveErrorCode, STATUS_BY_CODE, DevPveAction, runDevPveAction()

### Community 67 - "fight/[chickenId]/page.tsx"
Cohesion: 0.17
Nodes (13): BossFightPage(), nextBossName(), Phase, Start, BATTLE_STAGES, BossEncounterPage(), buildBossVisual(), eligible() (+5 more)

### Community 68 - "training.ts"
Cohesion: 0.11
Nodes (30): DevAction, POST(), declineMultiplier(), deriveLifeStage(), totalExperience(), VETERAN_STAGES, veteranExperienceBonus(), isDevModeEnabled() (+22 more)

### Community 69 - "ImpactVFX.tsx"
Cohesion: 0.24
Nodes (9): Flash, ImpactVFX, ImpactVFXHandle, Shard, ImpactInfo, IMPACT_VFX, impactKindFor(), ImpactVfxDef (+1 more)

### Community 70 - "Rooster Arena Project"
Cohesion: 0.40
Nodes (5): Agent Rules, Claude Project Context, README, Rooster Arena Project, Serena Project Configuration

### Community 71 - "pve_ui_revamp.md"
Cohesion: 0.07
Nodes (27): 11. Screen 9 — Battle Scene HUD, 13. Screen 11 — Rewards, 14. Screen 12 — Progression Update, 15. Screen 13 — Boss Defeated State, 16. Screen 14 — Challenge Received, 17. Screen 15 — Rival Encounter, 18. Screen 16 — Championship Qualifier, 19. Screen 17 — Championship Event (+19 more)

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

### Community 77 - "Continuous combat V2 — live authority"
Cohesion: 0.33
Nodes (5): Continuous combat V2 — live authority, Engine boundary, Presentation, Remaining milestones, Verification

### Community 79 - "combatPresentation.test.ts"
Cohesion: 0.14
Nodes (17): StyleAnimParams, NEUTRAL_PERSONALITY, PERSONALITIES, PersonalityArchetype, personalityForArchetype(), personalityForStyle(), STYLE_TO_ARCHETYPE, approachScalar() (+9 more)

### Community 82 - "ManageView.tsx"
Cohesion: 0.12
Nodes (14): CoopFilters(), STATUS_OPTIONS, CoopHUD(), CoopMode, EggGrid(), ManageView(), CoopPage(), VillageView() (+6 more)

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

### Community 98 - "ChickenCard.tsx"
Cohesion: 0.10
Nodes (24): OffspringPreview(), BreedPageContent(), ParentCard(), ROLE_RIBBON, SEX_ICON, STAT_ICON, SEX_ICON, STAGE_COLOR (+16 more)

### Community 99 - "65. CORE DESIGN RULES"
Cohesion: 0.18
Nodes (11): 65. CORE DESIGN RULES, Rule 1, Rule 10, Rule 2, Rule 3, Rule 4, Rule 5, Rule 6 (+3 more)

### Community 100 - "Training — Design Spec"
Cohesion: 0.18
Nodes (10): API routes, Core logic (`lib/training.ts`), Data model, `POST /api/chickens/[id]/rest`, `POST /api/chickens/[id]/train`, Scope, Stat mapping, Testing (TDD) (+2 more)

### Community 101 - "arenaRoam.ts"
Cohesion: 0.31
Nodes (8): clampToDisc(), DEFAULT_ROAM, distanceBand(), NeutralIntent, preferredDistance(), RoamConfig, RoamContext, roamPose

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

### Community 108 - "lib/types.ts"
Cohesion: 0.07
Nodes (40): POST(), POST(), POST(), ChickenCard(), CoopSelectionPanel(), SEX_ICON, retireChicken(), isChampion() (+32 more)

### Community 110 - "32. SPECIALIZED BLOODLINES"
Cohesion: 0.33
Nodes (6): 32. SPECIALIZED BLOODLINES, COLLECTION BLOODLINE, CRITICAL BLOODLINE, MUTATION BLOODLINE, SPEED BLOODLINE, TANK BLOODLINE

### Community 111 - "stylePolicy.ts"
Cohesion: 0.47
Nodes (4): STYLE_POLICIES, StylePolicy, styleWeight(), COMBAT_ACTIONS

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

### Community 120 - "combat-v2/types.ts"
Cohesion: 0.12
Nodes (15): ACTIONS, exits, mobile, TRANSITIONS, ActionDefinition, ActionRuntime, AerialPhase, AerialRuntime (+7 more)

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

### Community 146 - "live/page.tsx"
Cohesion: 0.14
Nodes (16): LiveMatchupResponse, LiveMode, LiveResolveResponse, MODE_LABEL, Phase, BettingPanel(), Props, ComicCommentary() (+8 more)

### Community 147 - "ChickenViewer.tsx"
Cohesion: 0.24
Nodes (7): DEMO_FIGHTER, HomeFighter, acquireCanvasSlot(), ChickenViewer(), releaseCanvasSlot(), SEX_EMOJI, waiters

### Community 148 - "tournament.ts"
Cohesion: 0.15
Nodes (19): applyFightOutcome(), fakeResult(), playerAlwaysLosesFight(), playerAlwaysWinsFight(), advanceEntrantChicken(), BASE_PLACEMENT_TOKENS, createTournament(), resolveRound() (+11 more)

### Community 149 - "behavior.ts"
Cohesion: 0.17
Nodes (20): ARCHETYPE_PROFILES, chooseAction(), clamp01(), DecisionContext, driftBehaviorProfile(), Rng, scoreAction(), emptyExperience() (+12 more)

### Community 150 - "validation-gate-sim.ts"
Cohesion: 0.23
Nodes (12): autoCoachPolicy(), CoachFn, CoachObservation, simulateBattle(), autoWinRate, buildFighter(), manualWinRate, noCommandWinRate (+4 more)

### Community 151 - "chickens/[id]/fight/[sessionId]/step/route.ts"
Cohesion: 0.16
Nodes (17): POST(), StepBody, POST(), ResolveBody, POST(), buildBattleReport(), createBattleSession(), createTournamentBattleSession() (+9 more)

### Community 152 - "[bossId]/fight/[sessionId]/step/route.ts"
Cohesion: 0.27
Nodes (9): POST(), StepBody, BossFightEntry, createBossFightSession(), endBossFightSession(), getBossFightSession(), sessions, finishBossFight() (+1 more)

### Community 153 - "training/page.tsx"
Cohesion: 0.16
Nodes (17): FacilityViewDTO, remainingMinutes(), SessionDTO, TrainingPageContent(), cancel(), refresh(), startTraining(), upgrade() (+9 more)

### Community 154 - "pve/types.ts"
Cohesion: 0.21
Nodes (9): CampaignMap(), NODE_ICON, Props, BossPreviewBars, BossProgressView, BossRewardConfig, CampaignProgressView, PublicPveBoss (+1 more)

### Community 155 - "seed-god-chickens.ts"
Cohesion: 0.16
Nodes (14): CALM, IRON_STAMINA, pickWeightedTrait(), RARITY_WEIGHT, Rng, TRAIT_POOL, FIGHTING_STYLES, Trait (+6 more)

### Community 156 - "FightingStyle"
Cohesion: 0.39
Nodes (7): FightingStyle, balancedStatBlock(), baselinePhysicalBlock(), main(), PAIRS, solidColorScheme(), zeroStatBlock()

### Community 157 - "TournamentPage"
Cohesion: 0.36
Nodes (5): TournamentPage(), currentOpponentEntrant(), handleFight(), handleReplayEnd(), stepLive()

### Community 158 - "5. Screen 3 — Boss Encounter"
Cohesion: 0.15
Nodes (13): 5. Screen 3 — Boss Encounter, Archetype, Boss description, Fight history, Flavor line, Header, Known traits, Layout (+5 more)

### Community 159 - "31. UX Principle"
Cohesion: 0.18
Nodes (11): 31. UX Principle, Battle, Boss encounter, Campaign map, Campaign return, Entrance, Fighter selection, Progression (+3 more)

### Community 160 - "LiveCombatV2Session"
Cohesion: 0.40
Nodes (5): POST(), POST(), commandMode(), LiveCombatV2Session, startBossFight()

### Community 161 - "5. Campaign Node Types"
Cohesion: 0.20
Nodes (10): 5. Campaign Node Types, Challenge, Championship, Gatekeeper, Invitational, Qualifier, Rematch, Rival Fight (+2 more)

### Community 162 - "Suggested sequence"
Cohesion: 0.20
Nodes (10): 10. Screen 8 — Arena Entrance / Boss Intro, Beat 1, Beat 2, Beat 3, Beat 4, Beat 5, Beat 6, Beat 7 (+2 more)

### Community 163 - "momentum.ts"
Cohesion: 0.27
Nodes (8): clampMomentum(), decayMomentum(), MOMENTUM_MAX, MOMENTUM_MIN, MOMENTUM_RISK_NUDGE_CAP, momentumDelta(), MomentumEvent, momentumRiskNudge()

### Community 165 - "rehab.ts"
Cohesion: 0.22
Nodes (8): isTrainingLocked(), LOCATION_LOCKS, REHAB_LABEL, REHAB_LADDER, rehabStage(), trainingLocks(), InjuryLocation, RehabStage

### Community 166 - "liveSession.ts"
Cohesion: 0.14
Nodes (13): COMBAT_VERSION, createMatch(), freeze(), validateNumbers(), createCombatRng(), MatchConfig, toCombatV2Snapshot(), fixture() (+5 more)

### Community 167 - "constants.ts"
Cohesion: 0.15
Nodes (10): ContinuousBattle(), pose(), COMBAT_DT, COMBAT_TICK_RATE, COMMAND_BUFFER_TICKS, queueCommand(), CombatSession, CombatEvent (+2 more)

### Community 168 - "3. Screen 1 — PvE Campaign Home"
Cohesion: 0.22
Nodes (9): 3. Screen 1 — PvE Campaign Home, Bottom campaign panel, Center content, Current node treatment, Example, Full-screen background, Layout, Purpose (+1 more)

### Community 169 - "campaign.ts"
Cohesion: 0.25
Nodes (7): circuitFor(), circuitForBoss(), PVE_CIRCUITS, quotes, titles, PveNodeType, PveOpponentPresentation

### Community 170 - "GENETIC_STAT_KEYS"
Cohesion: 0.28
Nodes (5): seedEgg(), zeroBlock(), seedChicken(), statBlock(), GENETIC_STAT_KEYS

### Community 171 - "8. Boss Archetypes as Combat Lessons"
Cohesion: 0.25
Nodes (8): 8. Boss Archetypes as Combat Lessons, The Charger, The Feint Master, The Grinder, The Pressure King, The Striker, The Veteran, The Wall

### Community 172 - "24. UI Style System"
Cohesion: 0.29
Nodes (7): 24. UI Style System, Display, Gold, Hierarchy, Panels, Typography, UI / Metadata

### Community 173 - "25. Background Strategy"
Cohesion: 0.29
Nodes (7): 25. Background Strategy, Boss encounter, Campaign map, Championship, Fighter selection, Results, Tale of the Tape

### Community 174 - "bosses/route.ts"
Cohesion: 0.60
Nodes (5): GET(), campaignProgress(), isUnlocked(), listBosses(), progressRows()

### Community 175 - "6. Circuit / Chapter Presentation"
Cohesion: 0.33
Nodes (6): 6. Circuit / Chapter Presentation, Chapter I — Backyard Circuit, Chapter II — Provincial Pits, Chapter III — Regional Circuit, Chapter IV — National Circuit, Chapter V — Grand Championship

### Community 176 - "30. Increasing Stakes Per Round"
Cohesion: 0.40
Nodes (5): 30. Increasing Stakes Per Round, Early Round, Final, Quarterfinal, Semifinal

### Community 177 - "10. Fighter Card States"
Cohesion: 0.40
Nodes (5): 10. Fighter Card States, Default, Hover, Ineligible, Selected

### Community 178 - "23. Reusable Components"
Cohesion: 0.33
Nodes (6): 23. Reusable Components, Boss, Campaign, Fighter selection, Post-fight, Pre-fight

### Community 179 - "29. Tournament Round Naming"
Cohesion: 0.50
Nodes (4): 16-Bird, 29. Tournament Round Naming, 32-Bird, 8-Bird

### Community 180 - "49. Initial V1 Scope"
Cohesion: 0.50
Nodes (4): 49. Initial V1 Scope, Add shortly afterward, Later, Required

### Community 181 - "31. Buttons"
Cohesion: 0.50
Nodes (4): 31. Buttons, Primary, Secondary, Tertiary

### Community 182 - "5. Typography"
Cohesion: 0.67
Nodes (3): 5. Typography, Display Font, Utility Font

### Community 187 - "35. Recommended MVP Scope"
Cohesion: 0.40
Nodes (5): 35. Recommended MVP Scope, Phase 1 — Presentation Revamp, Phase 2 — Career Layer, Phase 3 — Dynamic Stories, Phase 4 — Legacy

### Community 188 - "6. Screen 4 — Scout Report"
Cohesion: 0.40
Nodes (5): 6. Screen 4 — Scout Report, Example, Purpose, Scout confidence, Visual style

### Community 189 - "7. Screen 5 — Fighter Selection"
Cohesion: 0.40
Nodes (5): 7. Screen 5 — Fighter Selection, Fighter card, Layout, Matchup tags, Purpose

### Community 190 - "29. Implementation Priority"
Cohesion: 0.50
Nodes (4): 29. Implementation Priority, Phase 1 — Essential Revamp, Phase 2 — Campaign Depth, Phase 3 — Championship Presentation

### Community 191 - "30. What Should Be Removed"
Cohesion: 0.50
Nodes (4): 30. What Should Be Removed, Current boss page, Current pre-battle screen, Current PvE page

### Community 192 - "4. Screen 2 — Circuit / Chapter Detail"
Cohesion: 0.50
Nodes (4): 4. Screen 2 — Circuit / Chapter Detail, Layout, Optional flavor panel, Purpose

### Community 193 - "9. Screen 7 — Tale of the Tape"
Cohesion: 0.50
Nodes (4): 9. Screen 7 — Tale of the Tape, CTA, Layout, Purpose

### Community 194 - "12. Screen 10 — Victory / Defeat Result"
Cohesion: 0.67
Nodes (3): 12. Screen 10 — Victory / Defeat Result, Defeat, Victory

## Knowledge Gaps
- **1352 isolated node(s):** `StepBody`, `Body`, `DevAction`, `BetBody`, `ResolveBody` (+1347 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1514 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Chicken` connect `getOrCreatePlayer` to `animations/index.ts`, `pve/service.ts`, `BattleCanvas.tsx`, `deriveBehaviorProfile`, `chickenGenerator.ts`, `chicken/[chickenId]/page.tsx`, `ConditionMonitor.tsx`, `live/page.tsx`, `ChickenViewer.tsx`, `tournament.ts`, `behavior.ts`, `BattleStage3D.tsx`, `chickens/[id]/fight/[sessionId]/step/route.ts`, `[bossId]/fight/[sessionId]/step/route.ts`, `training/page.tsx`, `StatBlock`, `validation-gate-sim.ts`, `liveCommentary.ts`, `simulator.ts`, `testHelpers.ts`, `LiveCombatV2Session`, `facilities/service.ts`, `ChickenPhysicsRig.tsx`, `medical.test.ts`, `liveSession.ts`, `BattleSession`, `MatchupScreen.tsx`, `coopVillage.ts`, `battleReport.ts`, `medical/service.ts`, `thumbnailCache.ts`, `tournament/service.ts`, `tournament/[chickenId]/page.tsx`, `combat.ts`, `fight/[chickenId]/page.tsx`, `training.ts`, `ManageView.tsx`, `ChickenCard.tsx`, `lib/types.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `LiveCombatV2Session` connect `LiveCombatV2Session` to `simulateFight`, `getOrCreatePlayer`, `pve/service.ts`, `liveSession.ts`, `BattleSession`, `chickens/[id]/fight/[sessionId]/step/route.ts`, `[bossId]/fight/[sessionId]/step/route.ts`, `combat.ts`, `testHelpers.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `AudioEngine` connect `AudioEngine` to `BattleCanvas.tsx`, `BattleStage3D.tsx`, `constants.ts`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `StepBody`, `Body`, `DevAction` to the rest of the system?**
  _1352 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `animations/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05693730729701953 - nodes in this community are weakly interconnected._
- **Should `BattleCanvas.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07751937984496124 - nodes in this community are weakly interconnected._
- **Should `resolution.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11264367816091954 - nodes in this community are weakly interconnected._