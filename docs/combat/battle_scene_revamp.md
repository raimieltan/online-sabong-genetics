Yep. I’d make this the **visual/presentation specification for the entire battle experience**, separate from your combat-system spec. It assumes your continuous combat state machine, server-authoritative simulation, coaching commands, tells, injuries, momentum, etc. already exist or are being implemented.

Save as `BATTLE_SCENE_REVAMP.md`.

````md
# Battle Scene Revamp — Cinematic Grounded Combat

**Project:** Cockfight Chronicles  
**Status:** Approved for implementation  
**Scope:** Battle presentation, rendering, camera, HUD, coaching UI, VFX, environment, and combat readability  
**Platform:** Web — Next.js + React Three Fiber / Three.js  
**Priority:** Critical — battle is the primary gameplay experience

---

# 1. Goal

Revamp the current battle scene from a stylized/cartoon-like battle viewer into a grounded, cinematic, readable, and highly polished combat experience.

The battle scene is the centerpiece of the game.

Breeding, genetics, physical traits, training, behavioral development, injuries, bloodlines, PvE progression, tournaments, championships, and rivalries ultimately lead here.

The battle must therefore feel substantially more polished than every supporting screen.

The target is NOT photorealism.

Target:

> 70% grounded realism  
> 30% intentional stylization

The game should develop its own visual identity:

> Cinematic rural Filipino realism with slightly stylized characters, physically grounded lighting, earthy materials, dramatic combat presentation, restrained UI, and explosive moments of action.

The browser platform must be treated as a design constraint rather than an excuse for low visual quality.

Spend rendering resources where they matter most:

1. Fighters
2. Lighting and shadows
3. Combat VFX
4. Arena
5. Background/environment

---

# 2. Core Design Principle

The current battle presentation gives roughly equal visual importance to every moment.

This must change.

Combat should have a repeating tension/release rhythm:

