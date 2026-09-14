# PvE Campaign UI Revamp Spec

**Feature:** PvE / Road to Glory  
**Scope:** UI/UX only  
**Status:** Ready for implementation planning  
**Goal:** Replace the current list-heavy PvE presentation with a cinematic campaign interface that makes boss progression feel like a journey, gives each opponent identity, and creates anticipation before and payoff after every battle.

---

# 1. UI Direction

The PvE feature should no longer feel like:

> list of bosses → boss detail → choose rooster → start battle

It should feel like:

> campaign map → encounter → scouting → fighter selection → matchup presentation → battle → cinematic result → progression update

The UI should support the existing dark/gold Cockfight Chronicles visual identity while making the feature feel more alive, premium, and story-driven.

### Core visual principles

- Dark cinematic backgrounds
- Warm gold accents
- Translucent / glass-like panels instead of large opaque brown boxes
- Strong hierarchy with large serif display titles
- Smaller uppercase utility text for metadata
- Minimal borders
- Layered backgrounds with depth
- Large rooster renders where possible
- Fewer visible text rows at once
- More visual storytelling
- Keep navigation shell consistent with the rest of the game
- Avoid making every screen look like a dashboard

---

# 2. Screens That Need to Be Built

The revamped PvE flow requires the following screens / states:

1. **PvE Campaign Home / Road to Glory Map**
2. **Circuit / Chapter Detail**
3. **Boss Encounter Screen**
4. **Scout Report Panel / State**
5. **Fighter Selection Screen**
6. **Selected Fighter Confirmation State**
7. **Matchup / Tale of the Tape Screen**
8. **Arena Entrance / Boss Intro Sequence**
9. **Battle Scene HUD Integration**
10. **Victory / Defeat Result Screen**
11. **Post-Fight Rewards Screen**
12. **Progression / Reputation Update Screen**
13. **Boss Defeated / Node Unlock State**
14. **Challenge Received Screen**
15. **Rival Encounter Screen**
16. **Championship Qualifier Screen**
17. **Championship Event Screen**
18. **Rematch State**
19. **Locked Boss / Requirement State**
20. **Campaign Completion / Circuit Champion Screen**

Some of these can be modal states or animated overlays rather than separate routes.

---

# 3. Screen 1 — PvE Campaign Home

## Purpose

Replace the current vertical boss list.

This should be the main visual representation of PvE progression.

## Suggested title

**THE ROAD TO GLORY**

Subtitle:

> From backyard fights to the national championship.

## Layout

### Full-screen background

Use a large illustrated / rendered environment representing the current circuit.

Examples:

- rural barangay
- backyard pit
- provincial arena
- warehouse fight venue
- coliseum
- championship stadium

The campaign route is layered on top.

### Center content

Use a vertical, diagonal, or winding progression path.

Each boss appears as a node.

Node states:

- defeated
- current
- unlocked
- locked
- championship
- special challenge
- rival
- rematch available

### Example

```text
THE ROAD TO GLORY

Provincial Circuit
8 / 10 Fighters Defeated

                  [ THE VETERAN ]
                     GATEKEEPER
                        ★★★★☆
                          ●
                          │
                 ✓ Pressure King
                          │
                  ✓ Feint Master
                         ╱
                    ✓ Grinder
                       ╱
                  ✓ The Striker
```

## Current node treatment

The current available boss should be significantly larger than other nodes.

Show:

- portrait / rooster silhouette
- boss name
- difficulty
- archetype
- reward preview
- `FIGHT AVAILABLE`

## Bottom campaign panel

Show:

- chapter name
- progress
- circuit reputation
- current rank
- next championship requirement

Example:

```text
PROVINCIAL CIRCUIT

8 / 10 defeated
Rank #11
Reputation 1,820

Championship Qualifier
Requires Rank #10
```

---

# 4. Screen 2 — Circuit / Chapter Detail

## Purpose

Give each group of fights a distinct identity.

## Layout

Large hero image for the region / venue.

Overlay:

```text
CHAPTER II

THE PROVINCIAL PITS

The backyard fights are over.
Now the real competition begins.
```

Show:

- circuit icon
- location
- number of fighters
- recommended progression range
- championship reward
- chapter progress

