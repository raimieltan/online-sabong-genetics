# Rooster Combat Agency, Combat Evolution & Awakening System

**Date:** 2026-09-10
**Status:** Planning / Future Combat Expansion
**Scope:** Player combat agency, autonomous behavior, career-derived traits, combat evolution, signature techniques, and late-game awakenings.

---

# 1. Core Design Philosophy

The rooster combat simulator must remain fundamentally autonomous and grounded in realistic rooster fighting behavior.

The player **does not directly control individual attacks**.

The core combat rhythm remains:

```text
CIRCLE
  ↓
STALK / READ
  ↓
APPROACH / COMMIT
  ↓
CLASH
  ↓
DISENGAGE / RETREAT
  ↓
RESET
  ↓
CIRCLE
  ↓
REPEAT
```

A clash is not a single attack.

A clash should represent a short, chaotic burst where both fighters may:

* leap
* flap
* kick
* peck
* scratch
* evade
* counter
* collide
* stagger
* knock each other backward
* disengage

The player should never turn this into:

```text
Press Attack
Press Dodge
Press Counter
Press Attack
```

The game is not an action fighter.

The player is the **handler / coach**, while the rooster remains an autonomous fighter.

The design goal is:

> The player influences how the rooster approaches the fight without directly becoming the rooster.

---

# 2. Current Problem

The current coaching commands such as:

```text
PRESS
COUNTER
GUARD
RECOVER
```

lack impact.

The player can issue a command, but because the rooster has innate genetic and learned behavioral tendencies, it may not obey.

This behavior is desirable.

The problem is not imperfect obedience.

The problem is that commands currently feel like weak behavioral suggestions rather than meaningful strategic decisions.

The player needs stronger agency without destroying rooster autonomy.

---

# 3. Player Decisions Should Affect Exchanges, Not Individual Attacks

Player commands should primarily influence the **next combat exchange / clash cycle**.

For example:

```text
PLAYER COMMAND: COUNTER
```

does NOT mean:

```text
Execute counterattack animation.
```

It means:

```text
During the next engagement:

- prefer allowing opponent initiation
- increase patience
- maintain useful counter distance
- look for opponent commitment
- increase counter preference
- reduce unnecessary initiation
```

The actual result remains simulation-driven.

---

# 4. Example: COUNTER

Player selects:

```text
COUNTER
```

Possible resulting sequence:

```text
CIRCLE
↓
STALK
↓
maintain distance
↓
opponent approaches
↓
yield slightly
↓
opponent commits
↓
CLASH
↓
counter-oriented attack sequence
↓
DISENGAGE
```

However, an aggressive rooster may resist the instruction.

Example:

```text
CIRCLE
↓
tries to wait
↓
opponent approaches
↓
aggression threshold rises
↓
rooster becomes impatient
↓
initiates clash early
```

The player should SEE the rooster's personality overpowering the instruction.

Avoid reducing this to:

```text
COUNTER FAILED
```

whenever possible.

Behavior should communicate obedience/resistance naturally.

---

# 5. Example: PRESS

```text
PRESS
```

Desired behavior:

```text
shorter stalking period
↓
close distance
↓
pressure opponent
↓
attempt to initiate next clash
↓
maintain offensive commitment
↓
potentially pursue retreat
```

Aggressive roosters naturally respond well to this command.

Patient or defensive roosters may hesitate or only partially comply.

---

# 6. Example: GUARD

```text
GUARD
```

Desired behavior:

```text
maintain safer distance
↓
allow opponent to initiate
↓
prioritize defensive positioning
↓
reduce reckless clash commitment
↓
prefer early disengagement after unfavorable contact
```

This is NOT a literal shield.

It is a behavioral strategy.

---

# 7. Example: RECOVER

```text
RECOVER
```

Desired behavior:

```text
increase distance
↓
extend circling/stalking
↓
avoid initiating
↓
reduce clash commitment
↓
recover stamina
↓
engage only if forced or opportunity is exceptional
```

An extremely aggressive rooster may struggle to follow RECOVER.

---

# 8. Player Command Resolution

