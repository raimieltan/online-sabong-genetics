# Rooster Combat Tell System — Reworked Specification

## 1. Purpose

The tell system exists to make player commands understandable and skill-based without turning combat into a traditional turn-based counter chart.

The player should be able to:

* watch the opponent during natural circling and stalking,
* notice physical behavior,
* infer what the opponent may be preparing,
* issue one of four coaching commands,
* see their rooster interpret that command according to its own genetics, traits, temperament, condition, confidence, and current combat state,
* then observe the result during the clash.

The core philosophy is:

> **Observe → Interpret → Command → Commit → Clash → Learn**

The player is not given the opponent's actual combat action.

They are shown physical behavior from which they must infer intent.

---

# 2. Core Combat Loop

The intended combat rhythm is:

```text
DISENGAGE
    ↓
RESET / RECOVER
    ↓
CIRCLE
    ↓
STALK
    ↓
INTENT BEGINS FORMING
    ↓
TELLS DEVELOP
    ↓
PLAYER READ / COMMAND WINDOW
    ↓
COMMITMENT
    ↓
CLOSING BURST
    ↓
CLASH
    ↓
DISENGAGE
    ↓
repeat
```

This replaces the incorrect implementation:

```text
CIRCLE
→ STALK
→ TELL
→ immediate clash
```

The tell must **not first appear immediately before the clash**.

By that point the player has no meaningful opportunity to react.

Instead, tells should develop **during Circle and Stalk**.

---

# 3. Circle and Stalk Are the Decision Phase

Do not create a visually obvious separate phase where both chickens freeze and the game announces:

```text
READ PHASE
```

The visual fight should remain continuous.

Internally, however, Circle/Stalk contains several logical stages:

```ts
type DecisionPhase =
  | "neutral"
  | "forming_intent"
  | "readable"
  | "committed";
```

Conceptually:

```text
CIRCLE / STALK
│
├── Neutral
│
│   Both chickens move naturally.
│
├── Forming Intent
│
│   AI begins deciding what it wants to do.
│
├── Readable
│
│   Physical tells become noticeable.
│   Player can react.
│
└── Committed
    Opponent has committed.
    Closing burst begins.
```

The rooster should continue:

* circling,
* changing angles,
* adjusting stance,
* closing or increasing distance,
* watching the opponent,
* stopping briefly,
* stepping laterally,
* feinting,
* repositioning.

The game must never feel like:

```text
animation
→ pause
→ choose button
→ animation
```

---

# 4. Player Commands

There are only four coaching commands.

## PRESS

**Meaning:** Close distance / seize initiative.

The player is telling the rooster:

> Push the fight.

PRESS does not necessarily mean "perform an attack immediately."

It biases behavior toward:

* closing distance,
* denying recovery,
* cutting off retreat,
* forcing engagement,
* initiating the next clash,
* taking initiative.

---

## WAIT

**Meaning:** Hold position / continue reading.

The player is telling the rooster:

> Don't commit yet.

WAIT encourages:

* patience,
* continued observation,
* maintaining spacing,
* avoiding unnecessary commitment,
* allowing the opponent to reveal more information.

WAIT is important because tells are intentionally ambiguous.

The player may suspect something but choose to gather more information.

---

## COUNTER

**Meaning:** Read and react.

The player is telling the rooster:

> Let him commit first and respond.

COUNTER biases behavior toward:

* defensive timing,
* reactive attacks,
* evasive positioning,
* intercepting committed attacks,
* punishing overextension.

COUNTER should be strongest when the player's read is correct.

It should not simply be a universal defensive button.

---

## RECOVER

**Meaning:** Conserve stamina / reset.

The player is telling the rooster:

> Don't force this exchange.

RECOVER biases behavior toward:

* increasing distance,
* lowering exertion,
* stabilizing posture,
* recovering stamina,
* resetting composure.

The tradeoff is surrendering initiative.

An opponent using PRESS may punish excessive recovery.

---

# 5. Commands Are Always Available During Circle/Stalk

The command wheel should remain available throughout the decision phase.

The player does **not** need to wait for a tell to appear.

They may issue:

```text
PRESS
WAIT
COUNTER
RECOVER
```

at any point while the fighters are circling or stalking.

This allows strategies such as:

```text
PRESS immediately
```

to seize initiative before the opponent settles.

Or:

```text
WAIT
```

to gather information.

Or:

```text
RECOVER
```

before the opponent has revealed anything.

---

# 6. Command Locking

Commands may be changed while the opponent is still forming intent.

Example:

```text
Player starts with WAIT.

Opponent begins Closing Distance.

Player changes to COUNTER.

Opponent commits.

COUNTER becomes the command used for the clash.
```

Once the opponent reaches the final commitment point, commands should lock for that exchange.

Conceptually:

```ts
if (!exchange.committed) {
  playerCommand = requestedCommand;
}

if (exchange.committed) {
  lockCommand();
}
```

The UI may briefly indicate:

```text
COMMAND LOCKED
```

but this should remain subtle.

---

# 7. Tell Design Philosophy

Tells should describe **observable body language**, not explain the correct answer.

Good:

```text
Weight Forward
Closing Distance
Wing Adjust
Head Low
Rear Leg Loaded
```

Bad:

```text
Attack Incoming
Use Counter Now
Enemy Preparing Heavy Attack
Press This Button
Enemy Weak
Guaranteed Opening
```

The tell system must never solve the fight for the player.

The player learns what physical behavior means through repeated fights.

---

# 8. Canonical Tell List

The canonical tell vocabulary consists of:

1. Weight Forward
2. Closing Distance
3. Wing Adjust
4. Head Low
5. Guard Open
6. Rear Leg Loaded
7. Hesitating
8. Recovering
9. Angle Shift
10. Side-On Stance
11. Overextended
12. Resetting

These are observations.

They are **not direct action labels**.

---

# 9. Tell: Weight Forward

## Visible Behavior

The rooster shifts its center of mass toward the opponent.

Possible animation characteristics:

* body leaning forward,
* chest moving ahead of feet,
* head slightly extending,
* rear posture tightening,
* forward step becoming more deliberate.

UI:

```text
WEIGHT FORWARD
Likely to commit
```

The subtitle should remain subtle and short.

## Likely Meaning

Weight Forward often correlates with:

* increasing aggression,
* imminent forward commitment,
* pressure,
* preparation to close distance,
* attack initiation.

It does **not** guarantee an attack.

The rooster could still:

* stop,
* feint,
* change angle,
* retreat,
* transition into another tell.

## Player Interpretation

Possible responses:

```text
COUNTER
```

if the player believes an attack is coming.

```text
WAIT
```

if the player suspects a feint.

```text
PRESS
```

if the player wants to meet aggression with aggression.

---

# 10. Tell: Closing Distance

## Visible Behavior

The opponent steadily reduces spacing.

This should look different from ordinary wandering.

Characteristics may include:

* diagonal steps toward the player,
* controlled forward movement,
* cutting off lateral escape,
* maintaining eye contact,
* reducing the circle radius.

UI:

```text
CLOSING DISTANCE
Cutting the angle
```

## Likely Meaning

Closing Distance can indicate:

* pressure,
* initiative,
* forcing the next exchange,
* preventing recovery,
* preparing a favorable entry.

It does not necessarily mean an immediate attack.

The opponent may simply be improving position.

## Player Interpretation

The player might:

* COUNTER and invite commitment,
* PRESS before being boxed in,
* WAIT to identify another tell,
* avoid RECOVER if retreat is already being denied.

---

# 11. Tell: Wing Adjust

## Visible Behavior

The rooster subtly changes wing posture.

Examples:

* wings raise slightly,
* one wing shifts position,
* elbows open,
* feathers flare,
* wing balance changes before explosive movement.

UI:

```text
WING ADJUST
```

Do not label it:

```text
Flying Attack Incoming
```

## Likely Meaning

Wing Adjust may precede:

* explosive movement,
* jump entry,
* balancing for a strike,
* directional change,
* defensive stabilization,
* feint.

This should remain one of the more ambiguous tells.

## Player Interpretation

A knowledgeable player may learn correlations between particular opponents and how they use Wing Adjust.

---

# 12. Tell: Head Low

## Visible Behavior

The rooster lowers its head and neck relative to its normal fighting posture.

Possible visual features:

* neck compression,
* lowered head line,
* eyes remaining fixed on opponent,
* stance becoming compact.

UI:

```text
HEAD LOW
```

## Likely Meaning

Depending on the fighter, Head Low can indicate:

* guarded approach,
* preparation to spring,
* low entry,
* defensive readiness,
* close-range commitment,
* pressure setup.

It should not translate directly to one combat action.

---

# 13. Tell: Guard Open

## Visible Behavior

The rooster momentarily leaves its defensive structure less protected.

Possible causes:

* repositioning,
* attack preparation,
* fatigue,
* poor balance,
* recovering from a previous movement.

UI:

```text
GUARD OPEN
```

## Likely Meaning

Guard Open represents a **potential opportunity**, not a guaranteed vulnerability.

The opponent could intentionally expose itself as bait.

