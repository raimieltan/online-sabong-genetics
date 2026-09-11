````md
# `/coop` Revamp — Full Design Specification

**Date:** 2026-09-11  
**Status:** Approved for implementation planning  
**Scope:** `/coop` Village mode + Manage mode + shared visual system  
**Primary goal:** Transform `/coop` from a functional roster/debug screen into the player's living stable and primary fighter-management hub.

---

# 1. Vision

The `/coop` page should become the player's **home base**.

It should feel like:

- a living rural fighter stable
- the place where the player's roosters actually reside
- the central hub for checking fighters, eggs, recovery, breeding readiness, and stable status
- a visually memorable environment rather than a database presented over a 3D canvas

The experience should combine:

- **immersive 3D village presentation**
- **fast roster management**
- **clear progression**
- **fighter personality**
- **environmental storytelling**

The two main modes should have distinctly different purposes:

### Village
Immersive, visual, spatial.

> "I want to see my stable and interact with my fighters."

### Manage
Efficient, information-dense, operational.

> "I know what I need to do. Let me manage my roster quickly."

The distinction should no longer feel like:

> 3D view vs spreadsheet view.

---

# 2. Core Design Principles

## 2.1 The coop is a place, not a menu

The environment itself should communicate systems.

Buildings and zones should represent actual game functionality.

Example:

- Incubator building → eggs
- Medical hut → injury/recovery
- Feeding station → nutrition/energy
- Training gate → training
- Main coop → roster
- Arena gate → battles
- Notice board → tournaments/challenges

The player should gradually understand the game world spatially.

---

## 2.2 Fighters are characters, not inventory items

Every rooster should feel like an individual.

The UI should prioritize:

- appearance
- name
- fighting style
- condition
- status
- personality
- performance

Raw numbers should remain available but should not dominate the default view.

---

## 2.3 The 3D environment should be believable

Avoid symmetrical radial layouts.

Avoid:

- circular island arenas
- evenly spaced pedestals
- perfect spokes
- floating gameplay nodes
- static chickens standing forever

Prefer:

- asymmetric paths
- dirt yard
- bamboo fencing
- natural vegetation
- pens and shelters
- uneven terrain
- functional buildings

---

## 2.4 Stylized realism

The visual target is:

> stylized realism with warm rural atmosphere

Not:

> colorful low-poly toy world

And not:

> photorealistic simulation

Use:

- warm golden-hour lighting
- earthy browns
- subdued greens
- long shadows
- atmospheric haze
- natural materials
- subtle environmental animation

---

# 3. 3D Environment Concept

The new `/coop` environment should resemble a **rural Filipino-inspired fighter compound**.

Reference direction:

- bamboo buildings
- thatched/corrugated roofs
- dirt courtyards
- banana trees
- coconut palms
- distant mountains
- rice-field-like background silhouettes
- bamboo fencing
- sacks
- barrels
- water containers
- lanterns
- small pens
- wooden perches

The scene should feel inhabited and maintained.

---

# 4. Environment Layout

The current radial layout should be removed.

Use an irregular compound layout.

Approximate spatial structure:

```text
                 distant mountains
                      sunset


        MAIN COOP / STABLE

     pens              incubator
       \                  /
        \                /

          CENTRAL YARD

 feed station        medical hut

      young area / small pens

              gate
               |
            training
````

Do not make this perfectly symmetrical.

Organic spacing is preferred.

---

# 5. Major 3D Zones

## 5.1 Main Coop / Stable Building

This is the largest structure.

Visual characteristics:

* bamboo/wood construction
* open-air interior
* elevated floor
* multiple visible small pens
* hanging lanterns
* feed sacks
* perches
* small banners
* equipment

This visually represents the player's stable.

Interaction:

Clicking it may open:

* roster
* stable overview
* active fighters

---

## 5.2 Central Yard

The central yard should remain intentionally open.

This is the primary free-roaming space.

Uses:

* idle rooster movement
* visual interaction
* ambient behavior
* selecting fighters
* future stable events

Ground:

* packed dirt
* sparse grass
* footprints
* small pebbles
* subtle mud variation

Do not overcrowd this area.

---

## 5.3 Incubator / Nesting Shed

Dedicated building for eggs.

Should visibly contain:

* nests
* eggs
* baskets
* straw
* small lantern
* shelves

Eggs should physically appear inside this area.

Clicking the incubator should:

1. smoothly move/focus camera
2. highlight the building
3. open incubator UI
4. show real available eggs

Avoid immediately opening a disconnected modal if possible.

---

## 5.4 Medical Hut

Small building or hut.

Visual elements:

* medical icon/sign
* cloth wraps
* medicine bottles
* crates
* resting cage/pen
* water bowl

Fighters recovering from injuries can appear nearby.

This creates visual feedback from gameplay state.

---

## 5.5 Feeding Station

Simple outdoor area.

Contains:

* grain sacks
* feeding trays
* water basins
* barrels
* shade cloth

Idle chickens can occasionally move here.

---

## 5.6 Fighter Pens

Remove the current pedestal/cone presentation.

Fighters should instead have small personal areas.

Possible elements:

* dirt patch
* short fence
* small shade cover
* perch
* feeding bowl
* wooden stake
* name plaque

These do not need to be identical.

Slight variation improves personality.

---

## 5.7 Young Chicken Area

Chicks and juveniles should not necessarily stand alongside adult fighters.

Provide:

* smaller fenced area
* lower shelters
* softer ground
* multiple young chickens grouped naturally

This instantly communicates life stage.

---

# 6. Environmental Animation

The scene should always feel slightly alive.

Keep animation subtle.

Possible ambient effects:

* tree leaves moving
* grass movement
* cloth/tarp movement
* lantern flicker
* drifting dust
* insects near feed
* smoke from distant hut
* subtle water movement
* distant birds
* occasional rooster vocalization

Avoid excessive motion.

---

# 7. Chicken Ambient Behavior

Roosters should not stand still forever.

Create a lightweight client-side ambient behavior state machine.

Example:

```text
IDLE
 ↓
LOOK_AROUND
 ↓
WALK
 ↓
PECK
 ↓
SCRATCH
 ↓
PREen
 ↓
DRINK
 ↓
RETURN
```

Possible states:

* idle
* look around
* walk
* peck
* scratch
* drink
* eat
* wing stretch
* preen
* vocalize
* perch
* rest

This does not affect authoritative combat/gameplay state.

---

# 8. Behavior Personality Integration

Personality should subtly affect ambient behavior.

Examples:

## Aggressive

* patrols more
* approaches nearby chickens
* stronger posture
* occasional wing flare

## Cautious

* stays near shelter
* walks less
* reacts strongly to nearby movement

## Confident

* stands taller
* explores more
* uses central yard

## Injured

* slower movement
* spends more time resting
* stays near medical area

## Tired

* lower activity
* sits/rests more often

This makes hidden personality/game data visible.

---

# 9. Active Stable System

Eventually, large rosters will become expensive to render.

The 3D village should not attempt to display every chicken owned by the player.

Introduce:

```text
ACTIVE STABLE
```

Recommended capacity:

```text
6–12 chickens
```

These are the fighters physically represented in the scene.

Other chickens remain in:

```text
RESERVE
```

Manage mode controls which fighters are active.

Benefits:

* predictable rendering cost
* better scene composition
* stronger team-building identity
* less visual clutter

---

# 10. Village Mode UX

Village mode should be the default immersive experience.

The player can:

* click chickens
* inspect buildings
* focus camera
* navigate to related systems
* observe idle behaviors

The majority of the screen should remain the 3D environment.

UI should stay light.

---

# 11. Chicken Selection

Clicking a chicken should:

1. select it
2. slightly highlight it
3. smoothly reposition camera
4. reveal a contextual mini-HUD

Do not immediately cover the screen with a large panel.

Example:

```text
UNTAMED DUKE

Adaptive Counter
Adult · Gen 3

⚡ 92 Energy
♥ Healthy
🏆 8–2

