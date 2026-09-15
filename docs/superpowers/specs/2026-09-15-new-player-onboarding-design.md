# New Player Onboarding and Interactive First Dynasty — Design Spec

**Status:** Implementation specification  
**Date:** 2026-09-15  
**Priority:** P0 first-session and production-auth companion  
**Owner:** Application/gameplay  
**Parent specs:** `docs/superpowers/specs/2026-09-15-production-auth-design.md` and `docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md`, especially new-player experience (§2), the core loop (§1), server authority (§50), and player profiles (§54)  
**Related canonical specs:** `docs/combat/COMBAT-CANONICAL.md`, `docs/combat/tournament-flow-spec.md`, `docs/superpowers/specs/2026-09-07-training-phase1-foundation-design.md`, and `docs/ui/rooster-clinic-revamp-spec.md`  
**Target stack:** Next.js 16 App Router, Supabase Auth, Supabase Postgres, Prisma 6, React 19, canonical persisted combat

---

## 1. Decision summary

Cockfight Chronicles will give each newly confirmed account one resumable, server-authored onboarding campaign before the normal ranch becomes its default destination.

The campaign teaches the real dynasty loop through real game actions:

> Meet starter pair → Breed → Hatch → Raise → Train → Fight → Recover → Tournament → PvE boss → Ranch

The player first meets one starter rooster as the hero of the story. A starter hen is then introduced as the rooster's breeding partner, preserving the baseline starter package and making the first breeding action possible without a market purchase.

The tutorial is not a client-side checklist and does not maintain progression in `localStorage`. It is a versioned, persisted state machine owned by the current `Player`. The server decides which action is legal, resolves all resource IDs from stored progress, calls the same domain services used by the rest of the game, and advances a step only after the authoritative mutation succeeds.

The tutorial battle is an authored `TUTORIAL` encounter running through canonical persisted combat. It teaches `PRESS`, `WAIT`, `COUNTER`, and `RECOVER` without introducing a second combat engine. Tutorial settlement may limit the first bout to a reversible minor injury and prevent death or permanent damage, but it must not fake commands, accept a client-reported winner, or duplicate combat rewards.

The first tournament is the real persisted Barangay Open. The first PvE encounter is the real `rookie` boss. Tournament and boss outcomes remain authentic. Onboarding completion depends on participating and viewing the result, not on winning, so a random loss can never trap a new account.

---

## 2. Relationship to production authentication

This specification is a companion to the production-auth specification, not a competing identity design.

The auth invariants remain unchanged:

- Supabase Auth proves identity.
- `requirePlayer()` resolves the verified auth subject to exactly one internal `Player`.
- `proxy.ts` refreshes cookies and performs only optimistic auth redirects; it does not query onboarding state.
- every onboarding API authenticates again and derives `playerId` from `requirePlayer()`;
- no onboarding request accepts `playerId`, `authUserId`, ownership, credits, rewards, resource IDs, fight results, tournament results, or progress state from the browser;
- foreign and missing artifacts use the same non-enumerating `404` behavior as the rest of the game.

### 2.1 Provisioning boundary

`getOrProvisionPlayer(authUserId)` creates the following exactly once in its starter-grant transaction:

- the `Player`;
- one adult generation-0 starter rooster;
- one adult generation-0 starter hen;
- a level-1 `TRAINING_GYM`;
- a level-1 `ROOSTER_CLINIC`;
- the starter currency defined in server configuration;
- one `OnboardingProgress` row at the current onboarding version;
- one auditable starter-grant/onboarding-created event.

Provisioning does not create the first egg or offspring. Those are earned by performing the breeding and hatching chapters.

Both starter birds are useful, average-potential, server-generated founders. They are marked with `origin = "STARTER"` and remain trade-locked until the account finishes onboarding and satisfies the future earned trading rule. A client cannot choose their IVs, EVs, traits, breed, sex, growth stage, value, or trade state.

### 2.2 Post-confirmation redirect

After successful email confirmation and provisioning:

- a new or incomplete account goes to `/onboarding`;
- a completed or exempt account goes to its validated relative `next` destination or `/`;
- an incomplete account's validated deep-link is stored as `returnPath` and used only after completion or an explicit skip;
- invalid, external, scheme-relative, or encoded external destinations are discarded exactly as specified by auth.

`proxy.ts` must not perform the database lookup needed for this decision. A protected server layout or a server-only navigation helper calls `requirePlayer()` and reads the onboarding projection after auth has succeeded.

### 2.3 Existing-account policy

Existing players linked during the auth migration are set to `EXEMPT` and receive no starter grant. They can replay the tutorial later in read-only/practice mode from Help, but replay never creates birds, eggs, credits, tournament tokens, records, or PvE rewards.

Only a newly provisioned player can enter the grant-bearing `ACTIVE` onboarding state.

---

## 3. Goals

1. Teach the actual core loop through interaction instead of a slideshow.
2. Give every new account a viable starter pair and a personally bred first fighter.
3. Make the flow resumable across reloads, token refreshes, browser restarts, deployments, and device changes.
4. Keep identity, ownership, progression, rewards, and outcomes server-authoritative.
5. Reuse breeding, hatching, growth, training, recovery, tournament, PvE, and canonical combat logic.
6. Prevent duplicate starter assets, step rewards, treatment waivers, brackets, encounters, and settlements.
7. Let a player lose, disconnect, or make a suboptimal choice without becoming stuck.
8. Explain why a mechanic matters to the bloodline, not only which button to press.
9. Remain keyboard accessible, mobile usable, reduced-motion compatible, and screen-reader understandable.
10. Produce analytics that reveal confusion and drop-off without storing auth secrets or invasive personal data.

## 4. Non-goals

This implementation does not add:

- a second or simplified combat simulator;
- client-authored tutorial progress;
- a general quest engine, achievement system, or live-ops campaign editor;
- free replayable rewards;
- guaranteed tournament or PvE wins;
- a complete market, retirement, advanced facility, live betting, or pedigree tutorial;
- multiplayer combat;
- voice-over as a launch requirement;
- hard server denial of every normal game API until onboarding is complete;
- a way to reset an account and claim starter assets again.

The onboarding state machine may later become an input to a general quest system, but launch code must stay narrowly scoped to first-run education.

---

## 5. Experience principles

### 5.1 One dynasty, not a feature tour

Every chapter follows the same family:

- the starter rooster is introduced as the first champion candidate;
- the starter hen establishes the first breeding decision;
- their offspring becomes the player's first self-bred fighter;
- training, combat, recovery, tournament, and PvE all follow that offspring;
- the final ranch view shows the resulting three-bird bloodline and its history.

This provides continuity and demonstrates why breeding matters.

### 5.2 Explain before, during, and after

Each chapter has three small beats:

1. **Context:** what this system means for the dynasty.
2. **Action:** one clear, real interaction.
3. **Reflection:** the authoritative result and the tradeoff it created.

Tooltips alone are insufficient. A chapter must expose the result that proves the mechanic happened: inherited stats, changed growth stage, EV/training result, combat command receipt, health/injury state, bracket state, or boss progress.

### 5.3 Guided, not brittle

The shell highlights the current objective and recommended action. It may temporarily collapse unrelated navigation to reduce noise, but it must not rely on fragile DOM selectors or a sequence of tooltip coordinates over unrelated pages.

Critical actions are rendered as explicit onboarding chapter components backed by stable domain APIs. Existing reusable UI such as chicken viewers, stat blocks, training cards, clinic cards, bracket views, matchup presentation, and canonical combat HUD should be extracted and embedded rather than copied.

### 5.4 Failure is teachable

- a training risk or fight loss is explained, not silently rerolled;
- a tournament loss still completes the competition lesson;
- a PvE loss still completes the boss lesson and recommends the next training/recovery action;
- retry is available for recoverable technical failure;
- gameplay failure never sends progress backward.

### 5.5 Time has meaning without blocking the session

The first training session uses the real level-1 timed session pipeline. Its launch program remains short (currently one minute). While it runs, the tutorial explains server timers and lets the player inspect the fighter. Progress resumes automatically when `claimExpiredSessions()` settles it.

No tutorial-only browser timer may award progress.

---

## 6. Canonical onboarding journey

### Chapter 0 — Welcome to the ranch

**Step IDs:** `WELCOME`, `NAME_DYNASTY`  
**Primary lesson:** the player manages a bloodline, not a disposable combat avatar.

The coach introduces the ranch and asks for an optional display/dynasty name. Name rules and moderation are server-side. Skipping the name keeps a neutral generated display label and does not block progress.

The chapter shows a compact progress rail with the seven major chapters and says up front that progress is saved automatically.

**Completion evidence:** accepted display-name mutation or explicit server-recorded skip.

### Chapter 1 — Meet the founders

**Step IDs:** `MEET_ROOSTER`, `MEET_HEN`, `READ_FIGHTER`  
**Primary lesson:** identity, sex, generation, IV versus EV, traits, growth stage, health, energy, condition, and record.

The starter rooster receives the hero presentation first, satisfying the feeling that the player “starts with a chicken.” The hen then enters as the second founder required to create a line.

The player opens the rooster dossier and selects three highlighted regions:

- genetics/potential;
- developed stats/training;
- readiness/medical condition.

Selections are educational UI events, not security-sensitive mutations. The server records only the chapter completion action after all required regions were acknowledged in the current client session. No rewards depend on the individual clicks.

**Completion evidence:** `READ_FIGHTER` event plus both owned starter artifact IDs still resolving to the provisioned birds.

### Chapter 2 — Create the first generation

**Step IDs:** `SELECT_PARENTS`, `BREED`, `HATCH`, `RAISE_JUVENILE`, `RAISE_YOUNG_ADULT`  
**Primary lesson:** parent roles, inheritance, eggs, generations, and growth readiness.

The server already knows the starter pair. The UI lets the player inspect both and confirm the match, but it does not post their IDs. `BREED` calls the extracted authoritative breeding service with the stored starter rooster and hen IDs.

After breeding, the inheritance reveal compares parent ranges with the egg's inherited phenotype without exposing private random seeds. The player hatches the real persisted egg. The hatched bird becomes the tutorial's `offspringChickenId` regardless of sex.

If the offspring is a hen, the system still teaches growth and training with her, but combat chapters require a rooster. To preserve the one-family narrative, onboarding generation is deterministic by server-side tutorial version and produces a rooster. The browser cannot request or reroll sex.

Growth uses the real `ageUpRequirements()` and growth service. The player advances:

- chick → juvenile;
- juvenile → young adult.

The second transition makes the offspring trainable and battle-age. The adult transition is deferred until the breeding explanation after onboarding; the player does not need the offspring to breed during the first session.

The UI explains that production progression can later add longer time/resource gates; the tutorial does not fabricate unmet requirements.

**Completion evidence:** one owned tutorial egg consumed, one owned generation-1 offspring exists, and its growth stage is at least `young_adult`.

### Chapter 3 — Build a fighter

**Step IDs:** `CHOOSE_TRAINING`, `TRAINING_ACTIVE`, `TRAINING_RESULT`  
**Primary lesson:** genetic ceiling versus developed ability, specialization, energy, fatigue, stress, training points, risk, and server timers.

The coach recommends one level-1 program based on the offspring's highest useful IV while still allowing any safe level-1 program. The setup preview is authoritative and shows:

- expected development range, never a guaranteed exact gain;
- energy, fatigue, stress, and training-point costs;
- primary and secondary stats;
- injury risk and why extreme intensity is inappropriate for a new fighter.