Actual rooster behavior should result from several competing influences.

Conceptually:

```text
Actual Behavior =
    Player Intent
  + Genetic Temperament
  + Learned Behavior
  + Combat Experience
  + Current Mental State
  + Current Physical State
  + Opponent Behavior
  + Spatial Situation
```

Player commands should therefore be influential but never absolute.

---

# 9. Command Compliance Spectrum

Avoid binary:

```text
OBEY
IGNORE
```

Use a behavioral spectrum:

```text
IGNORE
RESIST
PARTIAL
OBEY
COMMIT
```

Example:

```text
COUNTER
```

Aggressive young rooster:

```text
Ignore: 10%
Resist: 20%
Partial: 30%
Obey: 30%
Commit: 10%
```

Experienced counter fighter:

```text
Ignore: 2%
Resist: 5%
Partial: 15%
Obey: 43%
Commit: 35%
```

Exact numbers are balancing examples only.

---

# 10. Compliance Should Not Always Be Explicitly Displayed

The simulation should communicate behavior.

For example:

```text
COUNTER ordered
```

Rooster begins waiting.

Opponent approaches.

Rooster becomes restless.

Rooster suddenly rushes.

The player understands:

> "He couldn't resist attacking."

This is much more immersive than:

```text
COUNTER FAILED: RNG 0.72
```

UI feedback may still provide subtle information such as:

```text
RESTLESS
HESITATING
LOCKED IN
DISCIPLINED
```

but should not expose raw simulation calculations during normal gameplay.

---

# 11. The Circle/Stalk Phase Is the Player Decision Window

Do NOT introduce constant reaction prompts during the clash.

Avoid turning combat into:

```text
INCOMING!

[DODGE]
[COUNTER]
[BLOCK]

800ms remaining
```

That transforms the game into a reaction fighter.

Instead, use the natural quiet period between clashes.

The rhythm becomes:

```text
READ
↓
COACH
↓
STALK
↓
COMMIT
↓
CLASH
↓
WATCH
↓
DISENGAGE
↓
READ
↓
COACH
↓
...
```

This gives combat natural pacing.

---

# 12. Player Agency Philosophy

The player controls:

```text
strategy
coaching
training
breeding
fighter preparation
risk decisions
fight reading
```

The rooster controls:

```text
individual attacks
movement execution
clash decisions
micro-reactions
attack selection
exact timing
emergency reactions
```

This distinction must remain intact.

---

# 13. Do Not Add Conventional Power-Ups

Avoid generic systems such as:

```text
+50% DAMAGE
2X SPEED
INVINCIBILITY
SHIELD
RANDOM POWER-UP PICKUPS
```

These conflict with the simulation-driven identity.

Instead, future "power" systems should emerge from:

```text
GENETICS
+
TRAINING
+
COMBAT EXPERIENCE
+
CAREER HISTORY
```

---

# 14. Combat Evolution

Roosters should change because of what actually happens during their careers.

Core philosophy:

```text
Genetics
    ↓
what the rooster was born to be

Training
    ↓
what the player tries to make it

Combat Experience
    ↓
what the rooster learns

Combat Evolution
    ↓
what fighting actually turns it into
```

Two genetically similar roosters should potentially become completely different fighters after dozens of battles.

---

# 15. Career Telemetry

The combat simulator should gradually collect meaningful career statistics.

Examples:

```text
heavyHitsTaken
lightHitsTaken
clashesWon
clashesLost

knockdownsTaken
knockdownsRecovered

fightsWon
fightsLost

comebackWins
dominantWins
closeLosses

damageTakenWhilePressing
damageTakenWhileRetreating

successfulCounters
failedCounters

successfulChases
punishedChases

lowStaminaClashesWon

retaliationDamageAfterHit

successfulDisengagements

timesIntimidated

strongerOpponentsFaced

openingClashesWon
openingClashesLost

lateFightPerformance

playerCommandCompliance

playerCommandSuccess
```

Traits should emerge from patterns in this telemetry.

---

# 16. Traits Should Not Be Simple Achievement Unlocks

Avoid:

```ts
if (losses >= 10) {
  addTrait("battle_hardened");
}
```

Instead evaluate patterns.

Example:

```text
Battle Hardened
```

could consider:

```text
heavy hits taken
+
knockdowns survived
+
losses survived
+
career fight count
+
retaliation performance after taking damage
+
continued willingness to engage
```

This makes the trait represent actual fighter history.

---

# 17. Existing Example: Battle Hardened

The existing Battle Hardened concept should remain.

Example behavior:

```text
Repeatedly takes punishment / loses difficult fights
↓
develops Battle Hardened
```

Possible effects:

```text
flinch tendency ↑
retaliation power ↑
post-hit aggression ↑
commitment after recovery ↑
```

Important:

**Battle Hardened is not purely beneficial.**

It represents adaptation AND damage/history.

The rooster may have become dangerous because of its experiences while also carrying behavioral consequences.

---

# 18. Traits Should Have Tradeoffs

Avoid universally positive traits.

Examples:

## Battle Hardened

```text
+ stronger retaliation
+ increased willingness to re-engage after damage
- increased flinch tendency
- potentially less predictable
```

## Bully

Developed through repeatedly dominating weaker opponents.

```text
+ confidence against weaker fighters
+ pressure effectiveness
- careless against opponents it underestimates
- confidence can collapse when dominated
```

## Once Bitten

Developed after repeatedly being punished while chasing.

```text
+ better disengagement discipline
+ reduced reckless chasing
- may abandon legitimate chase opportunities
```

## Slow Starter

Developed after repeatedly losing early exchanges but performing well later.

```text
+ improved late-fight composure
+ patience
- lower early commitment
```

## Comeback Fighter

Developed through repeated comeback victories.

```text
+ confidence while behind
+ late-fight commitment
+ reduced panic
- may become overly comfortable fighting from behind
```

## Deep Reserves

Developed through successful low-stamina fighting.

```text
+ improved fatigue behavior
+ better low-stamina decision making
- may stay engaged longer than physically advisable
```

## Giant Killer

Developed through experience against physically superior opponents.

```text
+ reduced intimidation
+ improved tactical patience against larger opponents
- potentially overconfident against size advantages
```

---

# 19. Trait Evolution

Some traits should evolve.

Example:

```text
Battle Hardened I
↓
Battle Hardened II
↓
Battle Hardened III
```

But progression should represent behavioral development rather than simply:

```text
+5%
+10%
+15%
```

Example:

## Battle Hardened I — Shell Shocked

```text
flinch ↑↑
retaliation power ↑
confidence unstable
```

## Battle Hardened II — Tempered

```text
flinch ↑
retaliation power ↑
recovery speed ↑
confidence more stable
```

## Battle Hardened III — Unbreakable

```text
flinch resistance ↑
recovery ↑↑
post-hit commitment ↑
pressure resistance ↑
```

The rooster has learned to deal with the experiences that originally damaged its composure.

---

# 20. Trait Conflicts

Not every trait should coexist cleanly.

Examples:

```text
Bully
vs
Giant Killer

Cowardly
vs
Unbreakable

Reckless
vs
Disciplined

Slow Starter
vs
Opening Specialist
```

Some combinations may:

* suppress each other
* evolve into something new
* create unstable behavior
* become context dependent

---

# 21. Emergent Fighter Identity

The long-term goal is for players to stop seeing fighters merely as:

```text
Power: 81
Speed: 76
Agility: 83
```

and start seeing them as personalities.

Example:

```text
TANDANG

Record: 31–4

Style:
Counter Fighter

Traits:
Battle Hardened II
Comeback Fighter
Once Bitten
Deep Reserves

Behavior:
Patient
Dangerous after taking damage
Rarely chases recklessly
Strong late-fight performer
```

The fighter has a history.

---

# 22. Signature Techniques

Future expansion may allow experienced roosters to develop signature techniques.

These should NOT normally be selected from a generic skill tree.

They should emerge from repeated successful behavioral patterns.

Example:

The telemetry discovers that a rooster repeatedly:

```text
retreats
↓
baits initiation
↓
sidesteps
↓
launches flying counter
↓
wins clash
```

