# Training Gym 3D Revamp — UI + Environment Build Spec

**Project:** Rooster Arena  
**Feature:** Training Gym / Fighter Camp  
**Scope:** Frontend UI + 3D Training Environment  
**Status:** Implementation Spec  
**Primary Goal:** Replace the current admin-style Training Gym with a cinematic, interactive 3D Fighter Camp that visualizes the new Training System V3 while preserving server-authoritative training logic.

---

## 1. Overview

The Training Gym should no longer feel like a beige management page with stacked cards.

It should become a major progression space where the player feels like they are physically coaching and developing an individual rooster.

The frontend revamp must combine:

- A compact 3D training environment
- Real rigged rooster models
- Reused combat/training animations
- Interactive training stations
- Camera-driven navigation
- A dark translucent/glass UI shell
- Fighter development information
- Training program selection
- Intensity selection
- Projected training results
- Active training session visualization
- Completion reports
- Breakthrough presentation
- Potential discovery feedback

The training backend remains authoritative.

The 3D scene only visualizes training.

---

# 2. Core Design Goal

The player experience should feel like:

```text
OPEN FIGHTER CAMP
        ↓
See actual rooster in training yard
        ↓
Select fighter
        ↓
Inspect development / condition / coach report
        ↓
Select training category
        ↓
Camera moves toward relevant training station
        ↓
Choose program
        ↓
Choose intensity
        ↓
Preview expected development and risks
        ↓
Start training
        ↓
Rooster physically performs drill
        ↓
Leave or stay and watch
        ↓
Training finishes server-side
        ↓
Return / claim result
        ↓
Completion presentation
        ↓
See EV, XP, behavior, specialization, traits, breakthroughs, injuries
        ↓
Choose next development step
```

The system must feel like fighter development, not stat editing.

---

# 3. Architectural Rule

The backend remains authoritative for:

```text
training session timing
session validation
program unlocks
energy cost
training point cost
fatigue
stress
condition
EV gains
combat XP
behavioral adaptation
specialization
trait progress
hidden potential
potential discovery
breakthroughs
injuries
training completion
persistence
```

The client-side 3D layer is cosmetic.

Do not resolve training rewards in the browser.

Do not run real training progression from animation events.

Do not trust client animation completion for server progression.

Use:

```text
SERVER
TrainingSession
startedAt
duration
program
intensity
result
        │
        ▼
CLIENT
TrainingVisualizationController
        │
        ├── maps program to station
        ├── selects visual animation sequence
        ├── moves/focuses camera
        ├── places rooster at station
        ├── loops cosmetic animation
        └── shows timer/progress
```

---

# 4. Existing Systems to Reuse

Do not duplicate systems that already exist.

Reuse the project's existing:

```text
React Three Fiber
Three.js
rigged rooster GLB
rooster genome system
physical profile system
mutation visuals
animation state library
procedural animation layers
combat attack animations
combat reactions
camera utilities
performance/LOD logic
battle presentation patterns
```

The training scene should use the same authoritative rooster appearance pipeline as:

```text
coop
battle
breeding
profile
```

A rooster must look identical across game systems.

---

# 5. Main Screen Structure

Recommended desktop layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ FIGHTER CAMP                      LV. 3 FIGHT CAMP          │
│ Slots 2/4      Efficiency 110%     Training XP +10%        │
├────────────────────────────────────────────┬────────────────┤
│                                            │ SELECTED       │
│                                            │ FIGHTER        │
│                                            │                │
│             3D TRAINING CAMP               │ Dragon         │
│                                            │                │
│              [ ROOSTER ]                   │ Condition 92   │
│                                            │ Energy    73   │
│                                            │ Fatigue   24   │
│                                            │ Stress    10   │
│                                            │                │
│                                            │ Adaptive       │
│                                            │ Counter  68%   │
├────────────────────────────────────────────┴────────────────┤
│ PHYSICAL | TECHNIQUE | TACTICAL | CONDITIONING | SPARRING │
├─────────────────────────────────────────────────────────────┤
│ Program selection / training setup / preview               │
└─────────────────────────────────────────────────────────────┘
```

The 3D scene should remain visually dominant.

The UI should support the scene rather than cover it.

---

# 6. Visual Direction

Use the game's dark glass / translucent UI language.

Avoid:

```text
large beige rectangles
flat admin dashboard styling
developer-style diagnostics
dense tables as the primary interface
white backgrounds
generic SaaS cards
```

Prefer:

```text
smoked translucent panels
dark earth-tone surfaces
weathered camp environment
subtle gold/brass interaction accents
desaturated natural materials
directional warm sunlight
soft rim light on rooster
thin borders
blurred panel backgrounds
compact typography
clear status hierarchy
```

Suggested UI feel:

```css
background: rgba(14, 12, 9, 0.70);
backdrop-filter: blur(16px);
border: 1px solid rgba(223, 178, 86, 0.18);
```

Do not blindly hard-code these exact values if the game already has design tokens.

Use existing theme variables where possible.

---

# 7. Training Camp Environment

Build a compact rural training compound.

This should feel like a believable rooster fight camp, not a fantasy arena.

Include:

```text
dirt ground
bamboo / wood fencing
simple shed or roofed training area
wooden training posts
hanging strike pads
footwork markers
conditioning lane
reaction training device
water / recovery corner
equipment rack
sparring pen
small ambient props
```

Optional low-cost ambient props:

```text
rope
buckets
crates
old tires
water basin
feed container
cloth banners
wooden benches
training notes board
```

Avoid excessive clutter.

The rooster should remain the focus.

---

# 8. Facility Levels Must Change the Environment

Do not create five separate maps.

Use one modular training camp.

Enable additional objects and stations based on gym level.

Example:

## Level 1 — Backyard Gym

Visible:

```text
basic dirt yard
simple fence
basic shelter
training post
water bucket
few props
```

## Level 2 — Training Shed

Add:

```text
covered training shed
footwork markers
hanging target
extra equipment
additional training space
```

## Level 3 — Fight Camp

Add:

```text
dedicated sparring pen
conditioning lane
equipment rack
coach corner
additional environmental detail
```

## Level 4 — Professional Gym

Add:

```text
reaction training machine
improved station equipment
recovery area
medical corner visual
more organized facility
```

## Level 5 — Elite Training Center

Add:

```text
elite sparring area
advanced training station props
better recovery zone
prestige decorations
trophies / banners
higher-quality camp structures
```

Implementation pattern:

```tsx
<TrainingCampEnvironment>
  <BaseTerrain />
  <BaseFence />
  <BasicShelter />

  {level >= 1 && <BasicTrainingPost />}
  {level >= 2 && <FootworkStation />}
  {level >= 2 && <TrainingShed />}
  {level >= 3 && <SparringPen />}
  {level >= 3 && <EquipmentRack />}
  {level >= 4 && <ReactionStation />}
  {level >= 4 && <RecoveryArea />}
  {level >= 5 && <EliteTrainingProps />}
  {level >= 5 && <PrestigeDecor />}