Launch onboarding permits `light` or `normal` intensity. The selected program is submitted to the onboarding action endpoint, which validates it against a server allowlist and calls `startTrainingSession()`.

The active state explains that training continues on the server. After expiry, the server calls `claimExpiredSessions()`, verifies the stored session is complete, and presents the real adaptation result. The player acknowledges which stat changed.

**Completion evidence:** the stored onboarding training session is `COMPLETED` and has a persisted `adaptationResult`.

### Chapter 4 — Coach the first fight

**Step IDs:** `FIGHT_BRIEFING`, `TUTORIAL_FIGHT_ACTIVE`, `TUTORIAL_FIGHT_RESULT`  
**Primary lesson:** automated movement, readable intent, coaching commands, command timing, health, stamina, condition, and post-fight consequences.

The matchup screen introduces a fixed tutorial opponent whose stats and behavior are authored for onboarding version 1. The opponent is weaker than a normal matched opponent but still uses a real `Chicken` snapshot and the canonical runtime.

The player must successfully issue or acknowledge the effects of these commands during valid read windows:

- `WAIT` — gather information and avoid overcommitting;
- `PRESS` — increase forward pressure;
- `COUNTER` — punish commitment;
- `RECOVER` — trade initiative for recovery.

The UI may recommend commands, but the server validates command timing and returns canonical receipts. If the bout ends before all four are accepted, the result screen can demonstrate the missing command in a non-settling practice vignette; it must not alter the recorded result.

Tutorial safety policy:

- mode is `TUTORIAL`, stored on `CombatEncounter` and `CombatSessionRecord`;
- the physics, actions, clashes, commands, events, checkpoints, reconnect behavior, and terminal result use canonical combat;
- no death or career-altering injury can be settled from this mode;
- the tutorial opponent pays no credits, tokens, reputation, or market value;
- the player fighter receives normal bounded experience and a tutorial-safe aftermath;
- settlement is idempotent and releases `activeCombatSessionId` exactly once;
- the authored version-1 fixture leaves the fighter with a reversible care need so the clinic chapter is deterministic;
- this care need is a clearly labeled tutorial strain, not a forged canonical injury event presented as if it occurred in the simulation.

The result screen distinguishes damage, condition, injury/strain, experience, and record. Tutorial mode does not add a public win/loss record; the first tournament becomes the first career result.

**Completion evidence:** stored tutorial combat session is `SETTLED` and its result has been acknowledged.

### Chapter 5 — Recover intelligently

**Step IDs:** `CLINIC_TRIAGE`, `CLINIC_ACTION`, `CLINIC_RESULT`  
**Primary lesson:** health versus condition, injury severity, treatment eligibility, credits, treatment time, medical rest, and fight readiness.

The clinic opens with the offspring already selected. The readiness panel explains exactly which state blocks or weakens combat.

The player reviews the tutorial strain and starts its recommended care. Version 1 uses a one-time onboarding treatment waiver recorded in the event ledger. The normal plan and crossed-out cost remain visible so the economy is taught, but credits are not debited. The waiver:

- is valid only for the stored onboarding offspring;
- is valid only during `CLINIC_ACTION`;
- is consumed in the same transaction that creates/completes the tutorial care action;
- cannot treat unrelated injuries or illnesses;
- cannot be converted to credits;
- cannot be issued again by replay, reset, or retries.

The chapter also explains that medical rest is free and improves energy, condition, stress, morale, fatigue, and natural recovery, while paid treatment handles HP and specific injuries/illnesses. Launch onboarding should use an immediate care result for the authored tutorial strain so the player is not forced through a second timer directly after training.

**Completion evidence:** waiver event exists once, tutorial strain is resolved, and `battleEligibility()` reports the offspring eligible or only non-medical tutorial-safe warnings remain.

### Chapter 6 — Enter the first tournament

**Step IDs:** `TOURNAMENT_BRIEFING`, `TOURNAMENT_ACTIVE`, `TOURNAMENT_RESULT`  
**Primary lesson:** registration, brackets, persistent condition/injuries, rounds, leaving to recover, placement, and tournament tokens.

Onboarding registers the offspring in the real `barangay-open` definition:

- 8 entrants;
- beginner tier;
- single elimination;
- one registered fighter;
- condition carries between rounds;
- no entry fee at launch.

The server resolves the definition, size, and tier. The browser sends no tournament parameters or opponent data.

Each player match is a canonical `TOURNAMENT` combat session. NPC matches and bracket advancement remain authoritative. If the player survives a round but is not medically ready for the next, the flow routes to a compact clinic/recovery interlude and then resumes the same persisted bracket.

The chapter completes when the tournament becomes `COMPLETE`, whether the player is champion or is eliminated. Existing placement/token rules and the Barangay Open champion credit prize apply exactly once. On a loss, the coach explains the battle report and turns weaknesses into the next training recommendation.

To guarantee the same offspring can reach the boss chapter, a one-run `NOVICE_MEDICAL_COVERAGE` entitlement applies to this stored onboarding tournament only. Combat and bracket outcomes remain canonical, but settlement cannot leave a career-altering injury on the novice fighter. After the tournament result is acknowledged, the sponsor resolves remaining combat-blocking HP and non-permanent injury recovery in an audited, non-cashable care transaction. The result screen shows the authentic aftermath first and labels the sponsor's medical adjustment separately. This entitlement cannot be used in another tournament, converted to credits, replayed, or selected by the browser.

**Completion evidence:** stored tutorial tournament belongs to the player, uses `barangay-open`, and has `status = COMPLETE`.

### Chapter 7 — Face the first PvE boss

**Step IDs:** `PVE_SCOUT`, `PVE_FIGHT_ACTIVE`, `PVE_RESULT`  
**Primary lesson:** fixed boss identity, scouting, style matchup, campaign unlocks, first-clear rewards, rivalry/history, and retry preparation.

