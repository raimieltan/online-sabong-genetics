# 3D Coop Village — Implementation Specification

## Objective

Replace the current 2D/grid-based Coop experience with a **3D living chicken village**, inspired by the feel of games like Dragon City.

The Coop should become the player's primary home/hub where their chickens physically live.

The player should be able to open the Coop and immediately see their actual chickens walking around their individual huts/roosts.

This is NOT simply a 3D background behind the existing ChickenCards.

The 3D village is the primary Coop experience.

The existing chicken management functionality must remain available through contextual UI.

---

# 1. Core Experience

The Coop should feel like:

> "This is where my chickens live."

Instead of:

> "This is a list of chickens."

The player enters a small stylized 3D chicken village containing:

* Chicken huts / teepees
* Chickens
* Grass / dirt
* Trees
* Rocks
* Small environmental decorations
* Paths
* Central gathering area
* Optional training/breeding/champion areas

The environment should be a compact **diorama**, not an open-world game.

The camera should show the village from an attractive elevated/isometric 3/4 perspective.

---

# 2. Reuse Existing Chicken Rendering

CRITICAL:

Do NOT create a second chicken rendering system.

The project already has:

* Chicken 3D models
* Physical genetics
* Visual trait resolution
* Body-part scaling
* Mutation rendering
* Existing ChickenModel / 3D rendering infrastructure
* Existing battle 3D infrastructure

Reuse the existing chicken rendering pipeline.

The Coop chicken must visually reflect the same physical genetics as the chicken everywhere else.

If a chicken has:

* Large body
* Long legs
* Large wings
* Special colors
* Mutations
* Two heads
* Extra toes
* Other physical traits

those traits must be visible in the Coop.

The Coop is one of the places where physical genetics should be visually communicated.

---

# 3. Coop Scene Architecture

Create a dedicated 3D Coop scene.

Suggested structure:

```tsx
<CoopPage>
  <CoopHUD />

  <CoopWorld3D>
    <CoopEnvironment />

    <CoopHabitat
      chicken={chicken}
    >
      <ChickenModel
        chicken={chicken}
      />
    </CoopHabitat>

    ...
  </CoopWorld3D>

  <ChickenInteractionPanel />

</CoopPage>
```

Adapt the architecture to the existing project conventions rather than blindly following these component names.

Keep the scene modular.

Suggested components:

```text
components/
  chicken3d/
    CoopWorld.tsx
    CoopEnvironment.tsx
    CoopHabitat.tsx
    CoopChicken.tsx
    CoopCamera.tsx
    CoopDecorations.tsx
```

Only create components that are actually necessary.

---

# 4. Chicken Habitats

Each active chicken should have a physical location in the village.

Each chicken gets:

* A hut / teepee / roost
* A small personal area
* A chicken model
* Idle behavior

Example:

```text
       🐔
       ↓
   ┌─────────┐
   │   ⛺    │
   │  HUT    │
   └─────────┘
```

The chicken should not permanently stand inside the hut.

It should move between:

* Hut
* Personal area
* Nearby path
* Village area

The hut represents the chicken's home.

---

# 5. Village Layout

Start with a compact fixed layout.

Do NOT implement procedural infinite terrain.

Example:

```text
              🌳

       ⛺              ⛺
       🐔              🐔


              🏆
        CENTRAL ROOST


       🐔              🐔
       ⛺              ⛺

             🔥

       🌾          🌾
```

The layout should support expansion later.

The initial implementation should support approximately:

* 8–12 visible chickens comfortably

but the architecture should not hard-code this limit.

Use deterministic placement based on chicken ID or slot.

Do not randomly reposition chickens every render.

---

# 6. Camera

Create a dedicated Coop camera.

Desired feeling:

* Elevated
* 3/4/isometric-ish
* Slightly angled downward
* Comfortable viewing distance
* Similar presentation philosophy to Dragon City

The player should be able to:

* Pan
* Rotate
* Zoom