```text
READ
  ↓
STALK / CIRCLE
  ↓
COMMIT
  ↓
APPROACH
  ↓
CLASH
  ↓
BREAK / DISENGAGE
  ↓
ASSESS
  ↓
READ
````

Presentation must react to this rhythm.

Neutral moments should feel tense and restrained.

Clashes should feel sudden, fast, chaotic, physical, and significantly more intense than everything surrounding them.

The contrast creates impact.

---

# 3. Non-Goals

Do NOT:

* attempt full photorealism
* replace the entire rooster model immediately
* add excessive permanent HUD elements
* turn combat into a particle-effects showcase
* use constant camera shake
* use constant slow motion
* use constant comic-book text
* make every hit cinematic
* add expensive simulation purely for visuals
* sacrifice combat readability for visual fidelity
* make coaching commands resemble RPG abilities
* make tells expose exact enemy actions
* make the arena visually compete with the fighters
* redesign server-authoritative combat logic as part of this task

This revamp focuses primarily on PRESENTATION.

---

# 4. Visual Direction

## 4.1 Target Style

Use:

* grounded proportions
* physically believable lighting
* earthy colors
* restrained saturation
* warm natural sunlight
* realistic contact shadows
* slightly painterly distant scenery
* detailed foreground materials
* cinematic contrast
* atmospheric depth
* subtle environmental imperfections
* restrained Filipino visual identity

Avoid:

* plastic-looking characters
* flat lighting
* neon UI everywhere
* highly saturated ability colors
* excessive outlines
* comic-book presentation everywhere
* pristine environments
* perfectly clean geometry
* overly bright fighters
* flat/uniform materials

---

# 5. Current Visual Problems

The current scene mixes three visual languages:

### Background

Highly detailed / near-photorealistic rural environment.

### Arena

Stylized clean 3D platform.

### Fighters + UI

Strongly stylized / arcade / comic presentation.

This creates visual separation.

The player should perceive:

> Roosters fighting inside a physical environment.

Not:

> 3D rooster assets placed over a background image.

The revamp must unify these visual layers.

---

# 6. Rendering Strategy

Do NOT chase fidelity through raw polygon count.

Use rendering techniques with high visual impact relative to GPU cost.

Priority:

```text
PBR materials
↓
lighting
↓
shadows
↓
contact grounding
↓
tone mapping
↓
atmosphere
↓
particles
↓
decals
↓
selective post-processing
```

Geometry complexity comes after these.

---

# 7. Lighting Revamp

Lighting is the highest-priority visual improvement.

The fighters currently appear too uniformly illuminated.

They must inherit the environment lighting.

## Required lighting model

Use one primary directional light representing sunlight.

Example conceptual setup:

```text
Warm directional sunlight
+
cooler ambient sky/environment lighting
+
environment map
+
contact shadows
```

Fighters must have visible:

* illuminated side
* shadow side
* self-shadowing
* wing shadows
* tail shadows
* head/body occlusion
* leg shadows
* contact shadows

Avoid illuminating the entire fighter equally.

---

# 8. Environmental Lighting

Use environment lighting to connect:

```text
fighter
arena
background
```

The environment map should approximately match the battle environment.

For the current rural afternoon environment:

* warm sun
* blue sky contribution
* slightly warm terrain bounce
* darker downward-facing surfaces

Avoid environment lighting strong enough to eliminate shadows.

---

# 9. Contact Grounding

Fighters MUST look physically connected to the arena.

Implement:

* contact shadows
* strong foot shadowing
* subtle ambient occlusion
* dirt interaction
* footstep decals where appropriate

Feet must never appear to float.

When fighters move:

```text
foot touches dirt
→
small dust disturbance
→
contact shadow follows
```

During hard acceleration:

```text
foot pushes dirt
→
small dust kick
```

During knockback:

```text
feet scrape
→
directional dirt effect
```

---

# 10. Rooster Material Revamp

Do NOT immediately replace rooster geometry.

Improve material response first.

## Feather materials

Feathers should not read as uniformly smooth colored surfaces.

Use:

* albedo/base color
* roughness
* subtle normal detail
* controlled specular response
* optional lightweight anisotropic approximation

Introduce subtle variation across feather surfaces.

Avoid:

* plastic shine
* completely matte surfaces
* excessive metallic appearance

## Comb / Wattle

Should visually differ from feathers.

Use:

* softer material response
* increased roughness
* subtle normal variation
* slightly different light response

Optional:

Fake a subtle subsurface effect if cheap enough.

Do NOT implement expensive true subsurface scattering.

## Beak / Claws

Use:

* harder surface response
* slightly stronger highlights
* lower roughness than feathers

This creates material separation.

---

# 11. Fighter Color Integration

Existing genetic colors/patterns remain important.

Do NOT allow environmental lighting to destroy genetic readability.

Final appearance should conceptually be:

```text
GENETIC COLOR
×
MATERIAL RESPONSE
×
ENVIRONMENT LIGHTING
```

Never:

```text
GENETIC COLOR
=
UNLIT RGB COLOR
```

Patterns should remain visible while responding naturally to shadows and highlights.

---

# 12. Arena Revamp

The arena currently feels too clean and artificial.

Keep the general arena architecture if desired.

Improve surface storytelling.

Add:

* uneven dirt coloration
* roughness variation
* subtle normal detail
* footprints
* scratches
* worn areas
* compressed soil
* scattered feathers
* minor debris
* dirt accumulation
* railing imperfections
* wood/bamboo variation

The arena should look USED.

---

# 13. Dynamic Arena Wear

The arena may accumulate temporary visual evidence during battle.

Examples:

```text
footprints
dust marks
scrape trails
scattered feathers
impact dirt
```

These do NOT need persistence beyond the battle.

Use decals or lightweight particles rather than modifying geometry.

Set reasonable maximum counts.

Old decals should recycle.

---

# 14. Background Art Direction

The current background is more realistic than the foreground.

Do NOT attempt to bring everything to photorealism.

Instead slightly stylize the background toward:

> cinematic painted realism

Use:

* atmospheric haze
* softened distant details
* restrained saturation
* natural color grading
* depth separation
* subtle environmental motion where possible

Possible subtle background motion:

* clouds
* tree movement
* flags
* smoke
* distant birds
* dust

Do NOT make the background distracting.

---

# 15. Atmospheric Perspective

Distant mountains and terrain should not be as visually sharp as the arena.

Implement atmospheric depth.

Conceptually:

```text
Foreground:
high contrast
high detail

Midground:
moderate contrast