The campaign map reveals `rookie`, the normal first unlocked boss. The scout report compares the offspring's developed profile with The Rookie's aggressive, tiring style and asks the player to choose an opening command.

The fight uses the real `startBossFight()`/canonical combat path with `bossId = "rookie"`. It is not tutorial-safe combat: normal PvE aftermath, first-clear credits, experience multiplier, progress, history, reputation, and campaign events apply.

Onboarding completes after the first boss result is acknowledged, win or loss. A win celebrates the first clear and unlocks the normal campaign. A loss still opens the ranch and pins “Prepare for The Rookie” as the suggested next goal.

**Completion evidence:** the stored boss combat session is settled and belongs to the player. A `PveProgress` clear is required only to display the victory branch, not to finish onboarding.

### Epilogue — The ranch is yours

**Step IDs:** `COMPLETE`  
**Primary lesson:** the loop now belongs to the player.

The epilogue summarizes:

- founder pair and first offspring;
- training choice and development;
- tournament placement;
- Rookie outcome;
- current medical readiness;
- suggested next action.

The server marks onboarding complete before navigation. The normal ranch becomes the default destination, full navigation is restored, and the validated `returnPath` may be offered as a secondary action.

---

## 7. Persistence model

### 7.1 Player fields

Extend the auth specification's `Player` shape:

```prisma
model Player {
  // auth specification fields
  onboardingState       String    @default("PENDING")
  onboardingVersion     Int       @default(1)
  onboardingCompletedAt DateTime?
  onboardingProgress    OnboardingProgress?
  onboardingEvents      OnboardingEvent[]
}
```

`onboardingState` is a coarse account projection: `PENDING`, `ACTIVE`, `COMPLETE`, or `EXEMPT`. It is useful for DTOs and indexed routing. Detailed progress lives only in `OnboardingProgress`.

### 7.2 Progress and event ledger

```prisma
model OnboardingProgress {
  id          String   @id @default(uuid())
  playerId    String   @unique
  player      Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  version     Int      @default(1)
  status      String   @default("ACTIVE")
  currentStep String   @default("WELCOME")
  revision    Int      @default(1)
  artifacts   Json     @default("{}")
  returnPath  String?
  startedAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?

  events OnboardingEvent[]

  @@index([status, updatedAt])
}

model OnboardingEvent {
  id             String   @id @default(uuid())
  progressId     String
  progress       OnboardingProgress @relation(fields: [progressId], references: [id], onDelete: Cascade)
  playerId       String
  player         Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  version        Int
  step           String
  kind           String
  idempotencyKey String
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now())

  @@unique([playerId, idempotencyKey])
  @@index([playerId, createdAt])
}
```

`artifacts` is a server-written, versioned object containing only IDs needed to resume the flow:

```ts
type OnboardingArtifactsV1 = {
  starterRoosterId: string;
  starterHenId: string;
  eggId?: string;
  offspringChickenId?: string;
  trainingSessionId?: string;
  tutorialEncounterId?: string;
  tutorialCombatSessionId?: string;
  tournamentId?: string;
  tournamentCombatSessionId?: string;
  bossCombatSessionId?: string;
};
```

These IDs are never trusted merely because they exist in JSON. Every use reloads the target with the current `playerId`, expected type/mode, and expected lifecycle state.

`OnboardingEvent.metadata` contains safe operational facts such as selected program ID, settled outcome class, or transition reason. It never stores auth claims, email, tokens, combat seed/checkpoint, full fighter snapshots, or provider responses.

### 7.3 Starter provenance and trade lock

Add explicit provenance instead of inferring starter status from names or generation:

```prisma
model Chicken {
  origin          String  @default("BRED")
  tradeLocked     Boolean @default(false)
  tradeLockReason String?
}
```

Launch starter birds use `origin = "STARTER"` and `tradeLockReason = "STARTER_PROTECTION"`. The first tutorial offspring uses `origin = "TUTORIAL_BRED"`; its trading policy follows the same earned unlock. Marketplace services, not UI buttons, enforce the lock.

Unlocking is an explicit server-side progression mutation that clears both lock fields. Do not represent a permanent or earned-condition lock with a magic far-future timestamp.

### 7.4 Versioning

`ONBOARDING_VERSION = 1` is application code, not a browser value.

- a new account starts on the current version;
- an active account stays on the version it began unless an explicit migration maps its step and artifacts;
- content-copy changes do not require a version bump;
- changed grants, step order, artifact meanings, or settlement policy require a version bump;
- unknown versions fail into a safe resumable support state and never re-provision.

---

## 8. State-machine contract

Define steps and transitions in one server-only module:

```ts
type OnboardingStep =
  | "WELCOME"
  | "NAME_DYNASTY"
  | "MEET_ROOSTER"
  | "MEET_HEN"
  | "READ_FIGHTER"
  | "SELECT_PARENTS"
  | "BREED"
  | "HATCH"
  | "RAISE_JUVENILE"
  | "RAISE_YOUNG_ADULT"
  | "CHOOSE_TRAINING"
  | "TRAINING_ACTIVE"
  | "TRAINING_RESULT"
  | "FIGHT_BRIEFING"
  | "TUTORIAL_FIGHT_ACTIVE"
  | "TUTORIAL_FIGHT_RESULT"
  | "CLINIC_TRIAGE"
  | "CLINIC_ACTION"
  | "CLINIC_RESULT"
  | "TOURNAMENT_BRIEFING"
  | "TOURNAMENT_ACTIVE"
  | "TOURNAMENT_RESULT"
  | "PVE_SCOUT"
  | "PVE_FIGHT_ACTIVE"
  | "PVE_RESULT"
  | "COMPLETE";
```

Each transition definition includes:

- accepted action kinds;
- validator/reconciliation function;
- domain command;
- next step;
- DTO presenter;
- retry policy;
- telemetry name.