[View Fighter] [Train] [Fight]
```

The HUD can appear:

* near the chicken
* as a bottom overlay
* as a compact right panel

---

# 12. Camera Behavior

Default camera:

* elevated
* angled
* slightly perspective
* limited zoom
* limited pan
* preferably no unrestricted rotation

The camera should feel like a management game camera.

Interactions:

```text
Click chicken
→ camera pushes closer

Click incubator
→ camera moves toward incubator

Click medical hut
→ camera focuses recovery area
```

Closing interaction:

```text
→ camera returns to prior village position
```

Use smooth easing.

Avoid instant teleporting.

---

# 13. Lighting

Target:

```text
Late afternoon / golden hour
```

Use:

* warm directional sunlight
* long shadows
* soft ambient light
* warm lanterns
* cool distant haze

The environment should have more depth than the current dark-green scene.

Avoid overly dark exposure.

Roosters should remain easy to read.

---

# 14. Background / Skybox

Use the generated rural environment concept as visual reference.

Background should suggest:

* Philippine countryside
* mountains
* tropical vegetation
* rice fields / open farmland
* warm sunset

Do not render this entire environment as high-poly geometry.

Use:

* distant low-poly silhouettes
* baked background planes
* skybox
* billboards
* fog

---

# 15. Web Performance Strategy

The game remains a web application.

Performance must remain a priority.

Use:

* LODs
* low-cost background geometry
* baked lighting where possible
* shared materials
* instancing
* frustum culling
* texture atlases
* limited shadows
* shadow casting only for important nearby objects

Only nearby/important objects need expensive rendering.

---

# 16. Rooster Rendering Priorities

Roosters should remain visually dominant.

Environment must not compete with fighters.

Prioritize GPU budget for:

1. rooster models
2. rooster animations
3. shadows under fighters
4. selection effects
5. nearby buildings

Reduce fidelity for distant vegetation/background.

---

# 17. Incubator Redesign

Current flow:

```text
egg card
→ hatch button
```

New flow:

```text
click incubator
→ camera focus
→ inspect physical eggs
→ select egg
→ hatch
```

Egg UI:

```text
EGG #204

Malay × Kelso
Generation 4

Ready to hatch

[Hatch]
```

---

# 18. Hatch Presentation

Hatching should feel rewarding.

Sequence:

```text
egg moves
↓
small cracks
↓
larger crack
↓
shell opens
↓
chick appears
↓
fighter reveal
```

Normal hatch:

* simple warm flash
* name
* generation

Strong IV:

* stronger visual emphasis

Rare mutation:

* distinct reveal
* camera push
* sound cue
* mutation title

Do not overdo effects.

---

# 19. Coop Progression

The stable itself can eventually visually upgrade.

Possible progression:

```text
Tier 1
Backyard Coop

Tier 2
Organized Stable

Tier 3
Professional Fighter Compound

Tier 4
Championship Stable
```

Upgrade changes can affect:

* building quality
* fencing
* lanterns
* decorations
* banners
* capacity
* visible trophies

This makes progression physical.

---

# 20. Header Redesign

Current header looks too much like SaaS navigation.

Shift toward a game HUD.

Example:

```text
RAIMIEL STABLE
Coop Grounds

🐓 5 Fighters
🥚 2 Eggs
💰 1,240
```

Right side:

```text
[Village] [Manage]
[Breed]
[Acquire]
```

Do not expose developer wording like:

```text
Generate Chicken
```

in production.

---

# 21. Village / Manage Toggle

Keep:

```text
[Village] [Manage]
```

But visually integrate it into the game's navigation.

Village selected:

* more immersive
* minimal UI
* 3D environment focus

Manage selected:

* roster overlay / management UI
* environment remains visible or partially blurred

---

# 22. Manage Mode Vision

Manage mode should be a **fighter stable roster screen**, not an admin dashboard.

Main goals:

* inspect roster quickly
* identify who needs attention
* assign actions
* sort/filter fighters
* inspect selected fighter
* manage eggs
* manage active stable

---

# 23. Manage Layout

Desktop structure:

```text
┌─────────────────────────────────────────────────────────┐
│ Stable Header                                           │
└─────────────────────────────────────────────────────────┘