</TrainingCampEnvironment>
```

---

# 9. Training Stations

Programs should map to actual 3D stations.

Recommended stations:

```text
Strength Station
Sprint Lane
Footwork Area
Endurance Area
Target / Accuracy Station
Counter / Reaction Station
Defensive Drill Station
Pressure Drill Station
Discipline Station
Recovery Conditioning Area
Controlled Sparring Pen
Hard Sparring Pen
```

Several programs may share one station.

Do not create a unique physical station for every single training program.

---

# 10. Training Station Metadata

Create reusable station definitions.

Recommended type:

```ts
interface TrainingStationDefinition {
  id: TrainingStationId;

  programs: ProgramId[];

  position: [number, number, number];
  rotation: number;

  roosterPosition?: [number, number, number];
  opponentPosition?: [number, number, number];

  minimumGymLevel: number;

  animationSequence: TrainingAnimationSequenceId;
  cameraPreset: TrainingCameraPresetId;

  props?: string[];
}
```

Example:

```ts
const COUNTER_STATION: TrainingStationDefinition = {
  id: "counter_station",

  programs: [
    "counter_drills",
    "advanced_reaction",
    "discipline_training",
  ],

  position: [4, 0, -2],
  rotation: Math.PI * 0.5,

  minimumGymLevel: 2,

  animationSequence: "counter_target",
  cameraPreset: "technique_close",
};
```

---

# 11. Training Visual State Machine

Build a lightweight cosmetic training state machine.

Recommended states:

```ts
type TrainingVisualState =
  | "idle"
  | "approach_station"
  | "prepare"
  | "exercise"
  | "recover"
  | "repeat"
  | "complete";
```

This system does not affect training rewards.

It exists only to produce believable visual flow.

Basic sequence:

```text
idle
 ↓
approach_station
 ↓
prepare
 ↓
exercise
 ↓
recover
 ↓
repeat
 ↓
exercise
 ↓
...
 ↓
complete
```

---

# 12. Training Visualization Controller

Create:

```text
TrainingVisualizationController
```

Responsibilities:

```text
read active TrainingSession
identify program
resolve training station
place rooster
select animation sequence
control visual timing
loop cosmetic drill
drive station props
trigger camera preset
display visual completion state
```

Suggested interface:

```ts
interface TrainingVisualizationContext {
  chickenId: string;
  programId: ProgramId;
  intensity: TrainingIntensity;

  startedAt: string;
  durationMinutes: number;

  station: TrainingStationDefinition;

  isSelected: boolean;
}
```

---

# 13. Rooster Placement

The selected rooster should physically exist in the scene.

When no training program is selected:

```text
rooster idles in central yard
```

When a training program is selected but not started:

```text
camera moves toward station
rooster may preview station position
```

When active training exists:

```text
rooster appears at training station
training animation loops
```

Do not require manual player movement.

---

# 14. No WASD / Character Controller

Do not turn the Training Gym into a third-person walking game.

The interaction model is:

```text
select rooster
select category
select program
select intensity
preview
start training
watch / leave
```

Navigation is camera-driven.

This keeps the system focused and avoids unnecessary movement logic.

---

# 15. Camera System

Create:

```text
TrainingCameraController
```

Recommended modes:

```ts
type TrainingCameraMode =
  | "overview"
  | "fighter_focus"
  | "station_focus"
  | "active_training"
  | "completion"
  | "breakthrough";
```

## Overview

Shows most of the camp.

Use when:

```text
opening Training Gym
no fighter selected
switching facility overview
```

## Fighter Focus

Frames selected rooster.

Use when:

```text
selecting fighter
opening coach report
reviewing fighter condition
```

## Station Focus

Frames rooster + training equipment.

Use when:

```text
program selected
training preview open
```

## Active Training

Tracks current drill.

Keep movement subtle.

Do not use battle-level camera intensity for ordinary training.

## Completion

Small push-in or reframing.

## Breakthrough

Short cinematic framing.

Use sparingly.

---

# 16. Camera Transitions

Use smooth damped camera transitions.

Avoid instant camera teleporting unless required for fallback.

Example:

```text
Select Counter Drills
        ↓
camera pans toward counter station
        ↓
