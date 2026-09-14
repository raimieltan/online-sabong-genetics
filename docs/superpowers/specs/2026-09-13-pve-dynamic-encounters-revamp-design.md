# PvE Dynamic Encounters Revamp — Living Campaign Stories

**Status:** Implementation specification  
**Date:** 2026-09-13  
**Parent specs:** `docs/story/pve_campaign_revamp.md`, `docs/story/pve_ui_revamp.md`  
**Supersedes:** `docs/superpowers/specs/2026-09-12-pve-phase3-dynamic-stories-design.md` where the two conflict  
**Depends on:** existing PvE campaign, boss fight, reputation, opponent-history, and event-feed foundations

---

## 1. Problem

The current Phase 3 implementation has useful plumbing, but it does not yet produce dynamic encounters or durable campaign stories.

Today:

- side encounters are five permanently authored boss definitions;
- eligibility is recalculated on every read rather than issued as a persistent offer;
- there is no offered, accepted, declined, expired, or completed lifecycle;
- encounter opponents, conditions, rewards, and venues never vary;
- special conditions are presentation copy rather than enforced combat rules;
- rivalry and adaptation history belongs to the player account, despite the UI framing it as a relationship with a specific rooster;
- opponent adaptation uses aggregate win/loss counts and uniformly increases every EV;
- event rows are created, but the post-fight flow does not reveal or act on them;
- side fights appear in a separate list instead of branching from the campaign map;
- rankings, titles, and accomplishment-driven triggers are not sufficiently modeled to support their promised encounter types.

The result is a static bonus-fight list with reactive labels. The revamp must make the campaign respond to what a particular rooster has done, issue concrete opportunities, remember the player's decisions, and produce rematches that are meaningfully different.

---

## 2. Goal

Create a server-authoritative dynamic encounter system that:

1. derives encounter opportunities from real campaign and fight state;
2. issues persistent, finite offers rather than exposing definitions directly;
3. supports accept, later, decline, expire, fight, and complete states;
4. targets a specific rooster when the trigger is fighter-specific;
5. freezes the offered opponent, conditions, and rewards so the preview matches the fight;
6. adapts repeat opponents from actual tactical evidence;
7. reveals new opportunities in the post-fight flow and campaign map;
8. reuses the shared `LiveCombatV2Session`, matchup, battle, and result components;
9. remains deterministic, bounded, testable, and safe from duplicate rewards.

The desired player story is:

> “After Tala upset The Veteran by KO, a provincial promoter offered her a short-notice invitational. I accepted it for later. The opponent was built to punish Tala's pressure-heavy style, the purse was higher because recovery was disabled, and the offer disappeared after I declined the rematch.”

---

## 3. Non-goals

This pass does not add:

- an LLM-authored narrative system;
- arbitrary executable combat scripts;
- a second PvE combat simulator;
- PvP or rankings-driven matchmaking;
- bloodline or descendant stories from Phase 4;
- a general live-ops scheduler or admin CMS;
- fully procedural rooster art or genetics;
- hidden opponent scaling based on the selected player's raw stats;
- permanent stat bonuses for completing side encounters.

Rank-, title-, and bloodline-triggered templates must remain disabled until those source systems persist real authoritative data. The current display-only rank formula must not be used as an encounter trigger.

---

## 4. Design principles

### 4.1 Facts create stories

Every offer must cite a real trigger: a loss, tied rivalry, KO streak, first circuit clear, reputation threshold, upset, or other persisted accomplishment.

### 4.2 Eligibility is not an offer

A template becoming eligible does not mean it remains permanently visible. Eligibility creates an offer instance. That instance then owns its lifecycle.

### 4.3 The offer is a contract

Once offered, the opponent snapshot, modifiers, target rooster, rewards, and expiry cannot silently change. Starting the fight uses the frozen snapshot.

### 4.4 Dynamic does not mean random noise

Selection is weighted but seeded. Given the same player, source fight, candidate set, and content version, the engine produces the same result.

### 4.5 Adaptation must be legible

