# TASK — Rebuild the Global Battle Matchup Screen

Rebuild the existing pre-battle / versus screen as a reusable cinematic game UI used by ALL battle types.

This is NOT tournament-specific.

The same matchup presentation should be reused for:

- PvE fights
- PvE bosses
- sparring
- tournaments
- championships
- live PvP
- challenges
- exhibition fights
- any future battle mode

The battle source/mode should only change the metadata and flavor shown around the same shared matchup scene.

Do NOT change combat logic, matchmaking logic, tournament logic, APIs, stats, persistence, or server-authoritative systems.

This task is frontend/presentation only.

---

# CORE GOAL

Replace the current web-style matchup layout with a polished fighting-game VS screen.

The screen should feel like:

FIGHTER A
        VS
FIGHTER B

with the actual 3D roosters standing prominently inside a cinematic arena.

The attached concept image is the primary visual reference.

Do not recreate it as a static image.

Build the composition with real UI + the existing live rooster renderer.

The matchup scene should become a reusable component such as:

<BattleMatchupScreen />

or

<PreFightScene />

with battle-type-specific props.

Example API:

<BattleMatchupScreen
  fighterA={fighterA}
  fighterB={fighterB}
  mode="pve"
  event={...}
  onFight={...}
/>

Supported mode values may include:

"pve"
"boss"
"spar"
"tournament"
"championship"
"pvp"
"challenge"

---

# 1. NO SIDEBAR

Do not use the old permanent left sidebar on this screen.

This is an immersive game state.

Use only the global compact game HUD/header if the current shell requires it.

The actual matchup should occupy almost the entire viewport.

Hierarchy:

TOP HUD
↓
FULL-SCREEN MATCHUP SCENE

The fight scene is the primary visual content.

---

# 2. FULL-SCREEN ARENA ENVIRONMENT

Use the existing/generated arena background as the full backdrop.

It should cover the whole matchup area.

Do NOT place the matchup inside a giant dashboard card.

Use:

- full-bleed arena image
- dark vignette
- blue atmospheric gradient from left
- red atmospheric gradient from right
- subtle central spotlight
- optional dust / particle effects

The arena must remain clearly visible behind the UI.

---

# 3. ACTUAL 3D ROOSTERS

Critical requirement:

DO NOT use static rooster images.

Use the existing 3D chicken rendering system so the screen displays the actual fighters.

Reuse the live:

- GLB model
- genome
- feather colors
- patterns
- physical proportions
- body mutations
- physical profile
- visual traits

The player's rooster must look exactly like the rooster they bred.

The opponent should use the opponent's actual data as well.

Create a presentation-oriented Three.js component if needed:

<MatchupFighterStage />

This stage should render:

LEFT FIGHTER
facing slightly toward center

RIGHT FIGHTER
facing slightly toward center

The two models should be large and occupy a significant amount of screen space.

Do not render them as tiny previews inside cards.

Suggested visual scale:

left rooster:
~30–38% screen height

right rooster:
~30–38% screen height

They should feel like characters in a fighting game.

---

# 4. FIGHTER POSITIONING

Composition:

LEFT 35%
fighter A

CENTER 30%
VS + comparison + fight CTA

RIGHT 35%
fighter B

Roosters should stand near the bottom ground plane and face one another.

LEFT:
slightly angled inward

RIGHT:
mirrored inward

Keep enough space between them so the VS and stat comparison remain readable.

---

# 5. BLUE CORNER VS RED CORNER

Use visual corner identity.

LEFT:

BLUE CORNER

- deep navy tint
- muted cyan highlights
- blue stat bars
- blue corner border details

RIGHT:

RED CORNER

- deep burgundy tint
- crimson highlights
- red stat bars
- red corner border details

Do NOT turn the whole screen into two opaque rectangles.

Use subtle translucent gradients over the environment.

---

# 6. MODE HEADER

The top-center header changes depending on battle type.

Examples:

PvE:

PVE CHALLENGE
THE VETERAN

Boss:

BOSS FIGHT
THE CHAMPION

Spar:

SPARRING MATCH
TRAINING BOUT

Tournament:

