# Launch Interpretation Spec v1 — Remaining Work

**Version:** 1.0  
**Status:** Frozen for implementation  
**Date:** 2026-09-14  
**Target:** Three-month launch  
**Primary system:** Authoritative continuous combat  
**Supersedes:** New launch-scope combat ideation. Existing canonical combat specifications remain authoritative for engine behavior unless this document explicitly narrows launch scope.

## 1. Purpose

The launch build must prove one interaction:

> The player observes an opponent, predicts what will happen, gives one of four coaching commands, sees their rooster interpret that command according to its identity, and understands why the exchange ended as it did.

The production mandate is:

> **Do not rebuild combat. Finish the interpretation layer.**

The required player-facing causal chain is:

> **Tell → Command → Compliance → Action → Result**

The corresponding player loop is:

> **Observe → Predict → Coach → Interpret**

The codebase already contains the authoritative combat runtime, semantic combat events, four-command vocabulary, imperfect compliance, tells, animation systems, career data, breeding, and PvE opponents. This specification covers only the remaining work required to make those systems legible, satisfying, testable, and launch-sized.

## 2. Launch success condition

After a meaningful exchange, a new player should be able to explain it in ordinary language:

> “I saw him load forward, told mine to counter, but my rooster reacted late because he is cautious, so he only landed a glancing hit.”

The player does not need to know internal event names, coefficients, or exact modifiers. The game must nevertheless retain enough authoritative evidence to explain and debug every recap.

## 3. Non-negotiable invariants

1. Production combat has exactly one authoritative simulation.
2. React renders authoritative meaning; it does not infer combat truth from animation timing, damage popups, or arrival order.
3. The only launch coaching commands are `PRESS`, `WAIT`, `COUNTER`, and `RECOVER`.
4. Read quality is evaluated at command lock using only information available to the player at that moment.
5. Read quality, compliance, execution quality, and outcome remain independent dimensions.
6. A favorable result does not retroactively make a decision correct.
7. An unfavorable result does not retroactively make a decision incorrect.
8. Every persisted interpretation declares its interpretation version.
9. Reconnects and event replay must reproduce the same recap without duplication or reinterpretation.
10. Exact percentages and hidden coefficients are not shown during combat.

Valid combinations include:

- `GOOD READ · FULL COMPLIANCE · MISSED`
- `GOOD READ · RESISTED · TOOK DAMAGE`
- `BAD READ · FULL COMPLIANCE · CLEAN HIT`
- `NEUTRAL READ · PARTIAL COMPLIANCE · DISENGAGED`

## 4. Existing foundation — do not rebuild

The following are existing foundations and are not new feature work:

- `CanonicalCombatRuntime` owns the authoritative simulation and semantic event stream.
- Every canonical event already has a stable ID, cursor, logical tick, and exchange index.
- Tell lifecycle events already map to `TELL_STARTED`, `TELL_INTENSIFIED`, and `TELL_REVEALED`.
- Commands already emit accepted/carried, locked, and resolved semantics.
- Command resolution already exposes `FULL`, `PARTIAL`, or `RESISTED` plus reasons.
- Combat already emits action, hit, counter, miss, block, evade, health, stamina, balance, phase, and terminal events.
- The production client already consumes ordered authoritative events and handles cursor recovery.
- The HUD already has four command controls, command-window states, world-to-screen tell anchoring, audio, camera response, hit stop, and impact effects.
- Combat identity already derives from behavioral data rather than being a player-selected class.
- Career records, rivalries, traits, boss victories, injuries, retirement, parentage, and bloodlines already exist.
- Existing PvE definitions already provide named behavioral archetypes and campaign presentation.

Implementation must extend these systems rather than introduce a parallel recap simulation, a second combat state machine, or client-only interpretation rules.

## 5. Workstream A — authoritative exchange interpretation

### 5.1 Required outcome

The server emits one versioned `EXCHANGE_RESOLVED` semantic event for every completed exchange. It contains a concise player-facing summary and ordered references to the evidence used to produce it.

### 5.2 Event contract

The initial contract is:

```ts
export const COMBAT_INTERPRETATION_VERSION = 1 as const;

export type ReadQuality = "GOOD" | "NEUTRAL" | "BAD";
export type ComplianceGrade = "FULL" | "PARTIAL" | "RESISTED";

export type ExecutionOutcome =
  | "MISSED"
  | "BLOCKED"
  | "GLANCING_HIT"
  | "CLEAN_HIT"
  | "COUNTERED"
  | "CANCELLED"
  | "DISENGAGED";

export type PrimaryExchangeOutcome =
  | ExecutionOutcome
  | "NO_COMMITMENT";

export type ExchangeResult =
  | "ADVANTAGE"
  | "EVEN"
  | "DISADVANTAGE"
  | "NO_DECISIVE_RESULT";

export type ExchangeResolvedPayload = {
  interpretationVersion: typeof COMBAT_INTERPRETATION_VERSION;
  exchangeIndex: number;

  read: {
    decisiveTellId: string | null;
    tellPhaseAtCommandLock: "START" | "INTENSIFIED" | "LOCKED" | null;
    quality: ReadQuality;
  };

  coaching: {
    command: "PRESS" | "WAIT" | "COUNTER" | "RECOVER";
    compliance: ComplianceGrade;
    reasons: string[];
  };

  /** Most salient cinematic event; not a judgment of the whole exchange. */
  primaryOutcome: PrimaryExchangeOutcome;

  /** Net authoritative assessment of the completed exchange. */
  exchangeResult: ExchangeResult;

  executions: Array<{
    sequence: number;
    action: string;
    outcome: ExecutionOutcome;
    refs: {
      actionEventIds: string[];
    };
    damageDealt: number;
    damageTaken: number;
    staminaDelta: number;
    balanceDelta: number;
  }>;

  consequences: {
    damageDealt: number;
    damageTaken: number;
    staminaDelta: number;
    balanceDelta: number;
  };

  refs: {
    instructionEventId: string;
    commandLockEventId: string;
    complianceEventIds: string[];
    tellEventIds: string[];
    actionEventIds: string[];
  };
};
```

`instructionEventId` may reference either `COMMAND_ACCEPTED` or `COMMAND_CARRIED`. `commandLockEventId` identifies the precise lock boundary used by the read evaluator. `decisiveTellId` identifies the engine tell, while `refs.tellEventIds` identifies the canonical tell events that support the interpretation.

### 5.3 Exchange accumulator

Add an authoritative accumulator with one record per active exchange. It must:

- open when an exchange enters `READ`;
- remember the active accepted or carried instruction;
- capture the observable state and tell set at `COMMAND_LOCKED`;
- collect all subsequent compliance, action, hit, miss, block, evade, damage, stamina, and balance events for that exchange;
- support zero, one, or multiple executions;
- finalize when combat returns to `READ` or becomes terminal;
- emit `EXCHANGE_RESOLVED` before advancing presentation to the next exchange;
- survive checkpoint serialization and `CanonicalCombatRuntime.restore`;
- be deterministic for the same seed, snapshots, commands, and ruleset;
- never depend on wall-clock time, React state, animation completion, or network timing.

The accumulator may live in the canonical checkpoint or be a fully deterministic fold over persisted canonical events. Whichever implementation is selected must support mid-exchange restoration without losing evidence or emitting the recap twice.

### 5.4 Event ordering

For each exchange, canonical ordering must be:

1. `COMMAND_ACCEPTED` or `COMMAND_CARRIED`
2. zero or more tell events
3. `COMMAND_LOCKED`
4. command compliance and execution events
5. `EXCHANGE_RESOLVED`
6. transition into the next exchange's `READ`, or terminal events

If the engine produces several contacts, all belong to the current exchange until the authoritative phase boundary closes it. Event cursor order determines execution sequence.

### 5.5 Read-quality policy

Implement read evaluation as a pure, versioned server policy. Version 1 must:

- run from the command-lock snapshot;
- use only player-observable information available at lock, including surfaced tells, visible phase, spacing, visible condition/resources, and already-exposed opponent history;
- never use later hits, damage, winner state, animation outcome, or post-lock intent changes;
- never equate a single tell with a universal hard-counter command;
- score the selected command in context relative to the other three legal commands;
- return `GOOD` when the command is among the contextually strongest reasonable choices;
- return `BAD` only when it materially conflicts with the observable situation;
- return `NEUTRAL` when evidence is weak, ambiguous, feinted, or several choices are similarly reasonable;
- return the same result when replayed under the same `interpretationVersion`.

The versioned evaluator and its fixtures are part of the authoritative ruleset. Changing its thresholds or relationships requires a new interpretation version; old events are never reinterpreted in place.

### 5.6 Execution grouping, salience, and exchange-result policy

Each execution summarizes one ordered player-fighter action sequence and owns the canonical references used to construct that sequence.

An execution begins at an authoritative commitment or action-initiation event. It ends when that action resolves into contact, miss, block, evade, counter resolution, cancellation, or disengagement. A new authoritative action initiation begins a new execution, even when it occurs immediately after the previous resolution.

Examples:

- `commit → miss → second kick → hit` is two executions;
- `counter attempt → evade → counter contact` is one execution when the evade and contact belong to the same authoritative counter action;
- an interrupted commitment is one `CANCELLED` execution;
- movement without an authoritative commitment does not create an execution.

Each execution's `refs.actionEventIds` must be an ordered subset of the exchange-level `refs.actionEventIds`. Every action event used by an execution must belong to exactly one execution. Exchange-level references may additionally include contextual events that do not belong to a player execution.

`primaryOutcome` means the most salient cinematic event worth surfacing. It does not claim to describe whether the complete exchange favored the coached fighter. It is selected deterministically from the complete exchange using this precedence:

1. `COUNTERED`
2. `CLEAN_HIT`
3. `GLANCING_HIT`
4. `BLOCKED`
5. `CANCELLED`
6. `DISENGAGED`
7. `MISSED`
8. `NO_COMMITMENT`

Precedence is a salience choice, not a replacement for the ordered `executions` evidence or the exchange-level result. For example, a clean opening hit followed by a damaging counter may have `primaryOutcome: "COUNTERED"` and `exchangeResult: "DISADVANTAGE"`.

`exchangeResult` is a separate, deterministic player-perspective assessment of the net consequences:

- `ADVANTAGE` means the coached fighter gained a material net benefit;
- `DISADVANTAGE` means the coached fighter suffered a material net loss;
- `EVEN` means both fighters produced materially offsetting consequences;
- `NO_DECISIVE_RESULT` means the exchange produced no material resolution.

The exchange-result evaluator, materiality thresholds, weighting of health/stamina/balance consequences, and damage thresholds separating glancing and clean hits must be centralized, named, tested, and frozen under the interpretation version. Presentation code may not derive or override this judgment.

### 5.7 Consequence accounting

All consequence totals are from the coached fighter's perspective:

- positive `damageDealt` means health removed from the opponent;
- positive `damageTaken` means health removed from the coached fighter;
- `staminaDelta` is final minus lock-time stamina for the coached fighter;
- `balanceDelta` is final minus lock-time balance for the coached fighter.

The sum of execution-level values must reconcile with exchange-level consequences. Any unattributed environmental or system delta remains visible at the exchange level and must be covered by a deterministic test.

### 5.8 Required tests

Add deterministic coverage for:

- no tell and no commitment;
- one tell, one command, one miss;
- good read with full compliance and a miss;
- good read with resisted compliance and damage taken;
- bad read with full compliance and a clean hit;
- multiple tells with one decisive tell;
- feint or ambiguous evidence producing a neutral read;
- multiple actions and multiple contacts in one exchange;
- clean opening contact followed by a heavier counter, with distinct `primaryOutcome` and `exchangeResult`;
- `ADVANTAGE`, `EVEN`, `DISADVANTAGE`, and `NO_DECISIVE_RESULT` fixtures;
- every execution owning an ordered, non-overlapping subset of action-event references;
- block followed by a second commitment;
- counter and simultaneous incoming damage;
- disengagement without contact;
- terminal combat during an exchange;
- command carried into the next exchange;
- auto-coach instruction references;
- checkpoint/restore in every phase;
- reconnect replay without duplicate recap emission;
- stable event digest and payload for identical inputs;
- changed interpretation policy requiring a new version.