rooster framed beside reaction target
        ↓
training setup panel opens
```

Start session:

```text
START TRAINING
        ↓
setup UI collapses
        ↓
camera pushes in slightly
        ↓
training animation begins
        ↓
timer becomes visible
```

---

# 17. Reuse Existing Animation Library

Do not build duplicate rooster animation clips if existing combat animation states can be reused.

Potential reusable states:

```text
idle
breathing
walk
stalk
circle
dash
peck
quick kick
heavy kick
wing strike
jump attack
flying kick
guard
hit reaction
recoil
disengage
recover
```

Training sequences should compose these existing animations.

---

# 18. Strength Training Visualization

Example sequence:

```text
prepare
↓
short stalk
↓
heavy kick / strike pad
↓
impact
↓
recoil
↓
small backstep
↓
recover
↓
repeat
```

Optional equipment:

```text
hanging weighted pad
wooden striking target
resistance object
```

Intensity differences:

```text
Light:
slower loops
longer recovery

Normal:
baseline

Hard:
shorter recovery
more explosive sequence

Extreme:
high-intensity animation pace
stronger visual strain
```

Intensity does not change rewards client-side.

It only reflects server-selected intensity.

---

# 19. Sprint / Speed Training Visualization

Use a short training lane.

Sequence:

```text
prepare
↓
crouch / ready
↓
dash forward
↓
decelerate
↓
turn
↓
dash back
↓
recover
```

Do not require a huge environment.

Use a compact back-and-forth lane.

---

# 20. Footwork / Agility Visualization

Use:

```text
marker poles
ground circles
small obstacle markers
```

Sequence:

```text
walk
↓
circle marker
↓
quick directional change
↓
short dash
↓
turn
↓
circle opposite direction
↓
recover
```

This should visually communicate:

```text
spacing
mobility
positioning
```

---

# 21. Endurance Training Visualization

Use sustained lower-intensity motion.

Sequence:

```text
steady movement
↓
short acceleration
↓
continued movement
↓
breathing animation becomes stronger
↓
slow recovery
↓
repeat
```

Avoid constant explosive attacks.

This should visually feel different from speed training.

---

# 22. Target / Accuracy Training

Use a hanging or pivoting target.

Sequence:

```text
track target
↓
target moves
↓
rooster waits
↓
precise peck / kick
↓
reset
```

Randomize cosmetic target timing slightly.

Do not tie reward RNG to visual target behavior.

---

# 23. Counter / Reaction Training

This should be one of the strongest visual programs.

Use a moving/swinging target or mechanical dummy.

Sequence:

```text
idle / stalk
↓
track target
↓
target attack cue
↓
small evade / sidestep
↓
counter kick / strike
↓
recoil
↓
disengage
↓
reset
```

This visually reinforces counter-fighter identity.

---

# 24. Defensive Training Visualization

Possible equipment:

```text
moving padded target
swinging obstacle
controlled opponent
```

Sequence:

```text
guard stance
↓
incoming cue
↓
block / evade
↓
recover
↓
reposition
```

---

# 25. Pressure Training Visualization

Use:

```text
training target
short pursuit path
```

Sequence:

```text
stalk
↓
dash
↓
strike
↓
target retreats
↓
pursue
↓
strike again
↓
recover
```

This should visually feel more aggressive than counter drills.

---

# 26. Discipline Training Visualization

Discipline training should be controlled, not flashy.

Sequence:

```text
controlled idle
↓
track cue
↓
wait
↓
hold position
↓
respond only after cue
↓
return to stance
```

Use subtle movement.

This program should visually communicate restraint.

---

# 27. Recovery Conditioning Visualization

This is not injury healing.

Use:

```text
light walking
stretch-like body movement
breathing recovery
water area
slow movement drills
```

Sequence:

```text
slow movement
↓
breathing
↓
short mobility drill
↓
rest
```

Keep animation intensity low.

---

# 28. Controlled Sparring

Use a second rooster.

Reuse battle visual logic where practical.

Do not run the actual competitive combat resolver.

Create cosmetic sparring loops.

Sequence:

```text
stalk
↓
circle
↓
short clash
↓
disengage
↓
circle
↓
reset
```

Clashes should be:

```text
short
controlled
less violent
less camera shake
less hit-stop
```

than real fights.

---

# 29. Hard Sparring

Use the same general sequence:

```text
stalk
↓
circle
↓
clash
↓
disengage
↓
repeat
```

But increase:

```text
animation speed
impact intensity
camera energy
clash duration
```

Still avoid full battle presentation.

The server determines actual injury outcome.

The client must not infer injury from animation.

---

# 30. Multiple Active Training Sessions

Facility capacity may allow several roosters to train simultaneously.

The frontend should support this.

However, rendering should remain bounded.

Recommended:

```text
selected active rooster:
full detail

up to 2 additional nearby active roosters:
normal or reduced detail

remaining active sessions:
UI representation only
```

Do not render all six full-detail roosters with maximum animation complexity if it hurts performance.

---

# 31. Active Session UI

Replace plain text rows with compact session cards.

Example:

```text
ACTIVE FIGHTERS 3 / 6

Untamed Dragon
Counter Drills
00:42
Normal
Efficiency 93%

Red Storm
Strength
01:14
Hard