CHAMPIONSHIP
QUARTERFINALS

Championship:

TITLE FIGHT
GRAND FINAL

PvP:

LIVE CHALLENGE
RANKED MATCH

Challenge:

RIVAL CHALLENGE

The reusable screen should accept:

eyebrow
title
subtitle

Example:

eyebrow="CHAMPIONSHIP"
title="QUARTERFINALS"
subtitle="BEST ROOSTERS. NO EXCUSES."

Do not hardcode tournament-specific text into the global component.

---

# 7. FIGHTER INFORMATION

Each side should have fighter information layered beside/behind the rooster.

Do NOT use oversized conventional cards.

Use lightweight translucent HUD panels.

LEFT:

RONIN

Reyes Bloodline

GEN 0
CHAMPION
BALANCED
VETERAN

Power       ██████
Speed       ███████
Stamina     █████
Defense     █████
Accuracy    █████
Agility     █████

RIGHT mirrors this structure.

Information hierarchy:

1. fighter name
2. bloodline
3. generation
4. important badges
5. combat stats

Do not show every database field.

This is a matchup screen, not the rooster detail page.

---

# 8. CENTER VS PRESENTATION

Center should be dramatic.

Use a large:

VS

in gold.

Add subtle radial rays / glow behind it.

Under VS:

contextual match info.

Examples:

MATCH 1 OF 3

ROUND 2

BOSS 4 OF 10

RANKED MATCH

EXHIBITION

This comes from props.

---

# 9. DIRECT STAT COMPARISON

Under the VS, display compact mirrored comparison bars.

Example:

63   ██████  POWER    █████   59
65   ███████ SPEED    ███████ 65
53   █████   STAMINA  ███     36
53   █████   DEFENSE  ███████ 79
53   █████   ACCURACY ██████  60
53   █████   AGILITY  █████   56

Left bars blue.

Right bars red.

Make the stronger side slightly brighter.

Do not make this enormous.

It should support the matchup rather than dominate it.

---

# 10. RECENT FORM

Bottom-left:

RECENT FORM

W W L W W

16W - 6L - 5KO

Bottom-right:

RECENT FORM

W L L W W

17W - 10L - 6KO

Use actual combat history when available.

If not available, hide this section rather than inventing data.

For bosses without historical records, replace with useful mode-specific info:

BOSS RECORD

UNDEFEATED

or

DIFFICULTY
★★★★★

The component must support this variation.

---

# 11. PRIMARY FIGHT ACTION

The biggest interactive element should be bottom-center:

⚔ FIGHT

Subtitle:

"Let the bloodlines speak."

or mode-specific flavor text.

Use:

- aged gold gradient
- dark text
- broad button
- subtle glow
- tactile hover/press

This should be the clear primary CTA.

For modes requiring preparation, secondary actions can appear beside it:

[ ADJUST STRATEGY ]
[ VIEW DETAILS ]

or

[ CHANGE FIGHTER ]

depending on context.

Never show irrelevant actions.

---

# 12. PRE-FIGHT STRATEGY INTEGRATION

Because the combat system supports coaching / strategy behaviors, the matchup screen is a natural place for preparation.

If available, include:

[ ADJUST STRATEGY ]

This may open a modal/drawer showing:

Fighting Style
Aggression
Patience
Risk
Counter Preference
Pressure Preference
Recovery Preference

Do not clutter the default screen with all of this.

Keep it behind the secondary action.

---

# 13. CONTEXT-SPECIFIC DATA

The same component must gracefully adapt.

## PvE

Show:

PVE CHALLENGE

opponent title
difficulty
reward

Example:

THE VETERAN
Difficulty ★★★
Reward 500 credits

---

## Boss

Show:

BOSS FIGHT

THE CHAMPION
FINAL BOSS

Potential reward / first-clear reward.

---

## Sparring

Show:

SPARRING MATCH

No major championship decoration.

Display:

Training Match
No permanent ranking effect

---

## Tournament

Show:

CHAMPIONSHIP
QUARTERFINALS

Match 1 of 3

Tournament name/location if available.

---

## PvP

Show:

LIVE CHALLENGE