### 5.9 Acceptance criteria

- Exactly one `EXCHANGE_RESOLVED` exists for each completed exchange.
- Every recap reference resolves to an event in the same session and exchange.
- Replaying or restoring a session produces byte-equivalent interpretation payloads.
- No client code decides read quality, compliance, primary outcome, or exchange result.
- Read quality is demonstrably independent from damage and victory.
- Multi-contact exchanges retain their ordered evidence.
- Every action event assigned to an execution is assigned exactly once.

## 6. Workstream B — exchange recap presentation

### 6.1 Required outcome

Render each authoritative `EXCHANGE_RESOLVED` as a compact one-to-two-second recap. It confirms the causal chain without interrupting the fight or obscuring the animals.

Examples:

```text
GOOD READ
COUNTER → clean hit
Responded late — cautious temperament
```

```text
INSTINCT OVERRULED COACHING
PRESS → held position
```

```text
GOOD READ
COUNTER → missed
The decision was sound; execution failed
```

### 6.2 Presentation rules

- Render semantic labels from the event; do not recalculate them.
- Never display exact timing bonuses, percentages, coefficients, or hidden scores during combat.
- Distinguish read quality from compliance and outcome visually and verbally.
- Do not claim a “good read” merely because damage occurred.
- Do not use a modal or pause authoritative simulation.
- Keep the recap close to the arena action and subordinate to the fighters.
- Queue recaps if network delivery batches multiple resolved exchanges.
- Deduplicate by canonical event ID after reconnect or cursor recovery.
- Respect reduced-motion and high-contrast settings.
- Keep copy short enough to read before the next decision window.
- Optional detailed evidence belongs in a post-fight analysis view, not the live HUD.

### 6.3 Client integration

The production authoritative player must consume `EXCHANGE_RESOLVED`. The local sandbox may render the same component, but it must use the same payload contract rather than maintain separate recap logic.

Create a single presentation adapter that maps enum values and reason codes to localized player-facing copy. Unknown future values must degrade to truthful generic language rather than guessing.

### 6.4 Acceptance criteria

- A delayed hit or second contact cannot contradict an already-rendered recap.
- Reconnect does not replay old recaps as new.
- The recap remains legible at supported desktop and mobile viewport sizes.
- Turning labels off does not remove embodied tells; it only removes textual assistance.
- Blind testers can distinguish “correct decision, poor execution” from “incorrect decision, lucky result.”

### 6.5 Assistance philosophy

> **The recap confirms learning; it must not replace observation.**

The authoritative payload always retains the full interpretation, but live presentation must support different assistance levels without changing combat truth:

- early/onboarding: read quality, command, compliance explanation, and outcome;
- later/standard: command, salient outcome, and only exceptional compliance feedback;
- advanced: minimal or no live grading, with the full interpretation available after the fight.

Adaptive reduction is not required for launch. The event contract and renderer must simply avoid assuming that every field is always displayed live. Players should look at the animals first and use the recap to confirm or correct what they believed they saw.

## 7. Workstream C — embodied production tells

### 7.1 Required outcome

Every launch-critical tell is visible on the authoritative production fighter before or as its HUD label becomes readable. The label confirms body language; it does not replace it.

### 7.2 Remaining implementation

- Move tell-to-posture derivation into a shared presentation module used by authoritative and sandbox combat.
- Apply tell posture to the production fighter rig, not only the floating indicator.
- Blend tell posture additively with locomotion and combat animation.
- Ramp posture using tell strength instead of snapping.
- Clear or transition the posture correctly on commit, reveal, cancel, feint, disengage, and terminal states.
- Preserve fighter facing and avoid mirrored or anatomically incorrect poses.
- Ensure camera cuts and world-to-screen labels remain synchronized with the embodied cue.