After enough repetition:

```text
SIGNATURE PATTERN DETECTED
```

Eventually:

```text
Signature Technique Developed:
SKY COUNTER
```

---

# 23. Signature Techniques Are Simulation Behaviors

Activating a signature technique should NOT mean:

```text
playUltimateAnimation();
deal50Damage();
```

Instead it modifies behavior to attempt to create the correct situation.

Example:

## Sky Counter

Requirements:

```text
sufficient stamina
opponent willing to initiate
appropriate distance
fighter composure
```

Behavior:

```text
create distance
↓
bait
↓
wait for commitment
↓
attempt outside angle
↓
launch explosive counter clash
```

The opponent can disrupt it.

The rooster can mistime it.

Temperament can interfere.

Positioning can prevent it.

Therefore it remains part of the simulator.

---

# 24. Example Signature Techniques

## Relentless Rush

Typically developed by highly aggressive pressure fighters.

```text
increased clash commitment
reduced voluntary disengagement
increased chase tendency
pressure-focused attack selection
```

Tradeoff:

```text
fatigue consumption ↑
counter vulnerability ↑
```

---

## Sky Counter

Typically developed by agile counter fighters.

```text
bait initiation
angle creation
explosive counter entry
```

Tradeoff:

```text
requires timing and opponent commitment
vulnerable if bait fails
```

---

## Ghost Step

Typically developed by agile evasive fighters.

```text
extended stalking
outside-angle preference
avoid frontal engagement
attack from favorable approach
```

---

## Second Wind

Typically developed by endurance/comeback fighters.

```text
temporary fatigue tolerance
improved low-stamina decision making
increased late-fight commitment
```

---

# 25. Anime Presentation Without Breaking Simulation

The underlying combat can remain grounded while the presentation becomes exaggerated.

This is an important future direction.

Use:

```text
dynamic camera
camera shake
hit-stop
slow motion
feather particles
dust
crowd reaction
motion trails
dramatic audio
brief technique names
cinematic framing
```

The simulation remains realistic.

The presentation makes exceptional moments feel legendary.

Design principle:

> Realistic simulation underneath. Anime presentation on top.

---

# 26. Awakening System

Yes:

**Super Saiyan chicken is allowed.**

However, Awakening should be an extremely rare late-game system rather than a normal consumable power-up.

A rooster should NOT simply:

```text
equip Awakening
press Awakening button
transform
```

Awakening should emerge from:

```text
rare genetics
+
advanced traits
+
career experience
+
combat conditions
+
mental state
```

---

# 27. Awakening Philosophy

An Awakening represents a fighter entering an extraordinary temporary combat state.

Visually it can be absurd.

Mechanically it should still respect the simulation.

Example trigger:

```text
Health: 11%
Stamina: 18%

Battle Hardened III
Comeback Fighter
Survivor

Opponent currently dominant
Championship/high-pressure fight
```

These conditions align.

Then:

```text
AWAKENING TRIGGERED
```

---

# 28. Awakening Presentation

Possible sequence:

```text
fighter disengages
↓
starts circling
↓
camera slowly pushes toward fighter
↓
environment audio dampens
↓
breathing becomes audible
↓
feathers begin lifting
↓
dust reacts
↓
subtle aura / visual effect
↓
trait names briefly appear
↓
AWAKENING TITLE
↓
combat resumes
```

Example:

```text
BATTLE HARDENED
COMEBACK FIGHTER
SURVIVOR

↓

AWAKENING

UNBREAKABLE
```

This should be rare enough that players remember when it happens.

---

# 29. Awakening Should Not Mean God Mode

Avoid:

```text
damage +500%
invulnerability
infinite stamina
guaranteed victory
```

Instead Awakening primarily changes mental and behavioral constraints.

Example:

```text
pain suppression ↑
flinch resistance ↑↑
fatigue tolerance ↑
commitment ↑
confidence stabilized
hesitation ↓
disengagement threshold modified
clash intensity ↑
```

A modest temporary physical improvement may be acceptable.

Example:

```text
effective power +5–15%
effective speed +5–10%
```

Exact values require balancing.

Most of the perceived transformation should come from:

```text
behavior
animation
camera
sound
VFX
```

rather than massive stat multipliers.

---

# 30. Awakening Does Not Guarantee Victory

This is critical.

An awakened rooster can still:

```text
miss
get countered
be exhausted
make poor decisions
lose
get knocked out
```

Awakening should create legendary opportunities, not predetermined outcomes.

An opponent defeating an awakened fighter should itself feel legendary.

---

# 31. Different Fighters Should Develop Different Awakenings

Awakening should reflect the fighter's career.

Examples:

## UNBREAKABLE

Likely requirements:

```text
Battle Hardened III
Survivor
high fight experience
multiple comeback situations
```

Behavior:

```text
extreme composure
flinch resistance
post-hit commitment
pressure resistance
```

---

## BERSERKER

Likely requirements:

```text
Relentless
high aggression
high confidence
dominant offensive history
```

Behavior:

```text
extreme pressure
long clashes
low disengagement
high offensive commitment
```

Major downside:

```text
defensive discipline ↓
fatigue burn ↑↑
```

---

## FLOW STATE

Likely requirements:

```text
Counter Instinct
Patient
Veteran
high successful counter history
```

Behavior:

```text
excellent timing
reduced hesitation
improved angle selection
high counter commitment
```

---

## SECOND WIND

Likely requirements:

```text
Deep Reserves
Comeback Fighter
high endurance
extensive low-stamina success
```

Behavior:

```text
temporary fatigue suppression
renewed movement
late-fight pressure
```

---

## APEX

Potential extremely rare endgame awakening.

Could require:

```text
exceptional genetics
rare mutation/genome conditions
championship experience
advanced traits
exceptional career performance
```

This should be extremely uncommon.

---

# 32. Awakenings Can Have Visual Identity

Visual effects may derive from:

```text
awakening type
genetics
mutations
fighter style
rarity
career
```

Examples:

```text
Unbreakable
→ heavy dust / grounded visual energy

Berserker
→ violent feather movement / aggressive aura

Flow State
→ restrained visual distortion / motion emphasis

Second Wind
→ breathing / feather lift / renewed posture

Apex
→ extremely rare unique presentation
```

Do not necessarily use literal magical effects unless the game's art direction eventually intentionally embraces them.

The presentation may be anime-inspired without changing the simulation into fantasy combat.

---

# 33. Relationship Between Systems

The complete fighter development pipeline becomes:

```text
GENETICS
│
├── physical traits
├── temperament
├── mutation potential
└── natural fighting tendencies
        ↓
TRAINING
│
├── EV/stat development
├── technique familiarity
├── conditioning
└── behavioral reinforcement
        ↓
COMBAT EXPERIENCE
│
├── actual fights
├── wins/losses
├── punishment
├── counters
├── fatigue experiences
└── opponent interactions
        ↓
COMBAT EVOLUTION
│
├── Battle Hardened
├── Comeback Fighter
├── Giant Killer
├── Deep Reserves
├── Bully
└── other emergent traits
        ↓
SIGNATURE BEHAVIOR
│
├── repeated successful patterns
└── signature techniques
        ↓
LEGENDARY CAREER
│
├── advanced traits
├── championships
├── rivalries
└── exceptional experiences
        ↓
AWAKENING
```

---

# 34. Fighter Career Should Tell a Story

The ultimate purpose is not simply mechanical depth.

The systems should make each fighter feel like it lived a career.

Example:

```text
TANDANG

Age: Veteran

Record:
47–6

Style:
Counter Fighter

Genetic Temperament:
Patient
Cautious
Persistent

Career Traits:
Battle Hardened III
Comeback Fighter
Deep Reserves
Giant Killer

Signature Technique:
Sky Counter

Awakening:
Flow State
```

The player should remember:

```text
"He used to panic after getting hit."

"He lost his first championship."

"That's when he became Battle Hardened."

"I trained him around counters."

"He started winning fights with that jumping counter."

"Eventually it became Sky Counter."

"Then he awakened Flow State during the championship."
```