## Optional flavor panel

Include one short paragraph describing the circuit's reputation.

Avoid long lore dumps.

---

# 5. Screen 3 — Boss Encounter

## Purpose

Turn each boss into a recognizable character rather than a stat preset.

This replaces the current generic boss detail card.

## Layout

### Left

Boss information.

### Right

Large 3D boss rooster render.

Use idle animation.

Camera can slowly orbit or subtly move.

## Header

```text
BOSS 10
PROVINCIAL CIRCUIT

THE VETERAN
★★★★☆
GATEKEEPER
```

## Flavor line

```text
"Everyone walks in thinking they're the next champion."
```

## Archetype

```text
ADAPTIVE FIGHTER
PATIENT · REACTIVE · EXPERIENCED
```

## Boss description

Keep this short.

No more than 2–3 lines.

## Known traits

Use icons.

Example:

```text
KNOWN FOR

◆ Reads repeated attacks
◆ Punishes reckless pressure
◆ Changes strategy mid-fight
```

## Fight history

```text
19 WINS
4 LOSSES
11 KOs
```

## Reward preview

```text
FIRST CLEAR

800 Credits
Combat Experience
Veteran Crest
+120 Reputation
```

## Primary CTA

**SCOUT OPPONENT**

Secondary:

**CHOOSE FIGHTER**

---

# 6. Screen 4 — Scout Report

## Purpose

Translate combat mechanics into player-readable tactical information.

Do not expose raw AI numbers unless developer/debug mode is enabled.

## Visual style

Could slide in from the side or expand within the boss encounter screen.

## Example

```text
SCOUT REPORT

OPENING
Patient. Rarely commits early.

MID-FIGHT
Starts reading repeated patterns.

WHEN PRESSURED
Defends first, then punishes overextension.

DANGER
Becomes more aggressive after recognizing your habits.

RECOMMENDATION
Use a varied fighter with enough stamina to survive a long fight.
```

## Scout confidence

Optional:

```text
SCOUTING CONFIDENCE: 72%
```

Information quality can improve based on:

- previous attempts
- career progression
- scouting upgrades
- facility upgrades
- rival history

---

# 7. Screen 5 — Fighter Selection

## Purpose

Make choosing a rooster feel like choosing a fighter, not selecting a row from a database.

## Layout

Large card carousel or horizontal roster grid.

Show 3–4 fighter cards at once.

## Fighter card

Each card should include:

- rendered rooster
- name
- style
- record
- condition
- fatigue
- key traits
- matchup summary

Example:

```text
┌───────────────────────┐
│     [3D ROOSTER]      │
│                       │
│      VINDICATOR       │
│      Aggressive       │
│                       │
│      52W · 8L         │
│                       │
│   GOOD MATCHUP        │
└───────────────────────┘
```

## Matchup tags

Possible tags:

- FAVORABLE
- GOOD MATCHUP
- EVEN
- RISKY
- BAD MATCHUP
- LOW CONDITION
- FATIGUED
- INJURED
- INEXPERIENCED

Do not reveal exact win probability.

---

# 8. Screen 6 — Fighter Confirmation

After selecting a fighter, expand it into a comparison view.

## Layout

```text
YOUR FIGHTER

VINDICATOR
Aggressive
52W · 8L · 31 KO

Condition      Excellent
Fatigue        Low
Morale         High

Traits
◆ Glass Cannon
◆ Pressure Fighter

vs.

THE VETERAN
Adaptive
19W · 4L · 11 KO
```

Primary CTA:

**CONFIRM FIGHTER**

Secondary:

**CHANGE FIGHTER**

---

# 9. Screen 7 — Tale of the Tape

## Purpose

This is the actual pre-battle matchup screen.

Reuse this component across:

- PvE
- tournaments
- championships
- PvP
- challenges
- rival fights

## Layout

Large left/right fighter presentation.

```text
PROVINCIAL CIRCUIT

        VINDICATOR
        52–8 · 31 KO

             VS

        THE VETERAN
        19–4 · 11 KO
```

Show only a few meaningful comparison attributes.

Possible:

- Fighting Style
- Experience
- Condition
- Reach
- Mass
- Momentum / Form