### 8.1 Transaction rules

For each mutation:

1. authenticate with `requirePlayer()`;
2. lock the player's `OnboardingProgress` row;
3. validate version, status, current step, and optimistic `revision`;
4. find an existing event by `(playerId, idempotencyKey)` and return its prior safe response when present;
5. reload every referenced artifact with an owner-scoped predicate;
6. execute the domain mutation and onboarding transition in one database transaction where the domain permits it;
7. write the event, update artifacts/current step, and increment revision;
8. return a DTO, never raw progress JSON or raw Prisma models.

When an existing domain service opens its own transaction, refactor it to accept a Prisma transaction client or expose a transactional command. Do not wrap calls in loopback HTTP and do not allow progress to advance in a separate best-effort write after a high-value mutation.

### 8.2 Reconciliation

`GET /api/onboarding` performs read-only reconciliation before presenting progress:

- claims expired training/treatment sessions through their idempotent service paths;
- detects terminal canonical sessions and uses canonical settlement;
- verifies stored artifacts still exist and remain owned;
- advances waiting/result steps only when durable evidence exists;
- never creates a missing grant during ordinary reconciliation;
- never rewinds a completed step because presentation data is unavailable.

If an artifact is unexpectedly absent, return `ONBOARDING_ARTIFACT_MISSING` with a support-safe recovery action. Automatic repair may recreate only a never-issued, ledger-proven starter grant; it must never duplicate a consumed egg, settled reward, completed tournament, or boss result.

### 8.3 Skip and replay

`SKIP_ONBOARDING` is an explicit same-origin POST with confirmation.

- it marks the state `COMPLETE` with event kind `SKIPPED`;
- it preserves already-created assets, costs, outcomes, and progress;
- it does not grant missing chapter rewards or refund choices;
- it cannot cancel active training, treatment, tournament, or combat;
- active canonical combat must first settle, expire, or be safely abandoned under the canonical policy;
- it restores normal navigation and uses the validated `returnPath`.

There is no destructive reset. Replay is a separate `PRACTICE` presentation using snapshots or rewardless exhibition services.

---

## 9. Server architecture

### 9.1 New files

```text
lib/onboarding/constants.ts       version, steps, authored opponent/config
lib/onboarding/types.ts           internal state and public DTO types
lib/onboarding/errors.ts          stable typed errors
lib/onboarding/stateMachine.ts    legal transitions
lib/onboarding/provision.ts       starter-pair and facility grant
lib/onboarding/service.ts         load, reconcile, act, skip, complete
lib/onboarding/presenter.ts       safe chapter DTOs
lib/onboarding/tutorialCombat.ts  TUTORIAL encounter/settlement policy
lib/onboarding/telemetry.ts       redacted event helpers
app/onboarding/page.tsx           protected server entry
components/onboarding/OnboardingShell.tsx
components/onboarding/ChapterRail.tsx
components/onboarding/CoachPanel.tsx
components/onboarding/*Chapter.tsx
app/api/onboarding/route.ts
app/api/onboarding/actions/route.ts
```

Refactor route-owned domain logic into reusable services:

```text
lib/breeding/service.ts           breed owned parents
lib/growth/service.ts             hatch/age owned chicken
```

Existing routes become thin authenticated adapters to those services. Onboarding calls services directly.

### 9.2 Required server APIs

```ts
async function getOnboardingView(playerId: string): Promise<OnboardingView>;

async function performOnboardingAction(
  playerId: string,
  input: {
    action: OnboardingAction;
    idempotencyKey: string;
    observedRevision: number;
    choice?: SafeStepChoice;
  }
): Promise<OnboardingView>;

async function skipOnboarding(
  playerId: string,
  idempotencyKey: string,
  observedRevision: number
): Promise<OnboardingView>;
```

`SafeStepChoice` is a discriminated union containing only bounded choices such as a validated display name, a level-1 training program/intensity, or an opening coaching command. It never contains an ownership or result field.

### 9.3 API surface

`GET /api/onboarding`

- requires auth;
- provisions through `requirePlayer()` if this is the first confirmed request;
- reconciles waiting states;
- returns the current safe chapter view.

`POST /api/onboarding/actions`

- requires auth and same-origin mutation protection;
- accepts action, idempotency key, observed revision, and bounded choice only;
- returns `409 ONBOARDING_STALE_REVISION` with the latest safe view when another tab/device advanced first;
- maps domain failures to stable tutorial-aware copy without hiding the original mechanic.

No generic endpoint accepts a target step. The client cannot post `currentStep`, `complete: true`, artifact IDs, or reward amounts.

### 9.4 DTO shape

```ts
type OnboardingView = {
  version: number;
  state: "ACTIVE" | "COMPLETE" | "EXEMPT";
  step: OnboardingStep;
  revision: number;
  chapter: {
    id: string;
    index: number;
    total: number;
    title: string;
    objective: string;
    lesson: string;
  };
  allowedActions: OnboardingAction[];
  subject?: PublicChickenDTO;
  comparison?: PublicInheritanceDTO;
  training?: PublicTrainingDTO;
  combat?: PublicCombatLaunchDTO;
  clinic?: PublicClinicTutorialDTO;
  tournament?: PublicTournamentDTO;
  pve?: PublicPveTutorialDTO;
  returnPath?: string;
};
```

Sensitive fields prohibited by the auth and combat specs remain omitted: `authUserId`, internal ownership IDs unless strictly required, access/refresh tokens, combat seeds/checkpoints, settlement keys, provider metadata, and hidden NPC state.

---

## 10. Domain integration rules

### 10.1 Breeding and hatching

- extract the current `POST /api/breed` mutation into an owner-scoped service;
- use tutorial artifacts to resolve both parents;
- generate the version-1 offspring deterministically enough to guarantee a rooster but preserve server-authored IV/physical/color/trait inheritance;
- create egg and transition atomically;
- hatch and consume the egg atomically;
- global name uniqueness is best-effort presentation, not an ownership boundary;
- no direct `Math.random()` result may be accepted from the browser.