Black Wing
Controlled Sparring
03:42
Normal
```

Clicking a card should:

```text
select rooster
focus camera
show station
open session details
```

---

# 32. Session Timer

The client should derive remaining time from:

```text
startedAt
durationMinutes
current timestamp
```

Do not decrement authoritative state manually and persist it.

The timer is display-only.

When expired:

```text
trigger normal claim/fetch flow
```

Use existing backend behavior.

---

# 33. Fighter Selector

Build a compact fighter selector.

It should show:

```text
portrait / miniature
name
condition
energy
fatigue
current activity
specialization
training eligibility
```

Do not overload the selector.

Detailed data belongs in the fighter panel.

---

# 34. Selected Fighter Panel

Show:

```text
name
growth/life stage
condition
energy
training fatigue
stress
medical state
current specialization
specialization progress
training availability
```

Example:

```text
UNTAMED DRAGON

Adaptive Counter
68%

Condition     92
Energy        73
Fatigue       24
Stress        10

Status
Ready to train
```

---

# 35. Coach Report

Replace raw diagnostic text such as:

```text
medical status: CRITICAL
evasion experience is below...
health too low...
```

with a structured Coach Report.

Example:

```text
COACH REPORT

STYLE DEVELOPMENT
Adaptive Counter — 68%

STRENGTHS
Accuracy
Agility
Counter Experience

DEVELOPMENT GAPS
Recovery
Evasion
Adaptation

READINESS
Good

RECOMMENDATION
Counter Drills or Controlled Sparring

CAUTION
Avoid Hard Conditioning until fatigue drops below 40.
```

The report must use real data.

No placeholders.

---

# 36. Training Categories

Replace one giant vertical program list.

Use category tabs:

```text
PHYSICAL
TECHNIQUE
TACTICAL
CONDITIONING
SPARRING
```

Possible mapping:

## Physical

```text
Strength
Sprint
Power Conditioning
```

## Technique

```text
Target Drills
Footwork
Balance
Advanced Reaction
```

## Tactical

```text
Counter Drills
Defensive Drills
Pressure Drills
Discipline
Adaptation
```

## Conditioning

```text
Endurance
Recovery Conditioning
Stamina Work
```

## Sparring

```text
Controlled Sparring
Hard Sparring
```

Use actual program IDs from backend config.

Do not duplicate backend definitions manually if metadata already exists.

---

# 37. Program Cards

Each program card should explain fighter development.

Example:

```text
COUNTER DRILLS

Read commitment and punish openings.

PHYSICAL
Accuracy +++
Agility +

COMBAT
Counter ++++
Adaptation ++
Defense +

BEHAVIOR
↑ Patience
↑ Counter Preference

TIME
1 min

ENERGY
18

FATIGUE
12
```

Locked programs should clearly explain unlock requirements.

Example:

```text
Requires Fight Camp Lv.3
```

---

# 38. Program Selection Interaction

Selecting a program should:

```text
highlight program
resolve station
move camera
position rooster
open training setup panel
fetch/use training preview
```

Do not immediately start training.

---

# 39. Training Intensity Selector

Support backend intensity options:

```text
LIGHT
NORMAL
HARD
EXTREME
```

Show tradeoffs.

Example:

```text
NORMAL

Development 100%
Fatigue     100%
Energy      100%
Risk        Normal
```

Hard:

```text
Development 125%
Fatigue     145%
Energy      130%
Risk        Elevated
```

Use actual backend values.

Do not duplicate balancing constants in the UI if they can come from API/config.

---

# 40. Training Preview

Before starting, show projected results from the real preview resolver.

Example:

```text
EXPECTED DEVELOPMENT

Accuracy EV
57.4 → ~60.2

Agility EV
48.8 → ~49.6

Effective Accuracy
52.8 → ~53.9

Counter XP
61 → ~67

Adaptation XP
34 → ~37

Training Efficiency
93%

Energy
73 → 55

Fatigue
24 → 36

Condition
92 → 88

Breakthrough Chance
3.5%

Injury Risk
Low
```

This must use real API data.

No fake estimated values.

---

# 41. Training Start Flow

Recommended UI flow:

```text
PROGRAM SELECTED
        ↓
camera focuses station
        ↓
intensity selected
        ↓
preview shown
        ↓
START TRAINING
        ↓
API request succeeds
        ↓
setup drawer collapses
        ↓
active session overlay appears
        ↓
visual training sequence begins
```

If API request fails:

```text
do not begin training animation
show backend error
```

---

# 42. Active Training Presentation

While training:

```text
rooster performs station animation
camera remains focused unless player changes selection
timer visible
program name visible
intensity visible
efficiency visible
```

Example:

```text
UNTAMED DRAGON

COUNTER DRILLS

00:43

NORMAL
Efficiency 93%

[Cancel Training]
```

Cancellation must call backend first.

Only update visual state after success.

---

# 43. Leaving the Page

Training must continue when the player leaves.

Do not depend on:

```text
animation loop
open tab
active React component
```

When returning:

```text
load active TrainingSession
calculate current remaining time
place rooster at correct station
resume cosmetic animation
```

---

# 44. Completion Flow

When a session is completed:

```text
server claims session
        ↓
client receives persisted TrainingResult
        ↓
training animation completes naturally
        ↓
rooster settles
        ↓
camera moves to completion framing
        ↓
completion panel appears
```

Avoid abrupt cutoffs where possible.

---

# 45. Training Completion Report

Show the exact persisted result.

Example:

```text
TRAINING COMPLETE

COUNTER DRILLS

PHYSICAL DEVELOPMENT

Accuracy EV
57.4 → 60.3
+2.9

Agility EV
48.8 → 49.6
+0.8

Effective Accuracy
52.8 → 54.0
+1.2

COMBAT DEVELOPMENT

Counter
61 → 68
+7 XP

Defense
39 → 41
+2 XP

Adaptation
34 → 36
+2 XP

BEHAVIOR