Launch-critical cues include at minimum:

- weight forward;
- closing distance/crowding;
- rear leg loaded;
- head low/lowered posture;
- hesitating;
- recovering;
- angle shift or side-on stance;
- overextended/resetting.

### 7.3 Acceptance criteria

- In label-off testing, at least 70% of launch-critical cue presentations are categorized into the intended behavioral family.
- Exact tell terminology is not required; for example, “loading up” correctly identifies a rear-leg-load preparation cue.
- With labels enabled, the label matches the fighter's visible posture and timing.
- Production and sandbox use the same posture mapping.
- No tell requires staring at a detached HUD region.
- Tell motion remains readable under all launch cameras and arenas.

## 8. Workstream D — visibly distinct commands

### 8.1 Required outcome

The four commands must produce observably different fights even when personality changes the quality of execution.

### 8.2 Command presentation requirements

**PRESS**

- closes spacing;
- increases stalking intent and forward locomotion;
- produces more frequent commitments and clashes;
- visibly communicates failed or resisted forward pressure.

**COUNTER**

- creates visible waiting, baiting, slipping, angle-taking, and punish attempts;
- preserves enough delay that it does not resemble passive inactivity;
- communicates when timing or temperament prevents the punish.

**WAIT**

- visibly preserves position and reduces unnecessary commitment;
- maintains tracking, feints, footwork, and tension;
- never looks like a frozen or disconnected simulation.

**RECOVER**

- creates breathing room and slower, defensive movement;
- visibly stabilizes stamina where the engine permits it;
- communicates late, partial, or resisted disengagement.

### 8.3 Verification

Add deterministic simulation comparisons using matched fighters and seeds. The minimum verification batch is 500 exchanges per command, per matched fighter pairing, across at least five representative identity profiles:

- `PRESS` must reduce median spacing and increase commitment pressure relative to `WAIT`;
- `COUNTER` must increase evade/counter attempts relative to `PRESS`;
- `WAIT` must reduce voluntary commitments relative to `PRESS` while retaining active movement;
- `RECOVER` must improve stamina trajectory relative to non-recovery commands when recovery is legal;
- personality may attenuate these differences but may not erase them from perception.

Use telemetry to establish and freeze acceptable bands. Do not balance solely from one cinematic example.

## 9. Workstream E — fighter identity everywhere

### 9.1 Required outcome

Players describe roosters in behavioral language instead of quoting coefficients or raw stat blocks.

### 9.2 Shared identity presenter

Create a deterministic presenter derived from actual behavior, physical profile, career evidence, traits, and fighting style. It must produce:

- one primary identity label, such as `Patient Counter-Fighter`;
- two or three plain-language strengths;
- one meaningful weakness or tradeoff;
- temperament descriptors;
- “known for” statements based on recorded career behavior when evidence exists;
- confidence/fallback handling for young or untested fighters.

Descriptions must be derived, stable, and testable—not arbitrary flavor assigned independently of the simulation.

### 9.3 Required surfaces

- Combat HUD: name plus primary fighting identity.
- Chicken dossier: identity, temperament, strengths, weakness, known-for history, notable victories, injuries, rivalries, and career stage.
- Coop/selection surfaces: identity before granular stats.
- Matchup/scouting: behavioral contrast between fighters.
- Breeding: inheritable tendencies and notable parent identity.

Raw values may remain in an expandable advanced-details area. They must not be the default language of selection or onboarding.

### 9.4 Acceptance criteria

- The same chicken receives the same identity for the same persisted state.
- Identity copy changes when meaningful behavior or career evidence changes.
- Copy never promises behavior the underlying policy cannot produce.
- At least 80% of blind testers can describe their rooster behaviorally without a stat prompt.

## 10. Workstream F — lineage-first breeding

### 10.1 Required outcome

Breeding selection feels like continuing a family story, not sorting a spreadsheet.

### 10.2 Remaining implementation