Background:
lower contrast
slight haze
slightly reduced saturation
```

This helps the arena feel physically embedded in the environment.

---

# 16. Color Grading

Target:

* warm highlights
* neutral-to-cool shadows
* earthy browns
* natural greens
* restrained yellows
* moderate contrast

Avoid:

* orange Instagram filter
* excessive saturation
* crushed blacks
* extreme bloom
* washed-out highlights

Use tone mapping appropriate for cinematic PBR rendering.

ACES-style tone mapping is acceptable.

---

# 17. Post Processing

Use post-processing selectively.

Allowed:

* tone mapping
* subtle bloom
* subtle vignette
* lightweight SSAO
* optional depth of field
* subtle color grading

Do NOT:

* permanently blur the scene
* permanently enable heavy DOF
* use excessive bloom
* use heavy chromatic aberration
* use excessive film grain
* make combat unreadable

---

# 18. Depth of Field

DOF should be contextual.

### Neutral combat

DOF OFF or extremely subtle.

Everything necessary for tactical reading must remain clear.

### Cinematic moment

DOF may activate briefly for:

* dramatic counter
* knockdown
* KO
* entrance
* victory
* major injury reaction

Never obscure the opponent during an interactive tactical moment.

---

# 19. Battle Director

Introduce a client-side:

```text
BattleDirector
```

The Battle Director consumes authoritative combat events and controls PRESENTATION.

It does NOT determine combat results.

Server remains authoritative.

Architecture:

```text
SERVER
Combat Simulation
      ↓
Authoritative Combat Events
      ↓
CLIENT
Battle Director
      ↓
┌─────────────┬─────────────┬────────────┬─────────────┐
│ Camera      │ Animation   │ VFX        │ UI          │
├─────────────┼─────────────┼────────────┼─────────────┤
│ Audio       │ Lighting    │ Commentary │ Atmosphere  │
└─────────────┴─────────────┴────────────┴─────────────┘
```

---

# 20. Presentation Events

Battle Director should understand events such as:

```ts
STALK
CIRCLE
TELL
COMMIT
APPROACH
CLASH_START
ATTACK
HIT
MISS
BLOCK
COUNTER
STAGGER
KNOCKBACK
KNOCKDOWN
RECOVER
DISENGAGE
INJURY
EXHAUSTION
MOMENTUM_SHIFT
KO
VICTORY
```

Not every event needs unique presentation.

Events should map to presentation intensity.

---

# 21. Presentation Intensity

Define approximate presentation tiers.

## Tier 0 — Neutral

Examples:

```text
STALK
CIRCLE
RECOVER
```

Presentation:

* stable camera
* minimal effects
* environmental audio
* tactical HUD visible

## Tier 1 — Tension

Examples:

```text
TELL
COMMIT
APPROACH
```

Presentation:

* subtle camera tracking
* framing changes
* tension audio
* contextual tell UI

## Tier 2 — Combat

Examples:

```text
CLASH
HIT
BLOCK
MISS
```

Presentation:

* tighter camera
* impact VFX
* controlled camera impulses
* louder combat audio

## Tier 3 — Major Event

Examples:

```text
COUNTER
KNOCKDOWN
MAJOR_INJURY
MOMENTUM_REVERSAL
```

Presentation:

* stronger camera response
* brief audio emphasis
* optional short time dilation
* special commentary

## Tier 4 — Finish

Examples:

```text
KO
VICTORY
```

Presentation:

* dedicated cinematic handling
* HUD suppression
* dramatic camera
* crowd/audio escalation
* transition into post-fight flow

---

# 22. Camera System

The camera must no longer behave like a permanently fixed platform fighter camera.

Use three primary presentation distances.

## Tactical Wide

Used during:

* stalking
* circling
* reset
* long-distance movement

Purpose:

* show positioning
* show arena
* communicate distance

Camera:

```text
wide framing
both fighters visible
stable movement
low shake
```

## Combat Medium

Used during:

* approach
* pressure
* feints
* short exchanges

Camera:

```text
closer framing
tracks fighters
moderate dynamic movement
```

## Cinematic Close

Used briefly during:

* major clash
* counter
* knockdown
* KO
* dramatic injury

Camera:

```text
close framing
dynamic angle
brief duration
high visual emphasis
```

Never remain close long enough to destroy tactical readability.

---

# 23. Camera Transition Rules

Camera transitions should be smooth.

Avoid:

```text
instant snap
instant snap
instant snap
```

Prefer:

```text
wide
  ↓
tracking acceleration
  ↓
medium
  ↓
commit
  ↓
rapid cinematic push
  ↓
clash
  ↓
controlled release
  ↓
wide
```

Camera motion itself becomes part of combat anticipation.

---

# 24. Camera Shake

Camera shake must communicate IMPACT, not general action.

Do not shake continuously during clashes.

Use small impulses.

Example:

```text
normal hit:
tiny impulse