Possible interpretations:

```text
PRESS
```

to exploit it.

Or:

```text
WAIT
```

if the player suspects bait.

This creates mind games.

---

# 14. Tell: Rear Leg Loaded

## Visible Behavior

One rear leg visibly takes more load.

Possible animation:

* slight body shift backward,
* rear leg compresses,
* front foot lightens,
* hips rotate slightly,
* stance briefly coils.

UI:

```text
REAR LEG LOADED
```

## Likely Meaning

Rear Leg Loaded may correlate with:

* explosive forward movement,
* kick preparation,
* jump,
* directional burst,
* counter preparation.

Again, the UI must not say:

```text
KICK INCOMING
```

The player must infer it.

---

# 15. Tell: Hesitating

## Visible Behavior

The rooster begins an action but repeatedly delays commitment.

Examples:

* short incomplete steps,
* weight shifting back and forth,
* interrupted forward movement,
* head movement without closing,
* brief stalls.

UI:

```text
HESITATING
```

## Likely Meaning

Hesitation may result from:

* uncertainty,
* low confidence,
* stress,
* conflicting instincts,
* opponent pressure,
* fatigue,
* a deliberate bait.

It could create an opening for PRESS.

But high-level opponents may deliberately imitate hesitation.

---

# 16. Tell: Recovering

## Visible Behavior

Movement becomes less aggressive.

Examples:

* slower steps,
* increased spacing,
* less frequent forward movement,
* more neutral posture,
* reduced wing activity.

UI:

```text
RECOVERING
Movement slowed
```

## Likely Meaning

The opponent is attempting to:

* regain stamina,
* reduce fatigue,
* reset composure,
* avoid an unfavorable exchange.

This is often an opportunity to PRESS.

However, some fighters may recover specifically hoping the opponent recklessly overcommits.

---

# 17. Tell: Angle Shift

## Visible Behavior

The rooster deliberately changes its relationship to the opponent rather than simply circling.

Examples:

* sharp lateral movement,
* stepping outside the opponent's line,
* redirecting its facing,
* cutting diagonally instead of maintaining the circle.

UI:

```text
ANGLE SHIFT
```

## Likely Meaning

Angle Shift can indicate:

* searching for a favorable entry,
* repositioning for attack,
* avoiding the player's preferred line,
* setting up a counter,
* breaking predictable spacing.

It is primarily a positional tell.

---

# 18. Tell: Side-On Stance

## Visible Behavior

The rooster rotates into a noticeably more lateral stance.

Possible characteristics:

* narrower frontal profile,
* one shoulder/wing leading,
* asymmetric foot placement,
* body rotated away from directly facing opponent.

UI:

```text
SIDE-ON STANCE
```

## Likely Meaning

Side-On Stance may represent:

* defensive positioning,
* preparation for lateral movement,
* loading one side,
* baiting,
* evasive readiness,
* preparation for explosive rotation.

It should be strongly influenced by fighting style.

---

# 19. Tell: Overextended

## Visible Behavior

The opponent has moved beyond a stable attacking posture.

This usually appears **after movement or an unsuccessful action**, rather than as an initial intent tell.

Examples:

* body too far forward,
* feet trailing behind center of mass,
* awkward landing,
* delayed recovery,
* poor balance after a missed movement.

UI:

```text
OVEREXTENDED
```

## Likely Meaning

The opponent may temporarily have:

* reduced defense,
* reduced evasion,
* poor balance,
* reduced counter capability.

PRESS can potentially exploit this.

COUNTER-oriented fighters may also automatically recognize this opportunity depending on skill and traits.

This tell should generally have a short lifetime.

---

# 20. Tell: Resetting

## Visible Behavior

The opponent deliberately returns to neutral posture.

Examples:

* returning feet underneath body,
* restoring normal spacing,
* turning back toward opponent,
* stabilizing wings,
* returning head posture to neutral.

UI:

```text
RESETTING
```

## Likely Meaning

Resetting indicates the opponent has finished:

* an attempted exchange,
* an aborted commitment,
* repositioning,
* defensive movement.

It does not necessarily mean the opponent is tired.

This differentiates Resetting from Recovering.

---

# 21. Recovering vs Resetting

These should remain distinct.

## Recovering

Primarily physiological.

```text
I need stamina / composure.
```

Indicators:

* slower movement,
* reduced pressure,
* larger spacing,
* fatigue-related behavior.

## Resetting

Primarily positional.

```text
I need to restore my fighting stance.
```

Indicators:

* posture normalization,
* balance restoration,
* orientation correction.

An opponent may Reset without needing to Recover.