Do not overload with six stat bars.

## CTA

**ENTER ARENA**

---

# 10. Screen 8 — Arena Entrance / Boss Intro

## Purpose

Bridge menu UI and actual battle.

This should feel cinematic.

## Suggested sequence

### Beat 1

Fade to black.

```text
PROVINCIAL CIRCUIT
SAN JOAQUIN
```

### Beat 2

Arena establishing shot.

Crowd ambience starts.

### Beat 3

Boss introduction.

```text
THE GATEKEEPER

THE VETERAN

19–4 · 11 KO
```

Camera focuses on boss.

### Beat 4

Short boss line.

```text
"Let's see what they taught you."
```

### Beat 5

Player fighter introduction.

```text
CHALLENGER

VINDICATOR

52–8 · 31 KO
```

### Beat 6

Both fighters in frame.

```text
VINDICATOR
VS
THE VETERAN
```

### Beat 7

**FIGHT**

Battle begins immediately.

---

# 11. Screen 9 — Battle Scene HUD

## PvE-specific HUD additions

The base battle HUD should remain reusable.

PvE can add a small boss identifier.

Example:

```text
THE VETERAN
ADAPTIVE FIGHTER
```

Optional boss phase / adaptation cues should be subtle.

Examples:

```text
THE VETERAN IS READING YOUR PATTERN
```

or

```text
TACTIC SHIFT
```

Avoid constantly exposing internal AI logic.

These should feel like combat feedback, not debug notifications.

---

# 12. Screen 10 — Victory / Defeat Result

Do not immediately return to menus.

Use a cinematic result overlay.

## Victory

```text
VICTORY

THE VETERAN
DEFEATED
```

Then transition to:

```text
THE OLD GUARD FALLS
```

Short flavor copy:

> The Veteran's home winning streak has ended.

Show:

- fight duration
- knockdowns
- final condition
- notable moment
- career record update

## Defeat

```text
DEFEAT

THE VETERAN
HOLDS THE PIT
```

Then show useful feedback:

```text
WHAT HAPPENED

Repeated pressure patterns became predictable.
Your fighter's stamina collapsed late.
```

Primary CTA:

**RETURN TO CAMP**

Optional:

**REMATCH**

if allowed.

---

# 13. Screen 11 — Rewards

Separate rewards from the immediate KO popup.

## Layout

Large centered reward reveal.

```text
FIGHT REWARDS

+800 CREDITS
+320 COMBAT XP
+120 REPUTATION

NEW ITEM
VETERAN CREST
```

Animate each reward sequentially.

Optional rare reward reveal should have a larger presentation.

---

# 14. Screen 12 — Progression Update

After rewards, show what changed in the world.

Example:

```text
PROVINCIAL RANKING

#18  →  #11
```

Then:

```text
REPUTATION

1,820  →  1,940
```

Then:

```text
NEW FIGHT UNLOCKED
THE EXECUTIONER
```

This creates stronger progression feedback than simply returning to the boss list.

---

# 15. Screen 13 — Boss Defeated State

Back on the campaign map, defeated bosses should visually change.

Possible treatment:

- faded portrait
- gold checkmark
- defeated stamp
- updated path lighting
- unlocked next node animation

Example:

```text
THE VETERAN
DEFEATED
✓
```

The next node should then illuminate.

---

# 16. Screen 14 — Challenge Received

Triggered after certain victories or reputation milestones.

## Presentation

Full-screen overlay or letter/card reveal.

```text
NEW CHALLENGE

THE EXECUTIONER
HAS CALLED YOU OUT
```

Flavor:

> "Beat the old man and suddenly everyone thinks you're dangerous."

Options:

**VIEW CHALLENGE**

**LATER**

This creates events outside the normal linear path.

---

# 17. Screen 15 — Rival Encounter

Rivals should use a distinct treatment.

## Visual identity

Use stronger contrast and unique framing.

Header:

```text
RIVAL FIGHT
```

Show rivalry history:

```text
VINDICATOR vs RED KING

Meetings: 3
Vindicator: 1
Red King: 2
```

Optional rivalry line:

> "You again."

Rival fights should feel personal.

