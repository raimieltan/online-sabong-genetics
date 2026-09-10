# Tournament Feature Revamp — UI Specification

**Status:** Planning  
**Scope:** Tournament user interface and presentation  
**Flow reference:** `tournament-flow-spec.md`  
**Goal:** Replace the current flat brown/gold tournament screens with a premium, cinematic tournament presentation that still fits the game's existing visual identity.

---

# 1. Visual Direction

The tournament UI should feel like:

```text
prestige
competition
ritual
rural championship
premium sports broadcast
```

The current gold/brown theme should remain, but the UI should move away from:

```text
large opaque rectangles
flat gold buttons
emoji icons
plain roster grids
generic admin-panel spacing
```

and toward:

```text
dark translucent glass
thin warm-gold borders
layered depth
cinematic serif headings
compact stat typography
subtle glow
arena imagery behind the interface
animated bracket progression
```

Tournament screens should feel like a championship broadcast layered over the arena world.

---

# 2. Global Tournament Shell

All tournament pages should share a common shell.

```text
┌───────────────────────────────────────────────────────────────┐
│ CHAMPIONSHIP CIRCUIT                                         │
│ Tournament / Round Context                    [currency/etc.] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                       PAGE CONTENT                            │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ contextual footer / actions                                  │
└───────────────────────────────────────────────────────────────┘
```

Recommended page background:

```css
background:
  linear-gradient(
    rgba(7, 5, 3, 0.50),
    rgba(7, 5, 3, 0.72)
  ),
  url("/images/tournament-arena.jpg");

background-size: cover;
background-position: center;
background-attachment: fixed;
```

Add a very subtle vignette.

---

# 3. Core Color Language

Use a restrained warm palette.

```css
--bg-deep: #090704;
--bg-panel: rgba(22, 15, 9, 0.72);
--bg-panel-hover: rgba(34, 24, 14, 0.82);

--gold-primary: #e7b95f;
--gold-bright: #f2cf7b;
--gold-muted: #a78343;
--gold-border: rgba(231, 185, 95, 0.28);

--text-primary: #f6efe3;
--text-secondary: #b9ab96;
--text-muted: #877b69;

--success: #7fb77a;
--danger: #c76558;
--warning: #d4a34a;
```

Do not overuse solid gold surfaces.

Gold should act as:

```text
accent
border
selected state
championship emphasis
progress highlight
```

not as the background for every primary control.

---

# 4. Glass Panel Style

Base tournament card:

```css
.tournament-panel {
  background: rgba(17, 12, 7, 0.70);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(231, 185, 95, 0.20);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.03),
    0 20px 50px rgba(0,0,0,0.35);
  border-radius: 18px;
}
```

Important panels may use:

```css
border-color: rgba(231, 185, 95, 0.42);
```

Avoid glowing every panel.

Reserve stronger glow for:

```text
selected fighter
active match
championship round
current bracket path
victory
```

---

# 5. Typography

Use two font families.

## Display Font

For:

```text
Tournament names
Round titles
Finals
Champion screens
Major calls to action
```

Recommended feel:

```text
Cinzel
Cormorant Garamond
Bodoni Moda
Libre Baskerville
```

Example:

```css
font-family: "Cinzel", serif;
letter-spacing: 0.02em;
```

## Utility Font

For:

```text
stats
labels
buttons
records
metadata
navigation
```

Recommended:

```text
Inter
Manrope
IBM Plex Sans Condensed
Barlow Condensed
```

Use small uppercase labels with increased tracking.

---

# 6. Tournament Circuit Screen

Replace the current bracket-size/difficulty selector screen.

## Desktop Layout

```text
┌───────────────────────────────────────────────────────────────┐
│ CHAMPIONSHIP CIRCUIT                                         │
│ Build your name through the regional circuit.                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  LOCAL CIRCUIT                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ [event artwork]                                         │  │
│  │ BARANGAY OPEN                              BEGINNER     │  │
│  │ 8 fighters • Single Elimination                         │  │
│  │ Prize ₱2,000                                            │  │
│  │                                                         │  │
│  │ Best Finish: Champion                                   │  │
│  │                                        [VIEW EVENT]     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  REGIONAL CIRCUIT                                             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ PANAY INVITATIONAL                         ROOKIE       │  │
│  │ 16 fighters • Prize ₱5,000                             │  │
│  │                                        [ENTER]          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  NATIONAL CHAMPIONSHIP                               LOCKED   │
│  Win 2 Regional Championships to qualify.                    │
└───────────────────────────────────────────────────────────────┘
```

