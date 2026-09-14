# Procedural Rooster Animation System — Design

Status: approved for planning
Date: 2026-09-06
Related: `2026-09-04-combat-design.md`, `2026-09-04-rooster-arena-design.md`,
`docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md`

## 1. Goal

Replace the ad-hoc per-frame bone poking in `ChickenModel` with a reusable
procedural animation architecture that generates convincing rooster combat
motion entirely in TypeScript — no authored GLB clips, no Blender, no external
assets. Motion is computed as a function of normalized animation time from
mathematical curves and spring physics.

The battle replay must read as: *approach → combat stance → windup → procedural
attack with body-weight shift → impact → opponent reacts (recoil / stagger /
knockback) → attacker recovers → back to stance* — not `dash → collide →
damage` on repeat.

## 2. Existing system (inspection results)

### 2.1 Rig

Models: `public/3d-chicken/chicken_rooster.glb`, `chicken_hen.glb`. Skinned,
**14-bone skeleton**, cloned per fighter with `SkeletonUtils.clone` (rebinds
skeletons so each instance is independently posable).

Bone hierarchy (from `chicken_viewer.html` and `applyProportions`):

```
ChickenRoot                      (top wrapper node; "Giant" mutation scales this)
  Hips
    Spine
      Chest                      (scaled by physical.body)
        Neck                     (scaled inv * neck)
          Head
        WingL                    (scaled inv * wings)
        WingR                    (scaled inv * wings)
        Tail                     (scaled 1, tail, 1 — no children)
    ThighL                       (scaled 1, legs, 1)
      ShankL
        FootL
    ThighR
      ShankR
        FootR
  Mut_TwoHeaded                  (parented to Head area, scale 0 until expressed)
  Mut_ExtraToe_L / Mut_ExtraToe_R (parented to feet, scale 0 until expressed)
```

`Hips`, `Spine`, `ShankL/R`, `FootL/R` exist in the skeleton but **nothing
currently animates them** — they are available for knee bend, torso counter-
rotation and foot planting.

### 2.2 Bone axes confirmed from working code

| Motion | Bone / target | Axis | Sign convention |
|---|---|---|---|
| Wing flap (raise/tuck) | `WingL`, `WingR` `.rotation.z` | Z | mirrored: `WingR` positive, `WingL` negative for a symmetric raise |
| Head pitch (nod / look up-down) | `Head.rotation.x` | X | positive = look down in current code (`-max(0,rot)*1.2`) |
| Neck pitch | `Neck.rotation.x` | X | positive ≈ tuck toward chest |
| Thigh swing (fore/aft) | `ThighL`, `ThighR` `.rotation.x` | X | mirrored ± for a symmetric raise; per-leg for a stride |
| Tail raise | `Tail.rotation.x` | X | positive = raise/fan up |
| Torso pitch (whole body lean) | **group** `rotation.x = -FighterAnim.rot` | X | done at group level, not a bone |
| Facing + circling yaw | **group** `rotation.y = baseYaw + FighterAnim.yaw` | Y | `right` = `+π/2`, `left` = `-π/2` |
| Barrel roll (aerial) | **group** `rotation.z = FighterAnim.roll` | Z | 0 when grounded |
| Squash/stretch, world offset, hit flash | **group** `scale` / `position`, material `emissive` | — | from `FighterAnim.scaleX/scaleY`, `offsetX/Y/Z * PX_TO_WORLD`, `flash` |

Unknowns to resolve at implementation time by observation in the running
battle (see §10): rest-pose local rotations of `Wing*`, `Thigh*`, `Shank*`,
`Foot*` (assumed ~0 by current code, not verified); which way `Shank.rotation.x`
bends the knee; whether `Head.rotation.y` yaw is clean or introduces roll;
`Tail` yaw/roll range before it clips the body.

### 2.3 `applyProportions` — MUST be preserved

`ChickenModel` sets `.scale` on `Chest, Neck, WingL, WingR, ThighL, ThighR,
Tail` from the `physical` block, and on `ChickenRoot` / `Mut_*` from mutation
tags. **The animation system only ever writes `.rotation` and `.position` on
bones; it never touches `.scale` on any of these bones.** Rest pose is captured
*after* `applyProportions` runs so proportion scaling is inherited untouched.

### 2.4 Data pipeline

- Server returns `CombatResult.log: CombatLogEntry[]`. Each entry:
  `{ turn, attackerId, defenderId, damage, hitZone, isMiss, isCrit, isCounter,
  isCritical, defenderHp, stagger }`. `hitZone` ∈ head|neck|body|left_wing|
  right_wing|left_leg|right_leg | null. `stagger` ∈ none|light|stumble|medium|
  heavy|knockdown.