heavy hit:
medium impulse

counter:
directional impulse

knockdown:
strong but brief impulse

KO:
custom cinematic response
```

Respect accessibility settings.

Add:

```text
Camera Shake:
Off
Low
Normal
```

---

# 25. Neutral Combat Presentation

During stalking/circling:

* camera pulls wider
* HUD becomes readable
* coaching becomes available
* tells become visible
* crowd intensity lowers
* environmental audio becomes audible
* fighters remain meaningfully separated

This phase should create tension.

Do NOT rush it visually.

---

# 26. Approach Presentation

When a fighter commits:

```text
COMMIT
↓
camera recognizes attacker
↓
subtle framing change
↓
fighter accelerates
↓
dust kick
↓
crowd intensity increases
↓
camera begins tracking inward
```

The player should FEEL the commitment before impact.

---

# 27. Clash Presentation

Clashes are the visual centerpiece.

During CLASH_START:

* coaching UI fades back
* tactical information reduces
* camera moves closer
* combat audio becomes dominant
* fighters may exchange multiple attacks rapidly
* dust and feathers react
* hit reactions drive readability
* camera responds to significant impacts

Do NOT display unnecessary UI over the clash.

Let the animation communicate the action.

---

# 28. Multi-Attack Clash Presentation

A clash is not:

```text
fighter A attacks
pause
fighter B attacks
pause
```

Presentation should support:

```text
rush
→
wing clash
→
kick
→
evade
→
counter
→
body collision
→
scramble
→
disengage
```

Both fighters may attack simultaneously.

Animation and presentation must support overlapping aggression.

---

# 29. Disengagement Presentation

After a clash:

```text
fighters separate
↓
camera releases
↓
dust settles
↓
crowd settles slightly
↓
HUD returns
↓
new state becomes readable
```

This is an important breathing period.

Do not immediately start another cinematic sequence.

---

# 30. Combat Read Window

After major exchanges, give the player a brief opportunity to understand the changed battle state.

Surface:

* fatigue
* injury
* confidence
* momentum
* behavior
* relevant tells

This should occur naturally while fighters reposition.

Do NOT pause combat artificially unless required by another system.

---

# 31. HUD Revamp

The HUD should communicate the fight story.

Current basic values remain:

* health
* stamina
* hits
* damage

Add contextual states without permanently cluttering the screen.

Example:

```text
VINDICATOR

████████░░ HEALTH
██████░░░░ STAMINA

PRESSURING
Confident

⚠ Left Wing
```

Opponent:

```text
PROUD RENEGADE

██████░░░░ HEALTH
███░░░░░░░ STAMINA

RETREATING
Shaken
```

---

# 32. HUD Visual Style

Move away from arcade/comic presentation.

Use:

* dark translucent surfaces
* subtle glass effect
* restrained gold accent
* off-white typography
* thin borders
* subtle shadows
* minimal saturation

Avoid giant bright:

* red
* blue
* purple
* green
* yellow

panels unless they represent genuinely important information.

---

# 33. HUD Dynamic Visibility

HUD elements should have visibility states.

```ts
FULL
REDUCED
CINEMATIC
HIDDEN
```

Example:

### FULL

Stalking / read phase.

### REDUCED

Approach.

### CINEMATIC

Clash.

### HIDDEN

KO / victory cinematic.

BattleDirector controls this.

---

# 34. Coaching Command Revamp

Existing commands remain:

```text
TIMBANG
SUGOD
BANTAY
ABANG
HINGA
TODO
```

But they should NOT visually resemble RPG abilities.

They are handler/coaching instructions.

Change presentation toward:

> tactical corner instructions

Use restrained cards or compact controls.

---

# 35. Contextual Coaching UI

The command panel should not permanently dominate 15–20% of the screen.

During neutral/read state:

```text
command panel expands
```

During approach:

```text
panel reduces
```

During clash:

```text
panel fades/collapses
```

After disengagement:

```text
panel returns
```

The fight should remain visually dominant.

---

# 36. Command Feedback

Issuing a command must feel like coaching a living fighter.

Example:

```text
SUGOD!
```

Then:

```text
VINDICATOR COMPLIES
```

or:

```text
HESITATES...
```

or:

```text
IGNORED
EXHAUSTED
```

or:

```text
IGNORED
LOW CONFIDENCE
```

Command compliance should connect existing behavioral systems to visible presentation.

---

# 37. Tells

Tells should become one of the primary tactical visual systems.

Do NOT display:

```text
ENEMY WILL ATTACK IN 1.3 SECONDS
```

Instead surface observations.

Examples:

```text
WEIGHT FORWARD
WINGS RISING
WATCHING YOUR LEFT
BACKING OFF
BREATHING HEAVILY
FAVORING LEFT LEG
UNSTEADY LANDING
HEAD LOWERED
```

Occasionally provide interpretation:

```text
Looks ready to rush.
```

or:

```text
May be baiting an attack.
```

Tells should remain imperfect.

---

# 38. Tell Presentation

Avoid giant floating labels above fighters.

Prefer:

* subtle edge annotation
* small contextual indicator
* short-lived text near fighter
* HUD observation feed
* visual body-language animation

Best tell:

> The player notices the animation themselves.

UI should supplement animation rather than replace it.

---

# 39. Momentum

Do not add another giant bar.

Use the existing central VS area.

Example:

```text
VINDICATOR ◀━━━━●━━━━▶ PROUD RENEGADE
```

Momentum shifts subtly based on combat.

Momentum represents:

> Who is currently dictating the fight?

Not:

> Who has more health?

Momentum may shift through:

* pressure
* clean hits
* counters
* knockdowns
* successful defensive sequences
* forcing retreats

---

# 40. Impact Effects

Use lightweight effects.

Possible effects:

* dust
* dirt
* feathers
* tiny impact particles
* subtle directional streaks for extremely fast movement

Avoid:

* explosions
* magic-looking particles
* huge sparks
* excessive screen flashes

Combat is physical.

Effects should reinforce physicality.

---

# 41. Feather Effects

Feathers are particularly useful because they communicate violent wing/body contact without requiring gore.

Use sparingly.

Example:

```text
light hit:
none