### 10.2 Growth

- use `ageUpRequirements()`, `canAgeUp()`, and `nextGrowthStage()`;
- reload and owner-scope before each transition;
- do not set `growthStage` directly from an onboarding request;
- emit the actual before/after effective-stat explanation.

### 10.3 Training

- use `previewTrainingForChicken()`, `startTrainingSession()`, and `claimExpiredSessions()`;
- store the created session ID;
- accept only launch-safe programs at facility level 1 and `light`/`normal` intensity;
- the server calculates duration, energy, fatigue, stress, training points, adaptation, injury chance, EV, experience, behavior, and traits;
- leaving the page does not cancel training;
- duplicate action keys return the same session.

### 10.4 Tutorial combat

- add `TUTORIAL` to the canonical combat-mode allowlist and explicitly define its launch surface;
- create a persisted owner-bound encounter and session;
- use normal begin, sync, command, reconnect, event, checkpoint, expiration, and settlement contracts;
- keep mode-specific safety and reward rules only in settlement policy, not in the animation client;
- verify a stored tutorial session is tied to the stored onboarding progress before advancing;
- practice command demonstrations after terminal state are client-only visual education and never produce settlement.

### 10.5 Clinic and recovery

- represent tutorial strain separately from authentic combat injuries in safe metadata or a typed recoverable status;
- do not inject a career record that claims a canonical injury occurred when it did not;
- consume the one-time waiver and resolve the strain transactionally;
- use `battleEligibility()` for the readiness explanation;
- normal injuries, illnesses, HP restoration, medical rest, treatment plans, and facility gates remain unchanged.

### 10.6 Tournament

- resolve `barangay-open` on the server;
- call `startTournament()` only once and persist its ID;
- use canonical `TOURNAMENT` sessions for player matches;
- rely on `CombatSettlementRecord` plus tournament state for exactly-once rounds/rewards;
- allow reload and clinic detours between rounds;
- complete the tutorial on either elimination or championship;
- never silently create a replacement bracket if the stored bracket exists.
- apply `NOVICE_MEDICAL_COVERAGE` only to the stored onboarding tournament, prevent career-altering novice harm there, and record any post-result sponsored care separately from the authentic battle aftermath;

### 10.7 PvE

- resolve `rookie` on the server;
- use normal unlock checks and `startBossFight()`/canonical settlement;
- store and owner-check the combat session;
- use real first-clear rewards and opponent history;
- complete after acknowledged terminal result, not only victory;
- never mark `PveProgress` clear from onboarding code.

---

## 11. Navigation and gating

### 11.1 Route groups

Use separate layouts so auth pages, onboarding, and the normal game shell remain composable:

```text
app/(auth)/...             public auth shell, no authenticated TopBar
app/(onboarding)/onboarding/page.tsx
app/(game)/layout.tsx      normal TopBar/navigation and onboarding redirect check
app/(game)/...             ranch and game pages
```

The onboarding shell may render a compact account/sign-out control. A player must always be able to sign out.

### 11.2 Redirect behavior

- visiting a normal protected page while onboarding is active redirects to `/onboarding` and preserves one validated `returnPath`;
- `/api/*` is never redirected to HTML;
- onboarding APIs return JSON `401` when auth is missing;
- completed/exempt players visiting `/onboarding` see the epilogue/replay offer, not a new grant-bearing run;
- two tabs converge through `revision` conflicts and safe refresh.

Normal game APIs retain normal ownership and authorization. The route gate guides the launch experience; security does not depend on hiding URLs.

### 11.3 Back, reload, and resume

Browser Back may revisit chapter presentation but cannot rewind server state. Reload reconstructs from `GET /api/onboarding`. Waiting combat, training, treatment, and tournament states show Resume rather than creating replacements.

---

## 12. UI and interaction specification

The visual language follows the same warm-black environment, smoked glass, brass/gold accents, parchment text, and display typography required by auth.

Desktop layout:

- left: chapter rail and saved-state indicator;
- center: interactive mechanic stage;
- right/bottom: coach context, objective, and result explanation.

Mobile layout:

- compact chapter progress at top;
- mechanic stage first;
- sticky objective/action area above safe-area inset;
- coach explanation in a dismissible but recoverable sheet.

Every screen includes:

- chapter and step name;
- one primary objective;
- why the action matters;
- clear saved/loading/retry state;
- keyboard-operable controls;
- visible focus;
- programmatic labels and error association;
- no color-only status distinctions.

Combat includes captions/event narration when audio is off. `prefers-reduced-motion` removes camera shake, rapid zoom, flashing spotlight sweeps, and nonessential animation while preserving state changes. Canvas/3D content has a textual summary and equivalent controls.

The user can reopen the most recent explanation. Critical warnings such as irreversible tournament entry, persistent injury, or spending are not auto-dismissed.

---

## 13. Error contract and recovery

Stable onboarding errors:

- `ONBOARDING_NOT_FOUND` — `404`;
- `ONBOARDING_NOT_ACTIVE` — `409`;
- `ONBOARDING_ACTION_NOT_ALLOWED` — `409`;
- `ONBOARDING_STALE_REVISION` — `409`, safe refresh;
- `ONBOARDING_ARTIFACT_MISSING` — `409`, support/recovery path;
- `ONBOARDING_VERSION_UNSUPPORTED` — `503`, safe retry/support;
- `ONBOARDING_PROVISIONING_FAILED` — `503`, safe retry;
- `ONBOARDING_DOMAIN_CONFLICT` — `409`, latest safe view;
- existing `UNAUTHENTICATED` — `401`;
- existing `FORBIDDEN` — `403`.