---

# 18. Screen 16 — Championship Qualifier

Once requirements are met, replace the normal node with a qualification event.

Example:

```text
PROVINCIAL CHAMPIONSHIP QUALIFIER

REQUIREMENTS

✓ Rank #10 or higher
✓ 8 circuit victories
✓ Reputation 2,000
```

CTA:

**ENTER QUALIFIER**

If locked, clearly show missing requirements.

---

# 19. Screen 17 — Championship Event

Championships should have their own event presentation.

This should not look like a normal boss fight.

## UI elements

- championship logo
- bracket / path
- venue banner
- trophy
- prize pool
- championship opponent
- event record
- previous winners

Example:

```text
PROVINCIAL CHAMPIONSHIP

FINAL

VINDICATOR
vs.
THE IRON KING

WINNER RECEIVES

Provincial Champion Title
5,000 Credits
Championship Trophy
Major Reputation Gain
```

---

# 20. Screen 18 — Rematch

Previously defeated bosses can later support optional rematches.

Show:

```text
REMATCH

THE VETERAN

Previous Result
Vindicator defeated The Veteran by KO

Opponent Growth
The Veteran has adapted since your last fight.
```

Possible rematch rewards should be reduced unless special conditions apply.

---

# 21. Screen 19 — Locked Boss State

Do not simply gray out a card.

Make requirements understandable.

Example:

```text
UNKNOWN FIGHTER

LOCKED

Defeat The Pressure King
Reach Provincial Rank #15
```

For secret bosses, intentionally hide the identity.

Example:

```text
???
SPECIAL ENCOUNTER

Requirement Unknown
```

---

# 22. Screen 20 — Circuit Champion

When the player clears a circuit, give it a real ending.

## Sequence

```text
PROVINCIAL CIRCUIT
COMPLETE
```

Then:

```text
NEW TITLE

PROVINCIAL CHAMPION
```

Show rooster hero shot.

Then:

```text
CAREER RECORD
62–8 · 38 KO
```

Show trophy.

Then unlock the next campaign region.

```text
NEW CIRCUIT UNLOCKED

THE REGIONAL CIRCUIT
```

CTA:

**CONTINUE THE ROAD**

---

# 23. Reusable Components

Build these as reusable pieces rather than hardcoding per screen.

## Campaign

- `CampaignMap`
- `CampaignNode`
- `CircuitHeader`
- `ProgressionPath`
- `CampaignProgress`
- `BossNode`
- `ChampionshipNode`
- `RivalNode`
- `LockedNode`

## Boss

- `BossHero`
- `BossIdentity`
- `BossRecord`
- `BossQuote`
- `BossTraitList`
- `ScoutReport`
- `RewardPreview`

## Fighter selection

- `FighterCarousel`
- `FighterCard`
- `MatchupTag`
- `ConditionBadge`
- `TraitBadge`
- `FighterComparison`

## Pre-fight

- `TaleOfTheTape`
- `ArenaIntro`
- `FighterIntro`
- `BossIntro`
- `VersusOverlay`

## Post-fight

- `FightResultOverlay`
- `RewardReveal`
- `RecordUpdate`
- `ReputationUpdate`
- `RankUpdate`
- `UnlockReveal`
- `ChallengeReveal`

---

# 24. UI Style System

## Panels

Prefer:

```text
background:
rgba(20, 14, 8, 0.55)

backdrop-filter:
blur(18px)

border:
1px solid rgba(214, 168, 74, 0.18)
```

Avoid fully opaque flat brown rectangles.

Use subtle inner highlights and shadows.

## Gold

Gold should indicate:

- active
- important
- legendary
- victory
- progression

Do not use bright gold on every label.

## Typography

### Display

Elegant serif.

Used for:

- boss names
- chapter names
- championships
- titles

### UI / Metadata

Clean condensed sans or small caps.

Used for:

- records
- traits
- categories
- requirements

## Hierarchy

Example:

```text
BOSS 10                   small utility text
THE VETERAN               large display title
ADAPTIVE FIGHTER          medium metadata
19–4 · 11 KO              secondary
```

---

# 25. Background Strategy

The game currently has too much empty black space.

Each major PvE screen should have environmental context.

