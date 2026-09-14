# Chicken Detail Page Revamp — Fighter Dossier UI/UX Spec

**Project:** Rooster Game  
**Feature:** Chicken Detail / Fighter Profile  
**Status:** Approved design direction  
**Purpose:** Replace the current spreadsheet-like chicken detail screen with a game-first fighter dossier that emphasizes identity, progression, condition, combat style, genetics, and career history.

---

# 1. Problem Statement

The current Chicken Detail page exposes a lot of useful information, but it reads like an admin dashboard rather than a game screen.

The current presentation relies heavily on:

- repeated horizontal progress bars
- raw numeric values
- dense labels
- stacked cream panels
- tab-like action buttons beside the rooster
- genetics presented as long lists of values
- behavioral values shown almost directly as raw simulation parameters

The underlying systems are deep and valuable, but the UI gives all of them equal visual weight.

This causes several problems:

1. The rooster feels like a database record rather than a fighter.
2. The player sees numbers before identity.
3. Progression does not feel exciting.
4. Genetics feel technical instead of meaningful.
5. Combat personality is difficult to understand at a glance.
6. The page feels static despite the rooster being a living 3D character.
7. Long progress-bar lists create “spreadsheet vibes.”
8. Important actions and information compete visually with minor data.
9. The player has to interpret too many raw stats manually.
10. The current page does not communicate legacy, history, trophies, rivalries, or personality strongly enough.

The revamp should keep the depth but completely change how that depth is surfaced.

---

# 2. High-Level Design Goal

The new page should feel like a combination of:

- fighter profile
- stable dossier
- premium sports management screen
- RPG character sheet
- genetics/bloodline archive
- career history
- interactive 3D showcase

The experience should answer these questions in order:

1. **Who is this rooster?**
2. **What kind of fighter is he?**
3. **How is he doing right now?**
4. **What is he good at?**
5. **How is he developing?**
6. **What are his genetics and bloodline?**
7. **What has he accomplished?**
8. **What should I do with him next?**

The rooster must always be the hero of the page.

---

# 3. Core Visual Direction

Use the newly generated visual concept as the primary reference.

## Visual tone

- dark cinematic stable/barn environment
- warm golden lighting
- subtle dust particles
- premium dark brown / black / gold palette
- smoked glass / dark translucent panels
- serif display typography for fighter names and section titles
- clean sans-serif typography for numbers and support labels
- restrained parchment/cream use
- minimal use of bright white backgrounds
- subtle vignette and depth
- polished game UI rather than website dashboard

## Key reference treatment

The main rooster presentation should resemble:

- large 3D rooster on a stone or wooden presentation platform
- cinematic barn/stable backdrop
- warm volumetric light
- optional bloodline banner / stable banner
- room for a live 3D model
- no flat black viewport box
- no generic card feel

The generated empty stable background can be used as a visual reference or implementation asset for the 3D stage.

---

# 4. New Information Architecture

Replace the current:

- Info
- Stats
- Skills
- Genes
- Evolve

with:

- **Overview**
- **Development**
- **Combat**
- **Genetics**
- **Career**

These are information sections, not actions.

Actions such as Train, Prepare, Enter Tournament, View Pedigree, Age Up, Sell, etc. should live in clear action areas instead of being mixed into section navigation.

---

# 5. Page Structure

The page should have three major zones:

1. **Hero Fighter Stage**
2. **Primary Navigation**
3. **Section Content**

---

# 6. Hero Fighter Stage

The hero area is the most important part of the page.

It should occupy a large portion of the first screen.

## Left side

Large 3D rooster presentation.

### Requirements

- use the actual rooster model
- larger than current model presentation
- no plain black viewport rectangle
- use a cinematic stable/barn background
- rooster stands on a platform or presentation base
- subtle contact shadow
- warm light from above/behind
- slight ambient fill from the front
- optional dust particles
- idle animation
- subtle head look-around
- feather/body idle motion
- occasional stance shift
- rotate camera or rooster manually
- allow player inspection

### Optional future polish