wing clash:
0–2

heavy collision:
2–5

major knockdown:
small burst
```

Do not turn every exchange into a feather storm.

Pool particles.

---

# 42. Dust Effects

Dust connects fighters to the arena.

Trigger during:

* acceleration
* sudden stop
* landing
* knockback
* hard turn
* knockdown
* intense clash

Intensity depends on movement force.

---

# 43. Physical Hit Reactions

Hit reactions matter more than particles.

Prioritize:

* head snap
* torso rotation
* wing displacement
* stumble
* balance correction
* failed step
* partial collapse
* knockback
* knockdown
* recovery

A hit should be readable even with ALL particles disabled.

---

# 44. Hit Stop

Use very brief hit-stop for significant impacts.

Example conceptual range:

```text
normal:
0 ms

solid:
20–35 ms

heavy:
35–60 ms

major counter:
50–80 ms

KO:
custom
```

Do not overuse.

The combat should still feel fast.

---

# 45. Time Dilation

Use extremely selectively.

Allowed:

* decisive counter
* dramatic knockdown
* KO

Duration should generally remain short.

Never repeatedly slow ordinary clashes.

---

# 46. Combat Typography

Reduce constant comic-book typography.

Current effects like:

```text
KALABOG!!
```

should NOT trigger constantly.

Reserve large stylized Filipino callouts for major moments.

Examples:

```text
BANGGAAN!
SOLIDONG TAMA!
SALAG!
GANTI!
BAGSAK!
```

These become special because they are rare.

---

# 47. Typography Hierarchy

Use two typography systems.

## Interface typography

Clean, readable, restrained.

Used for:

* HUD
* stats
* commands
* observations
* timers

## Impact typography

Expressive Filipino display typography.

Used for:

* major counters
* knockdowns
* dramatic moments
* KO
* victory

Never use impact typography for everything.

---

# 48. Audio Direction

Visual impact depends heavily on audio.

Use layers:

### Environment

* rural ambience
* wind
* birds
* distant crowd

### Fighter

* wings
* feet
* breathing
* vocalizations
* dirt movement

### Combat

* body impact
* wing collision
* ground impact

### Crowd

Crowd intensity follows battle state.

---

# 49. Dynamic Crowd Intensity

Conceptual:

```text
STALK
crowd = 0.25

APPROACH
crowd = 0.45

CLASH
crowd = 0.75

COUNTER
crowd = 0.9

DISENGAGE
crowd = 0.4