Use:

### Campaign map
Large stylized region / countryside.

### Boss encounter
Boss-specific venue background.

### Fighter selection
Blurred arena / coop environment.

### Tale of the Tape
Dark cinematic arena tunnel.

### Results
Actual battle scene frozen / blurred behind overlay.

### Championship
Dedicated prestigious arena.

The background should carry much of the atmosphere so UI panels can stay minimal.

---

# 26. Animation Guidelines

Animations should be short and deliberate.

Recommended:

- node unlock glow
- map path illumination
- boss card entrance
- subtle 3D rooster idle
- camera orbit
- reward count-up
- rank number movement
- trophy reveal
- challenge card slide-in
- championship banner drop
- fade-to-arena transitions

Avoid:

- excessive bouncing
- constant glowing
- long blocking transitions
- mobile-game reward spam

---

# 27. Updated User Flow

```text
PVE
 ↓
ROAD TO GLORY
 ↓
SELECT CURRENT / AVAILABLE NODE
 ↓
BOSS ENCOUNTER
 ↓
SCOUT REPORT
 ↓
CHOOSE FIGHTER
 ↓
FIGHTER CONFIRMATION
 ↓
TALE OF THE TAPE
 ↓
ARENA INTRO
 ↓
BATTLE
 ↓
VICTORY / DEFEAT
 ↓
REWARDS
 ↓
CAREER RECORD UPDATE
 ↓
RANK / REPUTATION UPDATE
 ↓
BOSS / CHALLENGE / CHAMPIONSHIP UNLOCK
 ↓
RETURN TO ROAD TO GLORY
```

---

# 28. Route Suggestions

Existing routes can be restructured approximately as:

```text
/pve
/pve/circuit/[circuitId]
/pve/boss/[bossId]
/pve/boss/[bossId]/select
/pve/boss/[bossId]/fight/[sessionId]
```

Most presentation states should not require additional routes.

For example:

- scouting
- tale of the tape
- intro
- results
- rewards
- unlock reveal

can be state transitions within the encounter / fight flow.

---

# 29. Implementation Priority

## Phase 1 — Essential Revamp

Build first:

1. Road to Glory campaign map
2. Boss encounter screen
3. Scout report
4. Fighter card selection
5. Tale of the Tape
6. Arena intro
7. New result screen
8. Rewards
9. Progression unlock animation

This alone will make PvE feel completely different.

## Phase 2 — Campaign Depth

Add:

- circuit chapter screens
- reputation
- rankings
- challenge received
- rivals
- rematches
- locked requirements

## Phase 3 — Championship Presentation

Add:

- qualifier UI
- championship event page
- championship-specific entrance
- trophy presentation
- circuit-completion screen

---

# 30. What Should Be Removed

Remove / replace the following current UI patterns:

### Current PvE page

Remove:

- giant vertical boss list
- repeated identical brown rows
- stars as the primary indicator of progression

Replace with:

- visual campaign map

### Current boss page

Remove:

- basic stats-only card
- huge list of rooster names

Replace with:

- boss encounter hero
- scout report
- fighter cards

### Current pre-battle screen

Remove:

- generic centered boss card
- standalone `START BATTLE` button

Replace with:

- Tale of the Tape
- arena intro
- direct transition into battle

---

# 31. UX Principle

The player should never feel like they are navigating CRUD screens.

Each PvE screen should answer one emotional question:

### Campaign map

> Where am I in my career?

### Boss encounter

> Who am I about to fight?

### Scout report

> What makes this opponent dangerous?

### Fighter selection

> Who should I trust with this fight?

### Tale of the Tape

> How do these fighters compare?

### Entrance

> This is a real event.

### Battle

> Can my fighter pull this off?

### Result

> What just happened?

### Progression

> What did this victory change?

### Campaign return

> What's next?

---

# 32. Final Target

The PvE UI should make a fight against **The Veteran** feel like an event before the battle even begins.

The player should remember:

- where the fight happened
- why the opponent mattered
- which rooster they used
- whether the matchup looked dangerous
- how the fight ended
- what the win unlocked

PvE should feel like the career history of the player's rooster rather than a menu containing AI opponents.