If an opponent changes, the UI explains the observed pattern and response. No invisible rubber-banding.

### 4.6 Shared combat remains authoritative

Modifiers enter the shared combat pipeline through a small typed rules contract. PvE does not copy or fork the engine.

### 4.7 One settlement transaction

Fight outcome, rewards, progress, history, events, and newly issued offers settle atomically and idempotently.

---

## 5. Core architecture

The system has four layers:

```text
EncounterTemplate (code-authored content)
        ↓ eligibility + weighted selection
EncounterOffer (persistent player opportunity)
        ↓ accept + frozen snapshot
EncounterFight (shared LiveCombatV2Session)
        ↓ settlement + tactical summary
CampaignReaction (history, events, follow-up offers)
```

### 5.1 Definitions versus instances

`EncounterTemplate` describes reusable content and generation rules. It is code-authored, versioned, and never stores player state.

`EncounterOffer` is a persistent instance issued to a player. It contains all data required to render and start the exact offered fight.

The existing `PVE_SIDE_ENCOUNTERS` definitions become the first template catalog. They must no longer be returned directly as unlocked fights.

### 5.2 Proposed files

```text
lib/pve/encounters/types.ts
lib/pve/encounters/templates.ts
lib/pve/encounters/eligibility.ts
lib/pve/encounters/generator.ts
lib/pve/encounters/lifecycle.ts
lib/pve/encounters/modifiers.ts
lib/pve/encounters/presentation.ts
lib/pve/adaptation.ts
lib/pve/fightSummary.ts
lib/pve/service.ts
```

Keep `lib/pve/service.ts` as the transaction and authorization boundary. Pure eligibility, generation, adaptation, and presentation logic belongs in focused modules.

---

## 6. Domain model

### 6.1 Encounter templates

```ts
export type EncounterKind =
  | "challenge"
  | "invitational"
  | "special"
  | "rematch"
  | "rivalry_decider";

export type EncounterTrigger =
  | { type: "circuit_completed"; circuitId: string }
  | { type: "reputation_reached"; minimum: number }
  | { type: "clean_record"; minimumFights: number }
  | { type: "win_streak"; minimum: number }
  | { type: "ko_streak"; minimum: number }
  | { type: "upset_victory"; minimumDifficultyGap: number }
  | { type: "loss_to_opponent"; opponentId?: string }
  | { type: "rivalry_tied"; opponentId?: string }
  | { type: "opponent_defeated_repeatedly"; minimumWins: number };

export type EncounterTemplate = {
  id: string;
  version: number;
  enabled: boolean;
  kind: EncounterKind;
  circuitId: string;
  trigger: EncounterTrigger;
  targetScope: "player" | "chicken";
  weight: number;
  cooldownDays: number;
  expiresAfterHours: number | null;
  maxIssuesPerPlayer: number | null;
  opponent: EncounterOpponentRecipe;
  modifiers: EncounterModifierRecipe[];
  rewards: EncounterRewardRecipe;
  presentation: EncounterPresentationTemplate;
};
```

Templates may use a fixed authored opponent, an adapted known opponent, or a bounded generated variant:

```ts
export type EncounterOpponentRecipe =
  | { type: "fixed"; opponentId: string }
  | { type: "adapted"; opponentIdFromTrigger: true }
  | { type: "variant"; baseOpponentIds: string[]; variationBudget: number };
```

MVP does not generate arbitrary names, prose, or genomes. Variant recipes select from authored opponent bases and bounded presentation fragments.

### 6.2 Persistent offer

Add one authoritative offer table:

```prisma
model PveEncounterOffer {
  id                 String   @id @default(uuid())
  playerId           String
  player             Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  targetChickenId    String?
  templateId         String
  templateVersion    Int
  kind               String
  circuitId          String
  status             String   @default("OFFERED")
  triggerType        String
  triggerData        Json
  sourceFightId      String?
  dedupeKey          String
  opponentId         String
  opponentSnapshot   Json
  modifierSnapshot   Json
  rewardSnapshot     Json
  presentation       Json
  seed               Int
  offeredAt          DateTime @default(now())
  acceptedAt         DateTime?
  declinedAt         DateTime?
  expiresAt          DateTime?
  completedAt        DateTime?
  fightSessionId     String?  @unique
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([playerId, dedupeKey])
  @@index([playerId, status, offeredAt])
  @@index([targetChickenId, status])
  @@index([sourceFightId])
}
```