KO
crowd = 1.0
```

Do not literally use these values without testing.

The point is dynamic response.

---

# 50. Audio Ducking

For major moments:

```text
major hit
↓
environment ducks briefly
↓
impact dominates
↓
crowd response
↓
normal mix returns
```

This creates perceived impact without requiring excessive visual effects.

---

# 51. Injury Presentation

Injuries should become visible in behavior.

Examples:

### Leg injury

* altered gait
* slower turning
* occasional favoring

### Wing injury

* asymmetric wing posture
* reduced wing extension
* guarded side

### Exhaustion

* slower recovery
* heavier breathing
* lower stance
* reduced movement explosiveness

Do not rely solely on HUD icons.

---

# 52. Fighter Personality Through Animation

Behavior should influence presentation.

### Aggressive

* forward stance
* less retreating
* frequent pressure
* sharper commitment

### Counter Fighter

* controlled distance
* reactive positioning
* patient posture
* sudden explosive counters

### Endurance Fighter

* measured movement
* stable posture
* fewer reckless commitments

### Nervous / Low Confidence

* hesitation
* extra repositioning
* slower commitment

Animation should help players recognize fighter identity without reading stats.

---

# 53. Battle Timeline Memory

BattleDirector should record presentation-worthy moments.

Example:

```ts
interface BattleHighlight {
  timestamp: number;
  type:
    | "CLEAN_HIT"
    | "COUNTER"
    | "MOMENTUM_SHIFT"
    | "INJURY"
    | "KNOCKDOWN"
    | "COMEBACK"
    | "KO";
  fighterId?: string;
  opponentId?: string;
  importance: number;
}
```

Only important events become highlights.

---

# 54. Battle Story Example

A battle might produce:

```text
00:18 — First clean hit
00:43 — Vindictor takes control
01:02 — Proud Renegade lands a counter
01:17 — Vindictor suffers wing injury
01:31 — Vindictor survives heavy clash
01:46 — Final rush
01:51 — KO
```

This feeds the post-fight flow.

---

# 55. KO Presentation

KO should be one of the strongest moments in the entire game.

Sequence concept:

```text
decisive impact
↓
brief hit-stop
↓
audio duck
↓
fighter reaction
↓
camera tracks fall
↓
crowd explodes
↓
winner remains active
↓
HUD disappears
↓
brief cinematic hold
↓
result transition
```

Do NOT immediately show a modal.

The player needs time to experience the finish.

---

# 56. Victory Transition

After KO:

```text
KO cinematic
↓
arena reaction
↓
winner focus
↓
short breathing room
↓
RESULT
↓
battle highlights
↓
injuries
↓
experience/progression
↓
championship/rivalry/bloodline consequences
```

This integrates with the separate post-fight flow specification.

---

# 57. Responsive Layout

This remains a web application.

Battle UI must support different viewport sizes.

Priority:

```text
Desktop
↓
Laptop
↓
Tablet
```

Mobile may require a separate layout.

Do NOT simply scale the desktop UI down.

---

# 58. Web Performance Strategy

Target stable performance over maximum fidelity.

Suggested targets:

```text
60 FPS:
preferred

45+ FPS:
acceptable on mid-range hardware

30 FPS:
absolute fallback
```

Avoid frame-time spikes during clashes.

A beautiful clash that drops from 60 FPS to 15 FPS is unacceptable.

---

# 59. Adaptive Graphics

Introduce graphics presets if necessary.

```text
LOW
MEDIUM
HIGH
```

Possible differences:

## Low

* reduced shadow resolution
* reduced particles
* no SSAO
* no DOF
* simplified environment effects

## Medium

* moderate shadows
* normal particles
* lightweight SSAO
* limited cinematic DOF

## High

* higher shadows
* full particles
* SSAO
* cinematic DOF
* improved environmental effects

Gameplay must remain identical.

---

# 60. Performance Budgets

Use strict budgets for:

* active particles
* decals
* dynamic lights
* shadow-casting lights
* post-processing passes
* draw calls

Prefer ONE major shadow-casting directional light.

Do not create dynamic point lights for every impact.

---

# 61. Object Pooling

Pool:

* feathers
* dust
* dirt particles
* decals
* temporary impact effects

Avoid runtime allocation spikes during clashes.

---

# 62. Asset Loading

Preload critical battle assets before entering battle:

* rooster models
* arena
* essential textures
* combat audio
* common VFX

Optional/high-cost assets may load progressively.

Never start a battle while critical fighter assets are still streaming.

---

# 63. Texture Strategy

Use compressed textures where supported.

Prioritize resolution:

```text
fighters
>
arena foreground
>
arena props
>
background
```

Do not use 4K textures everywhere.

Background detail does not need the same resolution as fighters.

---

# 64. LOD Strategy

Use LOD where useful.

Possible:

* distant arena props
* background vegetation
* crowd
* decorative objects

The two active fighters should retain the highest practical quality.

---

# 65. Accessibility

Support:

```text
Camera Shake:
Off / Low / Normal