- click/drag rotate
- camera reset
- zoom
- light inspection mode
- body-zone hover when in Genetics
- pose changes depending on context
- trophy shelf or banners for champions
- scars, equipment, cosmetics, titles

---

# 7. Hero Identity Block

To the right of the 3D rooster:

## Primary identity

Example:

```text
UNTAMED DUKE ★
COMMON · GEN 0

Developing Counter Fighter
Chick · Development 35%

Healthy · Fresh · High Morale
```

The name should be visually dominant.

## Secondary fighter read

The game should summarize the rooster based on stats, behavior, experience, traits, genetics, and development.

Example:

```text
ADAPTIVE COUNTER

Observant and resilient.
Excels at reading committed attacks and punishing openings.
```

This fighter archetype should be derived automatically.

Possible examples:

- Adaptive Counter
- Pressure Brawler
- Endurance Grinder
- Evasive Striker
- Heavy Power Fighter
- Balanced Technician
- Defensive Counter
- Relentless Pressure Fighter
- Opportunistic Finisher
- Glass Cannon
- Attrition Fighter

---

# 8. Hero Quick Stats

Do not show the full raw dataset in the hero.

Show only the most meaningful combat attributes.

Example:

```text
POWER      13
SPEED      11
STAMINA     9
DEFENSE    16
ACCURACY   15
AGILITY    10
```

However, visually reduce the emphasis on long progress bars.

Use shorter stylized rating strips, compact meter segments, or small stat indicators.

The hero should prioritize:

- fighter identity
- strengths
- current status
- archetype

not detailed stat analysis.

---

# 9. Hero Actions

Place clear primary actions under or near the identity area.

Recommended actions:

- **Train**
- **Prepare**
- **Enter Tournament**
- **View Pedigree**

Use one primary gold CTA and secondary dark-gold outline buttons.

Example:

```text
[ TRAIN ] [ PREPARE ] [ ENTER TOURNAMENT ] [ VIEW PEDIGREE ]
```

Do not mix “Evolve” into navigation.

Do not put “Sell Chicken” as a large equal-priority button.

---

# 10. Overflow / More Menu

Secondary and destructive actions should live under a `•••` menu.

Example:

```text
Rename
Favorite
Move Coop
Retire
Sell
```

This reduces clutter and prevents destructive actions from looking like normal progression actions.

---

# 11. Overview Section

The Overview screen should summarize only the most important current state.

Recommended cards:

- Condition Monitor
- Mental State
- Record
- Growth & Development
- Combat Specialty
- Genetic Profile Summary

Avoid giant vertical lists.

Use a responsive card grid.

---

# 12. Condition Monitor

Current state systems should still use meters because they change continuously.

Recommended items:

- Health
- Energy
- Morale
- Fatigue
- Stress
- Condition

These are appropriate as bars.

### Example

```text
CONDITION MONITOR

Health       100
Energy       100
Morale        75
Fatigue        0
Stress         0
Condition    100

Status: HEALTHY
```

Add contextual labels:

- Healthy
- Fresh
- Tired
- Overtrained
- Injured
- Sick
- Stressed
- Recovering
- Battle Ready

Use color coding carefully.

---

# 13. Battle Eligibility

Do not show the current large plain warning box.

Replace it with a contextual status ribbon/card.

Example:

```text
NOT CLEARED TO COMPETE

Reason:
Chick has not reached battle age.

Next requirement:
Reach Juvenile stage.
```

Or, if cleared:

```text
BATTLE READY

Condition: Excellent
Energy: Full
Stress: Low
```

---

# 14. Mental State

Mental state should feel like personality and psychology rather than raw bars.

Current systems include:

- confidence
- morale
- stress

Behavior systems include:

- aggression
- caution
- patience
- riskTolerance
- pressurePreference
- counterPreference
- recoveryPreference
- persistence

Do not display them all as raw percentages by default.

Instead show interpreted states.

Example:

```text
MENTAL STATE

Confidence    Stable
Morale        High
Stress        Calm

Temperament
Aggression    High
Caution       Moderate
Patience      Moderate
Persistence   High
```

Add a generated sentence:

> Duke is eager to engage but still waits for obvious openings. He tends to continue pressing once he establishes momentum.

Exact raw values should be available under an Advanced Details expansion.

---

# 15. Behavior Presentation

Behavior should become a game-readable profile.

Instead of:

```text
aggression: 55%
caution: 45%
patience: 50%
riskTolerance: 50%
```

show:

```text
TEMPERAMENT

Aggression        Moderate
Caution           Moderate
Patience          Balanced
Risk Tolerance    Balanced
Pressure Instinct Above Average
Counter Instinct  Developing
Recovery Instinct Developing
Persistence       Moderate
```

Potential future visualization:

- temperament diamond
- four-axis personality map
- radial trait chart
- behavioral archetype badge

Use percentages only in advanced mode.

---

# 16. Record Card

Current career summary:

- wins
- losses
- KO/TKO
- championships

This should become a dedicated compact career summary.

Example:

```text
RECORD

0W - 0L
0 KO/TKO
0 Championships

Unranked
No tournament appearances
```

Future additions:

- streak
- rank
- division
- rival
- title
- best tournament finish
- most dangerous opponent
- career earnings/rewards

---

# 17. Growth & Development Card

Growth should feel like a life-stage progression system.

Example:

```text
GROWTH & DEVELOPMENT

Current Stage
CHICK

Development 35%

CHICK ---- JUVENILE ---- YOUNG ADULT ---- PRIME

Next Milestone
Juvenile

Requirements:
- Development 60%
- Basic conditioning complete

Unlocks:
- Beginner sparring
- Expanded training
- Personality stabilization
```

Use a milestone timeline instead of just an “Age Up” button.

---

# 18. Age Up / Maturity

Age Up should not always appear as a generic button.

When not ready:

```text
NEXT STAGE: JUVENILE

2 requirements remaining
```

When ready:

```text
READY TO MATURE

Duke has reached the Juvenile stage.

[ AGE UP ]
```

The action should feel like a progression event.

Possible future enhancement:

- short maturity animation
- rooster model growth morph
- unlock reveal
- new stats highlighted
- new training options revealed

---

# 19. Combat Specialty Card

This should summarize the rooster’s fighting identity.

Example:

```text
COMBAT SPECIALTY

COUNTER FIGHTER

Counter
Evasion
Defensive

Excels at reading the opponent and punishing openings.

Best when:
Patient
Accurate
Well-conditioned
```

This section should be derived from:

- natural stats
- EV training
- behavior
- experience
- learned traits
- genetics
- recent combat history

---

# 20. Development Section

The Development tab should contain:

- natural potential
- trained growth
- training allocation
- training capacity
- overtraining load
- development milestones
- training plan
- recommended training focus

---

# 21. Rename IV and EV in Presentation

Internal systems may remain IV and EV.

Player-facing labels should be clearer.

Recommended:

## Natural Potential

Subtitle:

> Genetic capability inherited at birth.

Then:

```text
Power       61    Good
Speed       52    Average
Stamina     43    Below Average
Defense     74    Excellent
Accuracy    70    Excellent
Agility     46    Average
```

Use letter grades or descriptors.

Example grading:

```text
90-100  Elite
80-89   Exceptional
70-79   Excellent
60-69   Good
50-59   Average
40-49   Below Average
30-39   Poor
0-29    Very Poor
```

Exact numbers can remain visible but should not dominate.

---

# 22. Training / EV Presentation

Use a compact allocation view.

Example:

```text
TRAINED DEVELOPMENT

0 / 100 training points invested

Power       0
Speed       0
Stamina     0
Defense     0
Accuracy    0
Agility     0

Current Specialization:
None

[ GO TO TRAINING ]
```

Once trained:

```text
SPECIALIZATION
Adaptive Counter

Defense      +28
Accuracy     +24
Stamina      +16
Counter XP   High
```

---

# 23. Training Capacity

Replace plain text like:

```text
100 training points remaining · 0/100 overtraining load
```

with a clear development card.

Example:

```text
TRAINING CAPACITY

Available Points
100 / 100

Overtraining Load
0 / 100

Status
Fresh

Recommended:
Safe to begin full training.
```

---

# 24. Recommended Training

The system should interpret the rooster and recommend development goals.

Example:

```text
RECOMMENDED DEVELOPMENT

Primary
Counter Timing

Secondary
Accuracy
Stamina

Reason
Duke has excellent natural defense and accuracy but limited stamina.
```

The recommendation can change based on:

- current stats
- target combat style
- recent losses
- trainer assignment
- behavioral weaknesses
- physical profile

---

# 25. Combat Section

The Combat tab should contain:

- combat archetype
- behavior / temperament
- mental state
- combat experience
- learned traits
- battle hardening
- strengths
- weaknesses
- matchup tendencies
- combat maturity

---

# 26. Combat Experience

The current seven-bar list should be replaced.

Current categories:

- Counter
- Evasion
- Pressure
- Recovery
- Defensive
- Offensive
- Adaptation

Use a radial mastery layout or skill wheel.

Concept:

```text
               OFFENSIVE
                   ●

       ADAPTATION       PRESSURE

EVASION        DUKE         DEFENSIVE

          RECOVERY     COUNTER
```

Each skill node can show:

- level
- XP
- current mastery
- next unlock

Example:

```text
COUNTER
Novice III

42 / 100 XP

Next:
Improved counter timing
```

---

# 27. Combat Maturity

Replace:

```text
0 clean fights survived · 15 more to Veteran
```

with a career progression line.

Example:

```text
COMBAT MATURITY

ROOKIE
◇────────◇────────◇────────◇
       SEASONED   VETERAN   ELITE

0 / 15 qualifying fights
```

Potential tiers:

- Rookie
- Seasoned
- Veteran
- Elite
- Legendary

This can tie directly to:

- survivability
- flinch resistance
- tell reading
- composure
- confidence stability
- recovery
- battle hardening

---

# 28. Traits

Learned traits should have a dedicated visually strong area.

Examples:

- Battle Hardened
- Glass Cannon
- Counter Fighter
- Survivor
- Relentless
- Calm Under Pressure

Cards should show:

```text
BATTLE HARDENED

Acquired Trait

Repeated punishment has reduced Duke's tendency to flinch under pressure.

Effects:
- Reduced flinch frequency
- Higher comeback aggression
- Improved stress resistance
```

Traits should feel earned and memorable.

---

# 29. Matchup Tendencies

Optional but recommended.

Example:

```text
MATCHUP READ

Strong Against
Aggressive pressure fighters
Slow heavy hitters

Struggles Against
High-evasion opponents
Endurance grinders
```

This should be generated from actual simulation systems, not hardcoded flavor only.

---

# 30. Genetics Section

The Genetics tab needs the largest visual change.

Do not show a long list of physical gene bars.

Use the rooster model as the primary genetics visualization.

---

# 31. Genetics 3D Inspection

Recommended layout:

Left or center:

- large 3D rooster
- interactive body hotspots

Selectable body regions:

- head
- comb
- wattle
- beak
- neck
- chest/body
- wings
- legs
- feet
- tail

When a player selects a region, show relevant genes.

Example:

```text
HEAD

Head Size
Large

Beak Length
Average

Comb
Tall

Wattle
Medium

Combat Effects
+ Improved peck reach
+ Slight stability bonus
- Larger head target profile
```

---

# 32. Physical Genes

Raw gene values can still exist in an Advanced Genetic Data section.

Default presentation should use readable labels.

Example:

```text
BODY

Scale        Medium
Body Girth   Large
Body Length  Short
Chest        Broad
Neck         Medium
```

Instead of immediately showing:

```text
bodyGirth: 1.26
neckThick: 1.27
```

---

# 33. Derived Physical Profile

This is where raw genes become game-readable.

Example:

```text
PHYSICAL ARCHETYPE

COMPACT STRIKER

Mass        ●●●○○
Reach       ●●●●○
Mobility    ●●○○○
Stability   ●●●●○
Wing Control●●●○○
Kick Power  ●●●○○
```