┌────────────────┐ ┌──────────────────────┐ ┌─────────────┐
│ Stable         │ │ Roster               │ │ Selected    │
│ Overview       │ │                      │ │ Fighter     │
│                │ │ Fighter cards        │ │             │
│ Facilities     │ │                      │ │ Actions     │
│ Needs attention│ │                      │ │             │
└────────────────┘ └──────────────────────┘ └─────────────┘
```

---

# 24. Stable Overview Panel

Show only useful information.

Example:

```text
STABLE OVERVIEW

5 Fighters
2 Eggs
3 Battle Ready
1 Recovering
1 Training
```

Optional:

```text
Top Fighter
Untamed Duke
8W – 2L
```

If rankings exist:

```text
Stable Rating
Silver II
```

No placeholder values.

---

# 25. Facilities Panel

Compact shortcuts:

```text
Incubator
2 eggs ready

Medical Hut
1 recovering

Feed Station
All good

Training Grounds
1 fighter training
```

Clicking can either:

* focus the 3D facility
* navigate to system
* open related UI

---

# 26. Needs Attention

Show actionable events only.

Examples:

```text
Bright Queen can mature

Egg #12 is ready to hatch

V3 Test is low on energy

Red Storm finished recovery
```

This helps the player manage the stable without inspecting every fighter.

Do not include fake recommendations.

---

# 27. Fighter Card Redesign

Cards should prioritize the fighter visually.

Approximate card hierarchy:

```text
[ LARGE 3D / PORTRAIT ]

UNTAMED DUKE
Adaptive Counter

Adult · Gen 3

⚡ 92
🏆 8–2
♥ Ready
```

Do not show every stat.

Detailed stats belong in Fighter Detail.

---

# 28. Card Interactions

Desktop:

```text
hover
→ reveal actions
```

Mobile/touch:

```text
tap
→ select card
```

Possible actions:

```text
View
Train
Fight
More
```

Selected card:

* gold border
* slightly stronger lighting
* persistent state

---

# 29. Selected Fighter Panel

Selecting a roster card should not immediately navigate away.

Display a dedicated panel.

Example:

```text
SELECTED FIGHTER

UNTAMED DUKE
Adaptive Counter Fighter

Adult · Gen 3

Energy
92 / 100

Condition
Healthy

Record
8 – 2

Confidence
High

NEXT RECOMMENDATION
Focus on Speed & Accuracy

[View Fighter]

[Train] [Fight]

[More Actions]
```

This enables quick roster management.

---

# 30. Fighter Archetypes

Combat style should be visually prominent.

Examples:

```text
Adaptive Counter
Pressure Fighter
Aggressive Brawler
Endurance Fighter
Balanced Fighter
Technical Fighter
```

Give each a small consistent symbol.

Example:

```text
Counter   ↩
Pressure  >>
Endurance ◈
Aggressive ✦
Balanced  ◉
```

Avoid excessive color coding.

---

# 31. Search

Search field:

```text
Search stable...
```

Search:

* name
* archetype
* possibly lineage

Keep it simple.

---

# 32. Primary Filters

Expose only commonly used filters.

Recommended:

```text
All
Ready
Training
Recovering
Young
```

Less common filters belong under:

```text
Filters
```

Advanced options may include:

* sex
* generation
* lineage
* stage
* mutation
* favorite

---

# 33. Sorting

Recommended options:

```text
Battle Ready
Power
Record
Energy
Age
Generation
Recently Acquired
```

Default:

```text
Battle Ready
```

---

# 34. Card / List Toggle

Support:

```text
Cards
List
```

Cards:

* immersive
* visual
* default

List:

* compact
* efficient for large rosters

List example:

```text
Untamed Duke   Counter     92⚡   8–2   Ready
Bright Queen   Endurance   100⚡  5–1   Ready
V3 Test        Pressure    64⚡   0–1   Training
```

---

# 35. Eggs in Manage Mode

Do not consume the top half of the screen with eggs.

Recommended:

```text
[Fighters 5] [Eggs 2]
```

or show eggs as a facility section.

Egg view can show:

* parent lineage
* generation
* hatch readiness
* incubation progress

---

# 36. Egg Card

Example:

```text
EGG #204