Reduced Motion:
On / Off

Impact Flash:
On / Off

Combat Text:
Reduced / Full
```

Reduced Motion should disable/reduce:

* aggressive camera pushes
* large shakes
* excessive time dilation
* strong DOF transitions

---

# 66. UI Safe Areas

Do not place important information directly over active combat.

Define safe regions:

```text
TOP LEFT
fighter 1 HUD

TOP RIGHT
fighter 2 HUD

CENTER TOP
round / momentum

RIGHT EDGE
contextual coaching

CENTER
COMBAT — KEEP CLEAR

BOTTOM
temporary commentary only
```

Combat area must remain visually dominant.

---

# 67. Battle Scene Layout Target

Conceptually:

```text
┌────────────────────────────────────────────────────────────┐
│ FIGHTER HUD             MOMENTUM             FIGHTER HUD   │
│                                                            │
│                                                            │
│                                                            │
│                      BATTLE                                │
│                                                            │
│                   ROOSTER     ROOSTER                      │
│                                                            │
│                                              ┌──────────┐  │
│                                              │ COACHING │  │
│                                              │ context  │  │
│                                              └──────────┘  │
│                                                            │
│              temporary commentary / tells                 │
└────────────────────────────────────────────────────────────┘
```

The arena gets the majority of screen real estate.

---

# 68. Implementation Architecture

Suggested client structure:

```text
components/battle/
│
├── BattleScene.tsx
├── BattleDirector.ts
│
├── camera/
│   ├── BattleCameraController.ts
│   ├── CameraPreset.ts
│   └── CameraShake.ts
│
├── presentation/
│   ├── PresentationEvent.ts
│   ├── PresentationQueue.ts
│   └── PresentationIntensity.ts
│
├── environment/
│   ├── BattleEnvironment.tsx
│   ├── ArenaLighting.tsx
│   ├── ArenaAtmosphere.tsx
│   └── ArenaDecals.tsx
│
├── effects/
│   ├── DustEffect.tsx
│   ├── FeatherEffect.tsx
│   ├── ImpactEffect.tsx
│   └── EffectPool.ts
│
├── hud/
│   ├── BattleHUD.tsx
│   ├── FighterHUD.tsx
│   ├── MomentumIndicator.tsx
│   ├── TellIndicator.tsx
│   └── CoachingPanel.tsx
│
├── audio/
│   ├── BattleAudioDirector.ts
│   ├── CrowdController.ts
│   └── ImpactAudio.ts
│
└── highlights/
    ├── BattleHighlightRecorder.ts
    └── highlightTypes.ts