Counter Preference
0.540 → 0.546

Patience
0.580 → 0.583

READINESS

Energy
73 → 55

Fatigue
24 → 36

Condition
92 → 88

SPECIALIZATION

Adaptive Counter
68% → 71%

Counter Specialist
72% → 76%

No injury.
```

---

# 46. Completion Scene Behavior

Ordinary completion:

```text
short camera push
rooster returns to calm stance
minimal flourish
completion panel slides in
```

Do not turn every training session into a huge cinematic.

---

# 47. Breakthrough Presentation

Breakthroughs should receive a stronger presentation.

Flow:

```text
training completes
↓
brief animation hold
↓
camera close-up
↓
subtle impact/audio cue
↓
BREAKTHROUGH overlay
```

Example:

```text
BREAKTHROUGH

PATIENT READER

The rooster is beginning to wait for stronger commitment
before reacting.

Counter XP +12

Adaptation XP +5

Counter Preference +0.010

Counter Specialist progress +15%
```

Do not fake breakthrough results.

Render the persisted server result.

---

# 48. Potential Discovery Presentation

If training reveals potential:

```text
DEVELOPMENT INSIGHT

Exceptional Counter Aptitude

Repeated counter work suggests unusually strong timing
and reactive-fighting potential.
```

This can appear after the primary training result.

Do not show hidden raw values unless the backend says they are revealed.

---

# 49. Injury Presentation

If training causes injury:

```text
TRAINING INJURY

Minor Leg Strain

Training has been restricted for:
Speed
Agility

Estimated recovery:
2 cycles
```

Use actual medical/injury system data.

Do not invent restrictions client-side.

---

# 50. High Fatigue Warning

Before starting high-load training:

```text
HEAVY TRAINING LOAD

Fatigue
76

Training Efficiency
48%

Hard training currently carries elevated injury risk.

Suggested:
Rest
Recovery Conditioning
Light Technique
```

Do not prevent risky training unless backend validation says it is forbidden.

---

# 51. Specialization Display

Show emerging fighter identity.

Example:

```text
FIGHTER IDENTITY

Counter       78
Adaptive      67
Defensive     58
Pressure      31
Aggressive    22
```

The main specialization can be emphasized:

```text
Adaptive Counter — 68%
```

This must be derived from actual backend progression.

---

# 52. Development Breakdown

The fighter panel may expose:

```text
Genetics
Training
Combat Experience
Behavior
Traits
Condition
Career
```

For individual stats:

```text
POWER

Genetics
42.0

Training
24.8

Modifiers
+2.1

Effective
68.9
```

Do not necessarily show all of this at once.

Use collapsible/secondary detail areas if needed.

---

# 53. Visual Training Programs Should Reflect Fighter Identity

Training animations should not all look identical.

Examples:

```text
Counter:
wait → evade → punish

Pressure:
advance → strike → chase

Footwork:
circle → angle → burst

Strength:
heavy impact → reset

Endurance:
continuous movement

Discipline:
hold → observe → controlled response
```

The player should be able to roughly identify the training type just by watching.

---

# 54. Camp Ambient Life

Add lightweight environmental motion.

Examples:

```text
cloth/banner sway
dust particles
small foliage motion
moving sun shadows
subtle equipment sway
distant rooster audio
occasional background bird silhouettes
```

Avoid:

```text
large NPC crowds
complex human animation
expensive physics props
constant heavy particles
```

---

# 55. Lighting

Use cinematic but practical lighting.

Recommended:

```text
directional sunlight
soft environment fill
warm sun angle
subtle rooster rim light
contact shadows if performant
```

Avoid excessively dark scenes where rooster colors/genetics are unreadable.

The rooster model must remain visually clear.

---

# 56. Day / Weather

Do not make a full day/night/weather system part of this revamp unless one already exists.

If existing environment systems support it cheaply, integrate them.

Otherwise use one polished default lighting setup.

---

# 57. Performance Requirements

The Training Gym is a web experience.

Performance matters.

Targets:

```text
selected rooster:
full rig + normal materials + animation

background trainees:
reduced update frequency / cheaper state

station props:
static where possible

environment:
merged/static geometry where practical

shadows:
limited to important objects

particles:
bounded

animation:
no unnecessary per-frame allocations
```

Reuse existing animation optimization patterns.

---

# 58. Multiple Rooster Optimization

Recommended strategy:

```text
selected rooster
→ full update every frame

secondary visible trainee
→ normal animation but simplified UI

distant/background trainee
→ lower animation update rate or LOD