- Replace default `Best Power` and `Best Speed` emphasis with identity-, temperament-, lineage-, record-, and trait-oriented discovery.
- Remove POW/SPD/AGI as the dominant parent-card content.
- Surface parent fighting identity, signature strengths, notable record, championships, recognized tendencies, generation, and pedigree.
- Add a deterministic `Likely inheritance` summary using existing genetics and behavior data.
- Express inheritance as tendencies and confidence ranges, not guarantees.
- Highlight meaningful parent complementarity and shared lineage traits in plain language.
- Keep detailed genetics in an optional advanced panel for players who want it.
- Preserve existing deep genetics internally unless simplification is required for correctness or launch stability.

### 10.3 Acceptance criteria

- A player can choose parents based on intended fighter identity without opening raw genetics.
- Inheritance descriptions are generated from the same inputs used by offspring generation.
- Preview language never claims deterministic inheritance where the generator is probabilistic.
- At least 80% of blind testers explain a pairing in lineage or identity terms rather than only citing higher numbers.

## 11. Workstream G — five-opponent teaching campaign

### 11.1 Required outcome

Launch with five memorable authored opponents, plus at most two optional rivals. Existing additional circuits and bosses may remain in data but are not part of the launch-quality surface.

Recommended existing-ID launch roster:

1. `charger` — obvious forward commitment; teaches `COUNTER`.
2. `wall` — defensive resistance and positional patience; teaches deliberate `PRESS` and restraint.
3. `grinder` — extended pressure and stamina attrition; teaches `RECOVER`.
4. `feint-master` — misleading or incomplete tells; tests observation, `WAIT`, and adaptation.
5. `apex` — combines prior lessons as the launch champion.

Final IDs may change only to reuse a better-existing authored opponent; the five teaching functions may not expand.

### 11.2 Behavior requirements

- Each opponent must be recognizable from behavior without reading a stat sheet.
- Differences must come from policy, timing, tell habits, spacing, compliance, and action selection—not only attribute totals.
- Early opponents exaggerate their lesson enough to teach it naturally.
- Later opponents vary timing and combine learned concepts.
- Scouting language describes tendencies without providing a deterministic command recipe.
- Defeat feedback uses exchange interpretation to explain the lesson.

### 11.3 Campaign scope

- Expose one compact launch ladder.
- Hide or defer non-launch circuits from normal progression.
- Preserve existing boss data for post-launch use without requiring launch polish.
- Validate unlocks, rewards, rematches, retirement, injury, and save progression across the compact ladder.

### 11.4 Acceptance criteria

- At least 80% of blind testers distinguish the five opponents from behavior after fighting each twice.
- Each opponent reliably produces the exchange patterns needed to teach its concept.
- No opponent is primarily a stat gate.
- The champion tests all four commands without introducing a new combat system.

## 12. Workstream H — four-command launch surface

### 12.1 Awakenings

Awakenings must not compete with the four-command model during onboarding or the opening launch campaign.

For launch, choose one bounded presentation policy:

- automatic career payoff;
- late-campaign unlock after command comprehension has been demonstrated; or
- unavailable in the launch campaign while retained elsewhere for development.

Do not add awakening expansion work. Do not place awakening controls beside the four commands in the first-30-minute experience.

### 12.2 HUD hierarchy

During the decision phase, visual priority is:

1. fighters and embodied tells;
2. decision-window state;
3. four coaching commands;
4. concise command acknowledgement;
5. exchange recap after resolution.

No other major system may compete with those elements.

## 13. Launch scope kill-list

The following are explicitly not in scope before the blind-test build and launch gates pass:

- awakening expansion;
- additional mutations;
- advanced tournament formats;
- extra clinic depth;
- additional campaign circuits;
- economy redesign unrelated to exploits or blockers;
- new combat commands;
- additional fighting styles;
- village expansion;
- PvP expansion;
- new training minigames;
- additional rare traits;
- new genetics dimensions;
- new progression branches;
- new side encounters;
- additional procedural opponent volume;
- cosmetic systems that delay interpretation work.

### 13.1 Scope-exception rule

A launch scope exception requires all five answers:

1. Which `Observe → Predict → Coach → Interpret` step does it improve?
2. Which existing launch task does it replace?
3. What playtest evidence requires it?
4. Who owns it, and what is the time estimate?
5. Which release-gate metric should improve, and by how much?

If an exception does not replace existing work, it is an addition and is deferred.

## 14. Release gates

These are release blockers, not aspirational metrics.

### 14.1 Combat comprehension gate

- Minimum 10 blind testers.
- Minimum 50 scored exchange explanations.
- Score every explanation component-wise:
  - observed situation: 0–1;
  - command understood: 0–1;
  - compliance understood: 0–1;
  - execution understood: 0–1;
  - result understood: 0–1;
  - causal relationship: 0–2.
- At least 80% of explanations must score 5/7 or higher.
- No individual scoring category may fall below 70% of its available points across the full sample.
- Explanations are graded against `EXCHANGE_RESOLVED`, not subjective designer recollection.
- Players may use ordinary language; exact game terminology is not required.

Example of a correct explanation for `GOOD / COUNTER / PARTIAL / GLANCING_HIT`:

> “I read the rush correctly and told him to counter, but he reacted late and only clipped him.”

### 14.2 Fighter identity gate

- At least 80% of blind testers describe their rooster using behavioral language without being prompted with stats.
- Their description must materially agree with the deterministic identity presenter and observed behavior.

### 14.3 Opponent identity gate

- At least 80% of blind testers distinguish the five launch opponents from behavior alone after fighting each twice.
- Recognition may use ordinary descriptions rather than exact opponent titles.

### 14.4 Release stability gate

Complete 10 consecutive fresh-save full launch runs with:

- zero progression blockers;
- zero unrecoverable state errors;
- zero authoritative/client combat desyncs;
- zero save corruption;
- zero duplicate or contradictory exchange recaps;
- no economy or breeding exploit that invalidates progression;
- successful reconnect/recovery from supported interruption points;
- valid handling of injuries, retirement, terminal fights, and campaign completion.

Any failure resets the consecutive-run count after the defect is fixed.

## 15. Blind-test protocol

1. Recruit players who did not design or implement the system.
2. Do not explain mechanics beyond normal in-game onboarding.
3. Observe where they look during tells, command selection, clashes, and recaps.
4. After selected exchanges, ask: “What happened, and why?”
5. After fights, ask: “What kind of fighter is your rooster?”
6. After facing opponents twice, ask players to distinguish them from behavior.
7. Record the authoritative exchange event used to grade every explanation.
8. Track incorrect mental models, unreadable cues, ignored UI, and contradictory feedback.
9. Fix comprehension failures before adding polish that does not affect a gate.

The most important failure response is:

> “I pressed counter and something happened.”

The target response is:

> “I saw the forward load, countered, and my cautious rooster reacted late, so he still got clipped.”

## 16. Implementation sequence

### Step 1 — authoritative exchange accumulator

- Define versioned interpretation types and policy module.
- Add accumulator/restoration state.
- Capture lock-time observable snapshot.
- Correlate ordered canonical evidence.
- Group executions using the frozen initiation/resolution boundary.
- Derive cinematic salience separately from net exchange result.
- Finalize exactly once per exchange.

**Exit condition:** deterministic unit fixtures produce complete payloads for single- and multi-execution exchanges.

### Step 2 — `EXCHANGE_RESOLVED` emission

- Emit the semantic event in canonical order.
- Persist and expose it through existing sync/recovery paths.
- Include it in event digests and replay behavior.

**Exit condition:** integration tests prove identical live, restored, and replayed results.

### Step 3 — deterministic multi-contact tests

- Add the test matrix in Section 5.8.
- Add reconciliation and reference-integrity assertions.
- Add fuzz/property coverage if deterministic fixtures cannot cover ordering sufficiently.

**Exit condition:** no supported exchange shape loses or misattributes evidence.

### Step 4 — minimal recap renderer

- Add one shared recap component and presentation adapter.
- Consume authoritative events only.
- Handle queues, deduplication, reconnect, accessibility, and reduced motion.