Status values are:

```ts
type EncounterOfferStatus =
  | "OFFERED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "IN_PROGRESS"
  | "COMPLETED";
```

Use service-layer constants and runtime validation while the database field remains a string, matching the repository's current Prisma conventions.

### 6.3 Immutable PvE fight facts

Aggregate counters cannot prove consecutive streaks or tactical patterns. Add a compact immutable record per settled PvE fight:

```prisma
model PveFightRecord {
  id                 String   @id @default(uuid())
  sessionId          String   @unique
  playerId           String
  chickenId          String
  opponentId         String
  encounterOfferId   String?  @unique
  circuitId          String
  won                Boolean
  outcomeReason      String
  durationTurns      Int
  playerDifficulty   Int
  opponentDifficulty Int
  combatVersion      String
  matchSeed          Int
  tacticalSummary    Json
  foughtAt           DateTime @default(now())

  @@index([playerId, foughtAt])
  @@index([chickenId, opponentId, foughtAt])
  @@index([encounterOfferId])
}
```

This row is the source for streaks, rivalry recency, upset detection, adaptation evidence, and future career presentation. It stores summaries, not full combat logs.

### 6.4 Fighter-specific opponent history

`PveOpponentHistory` must represent a rooster-opponent matchup, not an account-opponent matchup.

Add `chickenId` and change the unique key to:

```prisma
@@unique([playerId, chickenId, bossId])
@@index([chickenId, lastFightAt])
```

Keep player-level totals as query-time aggregates or campaign presentation, not as the source of rivalry and adaptation.

Existing rows cannot be reliably assigned to a rooster. Migration behavior:

- associate a legacy row only when `PveProgress.firstClearChickenId` identifies one unambiguous rooster;
- otherwise archive or discard the aggregate for rivalry/adaptation purposes;
- never silently attach old fights to the player's current rooster;
- preserve `PveProgress` clear counts and rewards independently.

### 6.5 Campaign events

Extend `PveEncounterEvent` with:

```prisma
encounterOfferId String?
actionedAt       DateTime?
```

Add event kinds:

```ts
type CampaignEventKind =
  | "callout"
  | "challenge_offered"
  | "invitational_offered"
  | "special_encounter_offered"
  | "rematch_offered"
  | "rivalry_decider_offered"
  | "encounter_expired"
  | "milestone";
```

`seen` means the player deliberately opened or dismissed the reveal. Loading the campaign page must not mark an event seen.

---

## 7. Encounter generation

### 7.1 Evaluation timing

Evaluate candidates:

- after a PvE fight settles;
- after a real campaign milestone changes;
- after reputation changes;
- through a dev-only refresh action for testing.

Do not generate new offers from a passive list read.

### 7.2 Candidate pipeline

```text
load authoritative post-fight state
  ↓
find enabled templates for current circuit/state
  ↓
evaluate trigger and target rooster
  ↓
remove cooldown, issue-limit, duplicate, and active-cap failures
  ↓
compute seeded weights
  ↓
select zero or one ordinary offer plus mandatory story offers
  ↓
freeze opponent/modifiers/rewards/presentation
  ↓
insert offer and linked campaign event
```

Mandatory offers, such as a newly tied rivalry decider, are not entered into the ordinary weighted lottery. At most one mandatory offer per opponent may be active.

### 7.3 Determinism

Derive the offer seed from stable inputs:

```ts
seed = hash31(`${playerId}:${sourceFightId}:${template.id}:${template.version}`);
```