non-visible active sessions
→ no 3D rendering
```

Do not render every active training session merely because capacity allows it.

---

# 59. Scene Culling

Training stations not visible or not unlocked should not incur meaningful runtime cost.

Consider:

```text
conditional mounting
frustum culling
LOD
static instancing where appropriate
```

Do not overengineer unless profiling shows need.

---

# 60. Animation Performance

The visual training state machine should avoid per-frame object allocation.

Follow the same principle as the current animation layer system.

Use persistent state objects.

Do not create arrays/maps in `useFrame()` unless unavoidable.

---

# 61. Station Prop Motion

Moving targets should be deterministic/cosmetic.

Example:

```text
swinging reaction pad
rotating target
small hanging bag sway
```

These animations do not need physics unless existing lightweight physics can be reused safely.

Prefer scripted transforms.

---

# 62. Sparring Opponent

For controlled/hard sparring:

```text
use a second rooster model
```

Possible source:

```text
assigned sparring partner
generic gym sparring rooster
another eligible player-owned rooster
```

Use whatever backend model already supports.

Do not invent a new persistent opponent system solely for the visual scene unless necessary.

---

# 63. Sparring Collision

Do not require full combat collision/resolution.

This visual can use choreographed contact timing.

If existing battle collision helpers are cheap and reusable, use them.

Do not make visual sparring capable of changing server outcomes.

---

# 64. Training Sound

If audio infrastructure exists, add lightweight cues.

Examples:

```text
footsteps / dirt scratches
wing flaps
training pad impacts
wood creaks
ambient rooster calls
sparring clash impacts
```

Breakthrough:

```text
short distinct cue
```

Do not make audio mandatory if the project currently lacks sound architecture.

---

# 65. Responsive Behavior

Desktop:

```text
3D scene dominant
fighter panel to side
program/setup panel below or layered
```

Tablet:

```text
3D scene above
selected fighter compact overlay
program drawer below
```

Mobile:

```text
3D scene top
fighter summary below
tabs horizontally scrollable
program cards stacked
training setup as bottom drawer
```

Do not allow the UI to obscure the rooster entirely.

---

# 66. Accessibility / Non-3D Dependency

The 3D scene is presentation.

All critical training actions must remain available through normal UI controls.

A player must be able to:

```text
select fighter
select program
select intensity
preview
start
cancel
inspect result
```

without clicking 3D objects.

3D stations may also be clickable as a shortcut, but must not be the only control.

---

# 67. Optional Station Clicking

If straightforward, allow clicking a station in the scene.

Example:

```text
click Counter Station
↓
select Tactical category
↓
select Counter Drills
↓
open program preview
```

This is optional enhancement.

Do not make implementation depend on it.

---

# 68. Proposed Component Structure

Recommended:

```text
app/training/
  page.tsx

components/training/
  TrainingGymShell.tsx

  scene/
    TrainingScene3D.tsx
    TrainingCampEnvironment.tsx
    TrainingCampLighting.tsx
    TrainingCameraController.tsx
    TrainingVisualizationController.tsx
    TrainingRooster.tsx
    TrainingStation.tsx
    ActiveTrainee.tsx
    SparringPair.tsx

  ui/
    FighterSelector.tsx
    FighterDevelopmentPanel.tsx
    CoachReport.tsx

    TrainingCategoryTabs.tsx
    TrainingProgramGrid.tsx
    TrainingProgramCard.tsx

    TrainingSetupPanel.tsx
    TrainingIntensitySelector.tsx
    TrainingPreview.tsx

    ActiveTrainingPanel.tsx
    TrainingSessionCard.tsx

    TrainingCompletionModal.tsx
    BreakthroughPresentation.tsx
    PotentialDiscoveryPanel.tsx
    TrainingInjuryPanel.tsx
```

Adjust names to match repository conventions.

---

# 69. Proposed Supporting Files

```text
lib/training/visuals/
  stations.ts
  sequences.ts
  cameraPresets.ts
  types.ts
```

Example:

```text
stations.ts
→ world placement and supported programs

sequences.ts
→ visual training animation recipes

cameraPresets.ts
→ target position / offset / FOV configs

types.ts
→ visual-only frontend types
```

Keep visual metadata separate from authoritative backend training balance.

---

# 70. Program-to-Station Resolution

Create:

```ts
resolveTrainingStation(programId)
```

Example:

```ts
function resolveTrainingStation(
  programId: ProgramId
): TrainingStationDefinition | null {
  return TRAINING_STATIONS.find(
    station => station.programs.includes(programId)
  ) ?? null;
}
```

If no visual mapping exists:

```text
fall back to central training area
use generic training loop
```

Do not crash the page.

---

# 71. Animation Sequence Definitions

Recommended visual sequence type:

```ts
interface TrainingAnimationStep {
  state: AnimState;
  duration: number;

  speedMultiplier?: number;
  repeat?: number;

  moveTo?: [number, number, number];

  targetId?: string;

  cameraCue?: string;
}
```

Example Counter sequence:

```ts
const COUNTER_TARGET_SEQUENCE = [
  {
    state: "stalk",
    duration: 1.4,
  },
  {
    state: "idle",
    duration: 0.6,
  },
  {
    state: "quick_kick",
    duration: 0.5,
    cameraCue: "counter_hit",
  },
  {
    state: "recoil",
    duration: 0.4,
  },
  {
    state: "stalk",
    duration: 1.0,
  },
];
```

Do not rely on exact values here.

Tune visually.

---

# 72. Intensity and Visual Pace

Intensity can affect cosmetic animation pacing.

Example:

```text
Light
0.85x pace
longer recovery

Normal
1.0x

Hard
1.15x
shorter recovery

Extreme
1.25x
more frequent effort animation
```

Do not make the rooster move unrealistically fast.

---

# 73. Selected Fighter Highlight

Use subtle visual indication.

Possible:

```text
soft rim light
small ground marker
UI nameplate
```

Avoid giant glowing circles or arcade effects unless consistent with the rest of the game.

---

# 74. World-Space Labels

Optional.

For stations:

```text
COUNTER
STRENGTH
SPARRING
```

Use subtle labels only when useful.

Avoid clutter.

A UI overlay is acceptable instead.

---

# 75. Camp Overview Header

Top section should summarize facility state.

Example:

```text
FIGHTER CAMP

Level 3 — Fight Camp

Training Slots
2 / 4

Efficiency
110%

Combat XP
+10%

Breakthrough
+5%
```

Use actual facility config.

---

# 76. Upgrade Presentation

If facility upgrade functionality already exists, redesign it.

Show:

```text
current visual tier
next level
new station unlocks
capacity increase
efficiency change
special bonuses
cost
```

Example:

```text
UPGRADE TO PROFESSIONAL GYM