---

# 7. Event Card Design

Each event card should feel like a poster.

Structure:

```text
small circuit label
large tournament name
difficulty badge
fighter count
prize
entry fee
best result / qualification
CTA
```

Optional background:

```text
faint arena photo
regional visual
crowd silhouette
mountain / rural scenery
```

Dark gradient overlay ensures readability.

Locked cards:

```text
reduce opacity
add lock icon
show qualification requirement
disable hover glow
```

---

# 8. Tournament Details Screen

Layout should feel like an event dossier.

```text
┌───────────────────────────────────────────────────────────────┐
│ ← CIRCUIT                                                    │
│                                                               │
│ PANAY INVITATIONAL                         REGIONAL CIRCUIT   │
│ 16-BIRD • ROOKIE • SINGLE ELIMINATION                       │
│                                                               │
│ [hero arena/event artwork]                                   │
├───────────────────────────────┬───────────────────────────────┤
│ EVENT DETAILS                 │ YOUR HISTORY                  │
│                               │                               │
│ Entry Fee      ₱500           │ Entries          3            │
│ Champion       ₱5,000         │ Best Finish      Semifinal    │
│ Runner-up      ₱1,500         │ Titles           0            │
│                               │                               │
│ Rules                         │ Qualification                  │
│ • Condition carries          │ ✓ Eligible                    │
│ • Injuries persist           │                               │
│ • One fighter only           │                               │
├───────────────────────────────┴───────────────────────────────┤
│                                [REGISTER FIGHTER]             │
└───────────────────────────────────────────────────────────────┘
```

Avoid presenting details as one long vertical list.

Use composition.

---

# 9. Fighter Registration Screen

This should feel closer to team selection than a generic card grid.

Recommended:

```text
┌───────────────────────────────────────────────────────────────┐
│ SELECT YOUR FIGHTER                                          │
│ Panay Invitational • 16-Bird • Rookie                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  [fighter cards / carousel]                                  │
│                                                               │
│ ┌────────────────────┐ ┌────────────────────┐                 │
│ │   [3D rooster]     │ │   [3D rooster]     │                 │
│ │                    │ │                    │                 │
│ │ VINDICTOR          │ │ BAGWIS             │                 │
│ │ Counter Fighter    │ │ Aggressive         │                 │
│ │                    │ │                    │                 │
│ │ Rating 1847        │ │ Rating 1520        │                 │
│ │ Condition 96%      │ │ Condition 81%      │                 │
│ │ W W L W W          │ │ W L W W L          │                 │
│ │                    │ │                    │                 │
│ │ [SELECT]           │ │ [SELECT]           │                 │
│ └────────────────────┘ └────────────────────┘                 │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ SELECTED                                                     │
│ VINDICTOR • READY                                            │
│                                     [REGISTER VINDICTOR]     │
└───────────────────────────────────────────────────────────────┘
```

---

# 10. Fighter Card States

## Default

```text
dark glass
muted gold border
```

## Hover

```text
slightly brighter border
subtle upward movement
```

## Selected

```text
bright gold edge
small inner glow
gold corner accent
```

## Ineligible

```text
reduced saturation
dark overlay
reason displayed
```

Example:

```text
INJURED
Recovering from leg strain
```

Do not hide ineligible fighters.

---

# 11. Bracket Screen

This is the most important UI in the tournament feature.

It should become the central tournament interface.

## Overall Layout