`hash31` returns a non-negative signed 31-bit integer so it fits Prisma's `Int` field across supported databases. Sort candidates by template ID before weighted selection. Tests must be able to reproduce every issued offer from its seed and snapshots.

### 7.4 Active limits

MVP limits:

- maximum 3 active offers per player across `OFFERED` and `ACCEPTED`;
- maximum 1 active offer for the same template and target rooster;
- maximum 1 active rematch/decider against the same opponent;
- ordinary offer chance after an eligible fight: content-configured, with a default ceiling of 35%;
- mandatory rivalry and circuit-completion offers ignore ordinary probability but still obey deduplication.

These values live in `lib/pve/encounters/config.ts`, not page components.

### 7.5 Dedupe keys

Examples:

```text
circuit-complete:{templateId}:{circuitId}
rep:{templateId}:{threshold}:{chickenId}
rival-decider:{opponentId}:{chickenId}:{rivalrySequence}
revenge:{opponentId}:{chickenId}:{sourceFightId}
streak:{templateId}:{chickenId}:{streakStartFightId}
```

The database unique constraint is the last line of defense against concurrent step/finish requests.

---

## 8. Offer lifecycle

### 8.1 State transitions

```text
                 ┌──────────→ DECLINED
OFFERED ─────────┼──────────→ EXPIRED
   │             └──────────→ ACCEPTED
   │                              │
   └── fight now ────────────────→│
                                  ↓
                             IN_PROGRESS
                                  ↓
                              COMPLETED
```

Only these transitions are valid:

- `OFFERED → ACCEPTED`
- `OFFERED → DECLINED`
- `OFFERED → EXPIRED`
- `OFFERED → IN_PROGRESS` when choosing Fight Now
- `ACCEPTED → IN_PROGRESS`
- `IN_PROGRESS → COMPLETED`

### 8.2 Expiry

No background worker is required for MVP. Before listing, accepting, or starting offers, atomically mark active rows with `expiresAt <= now` as `EXPIRED`.

Accepted offers expire unless a template explicitly declares `expiresAfterHours: null`. Starting a fight before expiry locks the offer as `IN_PROGRESS`; it cannot expire during that session.

### 8.3 Accept, later, and decline

- **Fight now:** binds the target rooster if necessary and starts the shared encounter flow.
- **Accept:** persists intent and keeps the offer in the map/feed until fought or expired.
- **Later:** leaves the offer in `OFFERED`; it does not mark it seen until the reveal is dismissed.
- **Decline:** is final for that offer. A later offer requires a new trigger and dedupe key.

### 8.4 Completion and rewards

An encounter becomes `COMPLETED` after any valid settled fight, regardless of win or loss. A rematch may be issued later through a new offer.

Rewards are read only from `rewardSnapshot`. Settlement must verify:

- offer belongs to the player;
- session references the offer;
- status is `IN_PROGRESS`;
- no prior `PveFightRecord` exists for the session/offer settlement;
- credits and progress are granted once.

---

## 9. Tactical summaries and opponent adaptation

### 9.1 Required summary

At finalization, derive a compact shared-combat summary:

```ts
export type PveFightTacticalSummary = {
  commandCounts: Partial<Record<"PRESS" | "COUNTER" | "GUARD" | "WAIT" | "RECOVER", number>>;
  damageDealt: number;
  damageTaken: number;
  counterDamageDealt: number;
  damageTakenWhilePressing: number;
  damageTakenWhileRetreating: number;
  clashesWon: number;
  clashesLost: number;
  recoveriesAttempted: number;
  knockdownsFor: number;
  knockdownsAgainst: number;
  finalHealthRatio: number;
};
```

Use existing continuous-combat event and career telemetry where available. Add missing command-mode counts to shared `CombatResult` or a generic session summary; do not scrape UI state.

### 9.2 Evidence window

Adaptation uses the last five fights for the same `chickenId + opponentId`, with recent fights weighted more heavily. It requires at least two fights before claiming a tactical read.

### 9.3 Adaptation signals

Examples:

| Observed player pattern | Opponent response | UI explanation |
|---|---|---|
| Pressure-heavy commands | caution and counter preference rise | “Prepared to punish repeated pressure” |
| Counter-heavy commands | patience and pressure variation rise | “Less willing to offer the first opening” |
| Frequent recovery | persistence and pressure preference rise | “Will chase recovery windows” |
| Defensive/guard-heavy | patience rises; aggression falls slightly | “Prepared for a longer, lower-tempo fight” |
| Repeated KO wins | defense/endurance allocation rises | “Conditioned to survive the finishing exchange” |

Only fields already consumed by the shared fighter build may change.

### 9.4 Bounded variation

For one opponent variant:

- at most one primary and one secondary tactical response;
- total EV variation budget: 18 points across all stats;
- no single EV changes by more than 9;
- behavior fields change by at most `0.18` from the authored base;
- condition changes by at most 5;
- final values remain within existing engine limits;
- the variant never reads the selected rooster's raw IV/EV values.

The old uniform `tier * 3` increase to every stat must be removed.

### 9.5 Escalation direction

Opponent growth increases primarily when the player has beaten that opponent or exposed a repeatable tactic. Repeated player losses may increase rivalry intensity or trigger a revenge opportunity, but they must not continually buff an opponent who is already dominant.

### 9.6 Frozen variant

Adaptation runs when the offer is issued. Store the resulting fighter-relevant overrides and explanation deltas in `opponentSnapshot`. The encounter page and fight start read the same snapshot.

---

## 10. Encounter modifiers

MVP uses a closed union:

```ts
export type EncounterModifier =
  | { type: "command_disabled"; command: "RECOVER" }
  | { type: "short_bout"; maxTurns: number }
  | { type: "player_condition_cap"; maximum: number }
  | { type: "opponent_condition"; value: number }
  | { type: "ko_bonus"; credits: number }
  | { type: "ko_required" };
```

Rules:

- modifiers are visible before fighter selection;
- rules are enforced server-side;
- disabled commands are also disabled with an explanation in the battle HUD;
- `short_bout` uses a generic configurable session limit;
- `ko_required` changes encounter success, not the underlying combat winner;
- reward bonuses settle from the frozen reward snapshot;
- unsupported modifier data rejects offer generation or fight start.

Introduce a small generic `CombatRules` input to `LiveCombatV2Session` for command and duration constraints. PvE translates encounter modifiers into this shared contract. Outcome interpretation remains in PvE settlement where appropriate.

---

## 11. Rivalries and rematches

### 11.1 Rivalry identity

Rivalries are keyed by `chickenId + opponentId`.

A rivalry begins when at least one is true:

- the rooster loses to the opponent;
- there are at least three meetings and the record margin is at most one;
- two consecutive fights finish narrowly, using final-health and duration evidence;
- an authored template declares a rivalry relationship.

One loss may begin an underdog rivalry, but the UI should distinguish `emerging`, `active`, and `decider` intensity instead of branding every loss as an identical rivalry.

### 11.2 Deciders

A tied record after at least two meetings may issue one decider offer. The offer's dedupe key includes the rivalry sequence so completing or declining it does not immediately regenerate the same offer.

### 11.3 Rematches

Cleared ladder bosses remain replayable as ordinary practice, but a **rematch encounter** is a distinct offer with:

- a reason;
- an adapted frozen opponent variant;
- an optional modifier;
- reduced or conditional rewards;
- its own expiry and presentation;
- a linked source fight or rivalry state.

This prevents every repeat click from being mislabeled as a dynamic rematch.

---

## 12. Campaign reactions

Replace aggregate approximations with fact-based derivation.

Examples:

- consecutive boss wins come from ordered `PveFightRecord` rows;
- a streak ending requires consecutive prior losses to that opponent, not loss-minus-win margin;
- clean record is evaluated per target rooster and requires a minimum number of fights;
- upset victory compares authored/frozen difficulty at fight time;
- KO streak counts consecutive eligible wins by KO;
- rivalry events use fighter-specific history;
- circuit completion uses authoritative championship/gatekeeper progress.

