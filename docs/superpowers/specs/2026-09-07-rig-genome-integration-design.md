# Rig genome integration — design spec

Date: 2026-09-07
Status: approved for planning

## Context

`public/3d-chicken/rooster_rigged_corrected_symmetry.glb` (23-joint skeleton, 7 materials,
mesh slots) and its reference genome runtime `public/3d-chicken/roosterGenome.ts`
replace the current rooster model (`chicken_rooster.glb`). The reference file is
not imported as a module (matches this repo's convention: `public/3d-chicken/*`
holds reference/demo code that gets *ported* into `lib/` and `components/`, the
same way `chicken_viewer.html`'s pattern shader and proportion logic already
were) — it documents the bone names, trait ranges, and bone-scale math to port.

This expands the current 5-trait physical genome (`body/neck/legs/tail/wings`)
to the rig's full 18-trait genome, replaces one mutation with two closer
matches to the rig's actual mesh slots, adds named breed archetypes ("bloodline
presets"), adds a full 7-material color genome with real inheritance (colors
are currently just randomly picked per bird, never bred), and unifies the hen
onto the same rig via bone-scaling instead of a separate mesh.

Out of scope: no breed-picker UI (breed is auto-assigned at generation), no
new hen geometry (the rig ships one mesh).

## Data model (`lib/types.ts`)

