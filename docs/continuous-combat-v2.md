# Continuous combat V2 — live authority

V2 is the production combat authority for `/battle`, PvE bosses, tournaments,
and all remaining one-shot callers of `simulateFight`. The browser never decides
a rewarded result: the server owns a `LiveCombatV2Session`, advances exactly 60
fixed ticks per live step, and only persists progression after its terminal V2
result. `/battle` keeps its existing replay presentation, but the streamed log
and settlement now originate from V2 rather than a local practice simulation.

`COMBAT_ENGINE` defaults to `v2`. The standalone `ContinuousBattle` component
remains useful as a non-persistent visual/debug harness, but is no longer
reachable from the real battle route.

## Engine boundary

`lib/combat-v2/index.ts` exports the standalone engine and session controller.
It has no React, Three, browser, Node or database imports. The application-only
`lib/combatV2Snapshot.ts` converts existing chickens to detached snapshots using
current effective stats, physical modifiers, behavior, condition and experience.
Match creation clones and recursively freezes these snapshots.

```ts
const state = createMatch(config);
stepCombat(state); // exactly one 1/60-second step; mutates session-owned state
const result = runCombatToCompletion(config); // same rules, no renderer
```

Each tick runs this versioned order:

1. Advance tick and apply accepted commands scheduled for that tick.
2. Advance both action timelines and complete recovery/stagger timers.
3. Perceive existing tells for both fighters, then make utility decisions.
4. Compute both movement vectors from the same starting positions, then move.
5. Collect all active strike collisions before applying any hit.
6. Apply collected damage, then interrupts. Overlapping strikes can trade.
7. Regenerate stamina/balance and check KO or time-limit finish conditions.

Movement is quantized to 1e-5; RNG uses serializable 32-bit integer state.
Decisions run on fighter-specific timers. They never choose an initiative winner
or discard the other fighter's active action. Pecks, lunges, jumping kicks, flying spurs and counters have
startup, active and recovery windows; guard, evade and feint have their own
commitment windows. Counter utility rises during actual recovery openings.
Each fighter independently moves through stalking → committing → clashing → breaking → resetting. A clash is a 0.4–2.0 second open window, rather than one attack: short action timelines allow strikes, evades, counters, collisions and follow-ups to emerge from simultaneous simulation state until temperament, fatigue or balance causes a break. Recovery inside the window returns the fighter to another decision quickly; only expiry or an interrupt begins disengagement. Recovery produces angled disengagement; pressure shortens it, caution and fatigue widen it. Tells incur recognition and reaction delay. Passivity increases approach and
attack utility. Repeated attacks inform basic defensive pattern recognition.

The collision module defines seven simulation-space hurt spheres (head, neck,
body, wings and legs). Strikes use reach capsules; rendered GLB bones do not
feed collision into the engine. These are initial approximate anchors, not a
fully calibrated rig or a complex physics system. All hurt spheres include simulation height; grounded attacks cannot connect to an out-of-height target. Symmetric body separation includes chest/wing clearance and arena walls. Airborne glancing contact redirects travel sideways.

The runtime holds current-tick events only. Consumers subscribe to each tick
through `CombatSession`; the UI retains a short rolling event feed. Persistent
replay archives and checkpoint serialization have not been implemented.

## Presentation

`ContinuousBattle` owns a fixed-step session outside React state. Its render
loop interpolates positions and updates refs used by the existing 3D stage.
V2 renders models directly without the independently displaced V1 Rapier rigs. Jump height comes from simulation trajectories, including gravity after an interrupted flight. HUD snapshots update about 12 times a second. A bounded catch-up loop retains
frame debt rather than dropping combat ticks after a slow frame.

V2 passes normalized simulation pose progress to the procedural animation
controller. This bypasses visual clip priority and completion transitions. The
existing V1 animation path still uses its original controller rules. The initial
attack pose mapping maps the authored .52–.72 strike segment to the active window.
Damage events drive impact particles and flash; stagger and KO states drive
corresponding poses. Visual rig alignment still needs in-browser playtesting.

Tactics have a 120-tick cooldown and a 12-tick local scheduling buffer. The
engine validates fighter/player identity, increasing sequences and tick ranges.
This is local command validation, **not an authentication or network authority
boundary**. Future competitive APIs must lock snapshots, authorize the caller,
stamp effective ticks and verify results before persisting any progression.

## Verification

```sh
node --import ./scripts/test-ts-loader.mjs --test \
  lib/__tests__/continuousCombat.test.ts \
  lib/__tests__/continuousPresentation.test.ts \
  lib/__tests__/continuousCollision.test.ts
node --import ./scripts/test-ts-loader.mjs scripts/fuzz-continuous-combat.ts 10000
```

Tests cover deterministic event sequences, detached snapshots, simultaneous
hits/double KO, active windows, interrupts, range, evade/block, no duplicate hits,
commands, terminal states, passive matchups, frame debt, pause and equivalent
47/60/144/240 FPS clocks. Presentation tests cover simulation-driven poses and
V1 priority preservation. Real browser-versus-Node determinism has not yet been
certified; frame-rate tests execute the same engine in Node.

## Remaining milestones

Multiplayer, durable cross-instance session storage, spectator streaming and
V2-native replay snapshots remain future work. Advanced status
injuries, persistent learned behavior, rig debug colliders, camera direction,
audio and broader action balancing are also not complete. Preserve `2.0.0`
rules or introduce an explicit version handler before shipping balance changes
that need to reproduce historical competitive matches.