Do not emit ranking, title, or championship-history reactions until those systems have authoritative persisted facts.

---

## 13. Service and transaction flow

### 13.1 Finish flow

`finishBossFight` or its extracted shared settlement helper must perform:

```text
validate session and ownership
finalize shared combat result
derive tactical summary
begin transaction
  update chicken outcome
  settle base and encounter rewards once
  write PveProgress when applicable
  write PveFightRecord
  update fighter-specific PveOpponentHistory
  update reputation through one authoritative helper
  complete EncounterOffer when present
  derive campaign events from post-fight facts
  generate/dedupe/freeze new EncounterOffers
  insert linked reveal events
commit
return result + newly issued offers/events
```

### 13.2 Idempotency

Introduce a settlement identifier tied to the server fight session. Repeated step or finish requests must return the settled result or a safe already-settled response; they must never award twice.

### 13.3 Authorization

All offer operations verify `playerId`. If targeted, fight start also verifies `targetChickenId`. A player cannot substitute another rooster after accepting a fighter-targeted offer.

---

## 14. API contract

### 14.1 List offers

```text
GET /api/pve/encounters?status=active|history
```

Returns active offers after lazy expiry reconciliation. Each view includes:

- offer ID and status;
- kind and circuit;
- target rooster summary when applicable;
- trigger reason;
- frozen opponent preview;
- modifier descriptions;
- reward preview;
- offered and expiry timestamps;
- allowed actions.

### 14.2 Offer actions

```text
POST /api/pve/encounters/[offerId]/accept
POST /api/pve/encounters/[offerId]/decline
POST /api/pve/encounters/[offerId]/fight/start
```

Accept and fight-start may receive `chickenId` only for player-scoped offers. Fighter-scoped offers reject substitution.

### 14.3 Existing APIs

- `GET /api/pve/bosses` continues returning ladder bosses and campaign progress.
- Stop returning raw unlocked `sideEncounters` once offer migration is complete.
- `GET /api/pve/events` returns actionable event views with linked `encounterOfferId`.
- Event seen state changes only through an explicit open/dismiss action.

### 14.4 Error codes

Add stable errors:

```text
ENCOUNTER_NOT_FOUND
ENCOUNTER_NOT_OWNED
ENCOUNTER_NOT_ACTIVE
ENCOUNTER_EXPIRED
ENCOUNTER_ALREADY_ACTIONED
ENCOUNTER_CHICKEN_MISMATCH
ENCOUNTER_RULES_INVALID
ENCOUNTER_ALREADY_SETTLED
```

---

## 15. UI and player flow

### 15.1 Post-fight reveal queue

After rewards and campaign consequence, show newly issued offers one at a time:

```text
INVITATION RECEIVED

THE SCOUT'S PICK
Issued after Tala's third straight provincial win

Short bout · 120 turns
Purse: 700 credits
Expires in 24 hours

[FIGHT NOW]  [ACCEPT]  [LATER]
```

Decline is available from the detail view, not emphasized on the initial celebration.

The existing fight response already returns new events; extend it to return compact `newOffers` views and consume them before routing back to `/pve`.

### 15.2 Campaign map

`CampaignMap` receives active offers and groups them by `circuitId`.

- offers render as branch nodes attached to the relevant circuit;
- accepted offers use a stronger outline;
- expiring offers show a restrained time indicator;
- completed/declined/expired offers do not remain on the active map;
- the separate Side Fights grid is removed after branch-node parity is complete.

### 15.3 Campaign feed

The feed becomes a notification and history surface, not the encounter source of truth.

- loading does not auto-mark events seen;
- opening or dismissing a card marks it seen;
- actionable cards link to the offer;
- expired cards remain readable but cannot start a fight;
- event text identifies the target rooster.

### 15.4 Encounter detail

Add:

```text
/pve/encounter/[offerId]
```

Reuse the current boss encounter sections through a shared encounter view model. Add:

- “Why this fight appeared”;
- target rooster;
- time remaining;
- enforced conditions;
- frozen rewards;
- opponent adaptation explanation;
- accept/decline/fight actions;
- inactive-state explanation for declined, expired, or completed offers.

### 15.5 Battle HUD

Show active modifiers once at the beginning and in a compact rules chip. Disabled commands must be visibly disabled rather than silently rejected.

### 15.6 Result flow

Result order:

```text
fight result
→ rewards and condition changes
→ rivalry/rematch consequence
→ encounter completion state
→ new offer reveal queue
→ return to campaign
```

---

## 16. Initial content set

Convert the existing five side encounters into templates, then add rematch templates.

Required MVP templates:

1. Backyard circuit-completion challenge.
2. Provincial circuit-completion challenge.
3. Reputation invitational targeted to the rooster that crossed the threshold.
4. Clean-record invitational requiring at least five fights by that rooster.
5. Veteran rivalry decider.
6. Revenge rematch after a loss.
7. Adapted rematch after two wins against the same opponent.
8. KO-streak special encounter.

At least three templates must use an enforced modifier. At least two must use an adapted opponent recipe.

---

## 17. Reputation and ranking boundaries

Centralize reputation calculation before relying on it broadly:

```ts
derivePveReputationDelta({
  firstClear,
  encounterKind,
  won,
  outcomeReason,
  upset,
  rivalry,
  championship,
}): number;
```

The same delta must drive persistence, result UI, event generation, and trigger checks.

The current rank derived only from completed boss count remains display-only and must be labeled provisional or removed. Dynamic encounter eligibility cannot depend on it.

---

## 18. Migration and compatibility

### 18.1 Database migration

Add:

- `PveEncounterOffer`;
- `PveFightRecord`;
- fighter identity to `PveOpponentHistory`;
- offer linkage/action timestamp to `PveEncounterEvent`;
- player relations and indexes required by the new tables.

### 18.2 Existing side progress

- Preserve `PveProgress` rows for existing side-opponent IDs.
- Converted templates use the same opponent/template IDs where practical.
- Existing clears affect presentation and issue limits, but do not fabricate completed offers.

### 18.3 Existing events

Old events without `encounterOfferId` remain readable, non-actionable feed history.

### 18.4 Existing players

Do not issue offers during migration or ordinary GET requests. Existing players receive new offers after their next qualifying fight. A dev-only refresh action may evaluate current state for QA.

---

## 19. Testing strategy

### 19.1 Pure unit tests

Add tests for:

- every eligibility trigger;
- per-rooster clean records and streaks;
- seeded weighted selection;
- cooldown and active-cap filtering;
- dedupe-key stability;
- offer lifecycle transitions;
- lazy expiry;
- rivalry intensity and decider issuance;
- tactical signal extraction;
- bounded opponent adaptation;
- modifier validation and translation;
- event kind and copy derivation;
- reputation delta derivation.

### 19.2 Service/integration tests

Cover:

- fight settlement creates one fight record;
- concurrent settlement cannot duplicate credits or offers;
- a targeted offer rejects another rooster;
- accepted and Fight Now paths start the frozen opponent;
- expired/declined/completed offers cannot start;
- challenge completion does not advance the ladder unless explicitly configured;
- a loss completes the current offer but can trigger a new revenge offer;
- event and offer rows are created in the same transaction;
- reset/dev actions clear all related state consistently.

### 19.3 Route tests

Cover ownership, invalid actions, malformed IDs, status conflicts, and stable error responses for all encounter routes.

### 19.4 UI tests

Cover:

- post-fight reveal ordering;
- accept/later/decline behavior;
- event cards not auto-marking on load;
- map branch placement by circuit;
- target-rooster display;
- expiry state;
- visible/disabled combat commands for modifiers.

### 19.5 Deterministic simulation checks

For each adapted template, run seeded batches to verify:

- the modifier is enforced;
- the variant remains within its budget;
- difficulty does not spike outside the intended band;
- the same offer snapshot always builds the same opponent;
- adaptation improves behavioral distinction without guaranteeing a boss win.

