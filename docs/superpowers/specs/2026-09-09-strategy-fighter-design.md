# Strategy Fighter — Design Spec

Planning only. **No implementation this pass.** This is the spec to build
from once the user greenlights Phase A/B.

Source material: `concepts/strategy-fighter.md` (raw brainstorm, 57
sections) — this doc is the trimmed, feasibility-checked version of it,
scoped against what already exists in `rooster-arena` and against the
solo-dev / procedural-assets constraint. Read the concept doc for the full
brainstorm and rationale; this doc is what actually gets built, in what
order, and why some of the brainstorm was cut or reshaped.

## Problem statement

Current game: breed/train → get good stats → simulator autoplays → win
because the numbers are bigger. Once a rooster is strong, watching the
fight is optional — there's no moment where player *decision-making*
changes the outcome independent of stats. That's the "grindy, boring, no
skill" complaint this spec exists to fix.

## Design goal

Player becomes the **coach**, not the fighter. The rooster independently
executes actions (already true — `combat/simulator.ts` picks from
`COMBAT_ACTIONS`); player skill comes from reading the opponent, planning,
and issuing limited commands that bias — not override — the AI's own
decisions. A weaker rooster with good coaching should be able to beat a
stronger rooster with none. If that's not true, this system has failed
regardless of how deep it gets.

## What already exists (don't rebuild)

Confirmed via graphify + direct read, 2026-09-09:

- **Action space** — `CombatAction` (`lib/types.ts:307`): `LIGHT_ATTACK`,
  `HEAVY_ATTACK`, `PRESSURE`, `EVADE`, `COUNTER`, `GUARD`, `RECOVER`,
  `REPOSITION`. This is the full command surface the coaching layer will
  ever need to bias — no new actions required.
- **Range/context** — `CombatDistance` (`CLOSE`/`MID`/`FAR`) and
  `CombatContextState` (`NEUTRAL`/`ADVANTAGE`/`DISADVANTAGE`/
  `PRESSURING`/`PRESSURED`) already modeled server-side in
  `combat/resolution.ts` / `combat/simulator.ts`. This is most of concept
  §25 (range) and a chunk of §18 (momentum) already done.
- **Action scoring** — `combat/actions.ts` + `combat/simulator.ts` already
  score and pick actions instead of pure random weighting. Turning this
  into `score × playerCommandModifier` is an edit to an existing function,
  not new architecture.
- **Behavioral profile** — `BehavioralProfile`, `deriveBehaviorProfile()`
  (`combat/behavior.ts`), `CombatExperience` (`lib/types.ts:381`),
  `FightingStyle` (aggressive/counter/endurance/balanced) all exist and
  map directly onto concept §3-4's `CombatIdentity`.
- **Animation** — fully procedural (`lib/animation/`), zero external
  assets. `ProceduralAnimationController.ts` drives pose functions
  (`idle.ts`, `attacks.ts`, `hitReactions.ts`, `downed.ts`, `outcomes.ts`,
  `locomotion.ts`) registered in `animations/index.ts` with
  duration/loop/priority per `AnimState`. 8 attack anims, graded hit
  reactions, full downed/outcome set — enough variety for every
  `CombatAction` already.
- **Audio** — fully synthesized (`lib/audioEngine.ts`, Web Audio
  oscillators + gain envelopes, "zero external audio assets" per its own
  comment).
- **Juice hook** — `HitStopController` (`lib/animation/hitStop.ts`)
  already exists in the Battle Canvas community; not yet wired to
  momentum.
- **Balance tooling** — `scripts/balance-sim.ts` exists for tuning
  simulated fights; use it, don't rebuild it.