- `BattleCanvas` runs a `requestAnimationFrame` loop, walks the log one entry
  per `TURN_INTERVAL` (900 ms). `ATTACK_DURATION` 700 ms, scaled by
  `physicalProfile.mass` and per-style `windupMult`. `IMPACT_AT = 0.52`.
- `moveKindForZone(hitZone, turn, isCrit)` → `MoveKind` ∈
  `body | leg | wing | peck | spin_kick | aerial` (seeded on turn number so
  replays are stable).
- Per frame `BattleCanvas` mutates two `FighterAnim` refs
  (`animR1Ref`, `animR2Ref`): idle circling (`offsetX/offsetZ/yaw` on slow
  clocks, bob/breathing on a fast clock) when not attacking;
  `attackPoseFor(moveKind, progress)` scalar pose while attacking; defender
  flinch when `progress > 0.45`.
- At `IMPACT_AT`: `fireImpact()` sets `flash`, HP, particles, sound, camera
  cue, and calls `ChickenPhysicsRig.applyKnockback(dir, 0, stagger,
  attackerPowerRatio, defenderRecoveryRatio)`.
- `ChickenPhysicsRig` (Rapier): capsule body + sensor zone colliders.
  `applyKnockback` applies a linear impulse for `stumble|medium|heavy|
  knockdown`, plus a topple torque for `stumble` (small, 450 ms auto-right)
  and `knockdown` (large, 1300 ms auto-right, scaled by recovery ratio).
  `none|light` are cosmetic only.

### 2.5 `FighterAnim` (preserved verbatim)

`offsetX, offsetY, offsetZ, rot, yaw, roll, scaleX, scaleY, flash, wingPhase,
legPhase`. Kept as the **root-motion / presentation channel**: world position,
facing/circling yaw, barrel roll, squash-stretch, hit flash. `wingPhase` /
`legPhase` become *inputs* the controller may read as additive hints but no
longer the only bone driver.

## 3. Architecture

Two channels into `ChickenModel`, both mutable refs read in `useFrame` — **no
React state per frame, no per-frame allocation**:

1. **`combatAnim: RefObject<FighterAnim>`** — unchanged. Owns group-level
   transform (world offset, yaw, roll, scale, flash). `BattleCanvas` keeps
   computing this exactly as today, including the `MAX_LUNGE` clamp and the
   physics-gap logic. **Root motion stays in `BattleCanvas`** (decision 2).

2. **`animIntent: RefObject<AnimIntent>`** — new. `BattleCanvas` writes it on
   each turn transition and at impact:

   ```ts
   interface AnimIntent {
     state: AnimState;      // "heavy_kick", "hit_heavy", "knockdown", ...
     startedAt: number;     // ms timestamp (same clock as FighterAnim)
     speed: number;         // playback multiplier (1 = nominal)
     moveKind?: MoveKind;   // disambiguates attack states
     stagger?: StaggerLevel;
     fatal?: boolean;       // this hit is the KO → death, not hit/knockdown
     facing: "left" | "right";
   }
   ```

`ChickenModel` owns one `ProceduralAnimationController` per instance, built
after the cloned scene + `applyProportions`. Each frame:

```
rest pose (captured once, per bone: quaternion + position)
   ↓ reset every bone to rest                                    (§ "no accumulation")
Base Animation Pose      controller.stateMachine → animation fn(t, ctx) → BonePose
   ↓ blend from previous state's last pose over transitionDur
Locomotion overlay       walk/run cycle when |velocity| > threshold (decision 3)
   ↓
Additive procedural layers   breathing · head tracking · recoil springs ·
                             wing balance · tail balance
   ↓
write bone.quaternion / bone.position
```

Group-level transform (from `FighterAnim`) is applied exactly as the current
code does, after the bone write.

### 3.1 Modules