This should use the existing derived PhysicalProfile systems.

---

# 34. Mutations

Mutations deserve premium visual treatment.

Examples:

- Two Headed
- Giant
- Albino
- Extra Toed
- Luminescent

If a mutation exists, show a rarity badge and visual emphasis.

Example:

```text
RARE GENETIC EXPRESSION

GIANT

Recessive Mutation

Effects:
+ Increased mass
+ Greater stability
+ Increased reach
- Reduced agility
```

Do not bury mutations inside a list.

---

# 35. Bloodline

Include a clear bloodline / pedigree summary.

Example:

```text
BLOODLINE

Sire
Iron Fang

Dam
Golden Ember

Generation
Gen 0

Lineage Quality
Unproven

[ VIEW FULL BLOODLINE ]
```

For later generations, show notable inherited traits.

---

# 36. Genetics Interpretation

The game should explain what the genes mean.

Example:

> Duke has a compact, stable body with above-average defensive structure and strong head accuracy traits. His physical build favors patient counter fighting rather than high-speed evasion.

This helps casual players understand breeding outcomes.

---

# 37. Career Section

The Career tab should create attachment.

This is where the rooster becomes a story.

Recommended content:

- fight history
- tournament history
- championship history
- milestones
- rivals
- acquired traits
- scars/injuries
- major wins
- major losses
- birth record
- training milestones
- retirement / legacy

---

# 38. Career Timeline

Use a vertical story timeline.

Example:

```text
DUKE'S STORY

Born
Sep 11, 2026
Ironwood Coop

────────────

First Training
Counter drills

────────────

First Fight
vs Red Talon
WIN · TKO

────────────

Trait Acquired
Battle Hardened

────────────

Tournament Debut
Barangay Cup
Quarterfinalist

────────────

First Championship
Regional Grand Prix
Champion
```

This should be highly visual.

---

# 39. Rivalries

Future support recommended.

Example:

```text
RIVAL

RED TALON

Meetings: 3
Duke: 2 wins
Red Talon: 1 win

Last Fight
Duke won by TKO
```

This will be valuable for PvP and tournament storytelling.

---

# 40. Trophies and Titles

Championships should visibly change the rooster profile.

Examples:

- trophy displayed beside model
- banner behind rooster
- championship badge beside name
- gold frame around profile
- title under fighter name

Example:

```text
UNTAMED DUKE

PHILIPPINE GRAND CHAMPION
★★★
```

The profile should visually reflect prestige.

---

# 41. Empty States

Avoid placeholder-looking empty bars.

Example current problem:

```text
Counter 0
Evasion 0
Pressure 0
Recovery 0
...
```

Instead:

```text
COMBAT EXPERIENCE

No established combat experience yet.

Duke will begin developing combat instincts through sparring and competition.

[ START TRAINING ]
```

For career:

```text
No official fights yet.

Every champion starts somewhere.
```

For trophies:

```text
No titles earned yet.
```

Empty states should still feel intentional and game-like.

---

# 42. Dynamic Fighter Dossier

The profile should visually change depending on the rooster.

Examples:

## Counter Fighter

```text
ADAPTIVE COUNTER
Patient · Accurate · Defensive
```

## Aggressive Fighter

```text
PRESSURE BRAWLER
Relentless · Fearless · High Pressure
```

## Giant Mutation

```text
GIANT EXPRESSION
Massive · Stable · Heavy Striker
```

## Veteran

```text
BATTLE-TESTED
Veteran · Calm Under Pressure
```

## Champion

```text
REGIONAL CHAMPION
3 Tournament Titles
```

The page should never feel identical for every rooster.

---

# 43. Visual Hierarchy Rules

## Highest priority

- rooster model
- fighter name
- fighter archetype
- condition
- career status
- main action

## Medium priority

- main attributes
- development stage
- record
- training focus
- genetics summary

## Low priority

- exact raw numbers
- simulation parameters
- advanced genetic values
- internal trait values

---

# 44. Reduce Progress Bar Usage

Bars should primarily be used for:

- health
- energy
- fatigue
- stress
- development
- training load
- live XP progression