```text
┌───────────────────────────────────────────────────────────────┐
│ PANAY INVITATIONAL                                           │
│ ROUND OF 16 • 16 REMAIN                                     │
│                                                               │
│ [BRACKET] [MATCHES] [EVENT]                                 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ R16             QUARTERFINAL       SEMIFINAL       FINAL     │
│                                                               │
│ Vindictor ───┐                                               │
│              ├── ? ───────┐                                  │
│ Copper ──────┘            │                                  │
│                           ├── ? ───────┐                     │
│ Bagwis ──────┐            │           │                      │
│              ├── ? ───────┘           │                      │
│ Tigre ───────┘                        ├── 🏆                 │
│                                       │                      │
│ ...                                   │                      │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ YOUR MATCH                                                   │
│ VINDICTOR           VS           COPPER SINNER               │
│ Counter                            Pressure                    │
│ 1847                               1792                        │
│                                      [PREPARE FOR MATCH]      │
└───────────────────────────────────────────────────────────────┘
```

---

# 12. Bracket Visual Rules

The bracket should not look like a spreadsheet.

Use:

```text
thin connector lines
small glass fighter chips
subtle portraits
compact stats
strong highlight on player path
```

Current player's bracket route:

```css
border-color: var(--gold-primary);
box-shadow: 0 0 18px rgba(231,185,95,0.18);
```

Resolved losers:

```text
dimmed
reduced saturation
optional strike-through on name
```

Winners:

```text
move visually forward
retain portrait
```

Unknown future slot:

```text
???
Awaiting Winner
```

---

# 13. Bracket Fighter Chip

Example:

```text
┌──────────────────────────────┐
│ [portrait] VINDICTOR         │
│            1847 • Counter    │
│                         W    │
└──────────────────────────────┘
```

Status markers:

```text
W
KO
DEC
UPSET
INJURED
```

Keep them small and secondary.

---

# 14. Your Match Panel

The player's current match should always be obvious.

Use a strong lower panel or right-side card.

```text
YOUR NEXT MATCH

VINDICTOR
Counter Fighter
1847

          VS

BAGWIS
Aggressive
1921

Quarterfinal

[SCOUT]        [PREPARE FOR MATCH]
```

The user should never have to hunt through the bracket to find their match.

---

# 15. Tabs Within Active Tournament

Recommended:

```text
BRACKET
MATCHES
EVENT
```

Optional later:

```text
HIGHLIGHTS
HISTORY
```

The active tournament should remain one coherent space.

Avoid navigating to unrelated-looking pages for every subfeature.

---

# 16. Round Hub UI

If the bracket is not always fullscreen, use the Round Hub as a dashboard.

```text
┌───────────────────────────────────────────────────────────────┐
│ QUARTERFINAL                                                 │
│ 8 fighters remain                                           │
├───────────────────────┬───────────────────────────────────────┤
│ YOUR FIGHTER          │ NEXT OPPONENT                         │
│                       │                                       │
│ [3D Vindictor]        │ [3D Bagwis]                          │
│                       │                                       │
│ VINDICTOR             │ BAGWIS                               │
│ Condition 81%         │ Rating 1921                          │
│ Fatigue Moderate      │ Aggressive                           │
│ Health 74%            │                                      │
│                       │                                      │
│                       │ [SCOUT OPPONENT]                     │
├───────────────────────┴───────────────────────────────────────┤
│ [VIEW BRACKET]                        [PREPARE FOR MATCH]      │
└───────────────────────────────────────────────────────────────┘
```

---

# 17. Opponent Scouting UI

Scouting should feel like a fight dossier.

```text
BAGWIS

Aggressive Fighter
Rating 1921

RECORD
12-4 • 7 KO

KNOWN TENDENCIES

Pressure          HIGH
Patience          LOW
Counter           LOW
Risk              HIGH

LAST MATCH

def. Tigre
KO • 01:43

OBSERVATION

Commits heavily after failed entries.
May become vulnerable while fatigued.
```

Unknown values:

```text
???
Scout to reveal
```

This is better than showing all hidden behavior values numerically.

---

# 18. Matchup Screen

Reuse the game's global battle matchup UI.

Tournament-specific additions:

```text
tournament name
round
stakes
winner destination
```

Example:

```text
PANAY INVITATIONAL

QUARTERFINAL

VINDICTOR
vs
BAGWIS

Winner advances to the Semifinal.

[ENTER ARENA]
```

The visuals should focus heavily on the two 3D fighters.

---

# 19. Fight Result UI

Do not show a plain modal.

Use a layered result sequence.

### Step 1 — Immediate Result

```text
KNOCKOUT

VINDICTOR
DEFEATS
BAGWIS

01:43
```

Large typography.
Minimal stats.

---

# 20. Result Details

After Continue:

```text
VINDICTOR ADVANCES

SEMIFINALIST

Health
██████████████░░ 74%

Condition
████████████████░ 81%

Fatigue
MODERATE

Injuries
None

Tournament Record
2-0

[VIEW BRACKET]
```

---

# 21. Bracket Update Animation

The bracket transition should be visual.

Recommended sequence:

```text
1. loser chip dims
2. winner chip gets gold edge
3. connector line animates
4. winner chip slides into next round
5. next opponent result appears
6. next matchup highlights
```

Do not instantly redraw the bracket.

Animation duration:

```text
~1.5–3 seconds total
```

Keep it skippable.

---

# 22. Other Results Presentation

After player's result:

```text
ROUND RESULTS

✓ Vindictor def. Copper Sinner — KO
✓ Bagwis def. Tigre — Decision
✓ Gitgit def. Cursed Cobra — KO
✓ Blazing Vanguard def. Noble Guardian — TKO
```

Potential upset:

```text
UPSET
Tigre defeats #2 Gitgit
```

This can appear as a small animated callout.

---

# 23. Between-Round UI

Present preparation as a deliberate choice.

```text
BETWEEN ROUNDS

Choose one preparation action.

┌──────────────────┐
│ REST             │
│                  │
│ Recover fatigue  │
│ +20% fatigue rec │
│                  │
│ [SELECT]         │
└──────────────────┘

┌──────────────────┐
│ TREATMENT        │
│                  │
│ Recover injury   │
│ Minor heal       │
│                  │
│ [SELECT]         │
└──────────────────┘

┌──────────────────┐
│ SCOUT            │
│                  │
│ Reveal opponent  │
│ tendencies       │
│                  │
│ [SELECT]         │
└──────────────────┘

┌──────────────────┐
│ WARM UP          │
│                  │
│ Small temporary  │
│ readiness bonus  │
│                  │
│ [SELECT]         │
└──────────────────┘
```

Once selected, confirm:

```text
REST SELECTED

Fatigue 48% → 28%

[CONTINUE TO SEMIFINAL]
```

---

# 24. Final Round Presentation

Finals should switch to a higher prestige shell.

Use:

```text
stronger vignette
slightly brighter gold
larger typography
championship crest
more arena visible behind UI
reduced dashboard clutter
```

Example:

```text
CHAMPIONSHIP CIRCUIT

THE FINAL

PANAY INVITATIONAL

VINDICTOR
          VS
BLAZING VANGUARD

REGIONAL TITLE

[FIGHT FOR THE CHAMPIONSHIP]
```

---

# 25. Championship Ceremony

This should feel like a trophy moment.

```text
                 🏆

        TOURNAMENT CHAMPION

             VINDICTOR

        PANAY INVITATIONAL
              2026

           4–0 • 3 KO

────────────────────────────────

Prize               ₱5,000
Prestige             +120
Experience           +850

NEW TITLE
REGIONAL CHAMPION

[VIEW FINAL BRACKET]

[CONTINUE]
```

Do not literally use an emoji trophy in production.
Use an SVG or custom rendered trophy mark.

---

# 26. Tournament Summary Screen

```text
PANAY INVITATIONAL
COMPLETE

┌───────────────────────────┐
│ [fighter portrait]        │
│                           │
│ VINDICTOR                 │
│ CHAMPION                  │
│                           │
│ 4 Wins                    │
│ 3 KOs                     │
│ Prize ₱6,400              │
└───────────────────────────┘

TOURNAMENT HIGHLIGHTS

Fastest KO
Vindictor vs Tigre • 00:38

Fight of the Tournament
Vindictor vs Bagwis

Biggest Upset
Copper Sinner def. Gitgit

[RETURN TO CIRCUIT]
```