```
lib/animation/
  math.ts                 easeIn, easeOut, easeInOut, easeOutBack, smoothstep,
                          smootherstep, lerp, lerpAngle, clamp, clamp01,
                          oscillate(t,freq,phase), bell(t) (0→1→0 sin bump),
                          damp(current,target,lambda,dt), class Spring
                          (stiffness/damping/mass; step(target,dt); addImpulse(v))
  types.ts                AnimState (union), MoveKind (re-export), BonePose
                          (Partial<Record<BoneName,{rot?:Vec3;pos?:Vec3;
                          quat?:Quaternion}>>), BoneName, AnimIntent,
                          ProceduralAnimationContext, AnimationDef
                          ({duration:number; loop:boolean; priority:number;
                          fn:(t:number,ctx)=>BonePose})
  stateMachine.ts         AnimationStateMachine: current, previous,
                          transitionT (0..1), request(state,opts),
                          update(dt); TRANSITIONS table + PRIORITY map;
                          rejects illegal transitions (returns false)
  physicalGenetics.ts     deriveAnimationGains(physical): AnimationGains
                          { inertia, headThrow, kickReach, wingForce,
                            tailCounter, bob } — visual-only multipliers,
                          derived from the raw 5 proportion genes, NOT from
                          physicalProfile (which is combat-facing)
  layers.ts               applyBreathing(pose,ctx), applyHeadTracking(pose,ctx),
                          class RecoilRig (Spring per driven bone; addHit(
                          dir,intensity); apply(pose,dt)),
                          applyWingBalance(pose,ctx), applyTailBalance(pose,ctx)
  animations/
    idle.ts               idle, idleAlert (= ready stance), taunt
    locomotion.ts         walk, run, backstep, strafe  (walk/run wired;
                          others built, wired later)
    attacks.ts            peckAttack, quickKick, heavyKick, wingStrike,
                          jumpAttack, flyingKick, doubleKick, chargeAttack
    hitReactions.ts       hitLight, hitMedium, hitHeavy, hitCritical, stagger,
                          staggerHeavy
    downed.ts             knockback, knockdown, getup, death
    outcomes.ts           victory, defeat
  ProceduralAnimationController.ts
                          constructor(bones, { gains, facing });
                          play(state, opts); update(dt, ctx) → writes bones;
                          owns stateMachine + RecoilRig + blend buffer;
                          getWorldMotion()? (returns nothing — root motion is
                          BattleCanvas's; here only for future use)
```

### 3.2 Animation state set

```
IDLE  IDLE_ALERT  WALK  RUN  READY
ATTACK (→ peck_attack | quick_kick | heavy_kick | wing_strike | jump_attack
          | flying_kick | double_kick | charge_attack)
RECOVERY
HIT_LIGHT  HIT_MEDIUM  HIT_HEAVY  HIT_CRITICAL
STAGGER  STAGGER_HEAVY  KNOCKBACK  KNOCKDOWN  GETUP
DEATH  VICTORY  DEFEAT  TAUNT
```

State machine rules (enforced in `stateMachine.ts`):

- `DEATH` is terminal — no transition out; additive breathing layer disabled.
- `KNOCKDOWN → GETUP → READY` only; `KNOCKDOWN` cannot go straight to any
  `ATTACK` or `WALK`.
- An `ATTACK` in progress cannot be overwritten by `WALK` / `IDLE` / `READY`
  (lower priority) — only by a `HIT_*` / `KNOCKDOWN` / `DEATH` (backend said
  the attacker got interrupted).
- `HIT_*` and `STAGGER*` outrank `IDLE` / `WALK` / `READY`.
- Priority order (low→high): `IDLE < WALK < RUN < IDLE_ALERT/READY <
  RECOVERY < TAUNT < VICTORY/DEFEAT < ATTACK < HIT_LIGHT < HIT_MEDIUM <
  STAGGER < HIT_HEAVY < STAGGER_HEAVY < KNOCKBACK < HIT_CRITICAL <
  KNOCKDOWN < GETUP < DEATH`.
- Same or lower priority than current, and current not finished → request
  rejected (returns false; caller keeps whatever it had).
- Every accepted transition blends: `transitionDur` = 120 ms
  (IDLE↔READY), 80 ms (into HIT_*), 200 ms (into GETUP / out of KNOCKDOWN),
  0 ms only for DEATH-from-already-collapsed.

### 3.3 Blending

On `request` accept, the controller snapshots the **current fully-resolved
bone pose** (post-layers) into a buffer, then for `transitionT` seconds
`slerp`s each bone from buffer → new base pose using `smoothstep(transitionT)`.
Additive layers are applied *after* the blend so recoil/breathing never pop.

## 4. Animation implementations (curve sketches)

All functions take `t` ∈ [0,1] and return a `BonePose` of **local-space
deltas from rest** (added to rest quaternion via `rest * delta`). Amplitudes
below are pre-gain; each is multiplied by the relevant `AnimationGains` field.

### 4.1 IDLE (`duration` ∞, `loop`)
- Chest: breathing `pos.y += bell(oscillate(t,0.25)) * 0.012 * bob`; tiny
  `rot.x` expand/contract on the same clock.
- Neck: `rot.x = sin(2πt·0.4)·0.03 + sin(2πt·0.13)·0.02` (two detuned
  freqs → non-repeating feel over the loop window).
- Head: independent `rot.y = sin(2πt·0.31 + 1.7)·0.05`, occasional
  `rot.x` dip when `sin` crosses a threshold (a "glance down").