Avoid using bars for:

- every stat
- every gene
- every behavior value
- every combat experience category

Use instead:

- grades
- descriptors
- badges
- skill nodes
- radial layouts
- icon ratings
- comparative labels
- body-zone interaction
- milestone timelines

---

# 45. Responsive Layout

Desktop should prioritize a cinematic wide layout.

Recommended desktop:

```text
--------------------------------------------------
| 3D ROOSTER | IDENTITY + ARCHETYPE + QUICK STATS |
--------------------------------------------------
| Overview | Development | Combat | Genetics | Career
--------------------------------------------------
|                SECTION CONTENT                 |
--------------------------------------------------
```

On smaller widths:

- stack hero
- rooster viewport first
- identity second
- actions in horizontal scroll or stacked layout
- section tabs scroll horizontally
- cards collapse into single column

---

# 46. Interaction Design

Recommended micro-interactions:

- selected tab glows gold
- cards lift slightly on hover
- stat descriptors reveal exact values on hover
- 3D rooster subtly tracks cursor
- selected genetics body part gains highlight
- milestone unlock animates
- newly acquired traits shimmer once
- championship badge has subtle animated sheen
- condition state pulses only when critical
- hover over a stat shows explanation and sources

Avoid excessive motion.

---

# 47. Tooltips

Every important derived system should have context.

Example:

```text
Defense: 74

Natural defensive potential inherited through genetics.

Current combat performance also depends on:
- training
- fatigue
- condition
- body profile
- traits
- experience
```

This helps explain the deeper simulation without exposing formulas immediately.

---

# 48. Advanced Details Mode

Min-max players should still be able to inspect exact values.

Add:

```text
Advanced Details
```

This can reveal:

- exact IV
- exact EV
- exact behavior percentages
- physical genome scalar values
- hidden modifiers if intended
- training breakdown
- XP breakdown
- growth multipliers
- derived formulas if allowed

Default UI should remain readable and game-first.

---

# 49. Recommended Component Breakdown

Possible frontend structure:

```text
ChickenDetailsPage

├── FighterHero
│   ├── FighterStage3D
│   ├── FighterIdentity
│   ├── FighterQuickStats
│   ├── FighterArchetype
│   └── FighterActions
│
├── FighterSectionTabs
│
├── OverviewSection
│   ├── ConditionCard
│   ├── MentalStateCard
│   ├── CareerSummaryCard
│   ├── GrowthCard
│   ├── CombatSpecialtyCard
│   └── GeneticsSummaryCard
│
├── DevelopmentSection
│   ├── NaturalPotentialCard
│   ├── TrainingDevelopmentCard
│   ├── TrainingCapacityCard
│   ├── DevelopmentTimeline
│   └── RecommendedTrainingCard
│
├── CombatSection
│   ├── CombatIdentityCard
│   ├── TemperamentCard
│   ├── MentalStateCard
│   ├── CombatMasteryWheel
│   ├── CombatMaturityCard
│   ├── TraitGrid
│   └── MatchupReadCard
│
├── GeneticsSection
│   ├── GeneticsRoosterViewer
│   ├── BodyRegionInspector
│   ├── PhysicalArchetypeCard
│   ├── MutationCard
│   ├── BloodlineSummary
│   └── AdvancedGeneticsTable
│
└── CareerSection
    ├── CareerRecord
    ├── CareerTimeline
    ├── TournamentHistory
    ├── Rivalries
    ├── ChampionshipShelf
    └── MilestoneHistory
```

---

# 50. Suggested Data Transformation Layer

The UI should not directly consume raw simulation data everywhere.

Create view-model helpers.

Examples:

```ts
getFighterArchetype(rooster)
getFighterStrengths(rooster)
getFighterWeaknesses(rooster)
getTemperamentSummary(rooster)
getConditionSummary(rooster)
getNaturalPotentialGrade(value)
getDevelopmentRecommendation(rooster)
getCombatMaturity(rooster)
getPhysicalArchetype(rooster)
getGeneticStrengths(rooster)
getMatchupRead(rooster)
getCareerSummary(rooster)
```

