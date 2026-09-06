# V2 — Combat Choreography, Impact & Physical Battle Presentation

The procedural rooster animation system has now been implemented.

Do NOT replace it.

Do NOT rewrite the animation system.

This task is to build the **combat choreography and physical presentation layer on top of it.**

The backend remains authoritative.

---

# CORE RULE

## Backend decides WHAT happened.

## This system decides HOW it looks.

Never calculate:

* hit/miss
* damage
* critical
* attack selection
* target selection
* knockdown outcome
* death
* combat RNG

Those already come from the backend.

This task only turns backend combat events into cinematic visual sequences.

---

# 1. REMOVE THE "DASH → COLLIDE → DAMAGE" FEEL

The current battle should NOT visually behave like:

```text
attacker moves forward
→ collider touches defender
→ damage
→ attacker moves away
→ repeat
```

Instead create:

```text
NEUTRAL
   ↓
APPROACH
   ↓
FACE OPPONENT
   ↓
ANTICIPATION
   ↓
ATTACK ANIMATION
   ↓
CONTROLLED LUNGE
   ↓
IMPACT
   ↓
HIT STOP
   ↓
DEFENDER REACTION
   ↓
KNOCKBACK / STAGGER / KNOCKDOWN
   ↓
ATTACKER RECOVERY
   ↓
SPACING RESET
   ↓
NEUTRAL
```

Every attack should have readable phases.

---

# 2. CREATE ATTACK CHOREOGRAPHY

Create a data-driven attack choreography system.

Example:

```ts
interface AttackChoreography {
  id: string;

  animation: AnimationId;

  anticipation: number;
  active: number;
  recovery: number;

  lungeDistance: number;

  impactTime: number;

  hitStop: number;

  recoveryDistance?: number;
}
```

Example:

```ts
heavy_kick: {
  animation: "heavy_kick",

  anticipation: 0.30,
  active: 0.15,
  recovery: 0.55,

  lungeDistance: 1.0,

  impactTime: 0.72,

  hitStop: 0.08
}
```

Adapt this to the actual animation controller created in the previous task.

---

# 3. ATTACK PHASES

Every attack must have:

```text
APPROACH
ANTICIPATION
ACTIVE
IMPACT
RECOVERY
COMPLETE
```

Expose the current phase to the animation system.

Example:

```ts
attack.phase === "ANTICIPATION"
```

This allows procedural layers to react differently depending on the phase.

---

# 4. CONTROLLED ATTACK LUNGES

Do NOT use normal steering physics for the entire attack.

During an attack:

```text
normal locomotion
      ↓
attack begins
      ↓
movement becomes choreography-controlled
      ↓
controlled lunge
      ↓
impact
      ↓
recovery
      ↓
normal locomotion
```

The attacker should visually move toward the opponent during the attack.

Do not simply teleport.

Use smooth interpolation/easing.

The lunge should reach the target around the attack's impact point.

---

# 5. DISTANCE MANAGEMENT

Create combat spacing.

Define:

```ts
idealCombatDistance
attackRange
minimumCombatDistance
maximumCombatDistance
```

Before an attack:

```text
too far
→ approach
→ correct distance
→ attack
```

After an attack:

```text
too close
→ separate
→ return to combat distance
```

Do not allow fighters to permanently occupy the same location.

---

# 6. FACING

Before attacks:

```text
attacker
    ↓
turn toward defender
    ↓
attack
```

Do not allow a rooster to kick/peck in a completely incorrect direction.

Use smooth rotation.

Do not snap instantly unless the rotation is extremely small.

---

# 7. IMPACT SYSTEM

When the backend reports a HIT:

Create a strong visual impact.

Sequence:

```text
attack animation
      ↓
impact frame
      ↓
HIT STOP
      ↓
impact VFX
      ↓
camera reaction
      ↓
defender recoil
      ↓
knockback/stagger
```

Do NOT determine the hit from collision.

The backend event triggers the impact.

---

# 8. HIT STOP

Create a centralized hit-stop controller.

Example:

```ts
triggerHitStop(duration)
```

Suggested values:

```text
light hit:     0.03–0.05 sec
medium hit:    0.04–0.07 sec
heavy hit:     0.06–0.10 sec
critical:      0.08–0.12 sec
```

During hit-stop:

* pause battle animation presentation
* pause relevant procedural movement
* pause attack choreography
* keep UI responsive
* do not freeze the entire React application

After hit-stop:

resume exactly where the presentation left off.

---

# 9. HIT REACTIONS

Use the procedural animations from the previous task.

Backend result determines the reaction.

Example:

```text
damage small
→ hit_light

damage medium
→ hit_medium

heavy impact
→ hit_heavy

critical
→ hit_critical
```

If backend explicitly provides a reaction type, use that.

Do NOT independently calculate reaction type if the backend already provides it.

---

# 10. STAGGER

When backend produces stagger:

```text
current animation
→ impact
→ stagger
→ recovery
→ ready stance
```

During stagger:

* disable attacking
* reduce normal movement
* maintain opponent facing
* allow procedural balance movement

The rooster should visually struggle to regain balance.

---

# 11. KNOCKBACK

When backend produces knockback:

Use the existing physics/presentation movement.

The defender should:

```text
impact
→ recoil
→ body reacts
→ move backward
→ stabilize
```

Use:

* physics impulse where appropriate
* procedural recoil
* wing reaction
* leg stabilization

Do not allow normal AI steering to immediately cancel the knockback.

---

# 12. KNOCKDOWN

When backend produces knockdown:

```text
impact
→ knockback
→ balance lost
→ knockdown animation
→ ground
→ settle
```

While knocked down:

* disable attack
* disable normal locomotion
* prevent standing until getup
* stabilize physics if necessary

Then:

```text
knockdown
→ getup
→ combat stance
```

---

# 13. DEATH

When backend reports death:

```text
current state
→ final reaction
→ death animation
→ collapse
→ settle
```

After death:

```text
NO
idle

NO
walking

NO
attacking

NO
AI movement
```

The rooster remains dead until the battle presentation ends.

---

# 14. MISS / DODGE

If backend reports MISS:

Do NOT play an impact.

Instead:

```text
attack
→ miss
→ attacker follow-through
→ recovery
```

For dodge:

```text
attacker attack
→ defender dodge animation
→ attack misses
→ attacker recovery
```

The defender can use:

* backstep
* sidestep
* body lean
* head movement

depending on the backend event.

---

# 15. ATTACKER RECOVERY

This is critical for eliminating robotic combat.

After every attack:

```text
attack
→ follow-through
→ recovery
→ return to stance
```

Do NOT immediately start another attack.

Even if the backend produces consecutive attacks, presentation should transition through the proper animation phases.

---

# 16. COMBAT PACING

Create short neutral beats between attacks.

Example:

```text
attack
→ impact
→ reaction
→ recovery
→ 0.2–0.8 sec neutral
→ next event
```

During neutral:

* idle breathing
* head movement
* subtle foot movement
* facing opponent
* small weight shifts

This makes the fight feel intentional rather than machine-gun combat.

---

# 17. COMBO PRESENTATION

If the backend produces consecutive attacks:

Do not invent attacks.

Instead chain the actual backend events into readable choreography.

Example backend:

```text
PECK
HIT
KICK
HIT
HEAVY_KICK
HIT
```

Presentation:

```text
Peck windup
→ peck
→ impact
→ recoil
→ quick transition
→ kick
→ impact
→ stagger
→ heavy kick windup
→ impact
```

The client must NEVER add an attack that the backend didn't send.

---

# 18. PHYSICAL COLLIDERS

Your rooster already has a bone structure.

Add optional presentation colliders/hit regions around:

```text
Head
Chest
WingL
WingR
ThighL
ThighR
Beak
```

These are NOT authoritative combat hitboxes.

They exist for:

* physical impact positioning
* debugging
* VFX placement
* future physics
* visualization

Backend results always override collider results.

---

# 19. IMPACT PHYSICS

When a backend hit occurs:

Apply physical presentation based on the backend result.

Examples:

```text
light hit
→ small recoil

heavy hit
→ strong recoil

critical
→ large recoil + stronger knockback presentation
```

Use spring/damping where appropriate.

Avoid directly setting huge position changes.

---

# 20. VFX

Create a small reusable VFX system.

At minimum:

```text
light_impact
heavy_impact
critical_impact

dust
landing_dust
knockback_dust
```

Impact effects should appear at the approximate contact point.