but keep the controls simple.

Avoid making it feel like a full 3D editor.

Suggested constraints:

```text
Rotation:
360° or a controlled range

Zoom:
reasonable minimum/maximum distance

Vertical angle:
limited to prevent awkward views
```

The camera should smoothly interpolate rather than snap when selecting a chicken.

---

# 7. Chicken Idle AI

The chickens should feel alive.

Do NOT implement complex AI.

Use lightweight state-based idle behavior.

Example states:

```text
IDLE
WALKING
PECKING
LOOKING_AROUND
RESTING
RETURNING_HOME
```

Basic loop:

```text
IDLE
 ↓
walk somewhere nearby
 ↓
PECK
 ↓
LOOK_AROUND
 ↓
WALK
 ↓
REST
 ↓
repeat
```

Each chicken should have slight randomness so all chickens don't perform the exact same animation at the exact same time.

Use deterministic/randomized offsets where appropriate.

Avoid expensive per-frame AI calculations.

---

# 8. Personality

Where possible, use chicken stats/traits to influence behavior.

Examples:

High energy:

* More movement
* Less resting

Aggressive:

* More strutting
* More wing-flapping
* More pacing

Low energy:

* More resting

Champion:

* More confident idle behavior

Do not create a complicated personality system yet.

A lightweight modifier system is enough.

---

# 9. Chicken Selection

Clicking/tapping a chicken should select it.

When selected:

1. Camera smoothly moves toward the chicken.
2. Chicken becomes visually highlighted.
3. A small UI panel appears.

Example:

```text
┌─────────────────────┐
│ 🐓 THUNDER          │
│                     │
│ Gen 4               │
│ ⭐ Champion         │
│                     │
│ STR   82            │
│ SPD   91            │
│                     │
│ [View] [Train]      │
│ [Battle] [Breed]    │
└─────────────────────┘
```

Do not duplicate the entire ChickenCard.

The selection panel should be compact.

---

# 10. Chicken Actions

The selected chicken should expose shortcuts to existing systems.

Actions:

### View

Open the existing detailed chicken/profile view.

### Train

Navigate to the existing training system.

### Battle

Navigate to battle/chicken selection.

### Breed

Open the breeding flow with this chicken preselected.

Do not rebuild these systems.

Integrate with the existing routes/components.

---

# 11. Visual Feedback

Selected chickens should have subtle visual feedback.

Possible effects:

* Soft ground ring
* Small highlight
* Floating name
* Slight camera focus
* Small interaction marker

Do NOT use giant UI outlines.

The visual language should feel like a creature-collection game.

---

# 12. Chicken Names

When selected, show the chicken's name.

Optionally show a small floating nameplate above the chicken:

```text
        Thunder
           ↓
          🐔
```

Nameplates should normally remain hidden unless:

* Chicken is selected
* Player is hovering
* Player is interacting

Avoid filling the entire village with text.

---

# 13. Hut Variations

Implement a basic hut first.

Architecture should allow hut appearance to vary later.

Potential future variations:

```text
Common Hut
Rare Hut
Champion Hut
Mutation Hut
Veteran Hut
Legendary Hut
```

Do NOT over-engineer this now.

Create a simple data-driven property such as:

```ts
habitatStyle
```

or equivalent.

---

# 14. Champion/Veteran Presentation

The user's important chickens should eventually feel important.

Support visual hooks for:

* Champions
* Retired chickens
* High-generation chickens
* Rare mutations
* Special bloodlines

For the initial implementation, Champion chickens can receive:

* Special hut decoration
* Trophy
* Different idle behavior
* Small visual indicator

Do not create an entire trophy system if one does not already exist.

Use existing chicken data where possible.

---

# 15. Eggs

The existing Coop currently displays eggs.

Keep egg functionality.

Instead of rendering eggs only as cards, eventually represent them physically in the village.

For the first implementation:

* Keep the egg count in the HUD.
* Provide an egg/incubator area in the village.
* Clicking the egg area can open the existing egg UI.
* Preserve existing Hatch functionality.

Do not break:

```text
POST /api/eggs/:eggId/hatch
```

---

# 16. Existing API Functionality

Preserve all existing functionality:

```text
GET /api/chickens
GET /api/eggs

POST /api/chickens

POST /api/eggs/:eggId/hatch

POST /api/chickens/:chickenId/age-up

POST /api/chickens/:chickenId/retire
```

The 3D Coop is primarily a presentation/interaction layer.

Do not move game logic into the client.

Server remains authoritative.

---

# 17. Age Up

The existing Age Up action must remain accessible.

It can appear inside the selected chicken panel.

Example:

```text
[Age Up]
```

After successful age-up:

* Update local chicken state
* Re-render its physical appearance
* Recalculate visual traits through the existing system

The chicken should visibly change if its physical profile changes.

---

# 18. Retire

Retirement must remain available.

After retirement:

* Update the chicken state
* Remove it from the active chicken area if appropriate
* Preserve the chicken's historical identity

Do NOT delete the chicken.

Retired chickens should eventually be able to have a dedicated veteran/champion area.

For now, implement the cleanest behavior consistent with the existing data model.

---

# 19. Filters

The existing:

```tsx
<CoopFilters />
```

should NOT necessarily dominate the main screen anymore.

The 3D village is now the primary view.

Move filters into a secondary UI such as:

```text
[Village] [Manage]
```

or:

```text
⚙ Manage Chickens
```

The Manage view can retain:

* Search
* Sex filter
* Generation filter
* Mutation filter
* Stats
* Other existing filters

Do not remove existing filtering functionality.

---

# 20. Village / Manage Toggle

Implement two modes:

```text
[VILLAGE] [MANAGE]
```

### Village

Primary 3D experience.

### Manage

Existing grid/card-based chicken management.

This gives advanced users an efficient way to manage large collections while keeping the immersive village as the default.

---

# 21. Performance

This is important.

The Coop may eventually contain many chickens.

Do not create unnecessarily expensive React state updates every frame.

Avoid:

* React state updates inside useFrame
* Re-rendering the entire Coop every animation frame
* Heavy physics for idle chickens
* Complex pathfinding
* Individual expensive effects on every chicken

Prefer:

* Three.js refs
* Lightweight animation state
* Instancing where appropriate
* Simple collision boundaries
* Frustum culling
* Reusable geometries/materials
* Existing optimized model loading

The initial version should prioritize correctness and visual quality, but the architecture must not obviously prevent scaling.

---

# 22. Environment Style

Use the existing game's visual identity.

The village should feel:

* Warm
* Rustic
* Slightly fantasy
* Charming
* Stylized
* Premium rather than childish

Suggested environment:

* Dirt paths
* Grass
* Wooden fences
* Small rocks
* Trees
* Bushes
* Hay
* Lanterns
* Wooden signs
* Central fire/roost
* Chicken huts

Avoid making it look like a generic farm simulator.

It should have its own recognizable chicken-world identity.

---

# 23. Lighting

Use attractive 3D lighting.

Suggested:

* Warm key light
* Soft ambient lighting
* Shadows
* Ambient occlusion if performance allows
* Slight atmospheric depth

The chickens need to remain visually readable.

Do not over-darken the scene.

---

# 24. Day/Night Foundation

Do NOT build a complete day/night system yet.

However, structure lighting/environment so that a future system could change:

```text
timeOfDay
```

and modify:

* Lighting
* Sky
* Ambient color
* Chicken behavior

This is future-proofing only.

Do not spend significant implementation time on this now.

---

# 25. UX Principle

The player should understand the village without instructions.

When entering:

```text
🐔 chickens are walking around
⛺ huts indicate homes
🥚 eggs have an obvious location
🏆 champions look special
```

Clicking something should reveal what it does.

Do not add tutorial popups everywhere.

