# Combat — Design Spec

Roadmap item 6 (Combat System), following on from training (item 5).
Baseline: `docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md`,
sections 15–21 (Combat System, Philosophy, Fighting Styles, Combat AI,
Hitbox Combat, Critical Injuries, Death & Legacy).

## Scope (decided with the user)

In for this pass:

1. **Core combat sim** — automated, stat-driven fight between two `Chicken`s.
2. **Fighting styles** — Aggressive / Counter / Endurance / Balanced, a
   persistent property set at creation, not chosen per-fight.
3. **Hitbox + injuries** — attacks resolve to a body zone; injuries are
   flavor/log detail on top of a simple **injured flag + heal action**
   (no timed recovery, no permanent stat loss, no death this pass).
4. **NPC opponents** — generated on demand, not owned by any player,
   roughly matched to the player's chicken.
5. **Server-side simulation, client replay** — a route runs the full fight
   and returns a complete log; the client animates it, mirroring the
   legacy `BattleArena`/`BattleEngine` split (already decoupled: engine has
   zero UI coupling, animation just drives it turn by turn).

Explicitly deferred (per baseline sections 20–21, not part of this pass):

- Serious/Critical/Fatal injury tiers, permanent stat impact, death/legacy.
- Timed injury recovery, training restrictions while injured.
- Matchmaking/ranking, tournaments, betting integration (roadmap items
  7–10).
- Per-fight style selection, equipment/boosts.

## Data model

Two new persistent `Chicken` fields (migration required):

```ts
export type FightingStyle = "aggressive" | "counter" | "endurance" | "balanced";

export type Chicken = {
  // ...existing fields
  fightingStyle: FightingStyle;
  colorScheme: RoosterColorScheme; // visual identity, for battle rendering + Coop
  injured: boolean;
};
```

- `fightingStyle` — rolled once in `createChicken`/`generateRandomChicken`
  (uniform random over the 4 styles) and copied onto hatched chicks the
  same way `bloodlineId`/traits already are. Not inherited from parents —
  baseline doesn't call for style genetics, and keeping it flat avoids
  scope creep onto the breeding system.
- `colorScheme` — `Chicken` currently has no visual identity at all (the
  legacy `Rooster` does). Reuse `COLOR_PALETTES` from `roosterGenerator.ts`
  (or promote it to a shared module) so hatched/generated chickens get a
  real look instead of a placeholder. Assigned once at creation, persisted,
  and reused by both the Coop UI and the battle canvas.
- `injured` — replaces reliance on `ChickenStatus`'s existing `"injured"`
  value for the *simple* flag this pass wants; `status` stays for
  active/retired/deceased lifecycle. A fight that produces a critical hit
  (see below) sets `injured = true`; nothing else reads it yet except
  `canBattle`, which now also requires `!injured`.

`prisma/schema.prisma` `Chicken` model gains `fightingStyle String`,
`colorScheme Json`, `injured Boolean @default(false)`.

NPC opponents are **not** persisted — generated in-memory per fight
request via `generateRandomChicken`, given a `fightingStyle` and
`colorScheme` the same way, and returned inline in the fight response.
No `Player` row, no `Chicken` row.

## Effective stats

`Chicken` has no single "battle-ready" stat block yet (`iv`/`ev` are
genetics, not combat numbers). New pure function:

```ts
// lib/combat.ts
export function effectiveStat(chicken: Chicken, key: GeneticStatKey): number {
  // iv is genetic ceiling context, ev is training investment;
  // same weighting the mechanics spec uses for "genetics + training"
  return chicken.iv[key] * 0.6 + chicken.ev[key] * 0.4;
}
```

Combat consumes `power`, `speed`, `stamina`, `defense`, `accuracy`,
`agility` (the existing `GeneticStatKey`s — no new stats invented). No
separate "HP" stat: max HP derives from `stamina` + `defense`, matching
how `battleEngine.ts` already derives fatigue thresholds from stat totals.

## Fighting styles

Applied as multipliers on top of effective stats, per baseline section 17:

| Style | Attack frequency | Damage | Stamina cost | Notes |
|---|---|---|---|---|
| Aggressive | +25% | +10% | +20% | Higher counter vulnerability (defense -10% while attacking) |
| Counter | -15% | Counterattacks deal +40% | -10% | Only counters when it successfully defends |
| Endurance | -10% | -10% early, ramps to +15% after turn 15 | -25% | Best late-fight scaling |
| Balanced | — | — | — | No modifier, no weakness |

## Hitbox + injuries

Every non-miss hit rolls a body zone (weighted, not uniform — head/neck
rarer than body/wings/legs) and carries it in the log entry:

```ts
export type HitZone = "head" | "neck" | "body" | "left_wing" | "right_wing" | "left_leg" | "right_leg";

export type CombatLogEntry = {
  turn: number;
  attackerId: string;
  defenderId: string;
  damage: number;
  hitZone: HitZone | null; // null on miss
  isCrit: boolean;
  isMiss: boolean;
  isCritical: boolean; // triggers the injured flag + ends the fight (head/neck crit only)
  defenderHp: number;
  timestamp: number;
};
```