---

# 22. Tells Should Develop Gradually

A tell should not simply appear as:

```text
WEIGHT FORWARD!
```

out of nowhere.

Internally it should have strength:

```ts
tell.strength = 0.0 → 1.0;
```

For example:

```text
0.00  invisible
0.20  animation begins
0.40  experienced player may notice visually
0.55  HUD may recognize tell
0.75  clear readable tell
1.00  strong commitment
```

This creates a spectrum rather than a binary event.

---

# 23. Visual Tell Before HUD Tell

Ideally, the physical animation begins **before the text label appears**.

Example:

```text
1.5s
Opponent begins leaning forward.

1.8s
Player may visually recognize it.

2.1s
HUD:
WEIGHT FORWARD

2.8s
Opponent commits.

3.2s
Closing burst.

3.5s
CLASH
```

Skilled players can therefore react earlier than players relying entirely on HUD assistance.

This creates mastery.

---

# 24. Tell Timing

Example exchange:

```text
0.0s
Previous clash ends.

0.0–0.8s
Disengage.

0.8–2.0s
Neutral circling.

2.0s
Opponent begins forming intent.

2.0–3.8s
Tell develops.

2.4–3.8s
Primary player decision window.

3.8s
Opponent commits.

3.8–4.3s
Closing burst.

4.3s
Clash begins.
```

These values should **not be fixed**.

Timing should vary according to:

* fighting style,
* aggression,
* patience,
* fatigue,
* confidence,
* personality,
* traits,
* battle state,
* opponent behavior.

---

# 25. Variable Decision Windows

Different exchanges should feel different.

Example A:

```text
long circle
→ Weight Forward
→ long readable window
→ clash
```

Example B:

```text
short circle
→ Rear Leg Loaded
→ rapid commitment
→ clash
```

Example C:

```text
long stalk
→ Closing Distance
→ Angle Shift
→ Weight Forward
→ clash
```

Example D:

```text
circle
→ Hesitating
→ Resetting
→ no clash
→ stalking continues
```

Example E:

```text
Recovering
→ player PRESS
→ opponent forced to respond early
→ clash happens before intended recovery finishes
```

The combat simulator should not guarantee that every tell leads directly into a clash.

---

# 26. Multiple Tells

A fighter may display several tells during one decision phase.

Example:

```text
Closing Distance
        ↓
Angle Shift
        ↓
Rear Leg Loaded
        ↓
Weight Forward
        ↓
commit
```

But the HUD must not display everything simultaneously.

Maximum recommended visible HUD tells:

```text
1 primary tell
+
optional 1 secondary tell
```

The physical animation can contain more information than the UI.

---

# 27. Tell Priority

When multiple tells exist, determine a primary tell.

Example priority considerations:

```ts
priority =
  tellStrength
  * gameplayImportance
  * visibility
  * confidence;
```

The UI should surface the most meaningful current observation.

Avoid:

```text
WEIGHT FORWARD
CLOSING DISTANCE
REAR LEG LOADED
ANGLE SHIFT
HEAD LOW
WING ADJUST
```

appearing simultaneously.

That creates information overload.

---

# 28. Tell Persistence

Tells need different lifetimes.

Short tells:

```text
Rear Leg Loaded
Overextended
Wing Adjust
```

Medium tells:

```text
Weight Forward
Head Low
Angle Shift
Guard Open
```

Longer state-like tells:

```text
Closing Distance
Recovering
Hesitating
Side-On Stance
Resetting
```

Do not use the same timeout for every tell.

---

# 29. Tell Confidence

Not every read should be equally reliable.

Internally:

```ts
interface CombatTell {
  type: TellType;
  strength: number;
  confidence: number;
}
```

Confidence can depend on:

* how strongly the animation is expressed,
* opponent experience,
* fighter skill,
* fatigue,
* feints,
* distance,
* visibility,
* current movement.

This allows:

```text
Weight Forward
```

to sometimes be very predictive and sometimes ambiguous.

---

# 30. Feints

Feints should use the **same tell vocabulary**.

Do not create:

```text
FEINT DETECTED
```

as a normal tell.

Example:

```text
Weight Forward
    ↓
player selects COUNTER
    ↓
opponent cancels commitment
    ↓
Angle Shift
    ↓
opponent PRESSes from new angle
```

The player learns:

> Weight Forward does not always mean he is definitely attacking.

This is necessary for high-level PvP.

---

# 31. Fighting Style Changes Tell Behavior

The same tell should mean slightly different things depending on the opponent.

## Aggressive Fighter

Frequently shows:

* Weight Forward
* Closing Distance
* Rear Leg Loaded

Transitions quickly from tell → commitment.

---

## Counter Fighter

Frequently shows:

* Side-On Stance
* Head Low
* Angle Shift

May deliberately wait for the player to PRESS.

---

## Endurance Fighter

Frequently uses:

* Recovering
* Resetting
* Hesitating

May deliberately extend decision phases.

---

## Balanced Fighter

Uses a wider mixture without extreme tendencies.

This means learning an opponent's style is useful.

---

# 32. Individual Fighter Habits

Roosters should develop readable tendencies.

Example Fighter A:

```text
Rear Leg Loaded
```

is strongly associated with jumping attacks.

Fighter B:

```text
Rear Leg Loaded
```

often precedes a feint.

Therefore the player learns fighters rather than memorizing universal icons.

This is especially important for rivals and tournament opponents.

---

# 33. Tell Readability Tiers

Not all tells should be equally subtle.

## Obvious

Usually highly visible:

* Overextended
* obvious Recovering
* severe Hesitating caused by fear/fatigue

## Moderate

Common tactical information:

* Weight Forward
* Closing Distance
* Head Low
* Rear Leg Loaded
* Guard Open

## Subtle

More advanced reads:

* Wing Adjust
* Angle Shift
* Side-On Stance
* deliberate Resetting
* feint variations

High-level opponents should rely more heavily on subtle tells.

---

# 34. Condition Influences Tells

Condition must affect both combat capability and presentation.

A fatigued rooster may display:

* Recovering more frequently,
* slower Resetting,
* more obvious Weight Forward,
* delayed Wing Adjust,
* increased Hesitating.

A fresh rooster may:

* hide intentions better,
* commit faster,
* transition between tells more cleanly.

---

# 35. Injuries Affect Tell Presentation

Injuries should naturally alter posture and therefore tells.

Examples:

Leg injury:

```text
Side-On Stance
Angle Shift
Hesitating
```

may become more common.

Wing injury:

```text
Wing Adjust
```

may become visibly abnormal.

Body injury:

```text
Weight Forward
```

may become less stable.

Do not create giant labels such as:

```text
LEFT LEG INJURY — ATTACK NOW
```

The clinic/injury systems should feed naturally into combat behavior.

---

# 36. Confidence and Morale

Mental state influences tells.

High confidence can produce:

* more Closing Distance,
* stronger Weight Forward,
* fewer aborted commitments.

Low confidence can produce:

* Hesitating,
* Resetting,
* longer stalking periods,
* retreating after feints.

Desperation can cause:

* faster commitments,
* poor Guard Open states,
* more Overextended moments.

---

# 37. Battle-Hardened Fighters

Battle-hardened fighters should become harder to read.

Possible effects:

* shorter visible tell duration,
* smoother transitions,
* reduced unnecessary Hesitating,
* better concealment,
* more believable feints.

This creates a gameplay benefit without simply granting raw stats.

---

# 38. Player Skill Comes From Pattern Recognition

The intended progression is:

### Beginner

```text
WEIGHT FORWARD
```

Player thinks:

> Something aggressive might happen.

### Intermediate

Player notices:

> This fighter usually goes forward after Weight Forward.

### Experienced

Player notices:

> He only commits when Weight Forward is followed by Rear Leg Loaded.

### Expert

Player notices:

> He showed Weight Forward early because he wants me to Counter. He's baiting it.

This is the desired skill ceiling.

---

# 39. Commands Should Not Hard-Counter Tells

Never implement:

```ts
if (tell === "weight_forward" && command === "counter") {
  guaranteedWin = true;
}
```

Instead commands alter probabilities and behavior.

Conceptually:

```text
Opponent intent
+
Opponent stats
+
Opponent traits
+
Opponent condition
+
Opponent confidence

versus

Player command
+
Player rooster stats
+
Player rooster temperament
+
Player rooster compliance
+
Player rooster condition
+
Current spacing
+
Current initiative
```

produces the exchange.

---

# 40. Example Command Relationships

These are tendencies, not hard rules.