- Tail: `rot.x = sin(2πt·0.2)·0.04`.
- Wings: `rot.z = ±(0.02 + sin(2πt·0.5)·0.015)` — barely-there balance.
- Weight shift: `Hips.rot.z = sin(2πt·0.17)·0.02`, `Hips.pos.x` matched so
  the shift reads as weight, not a lean. Seamless because every term is a
  whole-cycle sinusoid over the loop period.

### 4.2 READY / IDLE_ALERT (`duration` ∞, `loop`)
Neutral **combat** stance, target-facing:
- Chest `rot.x = -0.12` (raised/puffed), `Spine.rot.x = -0.06`.
- Hips `pos.y = -0.03` (body lowered), Thigh `rot.x = 0.10` both (slight
  crouch), Shank `rot.x` compensates so feet stay planted.
- Neck forward+down `rot.x = 0.14`, Head `rot.x = -0.06` (eyes up at
  opponent), `rot.y` toward opponent from head-tracking layer.
- Wings `rot.z = ±0.10` held slightly off the body.
- Breathing layer still active at reduced amplitude.

### 4.3 WALK (`duration` ~0.6 s / cycle, `loop`) — decision 3
Controller derives planar velocity `v` from `FighterAnim.offsetX/offsetZ`
deltas (finite difference, low-pass filtered). `|v|` above `WALK_MIN` →
overlay WALK on top of IDLE base; above `RUN_MIN` → RUN. Cycle phase advances
by `|v| * strideGain * dt` (not wall-clock) so foot speed matches travel and
feet visually stick.
- Legs in anti-phase: `ThighL.rot.x = sin(2πφ)·0.5`,
  `ThighR.rot.x = sin(2πφ+π)·0.5`; knees (`Shank.rot.x`) bend on the swing
  half (`max(0, -cos(2πφ))·0.7`) and straighten on stance; `Foot.rot.x`
  keeps the sole parallel to ground through stance (planted).
- Body bob: `Hips.pos.y = -abs(sin(2πφ))·0.02` (down on each footfall).
- Hip yaw/roll counter-rotation `Hips.rot.y = sin(2πφ)·0.04`.
- Head stabilization: `Head.rot` counter to `Hips` bob/yaw so the head
  glides level.
- Wing counterbalance: `Wing.rot.z` small anti-phase to the leading leg.
- Tail: slow `rot.x`/`rot.y` sway lagging the hips (see tail balance layer).

### 4.4 RUN (`duration` ~0.38 s / cycle, `loop`)
Same structure, bigger: thigh amplitude `0.8`, deeper knee bend, forward
`Spine.rot.x = 0.12` lean, stronger bob, wings held out for balance
(`rot.z = ±0.25`), tail streamed back, head still stabilized. Clearly
distinct from walk.

### 4.5 PECK_ATTACK (`duration` 0.55 s)
| t | pose |
|---|---|
| 0.00–0.25 windup | Neck `rot.x -= 0.35·easeOut` (pull head back/up), Chest `rot.x -= 0.06`, weight forward `Hips.pos` toward target |
| 0.25–0.55 thrust | Neck `rot.x += 0.9`, Head `rot.x += 0.3`, accelerating via `easeIn`; Chest dips `rot.x += 0.15`; head position peaks at t≈0.5 (contact) |
| 0.55–0.75 recoil | Head snaps back `lerpAngle` with overshoot (`easeOutBack`) |
| 0.75–1.00 recover | `smoothstep` back to READY pose |
Head speed profile: `easeIn` toward target, `easeOut` after — accelerate in,
decelerate out.

### 4.6 QUICK_KICK (`duration` 0.7 s)
Weight shift → support leg (`ThighL`+`ShankL`) bends `rot.x += 0.3` → attack
leg (`ThighR`) raises `rot.x -= 0.4` then extends (`ShankR.rot.x → straight`)
at t≈0.55 (impact) → retract → recover. Chest `rot.x` small forward, Tail
raises `rot.x += 0.25` as counterbalance, Wings flare opposite the kick
(`WingL.rot.z += 0.4`, `WingR` less) to counterbalance.