A `head`/`neck` hit that also crits (existing crit-chance roll) is a
**critical injury**: fight ends immediately (baseline section 20), that
chicken's `injured` flag is set true on save, and the log entry carries
`isCritical: true` so the client can show "Critical injury — fight
terminated" instead of a normal KO line. All other zones/hits are flavor
only this pass (`hitZone` shown in the replay log, no mechanical effect
beyond normal damage) — full per-zone mobility penalties are deferred
scope, consistent with "injured flag + heal action" being the whole
recovery model.

## Injury recovery

```ts
// lib/combat.ts
export function canBattle(chicken: Chicken): boolean {
  return canBattleStage(chicken.growthStage) && !chicken.injured;
}

export function healChicken(): { injured: false; health: number } {
  return { injured: false, health: MAX_HEALTH };
}
```

`POST /api/chickens/[id]/heal` — same shape as `rest`, instant, no cost
this pass (a currency/time cost can layer on with the economy system,
item 8).

## Combat AI / simulation (`lib/combat.ts`, server-side)

Extends `battleEngine.ts`'s pattern (pure, turn-based, no UI coupling) but
keyed on `Chicken` + style + traits instead of `Rooster`:

```text
IF opponent stamina ratio < 0.3 → increase own attack frequency
IF own stamina ratio < 0.3 → reduce own attack frequency (fatigue, existing mechanic)
IF style is Counter AND last turn was a successful defense → counterattack this turn
IF critical injury occurs → terminate fight immediately
```

Traits already in `TRAIT_POOL` map onto this directly, so no new trait
data is needed:

- **Iron Stamina** — stamina cost -20% (stacks with style).
- **Calm** — miss chance for wasted/low-value attacks reduced.
- **Quick Starter** — +15% damage in turns 1–5.
- **Counter Fighter** — counterattack chance +20% regardless of style.
- **Heavy Striker** — damage +15%, stamina cost +15%.
- **Survivor** — critical-injury roll chance halved.
- **Glass Cannon** — damage +20%, defense -20%.

Influence balance follows baseline section 16 (~75% stats/genetics, ~15%
style/traits, ~10% randomness) — same variance/crit machinery
`battleEngine.ts` already has (`MAX_CRIT_CHANCE`, defense reduction curve,
±20% variance), reused rather than reinvented.

Whole fight runs to completion synchronously inside the API route
(existing `MAX_TURNS = 300` cap carries over) and returns the full
`CombatLogEntry[]` plus the result. The client never simulates — it only
replays the returned log, same separation `BattleArena`/`BattleEngine`
already have today for the legacy homepage app.

## NPC opponent generation

`generateRandomChicken` already exists and produces a full `Chicken`
(minus the two new fields, added the same way as for player chickens).
Match difficulty to the player's chicken by generating candidates and
picking one whose total effective stats land within a tolerance band
(e.g. ±20%) of the player chicken's total — same spirit as
`roosterGenerator.ts`'s existing odds calculation, not a new system.

## API routes

### `POST /api/chickens/[id]/opponent`
Generates and returns one NPC opponent `Chicken`, matched to `[id]`.
Stateless — not persisted; the client holds it in memory until the fight
is requested.

### `POST /api/chickens/[id]/fight`
Body: `{ opponent: Chicken }` (the NPC returned above, round-tripped —
avoids persisting throwaway opponents just to reference them).
Validates `canBattle` on the player chicken, runs the simulation, updates
the player chicken's `record`, `health`, `injured` (on critical injury),
`status`, then returns `{ result: CombatResult, log: CombatLogEntry[] }`.

### `POST /api/chickens/[id]/heal`
Clears `injured`, restores `health` to max. Instant, no cost.

## Rendering (`/battle` page, new route)

New dedicated route in `rooster-arena` (not reusing the homepage's legacy
battle app, which stays a separate standalone demo) — but the canvas
component itself is a straight port: `BattleArena.tsx`'s draw routines
(`drawRooster`, `drawHealthBar`, `drawArenaGround`, particles/floating
text/lunge animation) are copied to a new `BattleCanvas.tsx` and retargeted
from `Rooster` to `Chicken` + `colorScheme` + the new `CombatLogEntry`
shape (adds a hit-zone label to the floating combat text, e.g. "-18
RIGHT WING"). The animation/particle/audio system is unchanged — it
already doesn't know or care about game rules, just replays whatever log
entries it's handed one at a time on a timer, which is exactly the
client-replay model this pass needs.

Flow: Coop → select a battle-eligible chicken → `/battle/[chickenId]` →
fetch an opponent → "Fight" triggers the `fight` route → canvas replays
the returned log at the existing `TURN_INTERVAL` pace → `ResultsScreen`
(existing component) shows the outcome, injury banner if critical, and a
"Heal" button when `injured`.

## Testing (TDD)

- `lib/combat.ts`: effective stat math, style multipliers, hit-zone
  weighting, critical-injury trigger, `canBattle`/`healChicken`, full
  fight determinism under a fake rng (mirrors `genetics.ts`'s test style).
- `app/api/chickens/[id]/opponent`, `.../fight`, `.../heal` route tests:
  eligibility rejection (wrong stage, already injured), record/health/
  injured updates on a completed fight, matched-opponent tolerance band.
- Component-level: `BattleCanvas` smoke test (renders, drives engine,
  calls `onBattleEnd`) following the existing `BattleArena.tsx` test
  pattern noted in memory (30/30 passing after the last type fix).