- **Physical capability layer** — `PhysicalProfile`
  (`lib/physicalProfile.ts`), derived from the genetic `PhysicalBlock` (18
  body-proportion genes, `lib/types.ts:115-178`, currently also driving the
  3D rig) into `mass`/`reach`/`mobility`/`stability`/`wingControl`/
  `kickPower` multipliers, plus `traitStatModifier()` mapping the same
  genes onto the 6 `GeneticStatKey`s. Already wired end-to-end into combat
  math: `maxHealth()` (`combat/stats.ts:36-38`) multiplies by `mass`, and
  `resolution.ts`/`simulator.ts` apply `reach`/`mobility`/`stability`
  against accuracy/agility/defense. This *is* the "physical body affects
  what a rooster can do, independent of personality" layer a design
  partner asked for on 2026-09-09 — it already exists, is already
  independent of `CombatIdentity`/`BehavioralProfile`, and needs no new
  subsystem. Phase A/B only need to make sure `ActionScoring` (below)
  reads it too, not just raw damage/accuracy math.

Net effect: Phase A/B below is ~30-40% already built. Phase C
(opponent modeling) and D/E (game plan/commands) are the real net-new
work — and also the part that actually fixes the grind complaint.

## Cuts and reshapes from the original brainstorm (with reasoning)

1. **Scouting stat-bars → in-fight visual/audio tells.** Stat-bar
   scouting screens (concept §10-11) are a menu users memorize before the
   fight, not something they *read* during it. Fighting-game telegraph
   design consensus: a tell only builds skill if it's a perceivable
   in-the-moment cue (wind-up motion, sound, stance shift), not a
   pre-fight number. Cut the scouting-bar screen from MVP. Replace with
   hand-tuned procedural tell animations (see Phase A.5 below). Scouting
   *menus* survive only as a later, optional, mid-game unlock (concept
   §52 already gates this correctly) — not core to the loop.
2. **`CombatIdentity`'s 10 numeric axes → 3 for the prototype.**
   Aggression, patience, risk tolerance only, to start. A 10-dimension
   multiplicative scoring function is unbuildable-by-feel for a solo dev
   and `balance-sim.ts` won't save you from a black box. Add axes only
   after the 3-axis version is proven fun.
3. **Command Points as a bankable resource → clock-regenerating, not
   turn-banked.** Pure banked CP gets solved into "hoard until the
   perfect moment, dump" — the same staleness problem this system exists
   to fix, just moved up a layer. CP regenerates on a timer so sitting on
   it has an opportunity cost.
4. **Momentum as a UI meter → momentum as juice, meter is secondary.**
   The number should confirm what the player already felt (bigger
   hit-stop, camera punch, audio swell on a momentum-swinging hit), not
   be the only channel. Wire momentum into `HitStopController` directly.
5. **Everything in one committed 57-section spec → Phase A/B only is
   committed.** Phases C onward (opponent modeling, game plan, commands,
   techniques, scouting, PvP, draft, meta) are *not* committed scope —
   they get revisited only after the Phase A/B prototype is proven fun in
   isolation. Writing them in detail now would just create spec-gravity
   pressure to build toward an unvalidated plan.
6. **No casual/auto-coach path → add one.** Nothing in the original
   brainstorm accounted for players who want to breed/watch/idle without
   engaging the coaching layer. Mandatory coaching risks trading "grindy
   but chill" for "mandatory homework" — a different complaint, not a
   fix. `Auto-Coach` (AI plays the coach role with a default game plan)
   is a first-class toggle from the start, not an afterthought. It also
   gives a clean fun-check: if manual-coach players consistently
   outperform auto-coach players at equal rooster strength, the skill
   layer is proven to work.

## Phase A — Dynamic Styles (net-new)

Convert `FightingStyle` from a static stat multiplier (current combat
design, `2026-09-04-combat-design.md`) into an actual action-weighting
policy.

- `CombatIdentity` (reduced): `aggression`, `patience`, `riskTolerance`
  only. Derived from existing `FightingStyle` + `BehavioralProfile`, not
  a new input the player sets directly.
- `StylePolicy`: base action-weight table per style (concept §5's
  example table is the right shape — weights shift as fight state
  changes, e.g. opponent exhausted → less `RECOVER` weight, more
  `PRESSURE`).