Malay × Kelso
Gen 3

Ready to hatch

[Hatch]
```

Use egg visuals prominently.

---

# 37. Active / Reserve Management

Manage mode should eventually allow:

```text
Set Active
Move to Reserve
```

Active fighters are visible in the 3D Village.

This solves large-roster rendering.

Recommended maximum active:

```text
12
```

Exact number can remain configurable.

---

# 38. Favorites

Allow the player to favorite fighters.

Favorite effect:

* small star icon
* optional sorting priority

Do not overcomplicate.

---

# 39. Batch Actions

Only implement if needed.

Possible future batch actions:

```text
Move to Reserve
Assign Rest
Favorite
Release
```

Do not turn the game into spreadsheet inventory management.

---

# 40. Age-Up UX

Avoid exposing:

```text
Age Up
```

as a generic always-visible button.

If a chicken is ready:

```text
READY TO MATURE
```

Then allow the action contextually.

If age-up is only a development shortcut, remove it entirely outside dev mode.

---

# 41. Dev Controls

Developer-only controls must be clearly separated.

Examples:

```text
Generate Chicken
Instant Age
Reset Energy
Force Hatch
```

These should only exist in dev/debug UI.

Do not allow dev terminology into the production experience.

---

# 42. Manage Background

The Manage screen can retain the 3D stable environment behind the UI.

Recommended:

* background remains live
* camera less interactive
* subtle depth blur
* darker exposure
* UI panels overlay scene

This preserves world continuity.

Do not switch to a flat black page.

---

# 43. Manage Visual Style

Use the same design language as the rest of the game:

* dark translucent panels
* bronze/brown surfaces
* thin warm gold borders
* serif display headings
* clean sans-serif body text
* soft blur
* restrained highlights
* textured surfaces

Avoid:

* generic SaaS cards
* pure black rectangles
* overly bright gold everywhere
* excessive neon
* giant shadows

---

# 44. Responsive Behavior

Desktop:

* 3-column Manage layout

Tablet:

* sidebar collapses
* selected fighter panel becomes drawer

Mobile:

* roster becomes 1-column
* filters become horizontal scroll/chips
* selected fighter becomes bottom sheet
* 3D Village controls simplified

---

# 45. Scene Performance Budget

Village should support:

```text
6–12 visible chickens
```

at stable performance.

Use:

* shared skeleton logic where possible
* animation throttling for distant chickens
* update frequency reduction for off-focus fighters
* LODs
* instancing for props
* static batching

Do not run full AI/pathfinding every frame.

---

# 46. Ambient AI Implementation Direction

Ambient behavior can use simple timed states.

Example:

```ts
type CoopAmbientState =
  | "idle"
  | "walk"
  | "peck"
  | "scratch"
  | "preen"
  | "drink"
  | "eat"
  | "rest"
  | "look"
  | "vocalize";
```

Each chicken can periodically choose a new allowed state.

Decision weighting can use:

* personality
* condition
* energy
* age

No server authority required.

---

# 47. Pathing

Avoid complex navmesh if unnecessary.

Possible implementation:

* predefined walkable polygon
* local waypoint graph
* random destination sampling
* simple obstacle avoidance

Pens can constrain movement ranges.

---

# 48. Interactions and Gameplay State

Visual state should reflect server state.

Examples:

```text
injured
→ appears near medical hut

training
→ absent from coop or marked as away

egg ready
→ incubator visual changes

low energy
→ reduced ambient activity

young
→ appears in juvenile area
```

The environment should communicate actual game state whenever practical.

---

# 49. Navigation Integration

Buildings can act as shortcuts.

Example:

```text
Training Gate
→ /training