| Observation      | PRESS                     | WAIT                  | COUNTER               | RECOVER                |
| ---------------- | ------------------------- | --------------------- | --------------------- | ---------------------- |
| Weight Forward   | risky contest             | gather info           | often useful          | potentially dangerous  |
| Closing Distance | contest initiative        | risk being pressured  | invite commitment     | difficult              |
| Wing Adjust      | interrupt possible        | observe               | prepare reaction      | risky                  |
| Head Low         | pressure possible         | observe               | reasonable            | situational            |
| Guard Open       | exploit opening           | test bait             | conservative          | usually wastes opening |
| Rear Leg Loaded  | disrupt setup             | risky read            | potentially strong    | risky                  |
| Hesitating       | often strong              | allows reset          | unnecessary sometimes | safe if needed         |
| Recovering       | punish recovery           | lets opponent recover | low value             | mutual reset           |
| Angle Shift      | regain initiative         | observe positioning   | prepare response      | risk losing position   |
| Side-On Stance   | force action              | study opponent        | potentially useful    | situational            |
| Overextended     | strong punish opportunity | wastes opening        | possible punish       | usually poor           |
| Resetting        | disrupt reset             | allow neutralization  | wait for recommit     | recover simultaneously |

Again:

**none of these are guarantees.**

---

# 41. Rooster Compliance

The player is a coach, not directly controlling the rooster.

Commands are interpreted through the fighter.

Example:

```text
Player: COUNTER

Adaptive counter fighter:
"Wait for commitment and punish."

Highly aggressive fighter:
"I'll wait... but only briefly."

Low-discipline fighter:
May ignore the command and PRESS anyway.
```

This preserves the game's genetics and personality systems.

---

# 42. Command Feedback

The player needs visible evidence that commands matter.

When a command is accepted, behavior should visibly change.

## PRESS

* circle radius decreases,
* forward movement increases,
* opponent is cut off,
* body becomes more assertive.

## WAIT

* spacing maintained,
* fewer commitments,
* more deliberate tracking.

## COUNTER

* rooster gives slight space,
* stance becomes reactive,
* movement becomes measured.

## RECOVER

* distance increases,
* movement slows,
* posture relaxes slightly.

Without physical feedback, commands will feel placebo-like.

---

# 43. Command Compliance UI

Avoid binary:

```text
COMMAND ACCEPTED
COMMAND IGNORED
```

Prefer subtle behavioral communication.

Possible tiny HUD status:

```text
PRESS
Following
```

or:

```text
COUNTER
Reluctant
```

or:

```text
RECOVER
Overridden
```

Only show this when necessary.

The animation should carry most of the information.

---

# 44. Suggested State Model

```ts
type CombatPhase =
  | "disengage"
  | "circle"
  | "stalk"
  | "closing"
  | "clash";

type DecisionState =
  | "neutral"
  | "forming_intent"
  | "readable"
  | "committed";

type PlayerCommand =
  | "press"
  | "wait"
  | "counter"
  | "recover";

type TellType =
  | "weight_forward"
  | "closing_distance"
  | "wing_adjust"
  | "head_low"
  | "guard_open"
  | "rear_leg_loaded"
  | "hesitating"
  | "recovering"
  | "angle_shift"
  | "side_on_stance"
  | "overextended"
  | "resetting";
```

Example:

```ts
interface ActiveTell {
  type: TellType;

  strength: number;
  confidence: number;

  startedAt: number;

  hudVisible: boolean;
}
```

---

# 45. Intent and Tell Separation

This distinction is extremely important.

The actual combat intent might be:

```ts
intent = {
  action: "jump_attack",
  target: "head",
  aggression: 0.82,
  commitment: 0.68
};
```

But the player should never receive that directly.

Instead:

```ts
tells = [
  "rear_leg_loaded",
  "wing_adjust",
  "weight_forward"
];
```

The simulator knows the intent.

The player sees its physical consequences.

---

# 46. Intent Should Form Before Commitment

Do not immediately lock an AI action.

Use something similar to:

```text
provisional intent
        ↓
movement/tells
        ↓
possible reconsideration
        ↓
commitment
```

This permits:

* feints,
* hesitation,
* response to player pressure,
* aborted attacks,
* changing angles,
* adaptive fighters.

---

# 47. Player Commands Can Affect Opponent Intent

The decision phase should not be entirely predetermined.

Example:

```text
Opponent begins Recovering.

Player selects PRESS.

Player rooster rapidly closes distance.

Opponent abandons recovery.

Opponent shifts:
Recovering
→ Head Low
→ Rear Leg Loaded

Clash occurs.
```

The player's command has therefore changed the exchange **before the clash even starts**.

This is essential.

Otherwise the decision phase is merely watching a predetermined cinematic.

---

# 48. Decision Window UI

During Circle/Stalk:

```text
              OPPONENT

          [ Weight Forward ]
           Likely to commit

        rooster         rooster


     PRESS        WAIT

     COUNTER      RECOVER
```

The tell should appear near the opponent or somewhere visually associated with them.

Do not use giant center-screen banners.

---

# 49. HUD Escalation

### Neutral Circle

Minimal UI.