This keeps presentation logic out of components and makes the dossier consistent.

---

# 51. Fighter Archetype Derivation

The fighter archetype should consider:

- power
- speed
- stamina
- defense
- accuracy
- agility
- aggression
- caution
- patience
- risk tolerance
- counter preference
- pressure preference
- recovery preference
- persistence
- combat XP categories
- learned traits
- body profile

Example logic direction:

```text
High defense
High accuracy
High counter preference
Moderate/high patience
Low/moderate aggression

=> Defensive Counter / Adaptive Counter
```

```text
High aggression
High pressure preference
High power
Low patience

=> Pressure Brawler
```

```text
High stamina
High persistence
High recovery
Moderate defense

=> Endurance Grinder
```

Do not make this a rigid one-stat classification.

---

# 52. Condition Interpretation

Create readable condition states.

Example:

```text
health >= 90
energy >= 80
fatigue <= 20
stress <= 20
condition >= 85

=> Battle Ready
```

Possible states:

- Perfect
- Battle Ready
- Healthy
- Fresh
- Tired
- Fatigued
- Stressed
- Overtrained
- Injured
- Recovering
- Sick
- Unfit to Fight

---

# 53. Visual Theme Tokens

Suggested direction only.

```text
Background:
near-black brown

Panel:
dark translucent brown

Panel Border:
subtle muted gold

Primary Gold:
warm amber gold

Text Primary:
warm ivory

Text Secondary:
muted sand

Success:
desaturated green

Warning:
warm amber

Danger:
muted red

Inactive:
dark charcoal
```

Do not overuse bright saturated colors.

---

# 54. Typography

Recommended hierarchy:

## Display / Serif

Use for:

- fighter names
- major section titles
- championship labels
- pedigree / bloodline headings

## Sans-serif

Use for:

- stats
- buttons
- conditions
- tooltips
- support text
- numeric values

Avoid using the serif font for all small UI labels.

---

# 55. Background Treatment

The main fighter stage should use the generated empty barn/stable concept.

Implementation options:

## Option A — Static background image

Use the generated stable image behind the live 3D rooster.

Recommended if performance needs to remain low.

## Option B — 3D stable stage

Rebuild a lightweight version using:

- wooden beams
- hay props
- barrels
- banner plane
- stone pedestal
- warm point lights
- one sun/spot light
- dust particles

This provides camera parallax and better integration with the rooster.

## Option C — Hybrid

Static background plus:

- real 3D pedestal
- real 3D rooster
- real dust particles
- dynamic contact shadow

This is likely the best visual/performance compromise.

---

# 56. 3D Rooster Presentation

The rooster viewer should support:

- idle state
- rotate
- zoom
- reset
- context camera
- dynamic scale for chick/juvenile/adult
- mutation scaling
- cosmetics
- championships
- scars
- body inspection mode

Do not allow infinite zoom.

Use sensible camera min/max distance.

---

# 57. Genetics Inspection Mode

When the player enters Genetics:

- camera can slightly zoom toward rooster
- body hotspots appear
- selected region gets subtle outline/glow
- right-side panel updates
- gene descriptors appear
- derived combat effects are listed

The 3D model becomes part of the UI instead of decoration.

---

# 58. Career Visual Progression

As the rooster grows, the hero should visually evolve.

## Chick

- smaller presentation
- softer title treatment
- development emphasis

## Young fighter

- combat specialty appears
- basic record

## Veteran

- badges
- scars
- advanced traits
- veteran banner

## Champion

- championship trophy
- title plates
- prestige framing
- trophy shelf
- special hero lighting

---

# 59. Preserve Existing Systems

This revamp should not remove the underlying mechanics.

Preserve:

- IV
- EV
- health
- energy
- fatigue
- morale
- stress
- condition
- growth stage
- behavior
- confidence
- combat XP
- combat maturity
- training capacity
- overtraining
- physical genome
- pedigree
- mutations
- traits
- record
- tournaments
- championships
- battle eligibility

The core objective is to change how the systems are presented.

---

# 60. No Placeholder Content