### 4.7 HEAVY_KICK (`duration` 1.1 s) — must differ hard from quick_kick
Large readable windup:
| phase | t | pose |
|---|---|---|
| load | 0.00–0.30 | deep weight shift onto support leg (`ThighL.rot.x += 0.5`, `ShankL` deep bend, `Hips.pos.y -= 0.05`); body **rotates away** `Hips.rot.y -= 0.35` winding up; Neck+Head track target through the turn; Tail fans `rot.x += 0.4`; both wings sweep back `rot.z` |
| release | 0.30–0.62 | body unwinds `Hips.rot.y += 0.7` (whip), attack leg `ThighR.rot.x -= 0.8` huge extension, `ShankR` snaps straight; Chest drives forward `Spine.rot.x += 0.2` |
| impact | 0.62–0.70 | full extension, `Spine`/`Hips` follow-through past neutral, wings thrown forward for the follow-through |
| recoil | 0.70–0.82 | spring-back overshoot on Hips yaw + attack leg |
| recover | 0.82–1.00 | `smoothstep` to READY |
Whole body visibly behind it: `Hips`, `Spine`, `Chest`, `Neck`, `Head`,
`ThighL/R`, `ShankL/R`, `WingL/R`, `Tail` all move.

### 4.8 WING_STRIKE (`duration` 0.6 s)
Wings **asymmetric**: strike wing (`WingR`) opens wide `rot.z += 1.1` and
`rot.y` forward, off-wing (`WingL`) tucks `rot.z -= 0.3` for balance. Torso
rotates `Hips.rot.y` into the swing, wing accelerates through t≈0.5
(contact), follow-through past the body, then both wings recover to READY.
Neck/Head lead the rotation, Tail counter-rotates.

### 4.9 JUMP_ATTACK (`duration` 0.8 s)
Crouch (Thigh+Shank compress) → launch (legs extend, `FighterAnim.offsetY`
rises — **root motion owned by BattleCanvas**, controller only poses the
legs/body for the launch) → attack pose airborne (legs tuck then strike,
wings spread, Chest `rot.x` forward) → airborne recoil → descend → landing
(legs absorb, deep knee bend, `Hips.pos.y` dip) → recover. `roll`/`yaw`
read from `FighterAnim`; bones never bake world position.

### 4.10 FLYING_KICK (`duration` 0.95 s) — more dramatic than jump_attack
Deeper crouch, bigger `Spine` rotation, both legs extend together in the air
(superman kick), stronger wing spread, tail streamed, Head tucked then
snapped toward target on impact. `FighterAnim.roll` carries an airborne
rotation; controller poses a full-body line (legs–spine–neck straight) at
extension. Landing is a hard single-leg plant with a knee-bend absorb.

### 4.11 DOUBLE_KICK (`duration` 0.9 s)
Kick 1 (t 0.0–0.4, `ThighR`) → weight transfer + `Hips.rot.y` reorient
(t 0.4–0.55) → kick 2 (t 0.55–0.85, `ThighL`, **different body
orientation**) → recover. Two distinct `bell`-shaped extension curves on
opposite legs with a hip yaw flip between.

### 4.12 CHARGE_ATTACK (`duration` 0.85 s)
Prep (body lowers, `Spine.rot.x += 0.15` forward lean) → accelerate
(`FighterAnim.offsetX` carries the charge; controller poses a low driving
run — deep thigh drive, head down, wings tight) → attack (rise, wings throw
forward, Chest slam `rot.x`) → follow-through → recover.

### 4.13 Hit reactions

`hitLight` (0.28 s): Head `rot.x/y` recoil `bell`·0.25, Chest `rot.x` recoil
0.08, one Wing twitch, `smoothstep` recover.

`hitMedium` (0.42 s): Head recoil 0.5 + `rot.y` twist, Neck rotates, `Hips.
rot.y` body rotation 0.15, both wings react, weight shift onto back foot,
recover with a small settle overshoot.

`hitHeavy` (0.55 s): Head **snaps** back (`easeIn` then spring) 0.9, Neck
recoils, `Spine`+`Hips` rotate 0.3, wings spread wide, support leg
destabilizes (`Shank` buckle then catch), body leans off-axis, delayed
`smoothstep` recover. Feeds `RecoilRig.addHit` for the settle.

`hitCritical` (0.7 s): everything in hitHeavy larger — Head recoil 1.2,
`Spine`/`Hips` 0.5, full wing spread, one leg lifts (balance loss), long
delayed recover; if the backend outcome for this entry is a KO the state
machine will already have routed to `DEATH` instead.

### 4.14 STAGGER (0.6 s) / STAGGER_HEAVY (0.9 s)
Genuine balance recovery, not a single tilt:
impact tilt → over-correction the other way → a **corrective step**
(one thigh swings out and plants, `Hips.pos.x` shifts over it) → wings spread
for balance → head counter-rotates to stabilize → settle back to READY with a
decaying `Spring` wobble on `Hips.rot.z`. STAGGER_HEAVY adds a second
corrective step and a deeper wobble. World-space displacement (if any) is
Rapier's via `applyKnockback("stumble")`; this state only poses the body's
fight to stay upright.