```text
commands visible
no major tell
```

### Tell Developing

A subtle tell appears.

```text
Weight Forward
```

### Strong Read

Tell becomes more readable.

```text
WEIGHT FORWARD
Likely to commit
```

### Commitment

HUD reduces.

Opponent begins closing burst.

### Clash

Tell UI disappears.

The player watches the action.

---

# 50. Clash UI

During the clash, reduce cognitive UI.

Do not show a pile of tells.

At this point the player has already made the decision.

Focus on:

* animations,
* impacts,
* injuries,
* stamina consequences,
* reactions,
* positioning,
* momentum.

After disengagement, information can return.

---

# 51. Post-Clash Feedback

The player needs to understand whether their read worked.

Examples:

```text
GOOD READ
```

should generally be avoided as a giant arcade popup.

Instead show subtle consequences:

```text
Counter landed cleanly
```

or:

```text
Pressure denied recovery
```

or:

```text
Caught while recovering
```

Eventually these may appear in post-fight analysis instead of during combat.

---

# 52. No Universal Tell-to-Command Recipe

The game should deliberately avoid becoming:

```text
Weight Forward = Counter
Recovering = Press
Guard Open = Press
Rear Leg Loaded = Counter
```

That would become a reaction minigame.

Instead:

```text
tell
+
fighter tendencies
+
spacing
+
condition
+
previous behavior
+
fight context
```

determine the player's interpretation.

---

# 53. History Matters

Players should learn opponents across repeated exchanges.

Example:

```text
Exchange 1:
Weight Forward → attack

Exchange 2:
Weight Forward → attack

Exchange 3:
Weight Forward → feint

Exchange 4:
Weight Forward...
```

Now the player must decide:

> Is he attacking again, or is he baiting my Counter because I've reacted the same way twice?

That is where the system becomes strategically interesting.

---

# 54. Opponent Adaptation

Advanced opponents may track player command tendencies.

Example:

```text
Player frequently COUNTERs Weight Forward.
```

Adaptive opponent learns:

```text
Weight Forward
→ cancel
→ player settles into counter posture
→ opponent Recover / Angle Shift
```

Or:

```text
Weight Forward
→ feint
→ player COUNTER
→ opponent PRESS from another line
```

Adaptive behavior should become more common at higher-level PvE and PvP.

---

# 55. Tell Memory / Scouting

Future systems may record observed tendencies.

Example opponent scouting card:

```text
Observed Tendencies

Weight Forward
Often commits afterward

Rear Leg Loaded
Frequently followed by aerial entries

Recovering
Usually genuine
```

Do not provide exact percentages initially.

The game should feel like accumulated fight knowledge.

---

# 56. Recommended HUD Tell Count

At any given instant:

```text
0–1 tells normally
```

Occasionally:

```text
2 tells
```

Rarely:

```text
3 simultaneous meaningful observations
```

Never display all current internal signals.

The simulator may track many variables internally.

The player-facing layer should remain readable.

---

# 57. Full Tell Reference

| Tell             | Primary Observation                     | Common Interpretation                    |
| ---------------- | --------------------------------------- | ---------------------------------------- |
| Weight Forward   | center of mass moves forward            | likely commitment / pressure             |
| Closing Distance | spacing decreases deliberately          | forcing engagement                       |
| Wing Adjust      | wings reposition                        | explosive movement / balance preparation |
| Head Low         | head/neck lowers                        | guarded or loaded approach               |
| Guard Open       | defensive structure temporarily exposed | possible opening or bait                 |
| Rear Leg Loaded  | rear leg takes load                     | explosive movement preparation           |
| Hesitating       | interrupted/incomplete movement         | uncertainty or bait                      |
| Recovering       | movement slows and spacing grows        | stamina/composure recovery               |
| Angle Shift      | deliberate lateral reposition           | changing attack/defense line             |
| Side-On Stance   | body turns laterally                    | defensive/evasive/loading posture        |
| Overextended     | center of mass exceeds stable stance    | temporary vulnerability                  |
| Resetting        | posture returns to neutral              | positional stabilization                 |

---

# 58. Exact Tell Labels

Use these exact primary names:

```text
Weight Forward
Closing Distance
Wing Adjust
Head Low
Guard Open
Rear Leg Loaded
Hesitating
Recovering
Angle Shift
Side-On Stance
Overextended
Resetting
```

Avoid replacing them with instructional names.

---

# 59. Optional Interpretation Subtitles

Subtitles should remain very short, preferably fewer than four words.

Examples:

```text
Weight Forward
Likely to commit
```

```text
Closing Distance
Cutting the angle
```