Use the existing rooster geometry / colliders to help determine the visual contact location.

Again:

**The collider does not decide whether the hit happened.**

---

# 21. CAMERA

Create a camera director.

Support:

```text
battle_start
approach
attack
impact_light
impact_heavy
critical
knockback
knockdown
death
victory
```

Examples:

### Battle start

Wide shot showing both fighters.

### Approach

Medium framing.

### Attack

Subtle push-in.

### Heavy impact

Short:

* camera shake
* zoom
* framing adjustment

### Knockback

Follow defender.

### Knockdown

Pull back slightly.

### Death

Hold on the defeated rooster.

### Victory

Hero framing around winner.

---

# 22. CAMERA RULES

Never:

* violently shake constantly
* clip through models
* lose both fighters unnecessarily
* snap between angles
* zoom excessively

Use smooth interpolation/damping.

Camera effects should be short and purposeful.

---

# 23. PHYSICAL GENETICS

Use existing physical traits for presentation.

For example:

```text
large body
→ heavier recoil

large legs
→ stronger-looking kicks

large wings
→ more wing movement

high agility
→ faster transitions

large mass
→ reduced visual knockback
```

These modifiers are PRESENTATION ONLY.

Do not alter backend combat math.

---

# 24. COMBAT PERSONALITY

If the backend exposes a combat style/personality, use it visually.

Examples:

### Aggressive

* shorter neutral beats
* larger attack anticipation
* stronger forward movement

### Defensive

* more backsteps
* more spacing
* longer neutral periods

### Heavy

* slower windups
* strong impacts
* large recovery

### Agile

* faster transitions
* quicker turns
* smaller recoveries

Again:

Do not alter what the backend decides.

Only alter presentation.

---

# 25. DEBUG MODE

Create a debug overlay showing:

```text
Current Event
Attacker
Defender

Current Animation
Current State
Attack Phase

Distance
Hit Stop

Knockback
Stagger

Camera Cue
```

Also allow optional visualization of:

* presentation colliders
* attack range
* ideal combat distance
* current target
* attack lunge path

---

# 26. PERFORMANCE

Use the existing R3F architecture.

Do NOT use React state every frame.

Prefer:

* refs
* imperative controllers
* cached Three.js objects
* centralized `useFrame`
* reusable Vector3/Quaternion

Avoid allocations inside `useFrame`.

---

# 27. DO NOT BREAK EXISTING SYSTEMS

The following must remain authoritative/existing:

* backend combat
* combat RNG
* damage calculations
* chicken genetics
* physical profile
* chicken identity
* existing renderer
* existing physics
* existing AudioEngine

Integrate with them rather than replacing them.

---

# 28. AUDIO

Use the existing AudioEngine.

Trigger:

```text
attack_whoosh
light_hit
heavy_hit
critical_hit
stagger
knockdown
landing
death
victory
```

Audio must be triggered from presentation events.

Do not create a second audio engine.

---

# 29. FINAL EXPERIENCE

The resulting battle should feel closer to:

```text
        ┌───────────────┐
        │    NEUTRAL    │
        └───────┬───────┘
                ↓
           APPROACH
                ↓
          FACE TARGET
                ↓
          WINDUP
                ↓
          ATTACK
                ↓
        CONTROLLED LUNGE
                ↓
             IMPACT
                ↓
           HIT STOP
                ↓
       ┌────────┴────────┐
       ↓                 ↓
     MISS               HIT
       ↓                 ↓
   RECOVERY         REACTION
                         ↓
                STAGGER / KNOCKBACK
                         ↓
                    RECOVERY
                         ↓
                    SPACING
                         ↓
                      NEUTRAL
```

The battle should no longer feel like two capsules repeatedly colliding.

It should feel like two physical animals fighting.

---

# 30. IMPLEMENTATION

First inspect the animation system you just implemented.

Then inspect the existing combat event/timeline system.

Integrate with both.

Do not create duplicate animation or combat systems.

Actually implement the choreography.

Do not merely describe it.

At the end report:

1. Files created
2. Files modified
3. Attack choreography implemented
4. Hit/reaction pipeline implemented
5. Knockback/knockdown implementation
6. Hit-stop implementation
7. Camera cues
8. VFX/SFX
9. Distance management
10. Debug tools
11. Any limitations
12. Exact testing procedure