Opponent username
rank
rating
latency indicator if relevant

Do not show tournament terminology.

---

# 14. MATCHUP TRANSITION

This should feel like entering combat.

Add a short transition sequence.

Example:

0ms
arena fades in

150ms
blue/red corner gradients slide in

250ms
fighter names appear

350ms
roosters enter / fade into position

500ms
VS slams into center

650ms
stats reveal

850ms
FIGHT button becomes active

Keep total duration roughly:

600–1000ms

Do not make players wait through long animations every fight.

Allow repeat fights to use shortened transitions if necessary.

---

# 15. FIGHT START TRANSITION

When player presses FIGHT:

1. disable button
2. subtle camera push
3. UI fades away
4. VS contracts/disappears
5. blue/red gradients fade
6. transition into BattleCanvas / live combat scene

Avoid a hard browser-like route flash.

If routing requires navigation, use a fullscreen transition overlay to hide the switch.

The goal is to feel like:

MATCHUP
→
FIGHT

not:

WEB PAGE
→
ANOTHER WEB PAGE

---

# 16. RESPONSIVENESS

Desktop is primary.

Target first:

1920×1080
1680×1050
1440×900
1366×768

Maintain the core:

fighter / VS / fighter

composition.

On narrower displays:

- reduce rooster scale
- simplify secondary metadata
- reduce stat panel width
- keep FIGHT visible

Do not stack the fighters vertically on normal laptop resolutions.

---

# 17. COMPONENT ARCHITECTURE

Prefer reusable components.

Suggested structure:

components/battle-matchup/

BattleMatchupScreen.tsx
BattleMatchupHeader.tsx
MatchupFighterStage.tsx
MatchupFighterHUD.tsx
MatchupComparison.tsx
MatchupRecentForm.tsx
MatchupActions.tsx
MatchupAtmosphere.tsx

Potential type:

type BattleMatchupMode =
  | "pve"
  | "boss"
  | "spar"
  | "tournament"
  | "championship"
  | "pvp"
  | "challenge";

interface BattleMatchupScreenProps {
  fighterA: Chicken;
  fighterB: Chicken;
  mode: BattleMatchupMode;

  title?: string;
  eyebrow?: string;
  subtitle?: string;

  matchLabel?: string;

  reward?: BattleReward;
  difficulty?: number;

  fighterARecentForm?: CombatRecord[];
  fighterBRecentForm?: CombatRecord[];

  onFight: () => void;
  onBack: () => void;
  onAdjustStrategy?: () => void;
  onViewDetails?: () => void;
}

Adapt to the actual existing types instead of duplicating domain models.

---

# 18. ROUTE INTEGRATION

Inspect all routes that currently launch combat:

app/battle/[chickenId]
app/pve
app/pve/[bossId]
app/spar/[chickenId]
app/tournament/[chickenId]
app/live
and any challenge/PvP routes

Identify duplicated pre-fight UI.

Replace duplicated matchup views with the shared:

BattleMatchupScreen

Do not copy/paste the screen into every route.

Each route should simply provide:

- fighter A
- fighter B
- mode
- metadata
- callbacks

---

# 19. IMPORTANT VISUAL RULE

The attached concept is a COMPOSITION reference, not a literal tournament-only design.

The reusable visual grammar is:

CINEMATIC ARENA
+
LARGE REAL 3D FIGHTERS
+
BLUE / RED CORNERS
+
CENTER VS
+
COMPACT HUD INFO
+
STAT COMPARISON
+
BIG FIGHT CTA

That visual grammar should remain consistent across every combat mode.

Mode-specific text and decoration may change, but the player should always recognize:

"I am at the pre-fight matchup screen."

---

# 20. DO NOT

Do not:

- use the old sidebar
- render tiny roosters inside cards
- use giant opaque dashboard containers
- use HTML select inputs on this screen
- make tournament-specific assumptions
- duplicate matchup UI per route
- alter combat logic
- replace actual rooster rendering with static images
- turn the page into a stats spreadsheet

This should look and behave like a fighting game's VS screen.

The rooster models and arena are the main content.

Everything else is HUD.