### 4.15 KNOCKBACK (0.5 s)
Body reaction only — Rapier owns the world displacement. Torso recoil
(`Spine.rot.x` back), Head recoil, wings spread, one leg braces back
(`ThighR.rot.x` back + `Shank` plant), then `Spring` recovery on torso and
neck back to READY.

### 4.16 KNOCKDOWN (0.9 s in) — decision 4
Non-fatal: `applyKnockback("knockdown")` already topples the Rapier body and
auto-rights it after ~1300 ms. The controller plays the **limb** story on top
of the toppling body: balance lost (arms/wings flail out), legs collapse
(thighs fold under, shanks tuck), wings splay to break the fall, Head/Neck
whip then go slack, settle. Ends in a stable grounded pose held until `GETUP`
is requested (when the physics body finishes righting).

### 4.17 GETUP (0.8 s)
From the grounded pose: wings push against ground (`Wing.rot.z` down-and-out),
one leg gathers under the body (`ThighR` folds in, `Foot` plants), torso
rises (`Spine.rot.x` from folded → upright via `easeOut`), second leg pushes
up, small over-balance forward then catch, resolve into READY. Never snaps.

### 4.18 DEATH (1.0 s) — decision 4
On the KO entry `BattleCanvas` sets `animIntent.fatal = true`. Controller:
(a) tells `ChickenPhysicsRig` (new handle method) to topple **and not
schedule the upright recovery**; (b) plays a limp collapse — final flinch,
legs give out (thighs go slack toward rest-minus, no bracing), wings fall
open loosely, Neck/Head drop, everything eases to a slack pose with **no
spring return**. Breathing layer is disabled for `DEATH`. State is terminal;
Rapier's body keeps the final resting position/orientation.

### 4.19 VICTORY (loop) / DEFEAT (loop)
`victory`: stand tall — Chest `rot.x -= 0.2`, Spine straighten, Head/Neck
raise `rot.x -= 0.25`, wings half-spread `rot.z = ±0.4`, Tail fanned high;
then a looping proud idle (slow chest heave, small head bob, occasional
wing shuffle).
`defeat`: Head lowers `rot.x += 0.35`, Chest drops `rot.x += 0.15`, Spine
slumps, wings relax fully to the body/slightly drooped, Tail down; subdued
looping breathing.

### 4.20 TAUNT (0.9 s, then hold/loop)
Chest puff (`rot.x -= 0.25`), two sharp head bobs (`Head.rot.x` `bell`
pair), a wing display flare (asymmetric, `WingR` wide), a quick body shake
(`Hips.rot.z` fast decaying oscillation), settle into a proud `READY`.

## 5. Additive procedural layers (`layers.ts`)

Applied every frame **after** the base/blend pose, in this order:

1. **Breathing** — always on when `state !== DEATH`. `Chest.pos.y` +
   `Chest.rot.x` on a slow `oscillate`, amplitude `× gains.bob`, reduced
   during ATTACK/HIT states so it doesn't fight them.
2. **Head tracking** — `Neck.rot.y` + `Head.rot.y` (split ~40/60) eased
   toward the opponent's world position (passed as `ctx.opponentPos`), clamped
   to a believable cone (±0.6 rad). Suppressed during KNOCKDOWN/DEATH/GETUP.
   `damp()` toward target so it lags naturally.
3. **Recoil springs** (`RecoilRig`) — a `Spring` per driven bone
   (`Head`, `Neck`, `Spine`, `WingL`, `WingR`, `Tail`). `addHit(dir,
   intensity)` on impact events pushes spring velocity; `apply()` adds the
   spring offset to the pose and steps the springs. Gives organic
   post-impact jitter without keyframes.
4. **Wing balance** — `Wing.rot.z/x` auto-reacts to `Hips`/`Spine` angular
   velocity (finite-difference from last frame), to `FighterAnim.offsetY`
   velocity (landing/launch), and to recoil. Amplitude `× gains.wingForce`.
5. **Tail balance** — `Tail.rot.x/y` lags body yaw/pitch velocity (a
   `damp` chase with a phase delay) and lifts under forward acceleration.
   Amplitude `× gains.tailCounter`.

All layer state (springs, last-frame angles, filtered velocities) lives in
controller instance fields — no allocation in `update()`.

## 6. Spring physics (`math.ts`)

```ts
class Spring {
  constructor(stiffness: number, damping: number, mass = 1) {}
  value = 0; velocity = 0;
  addImpulse(v: number) { this.velocity += v; }
  step(target: number, dt: number): number {
    const f = -this.stiffness * (this.value - target) - this.damping * this.velocity;
    this.velocity += (f / this.mass) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }
}
```