```text
Recovering
Movement slowed
```

Most tells do not necessarily need a subtitle.

The physical observation itself should eventually become enough.

---

# 60. Rejected Naming Style

Do not use:

```text
Attack Incoming
Heavy Attack
Counter Opportunity
Enemy Weak
Use Press
Use Counter
Defend Now
Guaranteed Opening
Flying Attack Incoming
Kick Incoming
```

These expose simulator information rather than presenting observable behavior.

---

# 61. Desired Player Experience

The desired sequence is:

```text
Opponent begins circling.

Player watches.

Opponent starts Closing Distance.

Player stays on WAIT.

Opponent Angle Shifts.

Player continues watching.

Rear Leg Loaded appears.

Player suspects commitment.

Player chooses COUNTER.

Opponent surges forward.

Player's rooster gives space.

Opponent commits.

CLASH.

Player's rooster catches the entry cleanly.

Both disengage.

Next read begins.
```

The important moment is:

```text
Rear Leg Loaded
        ↓
"I think he's going."
        ↓
COUNTER
```

Not:

```text
ATTACK INCOMING
        ↓
PRESS COUNTER NOW
```

---

# 62. Another Desired Sequence

```text
Opponent shows Weight Forward.

Player remembers:
last two times this fighter attacked afterward.

Player selects COUNTER.

Opponent does not commit.

Weight returns neutral.

Angle Shift appears.

Player realizes it was a feint.

Opponent begins Closing Distance from the side.

Player changes to PRESS before commitment.

Both collide aggressively.

CLASH.
```

This is the type of emergent mind game the system should support.

---

# 63. Critical Implementation Rule

The current bug/design problem is:

> Tells only appear immediately before the clash.

This must be changed.

The tell-generation system must run while the fighter is:

```ts
phase === "circle"
||
phase === "stalk"
```

not only while:

```ts
phase === "closing"
||
phase === "pre_clash"
```

The decision window must occur **before closing commitment**.

---

# 64. Recommended Timeline

A normal exchange can resemble:

```text
0.0
Disengage

0.7
Circle begins

1.5
Stalking begins

2.0
Opponent forms provisional intent

2.2
Physical tell begins

2.5
HUD identifies tell

2.5–4.0
PLAYER DECISION WINDOW

3.1
Second contextual tell may appear

4.0
Opponent commits

4.0
Command locks

4.0–4.5
Closing burst

4.5+
CLASH
```

Timing must vary.

---

# 65. Read Window Duration

The player should usually have enough time to:

1. see the movement,
2. understand it,
3. decide,
4. click a command,
5. see their rooster begin responding.

Rough target:

```text
~1.5–3.0 seconds
```

for ordinary readable commitments.

Fast/aggressive fighters can occasionally give shorter windows.

Patient or exhausted fighters can provide longer ones.

Avoid making every window identical.

---

# 66. No Artificial Freeze

Never freeze either rooster simply because the player is choosing.

The decision window is part of live movement.

The player should feel like they are coaching from ringside.

---

# 67. Information Hierarchy

The player sees three layers of information.

## Layer 1 — Physical Animation

Most important.

Examples:

```text
lean
stance
distance
wing motion
foot loading
angle
```

## Layer 2 — Tell Label

Accessibility/readability aid.

Example:

```text
Weight Forward
```

## Layer 3 — Interpretation

Rare/subtle helper.

Example:

```text
Likely to commit
```

Long-term gameplay should increasingly reward Layer 1 understanding.

---

# 68. Combat Should Remain Realistic-Looking

Even though the system contains game mechanics, animation should still follow the established fight rhythm:

```text
circle
stalk
read
burst
clash
disengage
reset
```

The clash itself remains:

* fast,
* chaotic,
* multi-action,
* physically intense.

The tactical decision happens primarily **before** that chaos.

---

# 69. Clash Is the Payoff, Not the Decision Screen

The player does not need to micro-command individual pecks, kicks, jumps, or wing strikes.

Their job is to influence:

* approach,
* initiative,
* patience,
* reaction,
* recovery.

Once the clash begins, the rooster's combat simulation takes over.

This preserves:

* genetic behavior,
* fighting style,
* traits,
* stats,
* animation realism,
* unpredictability.

---

# 70. System Goal

The final combat rhythm should feel like:

```text
WATCH
↓
NOTICE
↓
THINK
↓
COMMAND
↓
COMMIT
↓
EXPLOSION
↓
RESULT
↓
RESET
```

Not:

```text
WAIT
↓
POPUP
↓
CLICK CORRECT BUTTON
↓
WATCH A
```
