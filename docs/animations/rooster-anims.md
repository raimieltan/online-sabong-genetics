Implement a full animation pass for `rooster_rigged_rebuilt_skinned_wingfans.glb`.

The rooster now uses a clean symmetrical wing rig:

- `WingL`
  - `WingL_Mid`
    - `WingL_Tip`
- `WingR`
  - `WingR_Mid`
    - `WingR_Tip`

Treat this as the canonical rig. Do not rename bones or change the bind pose.

Goal: make combat animation feel violent, weighty, cinematic, and rooster-like rather than floaty or like generic bird flight.

## Core wing animation rules

Do NOT animate the wings as simple synchronized up/down rotations.

Each flap should use the whole 3-bone chain:

- `WingL` / `WingR` = large shoulder/primary stroke
- `Wing*_Mid` = folding, cupping, and snap
- `Wing*_Tip` = delayed trailing whip

Use overlapping motion:
1. shoulder starts
2. mid follows slightly later
3. tip follows last
4. on reversal, tip should overshoot slightly before settling

Avoid perfectly symmetrical wing timing during combat.

Offset left/right wing timing by roughly 20–60 ms during intense motions so the rooster feels unstable and alive.

## Body reaction

Every hard flap must influence the rest of the body.

Coordinate wing strokes with:
- `Chest` roll/pitch
- `Spine` compression/extension
- `Hips` balance shift
- `Neck` retract/extend
- `Head` target stabilization
- `Tail` counterbalance
- legs tucking/extending during aerial attacks

Do not let the torso remain static while the wings move.

Use small torso motion rather than exaggerated cartoon movement.

## Animation style

Target realistic rooster combat behavior:

`stalk -> circle -> burst forward -> clash -> frantic multi-hit exchange -> disengage -> recover`

Clashes should be short, chaotic, and intense.

During a clash:
- wings open aggressively
- multiple rapid flap beats may occur
- birds may flap asynchronously
- torso rotates slightly from impacts
- legs kick/scratch independently
- neck/head continue tracking the opponent
- wings should help sell balance and impact, not just flight

## Specific animations to improve/build

Prioritize:

### `idle`
Very subtle breathing, micro head motion, occasional wing adjustment.

### `stalk`
Wings mostly folded.
Small shoulder tension.
Body slightly lowered.
Head remains focused on opponent.

### `circle`
Subtle asymmetric wing balancing during directional changes.
Do not visibly flap unless balance requires it.

### `dash`
Wings partially open near acceleration.
Very short backward wing sweep.
Body leans forward.

### `jump_attack`
Strong wing opening immediately after launch.
1–2 powerful flap strokes.
Legs tuck then extend toward opponent.

### `air_clash`
Most important animation.

Make it violent:
- rapid shoulder strokes
- mid-wing folding
- delayed tip whip
- asymmetric L/R timing
- chest rotation
- small vertical oscillation
- kicks and wing movement can overlap
- avoid both birds performing identical synchronized loops

This should look like an unstable aerial struggle, not two birds hovering.

### `wing_strike`
One side becomes dominant.
Attack-side wing opens and drives through target.
Opposite wing counterbalances.
Chest rotates into strike.

### `kick`
Wings spread for balance.
Opposite wing can lead slightly.
Torso recoils from leg extension.

### `stagger`
One wing may flare automatically for balance.
Short reactive motion, not a full flap cycle.

### `knockback`
Wings abruptly open to stabilize.
Body moves first, wings react slightly afterward.

### `knockdown`
Wings spread irregularly before ground impact.
Avoid symmetrical posing.

### `get_up`
Use wings as support/balance during recovery.

### `KO`
Wings lose tension and settle naturally.
No looping flap.

## Timing and feel

Avoid linear animation.

Use:
- ease-in / ease-out where appropriate
- fast acceleration for strikes
- brief overshoot
- delayed secondary motion
- stronger downstroke than recovery stroke

Hard combat flaps should feel closer to:

`SNAP -> DRIVE -> WHIP -> RECOVER`

rather than:

`up -> down -> up -> down`

For major flap beats, keep the primary force phase very short and sharp.

## Important technical requirement

The animation system must support additive procedural wing motion layered on top of base animations.

Example:
- base animation = `air_clash`
- procedural layer = wing flap intensity
- procedural layer = hit recoil
- procedural layer = balance correction

Do not overwrite the entire pose for every effect.

Use bone-local additive offsets where possible.

## Intensity parameter

Create a reusable wing flap intensity control:

```ts
wingFlapIntensity: 0..1