---

# 26. Empty Coop

If the player has no chickens:

Show an inviting empty village.

Example:

```text
       ⛺

    Your coop is empty.

    Hatch or generate
    your first chicken!

       [Get Chicken]
```

Do not show an empty grid.

---

# 27. Loading

Because the Coop uses 3D assets, provide a proper loading state.

Example:

```text
🐔
Preparing your coop...
```

Use the existing 3D loading infrastructure if available.

Avoid blocking the entire application unnecessarily.

---

# 28. Mobile/Responsive

The Coop should work on desktop and mobile.

Desktop:

* Larger village view
* Side interaction panel

Mobile:

* Full-screen village
* Bottom sheet for selected chicken

Example:

```text
        3D VILLAGE

           🐔
        ⛺


────────────────────
 Thunder
 Gen 4

 [Train] [Battle]
 [Breed] [View]
────────────────────
```

Do not allow the UI panel to permanently obscure the chicken.

---

# 29. Keep the Existing Game Systems Intact

This task is primarily about **Coop presentation and interaction**.

Do not rewrite:

* Breeding logic
* Genetics
* Physical profile calculation
* Combat
* Training
* Growth
* Mutation logic
* Chicken generation
* Server APIs

Reuse those systems.

If an existing function already provides the required data, use it.

Do not duplicate business logic.

---

# 30. Implementation Order

Implement in this order:

### Phase 1 — 3D Village

* Create Coop 3D scene
* Camera
* Ground
* Basic environment
* Basic hut
* Render chickens

### Phase 2 — Chicken Behavior

* Idle animation
* Walking
* Pecking
* Resting
* Home area

### Phase 3 — Interaction

* Select chicken
* Camera focus
* Selection indicator
* Chicken information panel

### Phase 4 — Existing Systems

Connect:

* View
* Train
* Battle
* Breed
* Age Up
* Retire

### Phase 5 — Village UX

* Egg area
* Champion presentation
* Better environment
* Hut decoration
* Manage/Village toggle

### Phase 6 — Polish

* Lighting
* Shadows
* Camera smoothing
* Animations
* Hover feedback
* Sound hooks
* Performance optimization

---

# 31. Important Existing-Code Rule

Before implementing, inspect the existing project.

Identify:

* Current ChickenModel implementation
* Current BattleStage3D
* Current 3D scene/camera architecture
* Existing animation system
* Existing physicalProfile system
* Existing Chicken type
* Existing CoopFilters
* Existing ChickenCard
* Existing routing/navigation
* Existing asset loading

Reuse existing infrastructure wherever possible.

Do not create duplicate systems just because this is a new screen.

---

# 32. Acceptance Criteria

The implementation is complete when:

* [ ] Coop opens into a 3D village by default
* [ ] Existing chickens appear as their real 3D models
* [ ] Physical genetics are visible
* [ ] Each active chicken has a hut/home
* [ ] Chickens perform idle behaviors
* [ ] Chickens move around naturally
* [ ] Chickens can be selected
* [ ] Camera focuses selected chickens
* [ ] Selected chicken displays relevant information
* [ ] Train works
* [ ] Battle works
* [ ] Breed works
* [ ] View works
* [ ] Age Up works
* [ ] Retire works
* [ ] Existing egg functionality still works
* [ ] Existing chicken filtering/management remains available
* [ ] Village/Manage modes work
* [ ] Empty coop is handled
* [ ] 3D loading is handled
* [ ] Mobile layout is usable
* [ ] No business logic has been duplicated
* [ ] Existing API contracts remain intact
* [ ] No existing chicken/genetics/combat systems are broken

---

# Final Design Goal

The Coop should make the player think:

> **"These are my chickens, and this is their home."**

not:

> **"These are my chicken records."**

The 3D village should become the emotional center of the game.

Breeding creates chickens.

Training develops them.

Battles give them history.

The Coop is where the player **sees that history come alive.**