Unlocks
Reaction Station
Hard Sparring
Advanced Conditioning

Capacity
4 → 5

Fatigue Generation
-10%

Training Injury Risk
-15%

Cost
12,000 Credits
```

If upgrades are out of current scope, preserve functionality and only restyle.

---

# 77. No Placeholders

Do not ship:

```text
Coming Soon
Lorem ipsum
fake programs
fake stat values
fake trainer names
fake progress
fake breakthrough results
hard-coded chicken data
```

If data is unavailable:

```text
hide that element
show a truthful empty state
```

Example:

```text
No active training sessions.
```

---

# 78. Empty State

If the player has no eligible rooster:

```text
NO ELIGIBLE FIGHTERS

Raise a rooster to a trainable growth stage
or recover injured fighters before training.
```

The camp can remain visible.

---

# 79. Loading State

Do not replace the whole page with a spinner.

Render:

```text
camp shell
environment
UI skeletons or compact loading indicators
```

Avoid jarring transitions.

---

# 80. Error Handling

Backend errors must map to readable UI.

Examples:

```text
PROGRAM_LOCKED
→ Upgrade the Training Gym to unlock this program.

INSUFFICIENT_ENERGY
→ This fighter needs more energy before training.

TRAINING_LIMIT_REACHED
→ Training capacity is exhausted for this cycle.

TRAINING_LOCKED_BY_INJURY
→ Current injury prevents this type of training.

FACILITY_CAPACITY_FULL
→ All training slots are occupied.

CHICKEN_ALREADY_TRAINING
→ This fighter already has an active session.
```

Do not show raw error codes to players.

---

# 81. Medical State

The selected fighter panel should clearly show whether training is safe.

Example:

```text
MEDICAL STATUS

Minor Wing Strain

Restricted:
Hard Sparring
Strength

Allowed:
Technique
Discipline
Recovery Conditioning
```

Use backend medical/rehab rules.

---

# 82. Training Recommendation Logic

The UI may show recommendations based on existing backend data.

Example:

```text
RECOMMENDED

Counter Drills

Why:
Counter XP is below target.
Accuracy has strong remaining potential.
Fatigue is low enough for normal intensity.
```

Do not make recommendations authoritative.

The player can choose something else.

---

# 83. Progress Visualization

Use progress bars for:

```text
specialization
trait progress
potential knowledge
training fatigue
condition
stress
energy
```

Avoid using progress bars for every single numeric field.

Maintain hierarchy.

---

# 84. Stat Delta Feedback

After training, visually emphasize deltas.

Example:

```text
Accuracy EV
57.4 → 60.3
+2.9
```

Do not only show:

```text
Accuracy 60
```

The training result must feel tangible.

---

# 85. Effective Stat Feedback

Where useful, show:

```text
Accuracy EV +2.9
Effective Accuracy +1.2
```

This solves the previous issue where EV progress felt disconnected from combat.

---

# 86. Coach Identity

Do not require an NPC coach.

"Coach Report" can be an interface concept.

If coach characters are added later, this system can be extended.

Do not block implementation on character NPCs.

---

# 87. Training Scene Lifecycle

Recommended:

```text
page mount
↓
load gym
↓
load fighters
↓
load active sessions
↓
select default fighter
↓
build visual session map
↓
render camp
↓
focus selected fighter
```

When user selects another fighter:

```text
update selected fighter
↓
if active:
focus current station
else:
focus central yard
```

---

# 88. Active Session Restoration

On page load:

```text
for each active session
resolve station
calculate remaining time
mount visual trainee if within render budget
start animation at an arbitrary loop phase
```

Do not attempt to reconstruct exact animation state from server time.

The training animation is cosmetic.

It is acceptable to resume from a believable loop state.

---

# 89. Session Completion Detection

Frontend may periodically re-fetch or detect local expiry and request claim.

Do not resolve result locally.

Pattern:

```text
remaining time <= 0
↓
call existing claim/refresh flow
↓
receive completed result
↓
show completion state
```

Avoid excessive polling.

Use existing app data-fetch strategy if possible.

---

# 90. Scene Input

The 3D canvas should not swallow ordinary UI interactions.

Ensure:

```text
camera controls do not interfere with buttons
station clicking is optional
no drag-to-orbit required for core use
```

Prefer controlled camera composition over free orbit.

---

# 91. Free Camera

Do not make free orbit the default.

Optional limited camera look may be acceptable.

The designed camera shots should remain primary.

---

# 92. Rooster Facing / Orientation

When stationed:

```text
orient rooster toward equipment
```

For sparring:

```text
orient roosters toward each other
```

Avoid training animations playing while facing away from targets.

---

# 93. Root Motion

If current animations do not include root motion:

```text
move the rooster container separately
```

Do not edit core skeleton transforms in ways that break combat reuse.

---

# 94. Training Prop Interaction

Use approximate visual contact.

Examples:

```text
kick hits pad
pad swings
target reacts
sparring opponent recoils
```

Exact physical simulation is unnecessary.

The goal is visual believability.

---

# 95. Completion Transition

When the server result is ready:

```text
wait for current visual animation beat to finish if delay is tiny
↓
transition to complete state
↓
show result
```

Do not delay backend result excessively for visual polish.

Cap any visual delay.

---

# 96. Breakthrough Camera

Recommended:

```text
brief close-up
slightly lower angle
rooster centered
background UI dimmed
```

Avoid huge screen shake.

Training is not battle.

---

# 97. UI Layering

The 3D scene should remain visible through most panels.

Use:

```text
side panel
bottom drawer
small floating cards
```

rather than:

```text
full-screen opaque modal for every action
```

Use full/large overlays only for:

```text
major breakthrough
detailed completion report if needed
```

---

# 98. Suggested Main Components Behavior

## TrainingGymShell

Owns:

```text
selected fighter
selected category
selected program
selected intensity
active session selection
training preview state
completion result state
```

## TrainingScene3D

Owns:

```text
Canvas
environment
roosters
stations
visual animation rendering
camera
```

## FighterDevelopmentPanel

Owns:

```text
condition
energy
fatigue
stress
specialization
medical state
```

## CoachReport

Owns:

```text
strengths
gaps
recommendation
warnings
```

## TrainingProgramGrid

Owns:

```text
available programs
locked states
selection
```

## TrainingSetupPanel

Owns:

```text
intensity
preview
start action
```

## ActiveTrainingPanel

Owns:

```text
active session list
remaining time
selection
cancel action
```

## TrainingCompletionModal

Owns:

```text
persisted result display
breakthrough
potential discovery
injury
```

---

# 99. State Management

Do not introduce global state unnecessarily.

Use existing project conventions.

Training-specific state can remain local to TrainingGymShell unless multiple distant components require a shared store.

Avoid duplicate copies of authoritative session data.

---

# 100. API Integration

Use current/new Training System V3 endpoints.

Expected frontend needs:

```text
get facility
get eligible fighters
get active sessions
preview training
start training
cancel training
claim/refresh completed sessions
get persisted result
upgrade facility
```

Reuse existing routes where possible.

Do not invent duplicate frontend-only training APIs.

---

# 101. Program Metadata Source

If backend program config is server-only, expose the necessary public metadata.

Frontend needs:

```text
name
description
category
unlock level
base costs
tags
supported intensity
station mapping key if desired
```

Do not copy training balance formulas manually into React components.

---

# 102. Visual Metadata vs Gameplay Metadata

Keep these separate.

Gameplay:

```text
EV gain
XP gain
costs
fatigue
breakthrough
injury risk
```

Visual:

```text
station
camera preset
animation sequence
prop type
```

Do not make backend combat math depend on visual station metadata.

---

# 103. Training Visual Fallback

Every program must have a valid visual fallback.

If unknown program:

```text
station:
central yard