```

Adapt to existing project architecture rather than blindly creating duplicate systems.

---

# 69. Separation of Responsibilities

Maintain strict boundaries.

## Combat Server

Determines:

* actions
* timing
* hits
* misses
* damage
* stamina
* injuries
* state
* winner

## Battle Director

Determines:

* camera presentation
* VFX intensity
* UI visibility
* audio response
* commentary
* cinematic emphasis

## Renderer

Determines:

* models
* materials
* lights
* shadows
* environment

Never let presentation determine combat results.

---

# 70. Implementation Order

Do NOT attempt everything simultaneously.

## Phase 1 — Ground the Existing Scene

Implement:

* lighting overhaul
* environmental lighting
* contact shadows
* rooster PBR improvements
* arena PBR improvements
* tone mapping
* atmospheric haze

Goal:

Make a static screenshot look significantly better.

No new combat logic required.

---

## Phase 2 — Camera

Implement:

* Tactical Wide
* Combat Medium
* Cinematic Close
* state-driven transitions
* camera tracking
* controlled shake

Goal:

Make movement through existing combat states cinematic.

---

## Phase 3 — Battle Director

Implement:

* presentation events
* intensity tiers
* HUD visibility control
* camera orchestration
* VFX orchestration
* audio orchestration

Goal:

Create one central presentation authority.

---

## Phase 4 — Physical Combat Effects

Implement:

* dust
* feathers
* dirt
* decals
* hit-stop
* improved hit reactions

Goal:

Make combat feel physical.

---

## Phase 5 — HUD Revamp

Implement:

* grounded HUD style
* contextual visibility
* fighter state
* momentum
* tells
* compact coaching UI

Goal:

Reduce permanent screen clutter.

---

## Phase 6 — Audio

Implement:

* environmental layers
* movement
* impacts
* crowd states
* audio ducking

Goal:

Increase perceived production value without GPU cost.

---

## Phase 7 — Cinematic Moments

Implement:

* counter presentation
* knockdown
* injury reactions
* KO
* victory transition

Goal:

Give major moments unique weight.

---

## Phase 8 — Optimization

Profile:

* GPU frame time
* CPU frame time
* React rendering
* draw calls
* particles
* shadows
* post-processing
* allocations

Implement:

* pooling
* quality presets
* adaptive effects
* texture compression
* LOD

---

# 71. Vertical Slice Requirement

Before applying this system everywhere, create ONE polished battle vertical slice.

Use:

* current arena
* current rooster models
* current combat system

Improve only:

```text
lighting
materials
shadows
camera
HUD
dust
feathers
impact response
post-processing
audio
```

Do NOT remodel the rooster yet.

Evaluate the result.

If the fighters still look excessively cartoon-like AFTER proper rendering and materials, then investigate model redesign.

Do not prematurely replace working models.

---

# 72. Visual Acceptance Criteria

The visual revamp is successful when:

* fighters appear physically grounded
* feet do not appear to float
* fighters inherit environment lighting
* shadows clearly describe fighter volume
* feathers no longer appear plastic
* arena dirt looks used
* arena visually belongs to the environment
* background does not overpower foreground
* fighters remain readable
* neutral moments feel calm and tense
* clashes feel dramatically more intense
* UI does not dominate the scene
* coaching feels like coaching, not casting abilities
* combat remains readable without VFX
* major moments feel substantially different from normal hits
* screenshots no longer look like 3D assets pasted over a background

---

# 73. Gameplay Presentation Acceptance Criteria

The presentation system succeeds when the player can visually understand:

* who is pressuring
* who is retreating
* who is tired
* who is hurt
* when someone is preparing to commit
* when a clash begins
* when a clash ends
* when momentum changes
* when a command is obeyed
* when a command is ignored
* why a fighter's behavior has changed

without constantly reading raw numbers.

---

# 74. Performance Acceptance Criteria

On target desktop hardware:

```text
neutral combat:
~60 FPS target

normal clash:
no major frame spike

heavy cinematic event:
must remain playable

memory:
no continuous growth over repeated clashes

particles:
pooled

decals:
bounded

camera:
no React state updates every frame
```

Profile rather than guessing.

---

# 75. Final Experience Target

A normal engagement should feel like:

```text
Wide arena.

The fighters keep their distance.

Crowd noise sits quietly underneath the rural ambience.

One rooster circles.

The opponent shifts its weight forward.

WEIGHT FORWARD

The player notices.

TIMBANG
SUGOD
BANTAY
ABANG
HINGA
TODO

SUGOD!

The rooster hesitates.

COMPLIES.

It suddenly accelerates.

Dirt kicks backward.

The camera tracks inward.

The opponent commits.

They collide.

CLASH.

Wings explode outward.

Several attacks happen rapidly.

A kick lands.

Tiny hit-stop.

Dust.

Two feathers spin away.

The opponent stumbles.

GANTI!

They scramble apart.

The camera releases.

Crowd settles.

Both fighters begin circling again.

One is breathing heavily.

The other is favoring its left leg.

The HUD quietly returns.

The player reads the new situation.

Another command.

Another engagement.
```

That rhythm is the battle experience.

---

# 76. Final Rule

Do not judge visual quality solely by:

> How much graphical detail is on screen?

Judge it by:

> Does the player believe these two fighters occupy the same physical space, and does every clash feel dangerous and consequential?

The battle scene should feel grounded during quiet moments and explosive during combat.

The web platform does not require the game to look like a web app.

Use disciplined rendering, strong art direction, physical animation, intelligent camera work, restrained UI, and excellent audio to create perceived production value instead of brute-forcing graphical fidelity.

```

This is deliberately a **presentation revamp rather than another combat-system rewrite**, so Codex shouldn't start tearing apart the server simulation you just rebuilt. It also gives you the vertical-slice checkpoint before committing to new rooster models—which I think is important because the screenshot suggests lighting/materials are currently hurting them more than their actual geometry. 
```