Arena / Battle Gate
→ battle selection

Notice Board
→ tournaments/challenges

Incubator
→ egg management

Medical Hut
→ health/recovery

Main Stable
→ Manage
```

The player should feel like they are navigating a place, not only URLs.

---

# 50. Transition Between Coop and Training

Since `/training` now has a more immersive 3D identity, transitions should feel related.

Possible:

```text
Click Training Gate
↓
camera moves toward gate
↓
fade
↓
training environment loads
```

No need for a long cinematic.

A 300–600ms transition is enough.

---

# 51. No Placeholders

Do not display:

* fake stable rankings
* fake recommendations
* fake facility states
* fake tournaments
* fake records
* dummy notifications

If data is unavailable:

remove the element.

Do not show:

```text
Coming Soon
Placeholder
TBD
Lorem ipsum
```

unless explicitly required for development.

---

# 52. Accessibility

All 3D interactions need accessible equivalents.

If a player can click:

```text
Incubator building
```

there should also be an accessible UI action:

```text
Open Incubator
```

Likewise:

* chicken selection
* training
* battle
* medical
* roster

Keyboard navigation should remain possible.

---

# 53. Implementation Priority

## Phase 1 — Environment Rebuild

Implement:

* new asymmetric terrain
* bamboo compound
* main coop
* incubator
* medical hut
* feeding station
* fences
* background environment
* new lighting

Remove:

* radial paths
* circular island feel
* cone/pedestal chicken stations

---

## Phase 2 — Chicken Placement

Implement:

* pen locations
* active stable
* juvenile area
* condition-based positioning

---

## Phase 3 — Ambient Behaviors

Implement:

* idle
* walk
* peck
* scratch
* look
* preen
* rest

Then expand personality weighting.

---

## Phase 4 — Village Interaction

Implement:

* click selection
* camera focus
* mini fighter HUD
* facility selection
* smooth return camera

---

## Phase 5 — Incubator Experience

Implement:

* physical eggs
* camera focus
* hatch interface
* hatch animation
* reveal flow

---

## Phase 6 — Manage UI

Implement:

* stable overview
* roster redesign
* filters
* sorting
* cards/list toggle
* selected fighter panel
* needs attention

---

## Phase 7 — Active / Reserve

Implement:

* active stable selection
* reserve fighters
* render active only
* roster indicators

---

## Phase 8 — Polish

Implement:

* ambient sound
* environmental animation
* minor VFX
* stable upgrades
* transition animations
* accessibility

---

# 54. Acceptance Criteria

The revamp is successful when:

* `/coop` no longer looks like a debug scene
* radial layout is gone
* chickens no longer stand permanently on pedestals
* the stable looks like a believable rural compound
* chickens perform ambient behaviors
* selecting chickens feels cinematic but fast
* incubator feels physically integrated
* Manage is efficient without feeling like admin software
* active/reserve fighters can scale roster size
* fighters remain the visual focus
* environment remains performant on web
* no placeholder content is shown
* the visual language matches the revamped Training/Battle screens

---

# 55. Core Experience Summary

The player should experience `/coop` like this:

```text
Open Coop
↓
See living stable
↓
Roosters move naturally
↓
Notice fighter recovering near medical hut
↓
Click favorite rooster
↓
Camera pushes closer
↓
Inspect status
↓
Send him to training
↓
Return to stable
↓
Notice incubator egg ready
↓
Focus incubator
↓
Hatch new chick
↓
New fighter joins stable
```

And when efficiency matters:

```text
Open Manage
↓
See roster overview
↓
Filter Ready fighters
↓
Select rooster
↓
Inspect condition
↓
Train / Fight / Manage
```

The goal is to make the coop feel like:

> **the player's actual stable**

rather than:

> **the page where chicken records are listed.**

```

This is the spec I'd hand directly to Codex for the full `/coop` rebuild. It incorporates the new 3D compound, ambient chicken behaviors, incubator flow, active/reserve system, and the redesigned Manage experience. 
```