That emotional history is more valuable than simply generating increasingly large stats.

---

# 35. Rivalries Can Eventually Interact With Combat Evolution

Future extension:

Repeated fights against the same opponent should produce opponent-specific familiarity.

Example:

```text
Tandang vs Diablo

Fight 1:
Tandang loses badly.

Fight 2:
Tandang performs better.

Fight 3:
Tandang begins recognizing Diablo's pressure tendencies.

Fight 4:
special rivalry behavior develops.
```

Possible effects:

```text
reduced intimidation
better tell recognition
specific counter preferences
increased confidence
increased emotional aggression
```

This should not simply grant:

```text
+10% damage against Diablo
```

It should influence behavior.

---

# 36. Legendary Rivalry Moments

Awakenings become especially powerful narratively when connected to rivalries.

Example:

```text
Championship Final

Tandang
vs
Diablo

Previous record:
0–2

Tandang is losing.

Health: 9%

Diablo begins stalking.

Tandang disengages.

Battle Hardened III triggers.
Comeback Fighter triggers.
Rival familiarity triggers.

Camera pushes in.

FLOW STATE

Tandang begins stalking differently.
```

The simulator still determines what happens next.

If Tandang wins:

the player remembers it.

If Tandang loses:

the moment still becomes part of its career.

---

# 37. Competitive Integrity

If the game develops serious PvP/esports ambitions, these systems must remain understandable and balanceable.

Competitive principles:

```text
no paid combat power
no purchased awakenings
no consumable stat boosts
no guaranteed ultimates
no hidden impossible-to-counter effects
```

Players should be able to inspect an opponent's known career traits before competitive matches.

Potentially:

```text
KNOWN TRAITS

Battle Hardened II
Counter Instinct
Deep Reserves

KNOWN SIGNATURE

Sky Counter

AWAKENING

Unknown
```

Some behavioral uncertainty is desirable.

Completely unknowable mechanics are not.

---

# 38. Monetization Boundary

Combat Evolution, traits, techniques, genetics and Awakenings should NOT become pay-to-win systems.

Monetization may affect presentation:

```text
awakening VFX
entrance animations
technique presentation
camera packages
crowd effects
titles
nameplates
cosmetic aura styles
fighter cosmetics
victory animations
```

but not:

```text
Awakening chance +50%
Power +20%
Premium Battle Hardened
Paid Signature Technique
```

---

# 39. UI Philosophy

Do not overwhelm the battle UI with numbers.

During normal combat, emphasize readable states.

Examples:

```text
STALKING

RESTLESS

WAITING

PRESSING

HESITATING

EXHAUSTED

LOCKED IN

BATTLE HARDENED
```

Detailed calculations can exist in:

```text
post-fight analysis
fighter profile
advanced stats
replay analysis
developer/debug mode
```

---

# 40. Post-Fight Evolution Feedback

After fights, show meaningful behavioral development.

Example:

```text
FIGHT EXPERIENCE

Tandang survived 3 heavy clashes.
Successfully countered 4 aggressive entries.
Lost 2 exchanges while chasing.
Won while below 20% stamina.

BEHAVIORAL DEVELOPMENT

Counter Instinct      +12
Deep Reserves         +8
Chase Discipline      +4

TRAIT PROGRESS

Battle Hardened II
████████░░
```

Do not necessarily expose exact unlock thresholds.

The player should understand WHY development occurred without being able to perfectly farm every trait through a checklist.

---

# 41. Anti-Farming

Combat Evolution should resist intentional farming.

Possible safeguards:

```text
diminishing experience from same opponent
opponent quality weighting
fight significance weighting
career context
minimum real risk
reduced telemetry value from trivial fights
```

A player should not be able to repeatedly fight an extremely weak opponent to manufacture:

```text
Legendary
Battle Hardened III
Apex
```

---

# 42. Emergence Over Determinism

The system should create stories the developers did not explicitly script.

Ideal result:

Player asks:

> Why does this rooster always become incredibly dangerous after getting knocked down?

Answer:

Because its genetics, career history, learned behavior, traits and current mental state produced that fighter.