---

## 20. Observability and developer tools

Add structured development logging behind the existing development guard:

```text
[pve:encounter] candidates=4 selected=revenge-rematch seed=...
[pve:encounter] skipped template=clean-slate reason=active-cap
[pve:encounter] offer=... OFFERED→ACCEPTED
[pve:adaptation] opponent=veteran signal=pressure-heavy budget=18
```

Extend the dev PvE endpoint with:

- `GENERATE_ENCOUNTERS` for a chosen rooster;
- `EXPIRE_ENCOUNTER`;
- `CLEAR_ENCOUNTERS`;
- `SET_RIVALRY_RECORD`;
- `SET_REPUTATION`;
- `SHOW_ELIGIBILITY_TRACE`.

Reset progress must either reset offers, events, fight records, histories, and campaign state together or expose clearly separated reset operations. It must not leave contradictory Phase 3 state behind.

---

## 21. Implementation order

### Phase A — Correct facts

1. Add `PveFightRecord` and tactical summarization.
2. Make opponent history fighter-specific.
3. Correct streak, clean-record, rivalry, and escalation semantics.
4. Add unit tests for existing Phase 3 derivation.

### Phase B — Persistent offers

1. Add `PveEncounterOffer` migration and types.
2. Convert static side encounters into templates.
3. Implement eligibility, seeded selection, snapshots, dedupe, caps, and expiry.
4. Implement accept, decline, and fight-start APIs.
5. Settle offers atomically with fights.

### Phase C — Player-facing lifecycle

1. Add post-fight reveal queue.
2. Add encounter detail route.
3. Render offer branch nodes on the campaign map.
4. Fix deliberate event seen behavior.
5. Remove the raw unlocked Side Fights list.

### Phase D — Meaningful variation

1. Add generic shared `CombatRules` support.
2. Enforce the MVP modifier union.
3. Replace uniform escalation with tactical adaptation.
4. Add seeded balance simulations and tune budgets.

### Phase E — Content expansion

Add new templates only after lifecycle metrics and balance tests are stable. Rank-, championship-, title-, and bloodline-driven templates wait for authoritative source systems.

---

## 22. Acceptance criteria

The revamp is complete when all of the following are true:

- [ ] Side encounters are exposed only through persistent offer instances.
- [ ] An offer can be offered, accepted, deferred, declined, expired, started, and completed.
- [ ] Offer state survives refreshes and server restarts.
- [ ] An offer's opponent, rules, rewards, and presentation do not change after issuance.
- [ ] Fighter-specific offers and rivalries do not transfer to another rooster.
- [ ] Consecutive streaks are derived from ordered fight facts, not aggregate margins.
- [ ] Clean-record eligibility is per rooster and requires a meaningful fight sample.
- [ ] At least eight templates ship, including rematch, rivalry, invitational, challenge, and special kinds.
- [ ] At least three templates enforce visible combat modifiers.
- [ ] At least two rematch templates produce bounded tactical adaptations.
- [ ] No opponent adaptation uniformly buffs all stats.
- [ ] New offers are revealed before the player returns to the campaign.
- [ ] Loading the campaign feed does not mark events seen.
- [ ] Active offers render as branches on their circuit map.
- [ ] Expired, declined, and completed offers cannot start fights.
- [ ] Settlement cannot duplicate rewards, fight records, events, or follow-up offers.
- [ ] Rank-based templates remain disabled until rank is authoritative.
- [ ] Pure, service, route, UI, and deterministic simulation tests cover the system.
- [ ] Existing ladder fights continue using the shared combat and post-fight pipelines.

---

## 23. Definition of the experience

This feature is not complete merely because a side opponent can be fought.

It is complete when the campaign can explain:

- **why** an encounter appeared;
- **who** earned it;
- **what** makes it different;
- **when** it must be answered;
- **how** the opponent remembers prior fights;
- **what** the player chose to do;
- **what consequence** that choice created next.

That is the difference between a side-fight catalog and a living campaign.