API envelope follows auth:

```json
{
  "error": {
    "code": "ONBOARDING_STALE_REVISION",
    "message": "Your tutorial advanced in another tab. Refreshing your saved progress.",
    "requestId": "..."
  }
}
```

Domain errors such as insufficient energy, active combat lease, medical ineligibility, or facility capacity are preserved as actionable mechanic explanations. Provider/database outages never fall back to local progress or a shared player.

---

## 14. Abuse prevention and integrity

Release-blocking invariants:

1. starter grants and onboarding rows are created only from confirmed authenticated provisioning;
2. one auth subject maps to one Player and one starter grant;
3. `OnboardingProgress.playerId` is unique;
4. each mutation requires a unique per-player idempotency key;
5. no action accepts ownership or reward data from the client;
6. all artifacts are owner- and mode-scoped when loaded;
7. replay and existing-account exemption issue no grants;
8. skip cannot reset grants or outcomes;
9. starter and tutorial-bred birds are trade-locked in marketplace services;
10. tutorial combat and care pay no repeatable currency or token reward;
11. tutorial clinic and novice tournament medical coverage are non-cashable, single-use, artifact-bound entitlements;
12. tournament and PvE rewards use their existing idempotent settlement paths;
13. no endpoint can jump directly to `COMPLETE` except the explicit skip contract;
14. progress and high-value domain mutation do not commit independently;
15. client analytics never advance gameplay state.

Rate-limit onboarding mutations per player and IP with enough allowance for combat command cadence. Combat commands retain the canonical command limit rather than sharing a low generic tutorial-action limit.

---

## 15. Observability and product analytics

Structured operational events:

- onboarding provisioned, resumed, skipped, completed;
- step started/completed/failed;
- stale-revision convergence;
- artifact missing/repair attempted;
- tutorial combat created/resumed/settled/expired;
- tournament and boss handoff/result;
- domain conflict by safe error code.

Metrics:

- start, completion, and skip rates;
- median and p90 time per chapter;
- drop-off by step and device class;
- retries and error rate by action;
- training wait abandonment/resume;
- command acceptance/rejection during tutorial combat;
- tournament rounds reached;
- Rookie win/loss rate;
- duplicate-grant count, which must remain zero;
- artifact-loss and unsupported-version count.

Use internal player ID or a non-PII correlation hash. Never log email, auth subject in raw form, cookies, JWTs, refresh tokens, combat seeds/checkpoints, passwords, or provider codes. Product analytics are not authoritative and may be sampled; the database event ledger is the audit source for grant-bearing actions.

---

## 16. Test plan

### 16.1 State-machine unit tests

- every step accepts only its declared actions;
- every legal transition has a presenter and reconciliation rule;
- illegal jumps and client-supplied target steps fail;
- stale revisions return the latest safe state;
- duplicate idempotency keys return the original result;
- version 1 active runs remain pinned when version 2 becomes current;
- skip preserves artifacts and cannot be reversed into a grant-bearing run;
- unknown versions fail safely.

### 16.2 Provisioning tests

- one confirmed auth subject creates one Player, starter pair, gym, clinic, progress row, and grant event;
- concurrent first requests still create one of each;
- starter rooster/hen sex, generation, stage, origin, ownership, and trade locks are correct;
- browser-supplied starter stats/currency are ignored or rejected;
- a provisioning failure rolls back all starter assets;
- legacy-linked players become `EXEMPT` and receive no assets;
- a second account receives distinct owned artifacts.

### 16.3 Domain integration tests

- breeding uses only the stored owned starter pair;
- duplicate breed creates one egg;
- hatch consumes one egg and creates one generation-1 tutorial rooster;
- growth follows real requirements and reaches `young_adult` without direct client stage input;
- training preview and settlement use real costs/results;
- leaving/reloading during training resumes the same session;
- tutorial combat creates one owner-bound persisted session and accepts canonical commands;
- tutorial settlement cannot cause death/permanent injury or pay repeatable rewards;
- clinic waiver applies once to only the tutorial strain/offspring;
- tournament uses `barangay-open`, persists between rounds, and settles rewards once;
- novice tournament coverage cannot be reused and leaves the tutorial offspring eligible for the boss chapter;
- elimination and championship both advance onboarding;
- Rookie win writes normal PvE progress/rewards once;
- Rookie loss does not write a clear but still permits onboarding completion;
- foreign artifact substitution and request-body `playerId` spoofing have no effect.

### 16.4 Route matrix

For both onboarding endpoints and each delegated domain route:

1. missing/expired auth returns `401`;
2. Player A can access Player A's onboarding view;
3. Player A cannot read or mutate Player B's progress/artifacts;
4. wrong-origin mutations are rejected;
5. duplicate request delivery is idempotent;
6. two tabs racing the same revision create one mutation;
7. safe DTOs omit auth and combat secrets.

### 16.5 Browser tests

- signup → confirmation → provisioning → onboarding;
- starter rooster hero reveal → hen reveal → dossier;
- breed → hatch → grow → train → timed resume/result;
- command-guided tutorial fight and reconnect;
- clinic triage and one-time waiver;
- persisted multi-round tournament with an optional clinic detour;
- Rookie fight victory branch;
- Rookie fight loss branch;
- skip confirmation and return-path restoration;
- refresh/back/multi-tab behavior at every waiting step;
- sign out and sign back in mid-flow;
- token refresh during combat and training;
- keyboard-only, screen-reader labels, mobile viewport, reduced motion, and audio-off captions;
- completed and exempt accounts cannot obtain new grants by revisiting `/onboarding`.

### 16.6 Failure-injection tests

- database failure after domain mutation but before transition rolls back both where transactionally coupled;
- provider outage fails closed without losing progress;
- deployment/restart during canonical combat resumes from persisted checkpoint;
- missing optional presentation asset does not corrupt progress;
- missing authoritative artifact enters recovery state without recreation;
- active combat lease prevents duplicate tournament/PvE launch;
- repeated settlement calls remain exactly once.