Used for: head recoil, wing recoil, body recovery, tail settle, stagger
wobble, knockdown/hit overshoot. `dt` clamped to ≤ 1/30 s so a frame hitch
can't explode the integrator.

## 7. Physical genetics → animation (`physicalGenetics.ts`)

`deriveAnimationGains(physical: PhysicalBlock)` returns multipliers centered
on 1.0, derived from the raw genes and their ratios (visual only — never
touches combat; `physicalProfile.ts` remains the combat-facing derivation and
is untouched):

| Gain | Formula (sketch) | Effect |
|---|---|---|
| `inertia` | `0.8 + body*0.35` | bigger body → slower attack in/out easing, more follow-through overshoot, heavier landings |
| `headThrow` | `0.7 + neck*0.5` | bigger neck → larger head/neck amplitude in pecks, hits, idle |
| `kickReach` | `0.75 + legs*0.45` | bigger legs → larger thigh/shank extension arcs (silhouette only) |
| `wingForce` | `0.7 + wings*0.5` | bigger wings → stronger wing-strike / balance / flare amplitude |
| `tailCounter` | `0.7 + tail*0.5` | bigger tail → more visible counter-rotation and lag |
| `bob` | `0.85 + body*0.2` | idle/walk vertical bob scale |

`inertia` also scales `transitionDur` slightly (heavier birds blend a touch
slower). Computed once in `ChickenModel` (memoized on `physical`) and passed
into the controller; **does not change `duration` fractions**, only amplitudes
and easing shape, so `IMPACT_AT` still lines up.

## 8. Combat integration (`BattleCanvas`)

`BattleCanvas` stays authoritative. It never invents a hit. On each log entry
it already knows attacker/defender, `moveKind`, `stagger`, `isMiss`,
`isCritical`, and whether `logIndex >= log.length` (final blow). Additions:

- **Turn start** — set attacker `animIntent = { state: attackStateFor(
  moveKind), startedAt: now, speed: 1/windupMult, moveKind, facing }`.
  `attackStateFor`: `peck→peck_attack`, `leg→quick_kick`,
  `spin_kick→heavy_kick`, `wing→wing_strike`, `aerial→flying_kick`,
  `body→charge_attack` (or `jump_attack` when the pose already hops).
  (`double_kick` / plain `jump_attack` remain available for later move-kind
  additions.)
- **Between turns** — if a fighter has planar velocity from the circling
  offsets, controller auto-plays WALK (decision 3); otherwise `IDLE_ALERT`
  (READY). `BattleCanvas` sets `state: "ready"`; the WALK overlay is the
  controller's own call from velocity.
- **`IMPACT_AT`, hit landed** — set defender `animIntent`:
  `isMiss` → leave attacker in its `recovery`, defender stays READY;
  `stagger` `light` → `hit_light`; `medium` → `hit_medium`;
  `stumble` → `stagger`; `heavy` → `hit_heavy`; `knockdown` → `knockdown`;
  plus `isCritical && !fatal` → `hit_critical`.
  If this entry is the KO (`defenderHp <= 0` / final entry) → defender
  `state: "death", fatal: true`; winner → `victory` after a beat; a
  non-KO end-of-log → loser `defeat`.
- **Attacker after its own clip** — controller auto-returns ATTACK →
  `RECOVERY` → `READY` via `duration` end + state machine; `BattleCanvas`
  doesn't need to send `recovery` explicitly but may.
- **`applyKnockback` for `knockdown` when `fatal`** — new param
  `suppressRecovery` so the Rapier body stays toppled for `DEATH`
  (decision 4). `ChickenPhysicsHandle` gains
  `applyKnockback(..., opts?: { suppressRecovery?: boolean })` or a
  dedicated `collapse()` method.

`BattleStage3D` creates `animIntentR1Ref` / `animIntentR2Ref`, passes each
`ChickenPhysicsRig` its intent ref and the **other** fighter's world
position (a stable ref, since fighters sit at fixed X) for head-tracking.
`ChickenPhysicsRig` forwards both to `ChickenModel`.

## 9. `ChickenModel` changes

- After `SkeletonUtils.clone` + `applyProportions` + `applyVisualTraits`,
  walk the bone map and capture `restPose: Map<BoneName, {quat, pos}>`
  (clones, not references).
- Build `const gains = useMemo(() => deriveAnimationGains(physical), [physical])`.
- `const controller = useMemo(() => new ProceduralAnimationController(bones,
  { gains, facing }), [bones, gains])`. (facing updates via a setter, not
  a rebuild.)
- New props: `animIntent?: RefObject<AnimIntent | null>`,
  `opponentPos?: RefObject<THREE.Vector3 | null>`.