Do not add fake temporary values or lorem ipsum.

Every visible element should:

- use real existing data
- derive real summaries from existing data
- hide itself if no data exists
- use purposeful empty states

Do not hardcode fake:

- rivalries
- wins
- championships
- tournament finishes
- traits
- mutations
- bloodline names
- fighter archetypes

If data is unavailable, show an intentional empty state.

---

# 61. Example Final Overview Layout

```text
┌──────────────────────────────────────────────────────────────┐
│                        FIGHTER DOSSIER                       │
│                                                              │
│ [ LIVE 3D ROOSTER ]     UNTAMED DUKE ★                      │
│                         COMMON · GEN 0                       │
│                         Chick · Development 35%              │
│                                                              │
│                         ADAPTIVE COUNTER                     │
│                         Patient · Accurate · Defensive       │
│                                                              │
│                         HEALTHY · FRESH · HIGH MORALE        │
│                                                              │
│                         DEFENSE A    ACCURACY A-             │
│                         POWER B      SPEED C+                │
│                                                              │
│                         [ TRAIN ] [ PREPARE ]                │
│                         [ TOURNAMENT ] [ PEDIGREE ]          │
└──────────────────────────────────────────────────────────────┘

 OVERVIEW | DEVELOPMENT | COMBAT | GENETICS | CAREER

┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ CONDITION         │ │ MENTAL STATE      │ │ RECORD            │
│ Healthy           │ │ Calm              │ │ 0W - 0L           │
│ Energy 100        │ │ Confidence Stable │ │ Unranked          │
│ Fatigue 0         │ │ Morale High       │ │ 0 Titles          │
└───────────────────┘ └───────────────────┘ └───────────────────┘

┌───────────────────────────────┐ ┌────────────────────────────┐
│ GROWTH & DEVELOPMENT          │ │ GENETIC PROFILE            │
│ Chick                         │ │ Defense potential: A       │
│ Development 35%               │ │ Accuracy potential: A-     │
│ Next: Juvenile                │ │ Body: Compact              │
└───────────────────────────────┘ └────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ COMBAT SPECIALTY                                             │
│ Counter Fighter                                              │
│ Strong defensive structure with excellent precision.        │
└──────────────────────────────────────────────────────────────┘
```

---

# 62. Implementation Priority

## Phase 1 — Structure

- replace current tabs
- build FighterHero
- rebuild Overview
- remove long spreadsheet sections
- move sell/rename into overflow

## Phase 2 — Presentation Helpers

- fighter archetype derivation
- grade/descriptors
- temperament summary
- physical archetype
- condition interpretation
- strengths / weaknesses

## Phase 3 — 3D Stage

- new stable environment
- pedestal
- dynamic lighting
- improved camera
- idle presentation

## Phase 4 — Combat Screen

- mastery wheel
- combat maturity
- traits
- matchup read

## Phase 5 — Genetics Screen

- body-zone inspector
- derived physical profile
- mutation presentation
- bloodline summary

## Phase 6 — Career Screen

- career timeline
- tournament history
- rivalries
- trophy display
- milestones

---

# 63. Acceptance Criteria

The revamp is successful if:

1. The rooster is the visual focus of the page.
2. The first screen communicates identity before raw stats.
3. The page no longer feels like a spreadsheet.
4. Progress bars are used only where they make sense.
5. Behavior values are interpreted into readable personality.
6. Genetics are presented visually and meaningfully.
7. Growth feels like progression rather than a button.
8. Evolve is no longer a navigation tab.
9. Career and history make the rooster feel persistent.
10. Advanced players can still access exact values.
11. Existing mechanics remain intact.
12. The page matches the dark cinematic gold visual language of the concept.
13. The UI uses real data only.
14. Empty states feel intentional.
15. The new page remains usable with live 3D rendering in a web app.

---

# 64. Final Design Principle

The current screen says:

> “Here is every value stored on this chicken.”

The new screen should say:

> “This is your fighter. This is who he is, how he fights, how he is growing, what he inherited, and what he has accomplished.”

That is the core of the revamp.