---

## 17. Implementation sequence

### Phase 0 — align foundations

1. Complete production-auth identity foundation and Migration A.
2. Fix Prisma validation blockers identified by auth.
3. extract breeding, hatching, and growth mutations into owner-scoped services;
4. confirm canonical combat is the only production tutorial/tournament/PvE battle path;
5. define starter configuration and authored tutorial opponent fixtures in server code.

### Phase 1 — persistence and provisioning

1. Add onboarding fields, progress/event models, chicken provenance, and trade-lock fields.
2. Implement versioned starter-pair/facility provisioning inside `getOrProvisionPlayer()`.
3. Implement existing-player exemption migration.
4. Add concurrency, rollback, and trade-lock tests.

### Phase 2 — state machine and non-combat chapters

1. Implement typed steps, errors, DTOs, action endpoint, reconciliation, and skip.
2. Build welcome/founders, breeding, hatching, growth, and training chapters.
3. Refactor reusable dossier, breeding, coop, and training presentation components.
4. Add resume, idempotency, and two-account route tests.

### Phase 3 — tutorial combat and clinic

1. Add canonical `TUTORIAL` mode and authored encounter fixture.
2. Define and test tutorial-safe settlement without a second engine.
3. Embed canonical combat HUD with command teaching and reconnect.
4. Add tutorial strain and one-time clinic-waiver transaction.
5. Verify no repeatable rewards and no permanent tutorial harm.

### Phase 4 — tournament, PvE, and shell

1. Connect the real Barangay Open lifecycle and recovery detours.
2. Connect The Rookie scout/fight/result lifecycle.
3. Add epilogue, normal-shell unlock, and validated return path.
4. Add full browser and failure-injection coverage.

### Phase 5 — rollout and tuning

1. Ship behind `ONBOARDING_REQUIRED` with internal/test accounts first.
2. Run deterministic combat fixture and balance simulations in CI.
3. Verify completion, skip, retry, and duplicate-grant dashboards.
4. Roll out to new accounts only; never retroactively grant existing accounts.
5. Tune copy and recommended actions without changing authoritative reward rules.

---

## 18. Deployment and rollback

Use expand/deploy/backfill/enable:

1. additive schema migration;
2. onboarding-capable code with redirect gate disabled;
3. explicit existing-player exemption backfill;
4. verify every newly provisioned test account receives exactly one grant;
5. enable onboarding for an internal allowlist;
6. enable for newly created production accounts;
7. monitor at least one full training, tournament, combat-resume, and token-refresh cycle.

Disabling `ONBOARDING_REQUIRED` stops redirects but does not delete or reset progress. New-account provisioning must still produce a valid starter package unless the whole account-creation path is placed in maintenance. Rollback must never restore singleton-player behavior or make starter grants client-controlled.

If a chapter is broken in production, configure a server-side safe bypass from that exact step to the next step with an audited migration/event. Do not tell users to clear storage, edit rows manually without an audit, or replay provisioning.

---

## 19. Acceptance criteria

Onboarding is launch-ready only when all are true:

- [ ] Signup and email confirmation provision exactly one isolated Player, starter rooster, starter hen, level-1 gym, level-1 clinic, and onboarding row.
- [ ] New confirmed accounts land on `/onboarding`; complete/exempt accounts land on the validated destination or ranch.
- [ ] The full flow teaches founders, breeding, hatching, growth, training, canonical combat, clinic/recovery, tournament, and PvE.
- [ ] The first self-bred fighter remains the subject across training, fight, clinic, tournament, and Rookie chapters.
- [ ] Progress survives refresh, sign-out/in, auth refresh, browser restart, deployment, and device change.
- [ ] Every grant-bearing action is authenticated, owner-scoped, transactional where required, and idempotent.
- [ ] No onboarding endpoint accepts caller identity, artifact IDs, stats, currency, rewards, outcomes, or target progress from the browser.
- [ ] Tutorial combat uses canonical persisted combat and cannot cause death/permanent injury or issue repeatable rewards.
- [ ] Tournament and PvE use their real persisted progression and settlement paths.
- [ ] A tournament loss or Rookie loss cannot trap onboarding.
- [ ] The clinic waiver is consumed at most once and only for the authored tutorial strain.
- [ ] Novice tournament medical coverage is consumed at most once, cannot be monetized, and prevents tournament aftermath from blocking the Rookie chapter.
- [ ] Starter and tutorial-bred chickens are trade-locked in server marketplace logic.
- [ ] Skip grants nothing, reset does not exist, and replay is rewardless.
- [ ] Two-account tests prove complete progress/resource isolation.
- [ ] Multi-tab and duplicate-delivery tests create no duplicate eggs, birds, sessions, brackets, clears, credits, or tokens.
- [ ] Auth/combat secrets and hidden server state are absent from DTOs, logs, and analytics.
- [ ] Keyboard, mobile, reduced-motion, textual 3D alternatives, and audio-off captions pass browser accessibility checks.
- [ ] Prisma validation, migrations, the complete test suite, production build, deterministic tutorial fixture simulation, and browser smoke tests pass.

---

## 20. Deferred follow-up tutorials

After the first dynasty flow is stable, contextual one-shot lessons may teach:

- marketplace valuation and trading unlock;
- pedigree navigation and lineage planning;
- retirement and breeder transition;
- advanced training potential, breakthroughs, and facility upgrades;
- illness, serious injury, and longer treatment;
- later PvE circuits, rivalries, and side encounters;
- live spectating/betting if retained for launch;
- seasonal tournaments and leaderboard competition.

These should use the same server-recorded “seen/completed” convention where rewards or unlocks are involved, but they must not expand the launch onboarding into an unfinishable encyclopedia.