**Physical traits** — `PhysicalTraitKey` expands from 5 to the 18 keys in
`roosterGenome.ts`'s `TRAIT_RANGE`: `scale, bodyGirth, bodyLength, chest,
neckLength, neckThick, headSize, combSize, wattleSize, beakLength, wingSpan,
wingSize, legLength, legThick, footSize, tailLength, tailSpread, tailArc`.
`PHYSICAL_TRAIT_RANGE` is copied in verbatim from `TRAIT_RANGE` (these are the
bone-scale bounds the rig actually tolerates). `PhysicalBlock` stays
`Record<PhysicalTraitKey, number>` — no shape change to the type itself, just
a larger key set, so `inheritPhysicalBlock`/`inheritPhysicalTrait` in
`lib/genetics.ts` need no logic change (they already iterate
`PHYSICAL_TRAIT_KEYS` generically).

**Colors** — `ChickenColorScheme` changes from `{feathers, details, eyes, tail,
pattern, patternColor}` to `{body, hackle, wings, tail, comb, beak, shanks,
pattern, patternColor}`, a 1:1 map onto the rig's 7 real materials
(`M_Feathers, M_Hackle, M_Wing, M_Tail, M_Comb, M_Beak, M_Legs`). `details` and
`eyes` are dropped — neither corresponds to a material this rig has (there is
no `M_Eyes`). `pattern`/`patternColor` are unchanged (shader-based, already
correct).

**Breed** — `Chicken`, `Egg`, and `MarketListing` gain an optional
`breed?: string` field (one of `BREED_IDS` from `lib/breeds.ts`, or unset for
"mixed"). This is a display/flavor tag, independent of `bloodlineId` (which
tracks the actual lineage/family tree and is untouched).

## Mutations (`lib/mutations.ts`)

Remove `extra_toed` (no matching mesh slot on the new rig — its
`EXTRA_TOED` visual effect has nothing to bind to). Add:

- `iron_spurs` → visual effect `IRON_SPURS`, binds to `Mut_Spur_L`/`Mut_Spur_R`.
  Rarity `common`, small `power` buff (~+0.10), matches `extra_toed`'s old
  slot in the rarity/stat-modifier table.
- `extra_wings` → visual effect `EXTRA_WINGS`, binds to `Mut_ExtraWing_L`/`R`.
  Rarity `rare`, small `agility`/`speed` buff (~+0.08 agility), compatible
  with `giant`, incompatible with `two_headed` (visually competes for
  shoulder/neck space).

`two_headed` (→ `Mut_SecondHead`), `albino`, `luminescent`, and `giant`
(→ `Root` scale) are unchanged — they already map correctly.

No data migration needed for mutations: `MutationGenome` is keyed by mutation
id and any existing `extra_toed` entries on old rows simply become inert
(unknown key, ignored by every reader) — acceptable for a dev-stage game.

## Breed archetypes (new `lib/breeds.ts`)

Ports the 5 named presets from `rooster_viewer.html`'s `BREEDS` table —
Texas, Sweater, Asil, Kelso, Hatch — generalized onto the 18-key range as
`BREED_PRESETS: Record<BreedId, { label: string; traits: Partial<Record<PhysicalTraitKey, number>>; colors: Partial<ChickenColorScheme> }>`.
Unlisted traits/colors fall back to the normal random roll.

`generateRandomChicken` gets an optional `breedId`. When unset, it rolls
~60% one of the 5 purebreds (uniform among them) / ~40% "mixed" (no bias,
today's fully-random behavior). A purebred roll blends each of its preset's
specified traits with the normal uniform-random roll (same 0.35–0.65 weighted
blend + noise shape used elsewhere, not a hard override) and merges its preset
colors over the random palette pick; unspecified traits/colors stay fully
random.

Breeding: offspring `breed` = the shared parent breed if both parents match,
else unset ("mixed"). This is computed in the breed route, not in
`lib/genetics.ts` (it's a simple equality check, not a genetic algorithm).

## Color inheritance (`lib/genetics.ts`)

New `inheritColorScheme(father, mother, rng)`, ported from
`roosterGenome.ts`'s `breed()` color-blend logic: for each of the 7 material
colors, lerp father→mother by a random weight, then apply a small random
hue/lightness drift (offsetHSL, same magnitude as the reference: ±0.05 hue,
±0.06 lightness). `pattern` inherits from whichever parent's weight rolled
higher; `patternColor` blends the same way as the 7 materials.

Wired into `app/api/breed/route.ts` (which currently does not set an egg's
colors at all — a gap, since colors are only ever randomly assigned at
gen-0/hatch, never bred) and the hatch route, alongside the existing
`inheritPhysicalBlock`/`inheritMutations`/`inheritStatBlock` calls.

`lib/roosterGenerator.ts`'s `COLOR_PALETTES` (used for gen-0 random birds) is
updated to the new 7-key shape.

## Combat coupling (`lib/physicalProfile.ts`, `lib/combat.ts`)

Two bounded layers, both centralized in `physicalProfile.ts` (keeps
`lib/combat.ts` free of raw trait reads, per the existing "don't let every
dimension directly affect combat" principle documented there):

1. **`resolvePhysicalProfile`** (existing: mass/reach/mobility/stability/
   wingControl/kickPower, read at combat call sites) — richer inputs from the
   18-trait set instead of the old 3 (`body/legs/wings`). E.g. `mass` from a
   `bodyGirth+chest+bodyLength` composite, `kickPower` from
   `legThick+footSize+bodyGirth`, `wingControl` from `wingSpan+wingSize` over
   `chest`. Same `toModifier` 0.85–1.15 cap, same call sites in
   `lib/combat.ts` — no signature change.
2. **New `traitStatModifier(chicken, key: GeneticStatKey): number`** — a
   second bounded (0.85–1.15) modifier computed directly from raw traits,
   mapped onto the 6 `GeneticStatKey`s (closer to `roosterGenome.deriveStats`'s
   direct trait→stat spirit, but re-derived for this game's stat keys rather
   than reused verbatim): `power` from `legThick/footSize/chest`, `speed` from
   `legLength` and inverse `bodyGirth`, `stamina` from `chest/bodyGirth`,
   `defense` from `bodyGirth/wingSpan/neckThick`, `accuracy` from
   `headSize/beakLength/neckLength`, `agility` from `legLength/wingSpan` and
   inverse `bodyGirth`.

`effectiveStat` becomes `base * mutationStatMultiplier(...) *
traitStatModifier(...)` — the existing IV/EV architecture is the unchanged
core; this is an additive direct-trait layer on top, per your "combination of
both" call. Worst-case compound of the two 0.85–1.15 layers is ~0.72–1.32,
within the game's existing swing tolerances (mutation multipliers already
reach similar magnitudes).

## Rendering (`components/chicken3d/ChickenModel.tsx`)

- Both sexes load `rooster_rigged.glb` (`MODEL_PATHS.hen` becomes the same
  path as `rooster`; `chicken_hen.glb`/old `chicken_rooster.glb` are retired).
- `applyProportions` is rewritten against the 18-trait block, porting
  `roosterGenome.ts`'s `worldScales`/`applyGenome` world-scale-with-parent-
  compensation math (covers `Hips/Spine/Chest/Neck/Head/Comb/Wattle/Beak/
  Tail/Tail_Tip/WingL,R(+_Tip)/ThighL,R/ShankL,R/FootL,R` — the full rig, not
  just the 5 groups the old proportions function touched).
- Hen differentiation: when `sex === "hen"`, after the normal genome-driven
  scaling, force `Comb`/`Wattle` scale toward 0 (no crown) and apply a
  hen-specific `Tail`/`Tail_Tip` scale profile (shorter length, flatter arc)
  distinct from the rooster's — same mesh, sex-differentiated pose. This is a
  fixed cosmetic override applied after the genome scale, not a new genetic
  axis (a hen's trait *values* still breed/inherit normally; only the render
  layer clamps her comb/tail differently).
- `applyVisualTraits` mutation-slot mapping updates for `iron_spurs` →
  `Mut_Spur_L/R`, `extra_wings` → `Mut_ExtraWing_L/R` (replacing the old
  `extra_toed` → non-existent-slot mapping).
- Color application updates to the 7-material `ChickenColorScheme` shape
  (`mats["M_Feathers"] = body`, `M_Hackle = hackle`, `M_Wing = wings`,
  `M_Tail = tail`, `M_Comb = comb`, `M_Beak = beak`, `M_Legs = shanks`).

## Animation gains (`lib/animation/physicalGenetics.ts`)

`deriveAnimationGains`'s 6 gain axes (inertia/headThrow/kickReach/wingForce/
tailCounter/bob) are recomputed from composites over the new 18 keys instead
of reading `.body`/`.neck`/`.legs`/`.tail`/`.wings` directly (e.g. `inertia`
from `bodyGirth+chest+bodyLength`, `headThrow` from `neckLength`, `kickReach`
from `legLength`, `wingForce` from `wingSpan+wingSize`, `tailCounter` from
`tailLength+tailArc`). Same clamp bounds (0.7–1.6), same "animation only,
never touches combat" guarantee.

## Persistence migration (`prisma/schema.prisma`)

- `Chicken.physical`, `Egg.physical`, `MarketListing.physical` JSON defaults
  updated to the new 18-key baseline-1 shape.
- `Chicken.colorScheme`, `MarketListing.colorScheme` JSON defaults updated to
  the new 7-material shape.
- Add `breed String?` to `Chicken`, `Egg`, `MarketListing`.
- A Prisma migration backfills existing rows' `physical`/`colorScheme` JSON to
  the new shapes (old data has no meaningful values for the new axes/fields
  anyway, so existing birds reset to baseline-1 physical genetics and a
  default color scheme — acceptable for a dev-stage game with no real users
  to protect).

## Testing

Existing test suites in `lib/__tests__/` cover genetics/breeding/generation/
combat/pedigree with the old 5-trait shape — these get updated fixtures
(`testHelpers.ts`) rather than rewritten logic, since `PHYSICAL_TRAIT_KEYS`-
driven code doesn't change shape. New coverage: `inheritColorScheme`,
`traitStatModifier` bounds, breed archetype rolling (`lib/breeds.ts`), and the
mutation catalog swap (`iron_spurs`/`extra_wings` replacing `extra_toed`).