---

# 27. Elimination Screen

Losing should still feel polished.

```text
TOURNAMENT RUN ENDED

VINDICTOR
ELIMINATED IN QUARTERFINAL

Placement
5th–8th

Tournament Record
1–1

Prize Earned
₱650

Experience
+220

Champion
Blazing Vanguard

[VIEW FINAL BRACKET]
[RETURN TO CIRCUIT]
```

Avoid making defeat look like an error screen.

---

# 28. Active Tournament Resume Card

On entering the circuit with an unfinished run:

```text
ACTIVE TOURNAMENT

PANAY INVITATIONAL

Quarterfinal

VINDICTOR
vs
BAGWIS

[RESUME TOURNAMENT]
```

This should be the first card the user sees.

---

# 29. Tournament Navigation

Recommended active tournament nav:

```text
← CIRCUIT

PANAY INVITATIONAL

BRACKET
MATCHES
EVENT
```

Do not include a generic:

```text
Back to Coop
```

as the main navigation action inside every tournament screen.

The tournament feature should feel self-contained.

Coop access can still exist through global navigation.

---

# 30. Iconography

Remove emoji-looking icons such as:

```text
🏆
⚔️
🎟️
```

Use a consistent icon system.

Recommended icon types:

```text
trophy
crossed blades
shield
heartbeat
eye
medkit
rest/moon
bracket
crown
lock
arrow
```

Use line icons around:

```text
1.5px–2px stroke
rounded ends
warm-gold tint
```

Lucide icons are sufficient for most utility icons.

Tournament-specific trophy/crest icons can be custom SVG.

---

# 31. Buttons

## Primary

```text
dark/gold premium button
```

Example:

```css
background:
  linear-gradient(
    180deg,
    rgba(235,194,105,0.95),
    rgba(203,151,62,0.95)
  );

color: #140d05;
```

Use only for true primary actions:

```text
ENTER TOURNAMENT
REGISTER FIGHTER
PREPARE FOR MATCH
ENTER ARENA
CONTINUE
```

## Secondary

```text
dark translucent
gold border
light text
```

For:

```text
VIEW BRACKET
SCOUT
EVENT DETAILS
```

## Tertiary

Text link:

```text
Back
Withdraw
Cancel
```

---

# 32. Selected States

Avoid filling entire controls bright yellow.

Instead:

```text
gold border
small gold corner
warm internal glow
slight tint
```

Example:

```css
background: rgba(231,185,95,0.08);
border-color: rgba(231,185,95,0.72);
box-shadow:
  inset 0 0 25px rgba(231,185,95,0.06),
  0 0 20px rgba(231,185,95,0.08);
```

---

# 33. Difficulty Badges

Example:

```text
BEGINNER
ROOKIE
VETERAN
CHAMPION
ELITE
```

Use compact pill-shaped badges.

Do not color the whole UI based on difficulty.

Possible treatment:

```text
Beginner     muted bronze
Rookie       warm silver
Veteran      gold
Champion     brighter gold
Elite        pale gold / ivory
```

Keep saturation restrained.

---

# 34. Health / Condition Bars

Use bars only where they communicate actionable state.

Example:

```text
HEALTH
███████████████░ 74%

CONDITION
████████████████░ 81%
```

Do not show every fighter's full six-stat graph in the bracket.

Bracket = orientation.

Scouting = information.

Matchup = comparison.

---

# 35. Responsive Bracket Behavior

Desktop:

```text
full horizontal bracket
```

Tablet:

```text
horizontal scrolling bracket
current path centered
```

Mobile:

```text
round-by-round column
```

Example:

```text
ROUND OF 16

Vindictor vs Copper
Bagwis vs Tigre

[Next: Quarterfinal]
```

Do not shrink a full 32-bird bracket until text becomes unreadable.

---

# 36. Motion Language

Animations should feel deliberate rather than flashy.

Use:

```text
fade
slide
gold line draw
card lift
soft scale
blur-to-focus
```

Avoid:

```text
large bouncing
excessive particles
arcade neon effects
spinning cards
```

Recommended duration:

```text
micro interactions: 120–220ms
page transitions: 250–400ms
bracket advancement: 700–1200ms
championship reveal: 1200–2000ms
```

---

# 37. Arena Background Usage

Tournament pages should expose more environment than the current screens.

Recommended:

```text
upper 25–35% hero region
arena/crowd/mountain background
darkened heavily
```

As tournament importance increases:

```text
Round of 16 → normal rural arena
Quarterfinal → more crowd
Semifinal → denser lighting / atmosphere
Final → championship arena variant
```

This makes progression visible even before reading text.

---

# 38. Audio Hooks

UI spec should allow future sound triggers.

Examples:

```text
tournament selected
bracket generated
player draw revealed
match ready
winner advances
upset
final unlocked
champion reveal
```

Keep UI animation events exposed so audio can attach later.

---

# 39. Component Structure

Recommended React structure:

```text
TournamentShell
├── TournamentHeader
├── TournamentNav
├── TournamentBackground
├── GlassPanel
│
├── CircuitPage
│   ├── CircuitSection
│   └── TournamentEventCard
│
├── TournamentDetailsPage
│
├── FighterRegistrationPage
│   ├── TournamentFighterCard
│   └── SelectedFighterPanel
│
├── ActiveTournamentPage
│   ├── TournamentTabs
│   ├── BracketView
│   │   ├── BracketRound
│   │   ├── BracketMatch
│   │   └── BracketFighterChip
│   ├── CurrentMatchPanel
│   └── TournamentStatus
│
├── ScoutOpponentPanel
├── BetweenRoundPanel
├── TournamentResultOverlay
├── BracketAdvanceSequence
├── ChampionshipFinalIntro
├── ChampionshipCeremony
└── TournamentSummary
```

---

# 40. Reusable Matchup UI

The tournament should not create a unique battle matchup component.

Use:

```text
BattleMatchupScreen
```

with tournament context:

```ts
interface BattleContext {
  mode: "pve" | "tournament" | "pvp";

  tournament?: {
    tournamentName: string;
    roundName: string;
    stakesText: string;
  };
}
```

Example:

```text
Panay Invitational
Quarterfinal

Winner advances to the Semifinal.
```

---

# 41. Current Screenshot — Problems to Fix

The current tournament selection screen has several issues:

```text
1. bracket size has too much visual importance
2. difficulty rows feel like settings
3. flat gold selected state dominates the page
4. tournament has no event identity
5. entry screen has no sense of prestige
6. button feels like a form submit
```

Replace it with event cards.

The current roster screen has:

```text
1. no bracket
2. all fighters presented as equal
3. no obvious player path
4. no next opponent emphasis
5. no tournament story
6. no sense of advancement
```

Replace it with the bracket as the primary screen.

---

# 42. Final UX Hierarchy

For every active tournament screen, hierarchy should be:

```text
1. Tournament identity
2. Current round
3. Player's fighter
4. Next opponent
5. Bracket position
6. Tournament status
7. Supporting details
```

Never let supporting stats dominate the tournament's main story.

---

# 43. Recommended V1 UI Build Order

Build UI in this order:

```text
1. TournamentShell
2. CircuitPage
3. TournamentEventCard
4. TournamentDetailsPage
5. FighterRegistrationPage
6. ActiveTournamentPage
7. BracketView
8. BracketMatch
9. CurrentMatchPanel
10. TournamentResultOverlay
11. BracketAdvanceSequence
12. BetweenRoundPanel
13. ChampionshipFinalIntro
14. ChampionshipCeremony
15. TournamentSummary
```

Do not start with fancy final animations before the bracket interaction is solid.

---

# 44. Core Experience

The visual goal is:

```text
I should feel like I entered a championship,
not opened a settings page.

I should see my path through the tournament,
not a list of random chickens.

Every victory should visibly move my fighter
closer to the trophy.

Each round should feel more prestigious
than the last.

Winning the tournament should feel like a
career-defining moment for that rooster.
```

That should be the guiding principle for every tournament UI decision.