- `ActionScoring`: extend `combat/actions.ts`'s existing scoring with
  `styleWeight` and `combatState` multiplier terms, reading `PhysicalProfile`
  (already computed per-fighter in `simulator.ts`) as a further term. Physical
  profile changes what an action *costs*, not what the rooster *wants*: low
  `mobility`/high `mass` makes `REPOSITION`/`EVADE` less attractive and
  close-range exchanges more stamina-efficient — it does not directly boost
  `PRESSURE`/`HEAVY_ATTACK` weight as if mass were a hidden fighting style.
  `StylePolicy` is what decides intent; `PhysicalProfile` only decides what's
  cheap or expensive to attempt. Keep the pipeline strictly layered:

  ```
  Physical Capability   ("what am I good at?")
  Combat Identity       ("what do I tend to want?")
  Fighting Style        ("what's my overall philosophy?")
  Experience            ("what have I learned?")
  Player Command        ("what is my coach asking?")
  Current Combat State  ("what's happening right now?")
        ↓
  Action Scoring
        ↓
  Action
  ```

  No new function shape, extend what's there.
- **A.5 — Tells reveal intent tier, not the exact action.** For each of
  the 3 identity axes, one hand-tuned procedural "tell" animation + matching
  synth sting, gated behind a new `AnimState` with hard priority (same
  registration pattern as `taunt` in `animations/index.ts`) so it interrupts
  idle rather than blending into ambient motion. Minimum readable duration
  300-500ms, matching existing attack-anim scale. Triggered from
  `combat/state.ts` one beat before the AI commits. Each tell maps to a
  coarse intent, not a specific `CombatAction` — aggression tell reads as
  "he's about to engage," patience tell as "he's waiting / looking for an
  opening," risk tell as "he's committing heavily / exposing himself." The
  risk tell is not "play the risk-tolerance animation" — it's triggered by
  the AI actually entering a high-risk decision state (e.g. about to swing
  on low stamina, or over-commit at bad range), so the tell is caused by a
  real decision, not a personality-stat readout. The actual action
  (`LIGHT_ATTACK` vs `HEAVY_ATTACK` vs `PRESSURE`, etc.) is still resolved
  after the tell plays. This keeps it a read-and-anticipate mechanic ("he's
  committing, WAIT") rather than a reaction-timing QTE ("that's the
  heavy-attack animation, counter now").
- **Imperfect command compliance.** A player command shifts
  `playerCommandModifier` toward the commanded action's weight, but the
  shift is scaled down the further the command sits from the rooster's own
  `CombatIdentity` — a high-aggression/low-patience rooster mostly complies
  with `PRESS`, but a high-patience one only partially does, and may still
  probe/reposition instead. Compliance is never 0% or 100%; the player is
  biasing a living fighter, not issuing a puppet command. This applies to
  all 3 MVP commands (`PRESS`/`WAIT`/`RECOVER`, see validation gate below).

## Phase B — Combat State (net-new + wiring)

- Momentum: `CombatMomentum` (value -100..100, from successful
  counters/critical hits/evasions/forced retreats). Wire directly into
  `HitStopController` (hit-stop duration, camera punch) for juice, but
  momentum's *mechanical* effect is bounded to decision-making, not raw
  power: it nudges effective `riskTolerance` a small, capped amount in
  each fighter *independently* — the fighter gaining momentum gets
  slightly more initiative/willingness to pressure, the fighter losing it
  gets slightly more caution/defensiveness. Each fighter's own momentum
  drives their own nudge; a losing rooster's caution comes from their own
  falling momentum, not from the winner's rising momentum reaching over
  and suppressing them. The cap must be small enough that a single swing
  can't compound into a runaway snowball — a losing rooster always has a
  believable path back via one good counter/evasion (see validation Test
  D). Explicitly not a damage, accuracy, or hit-stop-magnitude multiplier —
  no invisible stat buff riding on top of the juice.
- Mental state (`calm`/`confident`/`nervous`/`frustrated`/`desperate`/
  `exhausted`): a single pure function,
  `deriveMentalState(hp, stamina, momentum, recentExchangeResult,
  experience)`, not six independent state machines. Its output feeds back
  into `CombatIdentity`'s effective weights for the rest of the fight.
- `CombatInactivity` — addresses the counter-vs-counter stalemate bug
  already hit once (Onyx Chicken vs Champion Chicken, 2026-09-08):
  repeated non-resolving exchanges raise both fighters' willingness to
  close distance/pressure/bait, and unlock a `FORCE_ENGAGEMENT` command
  even at 0 CP.

## Phase A/B validation gate — the only thing that gets built before a decision

Per concept §57, narrowed: one 1v1 fight, Counter style vs Aggressive
style, 3 clock-regenerating Command Points (`PRESS`/`WAIT`/`RECOVER`
only — 3 commands, not the full 8+ of the brainstorm), hidden opponent
identity, momentum wired to hit-stop, tells wired per Phase A.5. CP regen
is visible but subtle in the UI (pips + "next command: 2.4s" countdown) so
spend-now-vs-wait is a felt decision, not hidden bookkeeping.

Pass criteria — four tests, all four must pass:

- **Test A — Reading.** Can the player look at the fight and predict what
  the opponent is trying to do, from tells/state alone, before it resolves?
  (The informal check: does a player start saying "he's getting
  predictable, BAIT" out loud before the AI acts on it?)
- **Test B — Intervention.** Can the player issue a command that
  meaningfully changes the outcome — i.e. does manual-coach win rate beat
  Auto-Coach win rate at equal rooster strength (same seed distribution,
  same stats), per the Auto-Coach comparison described in cut #6 above and
  the Auto-Coach section below?
- **Test C — Physical identity.** Do two same-style roosters with
  different `PhysicalProfile`s (e.g. massive vs long-legged) visibly fight
  differently — not just "same AI, different numbers"? Must produce
  behavioral differences, not merely numerical ones: a massive rooster
  shouldn't just have more HP, it should actually reposition/evade less and
  manage stamina differently because those actions are more expensive for
  its body; a long-legged rooster shouldn't just have +speed, it should
  visibly maintain distance, reposition often, spend more stamina doing so,
  and become vulnerable once that stamina runs out. Checkable today against
  `resolvePhysicalProfile()` + `balance-sim.ts` without waiting on Phase A/B
  code.
- **Test D — Comeback.** Can a weaker rooster with good coaching find a
  believable path to victory — not "60% stats auto-loses" and not "press
  WAIT, magically win," but a legible chain: stronger opponent falls into a
  predictable pattern → player reads it → player commands (with imperfect
  compliance) → opponent overcommits → counter exchange lands → momentum
  swings → fight becomes genuinely competitive. If this doesn't hold, the
  system is a stat simulator with buttons regardless of how the other three
  tests score.

If all four pass, proceed to Phase C. If any fail, this system gets
rethought before anything else is added — more phases will not fix a
fight that isn't fun at 3 minutes.

## Deferred — not designed further until the gate above is passed

Everything past Phase B in the original concept doc (opponent modeling /
pattern detection, game plan + conditional rules, full 8-command set,
techniques/loadouts, scouting UI, post-fight analysis, rival memory,
draft/PvP modes, meta seasons, gauntlet, fight contracts) stays exactly as
brainstormed in `concepts/strategy-fighter.md`. No further spec work here
until Phase A/B is validated as fun — see cut #5 above for why.

## Auto-Coach (first-class from Phase A)

A per-fight toggle: `manual` (player issues commands) vs `auto` (a
default game-plan policy issues them). Same action-scoring path either
way — `auto` just supplies a static `playerCommandModifier` instead of a
live one. Required from the start, not bolted on later, so idle/casual
play is never blocked by this system.

## Explicitly not addressed here

- Regulatory/gambling framing of any prediction/betting mechanic (concept
  §10) — out of scope for this spec, flagged for whenever that system is
  actually proposed, given the existing baseline spec's PH e-sabong
  legal notes (`gamefowl_dynasty_full_mechanics.md`, economy section).
- Persistence for rival memory / meta-evolution (concept §41-50) — real
  technical debt (storage, anti-smurf) but irrelevant until those systems
  are in scope at all.