- `useFrame((state, delta))`:
  - group transform block — **unchanged** (reads `combatAnim`).
  - if `animIntent`: `controller.setFacing(facing)`;
    if `animIntent.current` changed since last frame →
    `controller.play(intent.state, intent)`;
    build `ctx` (reused object field, not a new literal) with
    `dt = min(delta, 1/30)`, `now`, `fighterAnim`, `opponentPos`,
    `velocity` (from `combatAnim` offset deltas), `gains`;
    `controller.update(ctx)` — writes bones from rest every frame.
  - The old hand-written `WingR/WingL/Head/Thigh/Tail` block is **removed**
    (superseded); the showcase-spin `!combatAnim` branch stays for the
    coop/gallery view (or is also ported — optional, low priority).
- No `useState` in the frame path; no `new` inside `useFrame`.

## 10. Testing

### 10.1 Automated (Node built-in test runner, `lib/__tests__/animation.test.ts`)
Pure functions only — no DOM, no three renderer:
- `math.ts`: `smoothstep(0)=0`, `smoothstep(1)=1`, monotonic; `lerpAngle`
  wraps the short way across ±π; `Spring` settles to target and is stable
  with `dt = 1/30` over 200 steps; `bell(0)=bell(1)=0`, `bell(0.5)=1`.
- `stateMachine.ts`: `DEATH` rejects all outbound requests;
  `KNOCKDOWN → ATTACK` rejected, `KNOCKDOWN → GETUP` accepted;
  `ATTACK` not overridden by `WALK`, is overridden by `HIT_HEAVY`;
  priority ties rejected; `transitionT` runs 0→1 and clamps.
- `physicalGenetics.ts`: all-1 `physical` → all gains ≈ 1.0; larger `neck`
  strictly increases `headThrow`; gains never touch combat types.
- Pose sanity: for each attack fn, `fn(0)` is within ε of an all-zero
  `BonePose` (starts at rest), `fn(1)` is within ε of rest (returns to
  rest), and the impact-fraction frame has the signature bone past a
  threshold (e.g. `heavyKick(0.66).ThighR.rot.x` beyond `-0.5`).
- Controller: feed a scripted intent sequence + fake bones (plain objects
  with `quaternion`/`position` stubs), step `update` 60×, assert no `NaN`
  and that bones are re-written each frame (not accumulating).

### 10.2 Manual in the battle
1. `yarn dev`, open `/battle/<chickenId>` for an owned chicken, click Fight.
2. Watch for each state as the log plays: stance between turns, distinct
   windups per `hitZone` (peck for head/neck, quick kick for legs, heavy
   kick on leg crits, wing strike for wings, flying kick for wing crits),
   defender `hit_light/medium/heavy/critical` matching the floating damage
   tier, `stagger` corrective step on leg-zone stumbles, `knockdown` +
   `getup` on a knockdown that isn't the finish, `death` (toppled, no
   getup) + `victory` on the KO.
3. Force paths for the rough/unreachable states with a scratch route or a
   dev query param (`?anim=taunt` etc.) that plays a named state on a loop
   — added under a dev-only guard, listed in the report.
4. Genetics: compare a max-`body` bird vs a min-`body` bird — heavier one
   should visibly lag/overshoot more. Max-`wings` vs min — wing-strike
   amplitude. Max-`neck` — peck reach.
5. Confirm feet stay planted during the circling (walk overlay) and that
   `applyProportions` scaling is intact (no bone inflation/deflation when
   animation runs).

## 11. Deliverables (final report must cover)

1. Files created / modified.
2. Animation **states** implemented (and which are full vs rough).
3. **Attack** animations implemented.
4. **Hit reaction** animations implemented.
5. **Procedural layers** implemented.
6. How **physical genetics** affect animation (the `gains` table as built).
7. How to **test every animation** in the battle (routes / query params).
8. **Bone-axis limitations** discovered (rest-pose offsets, knee bend
   direction, any bone that introduces cross-axis rotation, clip ranges).
9. Animations **needing further tuning** (the "rough" set + anything that
   reads wrong).
10. Any deviation from this design and why.

## 12. Non-goals

- No authored GLB animation clips, no Blender, no new art assets.
- The animation system never decides combat outcomes — it renders the
  server log.
- Root motion / world displacement stays in `BattleCanvas` + `ChickenPhysicsRig`.
- `physicalProfile.ts` (combat-facing) is not modified.
- Full-quality `walk/run/backstep/strafe/taunt/charge/double_kick/
  flying_kick` polish beyond "reads correctly" is deferred (decision 1).
- The `!combatAnim` coop/gallery showcase spin is out of scope (may be
  ported opportunistically).
```