animation:
generic technique loop

camera:
fighter focus
```

This prevents future programs from breaking the Training page.

---

# 104. Testing — UI

Add tests where practical for:

```text
program selection
category filtering
intensity switching
preview loading
start button validation
active session rendering
cancel flow
completion result rendering
locked program messaging
injury restriction messaging
high-fatigue warning
```

---

# 105. Testing — Visual Mapping

Add lightweight tests for:

```text
every known program resolves to a station or fallback
locked stations respect facility level
camera presets exist
animation sequences exist
sparring programs resolve opponent-capable station
```

---

# 106. Performance Acceptance Criteria

The training page should remain smooth with:

```text
one selected rooster
multiple active session cards
up to a few visible active trainees
full environment
animated props
```

Do not accept major frame drops caused by decorative camp elements.

Profile if necessary.

---

# 107. UI Acceptance Criteria

The player should be able to answer:

```text
Which rooster am I training?

What condition is it in?

What style is it becoming?

What should I train next?

What does this program develop?

What will this session probably give me?

What will it cost?

How risky is it?

Where is the rooster training?

How long is left?

What exactly changed afterward?
```

If the UI cannot answer these clearly, the revamp is incomplete.

---

# 108. 3D Acceptance Criteria

The 3D implementation is complete when:

```text
selected rooster appears using the real model/genome

facility level visibly changes the camp

program selection maps to a believable station

camera moves to the relevant station

active training produces a looping visual drill

different training categories look meaningfully different

sparring uses two roosters

active sessions restore correctly after page reload

training visuals do not control progression

performance remains appropriate for a web app
```

---

# 109. Functional Integration Acceptance Criteria

The revamp must preserve:

```text
server-authoritative session timing
offline completion
facility capacity
program locks
energy validation
training point validation
injury restrictions
intensity
preview results
completion results
transaction safety
```

The frontend revamp must not regress Training System V3.

---

# 110. Final User Experience Target

The Training Gym should no longer communicate:

```text
"Click a button to add +2 EV."
```

It should communicate:

```text
"I am developing this specific rooster into a specific kind of fighter."
```

The player should see:

```text
the rooster
the camp
the equipment
the training behavior
the costs
the projected development
the resulting progression
```

all as one cohesive experience.

---

# 111. Final Design Rule

The finished feature should follow this rule:

```text
BREEDING
creates the raw fighter.

TRAINING
shapes the fighter.

SPARRING
tests controlled development.

REAL COMBAT
battle-hardens the fighter.
```

The Training Gym must visually and functionally sell the fantasy of coaching and developing an individual rooster.

---

# 112. Codex Implementation Priority

Implement in this order:

```text
1. New TrainingGymShell layout
2. 3D TrainingScene3D foundation
3. Real rooster model integration
4. Camp environment
5. Facility-level visual upgrades
6. Training station definitions
7. Camera controller
8. Program → station mapping
9. TrainingVisualizationController
10. Core drill animation sequences
11. Fighter Development panel
12. Coach Report
13. Category/program UI
14. Intensity + preview UI
15. Active sessions
16. Completion report
17. Breakthrough / discovery / injury presentation
18. Multiple trainee optimization
19. Responsive polish
20. Performance profiling
```

Do not postpone the 3D training environment to a later phase.

The UI and 3D environment are part of the same revamp.