Not:

> Because ChickenType42 has +30% damage below 20 HP.

---

# 43. Recommended Implementation Order

Do NOT attempt the entire system simultaneously.

## Phase 1 — Coaching Impact

Improve:

```text
PRESS
COUNTER
GUARD
RECOVER
```

Make commands influence the complete next engagement.

Implement:

```text
command intent
behavior weighting
compliance spectrum
visual behavioral response
```

---

## Phase 2 — Career Telemetry

Persist meaningful combat history.

Build generic event/stat tracking for:

```text
hits
clashes
knockdowns
counters
fatigue
retaliation
chasing
disengagement
comebacks
opponent strength
command compliance
```

Do not tightly couple telemetry to specific traits.

---

## Phase 3 — Combat Evolution

Implement an extensible trait evaluator.

Traits should consume career telemetry and current fighter state.

Start with a small number:

```text
Battle Hardened
Counter Instinct
Deep Reserves
Comeback Fighter
Once Bitten
Bully
```

---

## Phase 4 — Trait Evolution

Add:

```text
trait levels
trait conflicts
trait evolution
behavioral adaptation
```

---

## Phase 5 — Signature Techniques

Track repeated successful combat patterns.

Allow exceptional fighters to develop named signature behaviors.

Keep them simulator-driven.

---

## Phase 6 — Rivalries

Track repeated opponent interactions.

Allow opponent-specific behavioral adaptation.

---

## Phase 7 — Awakening

Only implement once:

```text
combat
traits
career telemetry
mental states
animations
VFX
camera system
```

are sufficiently mature.

Awakening should sit on top of these systems rather than bypassing them.

---

# 44. Non-Goals

Do NOT turn the game into:

```text
real-time button-mashing fighter
Pokemon-style move selection
traditional turn-based RPG
random power-up arena
stat-check autobattler
QTE reaction game
```

Do NOT remove autonomous rooster personality.

Do NOT guarantee command compliance.

Do NOT make every trait beneficial.

Do NOT make every fighter eventually identical.

Do NOT make Awakening a generic ultimate meter.

Do NOT allow Awakening to guarantee victory.

---

# 45. Core Design Pillars

All future implementation should preserve these pillars.

### 1. Autonomous Fighters

The rooster fights.

The player coaches.

### 2. Realistic Combat Rhythm

```text
Circle → Stalk → Clash → Disengage → Repeat
```

remains fundamental.

### 3. Imperfect Control

Roosters have personality.

They may resist coaching.

### 4. Visible Behavior

Personality and compliance should appear through movement and decisions rather than primarily through UI messages.

### 5. Career Consequences

Fights permanently shape fighters.

### 6. Tradeoffs

Interesting traits have advantages and disadvantages.

### 7. Emergence

Fighter identity should arise from systems rather than predefined classes.

### 8. Earned Spectacle

Anime-style moments are allowed and encouraged when they emerge from meaningful simulation states.

### 9. Simulation First

Even spectacular techniques and Awakenings must interact with the normal combat simulator.

### 10. Every Fighter Has a Story

The endgame is not merely creating the rooster with the highest stats.

The endgame is creating a fighter players become attached to because they remember what it went through.

---

# 46. North-Star Experience

A new rooster begins as:

```text
Genetics
+
Temperament
+
Physical Characteristics
```

The player trains it.

It begins fighting.

It loses.

It adapts.

It develops quirks.

The player learns how to coach it.

It develops traits.

Its fighting style becomes increasingly distinctive.

It encounters rivals.

It develops a signature technique.

It enters tournaments.

Its career produces memorable victories and defeats.

Eventually, under extraordinary circumstances:

```text
CIRCLE

...

STALK

...

Opponent approaches.

Health: 8%

The rooster has been here before.

BATTLE HARDENED III

COMEBACK FIGHTER

SURVIVOR

↓

AWAKENING

UNBREAKABLE
```

The camera changes.

The crowd erupts.

The rooster's posture changes.

The next clash begins.

And critically:

**nobody knows for certain who is going to win.**

That is the target experience.