**Exit condition:** production combat renders truthful recaps under delayed and batched delivery.

### Step 5 — embodied production tells

- Share posture mapping.
- Apply it to the authoritative fighter rigs.
- Verify all launch cameras and key tell transitions.

**Exit condition:** primary tells remain broadly readable with labels disabled and become unambiguous with labels enabled.

### Step 6 — blind-test build

- Restrict combat to the four-command launch surface.
- Include contrasting test fighters and the compact teaching ladder.
- Instrument and run the protocol in Section 15.

**Exit condition:** the combat-comprehension gate passes or produces evidence-backed fixes.

### After Step 6 only

- Surface fighter identity everywhere.
- Convert breeding to lineage-first presentation.
- Finish the five-opponent campaign.
- Execute stability, performance, onboarding, sound, animation-transition, save, reconnect, exploit, and device testing.

No deferred system work resumes until all release gates pass.

## 17. Indicative 12-week allocation

Calendar dates do not override exit gates.

### Weeks 1–5 — combat comprehension

- authoritative accumulator and interpretation policy;
- `EXCHANGE_RESOLVED`;
- deterministic and restoration tests;
- recap renderer;
- embodied authoritative tells;
- distinct command verification;
- four-command-only opening experience.

### Weeks 6–8 — make the rooster matter

- shared fighter identity presenter;
- combat, dossier, coop, matchup, and selection integration;
- lineage-first breeding;
- career-derived known-for and weakness language.

### Weeks 9–12 — releasable vertical slice

- five-opponent teaching ladder;
- onboarding and blind testing;
- animation and sound polish tied to comprehension;
- desktop/mobile layout verification;
- loading, reconnect, and server-failure behavior;
- save and progression integrity;
- injury, retirement, and terminal-state edge cases;
- economy and breeding exploit testing;
- performance and final stability runs.

## 18. Likely implementation touchpoints

The exact file split may change, but work should remain near these existing owners:

- `lib/combat-v2/canonical.ts` — canonical types, checkpoint, event emission, restoration, result digest.
- `lib/combat-v2/engine.ts` and related rhythm/tell modules — source engine evidence only; do not move interpretation into React.
- new `lib/combat-v2/interpretation.ts` — pure versioned evaluator, accumulator helpers, primary-outcome policy.
- `lib/__tests__/canonicalCombat.test.ts` — canonical ordering, restore, replay, digest, and reference integrity.
- new focused interpretation tests — read-quality and multi-execution fixtures.
- `components/combat-v2/ContinuousBattle.tsx` — authoritative event consumption and recap queue integration.
- new `components/combat-v2/hud/ExchangeRecap.tsx` — minimal recap presentation.
- `components/combat-v2/hud/uiAdapter.ts` — player-facing labels only, never semantic inference.
- `components/chicken3d/BattleStage3D.tsx` and animation tell/posture modules — embodied authoritative cues.
- `lib/combat/identity.ts` or a dedicated presenter — shared derived fighter identity.
- chicken detail, coop, matchup, and breeding components — identity-first presentation.
- `lib/pve/bosses.ts`, `lib/pve/campaign.ts`, and `lib/pve/service.ts` — compact launch roster and teaching progression.

## 19. Definition of done

This launch interpretation effort is complete only when:

- every meaningful exchange emits one versioned authoritative recap;
- every recap can be traced to canonical source events;
- read quality is evaluated at lock and remains independent from outcome;
- multi-action exchanges are represented honestly;
- production tells are embodied on the fighters;
- each command visibly changes the fight while preserving personality;
- combat exposes only the four-command core during onboarding;
- fighter identity is understandable without raw coefficients;
- breeding defaults to lineage and tendency rather than stat sorting;
- five authored opponents teach and test the combat language;
- all four comprehension/identity/opponent/stability release gates pass;
- no launch kill-list item displaced required gate work.

The final production test is simple:

> Can a player who received no designer explanation accurately describe what they saw, what they chose, how their rooster interpreted it, and why the exchange ended that way?

If not, the interpretation layer is not finished.
