# PvE Campaign Revamp — The Road to Glory

**Status:** Design / implementation specification  
**Feature:** PvE Bosses / Campaign  
**Goal:** Replace the current boss-list experience with a cinematic career journey where each opponent, venue, victory, and defeat contributes to the rooster's story.

---

## 1. Problem

The current PvE feature works mechanically but presents itself as a list of bots:

`PvE List → Boss Detail → Select Rooster → Start Battle → Battle`

This creates several problems:

- Bosses feel like stat presets rather than characters.
- Progression has little sense of place or achievement.
- There is no anticipation before a major fight.
- The UI does not take advantage of the game's unique 3D roosters.
- The boss detail page exposes raw game data instead of communicating personality and fighting behavior.
- Fighter selection is a text list despite roosters having visual identity, records, traits, condition, genetics, and fighting styles.
- The pre-fight screen is redundant and visually empty.
- Victories do not meaningfully change the perceived world around the player.
- The PvE ladder feels disconnected from championships, reputation, bloodlines, combat history, and the larger career loop.

The revamp should make PvE feel like a **career campaign**, not a menu of AI opponents.

---

# 2. Core Fantasy

The player's rooster is climbing through an underground/professional fighting circuit, starting in small rural fights and eventually reaching prestigious championship events.

The rooster is the protagonist.

There does not need to be a dialogue-heavy RPG storyline. Story should emerge primarily from:

- victories and defeats;
- opponent reputations;
- rivalries;
- rankings;
- venues;
- championship progression;
- injuries and recovery;
- fight records;
- bloodlines;
- rematches;
- invitations and challenges;
- world reactions to important victories.

A rooster's eventual career history should itself tell a story.

Example:

> Vindicator 81–13 · 42 KO  
> Provincial Champion  
> Defeated The Veteran  
> Lost twice to The Striker before winning the trilogy  
> Fathered two championship fighters  
> Retired as a Hall of Fame bloodline founder

---

# 3. New PvE Structure

Rename/reframe the feature around a campaign concept.

Possible primary title:

# THE ROAD TO GLORY

Subtitle:

> Rise from backyard fights to the grand championship.

The campaign is divided into **Circuits / Chapters** instead of one long boss list.

Example structure:

```text
THE ROAD TO GLORY

Chapter I    Backyard Circuit
Chapter II   Provincial Pits
Chapter III  Regional Circuit
Chapter IV   National Circuit
Chapter V    Grand Championship
```

Each circuit represents a meaningful increase in:

- opponent intelligence;
- combat experience;
- opponent reputation;
- rewards;
- venue quality;
- crowd size;
- presentation;
- stakes;
- championship importance.

---

# 4. Campaign Map

## 4.1 Replace the Boss List

Remove the existing vertically stacked boss list as the primary PvE navigation.

Replace it with a **visual campaign journey/map**.

The map should show the player's progression through venues and opponents.

Example conceptual structure:

```text
                 GRAND CHAMPIONSHIP
                        🔒
                        │
                  THE VETERAN
                   GATEKEEPER
                        │
                 Pressure King ✓
                        │
                 Feint Master ✓
                       ╱
                   Grinder ✓
                     ╱
                  Striker ✓

────────────────────────────────────

CHAPTER II — THE PROVINCIAL PITS
8 / 10 DEFEATED

Next Milestone: Defeat The Veteran
```

This should NOT look like a generic skill tree.

Nodes should represent actual locations/events such as:

- backyard pits;
- farms;
- barangay arenas;
- provincial venues;
- warehouses;
- city arenas;
- championship coliseums.

The map background can evolve from rural countryside into larger urban/championship locations as the campaign progresses.

---

# 5. Campaign Node Types

Not every node should simply mean "fight next boss."

Supported node types should eventually include:

### Standard Fight
Regular named opponent.

### Gatekeeper
Major opponent required to unlock the next circuit.

### Rival Fight
Recurring opponent with history against the player's rooster.

### Challenge
Optional fight with special conditions or rewards.

### Qualifier
Required tournament/championship qualification fight.

### Championship
Major title fight with enhanced presentation and rewards.

### Rematch
Previously defeated or victorious opponent returns with modified behavior/experience.

### Invitational
Special fight unlocked through reputation, record, bloodline, or accomplishments.

### Special Encounter
Rare opponent, unusual mutation, legendary bloodline, or unique ruleset.

The initial implementation does not need all node types, but the campaign architecture should support them.

---

# 6. Circuit / Chapter Presentation

Each circuit should have its own identity.

Example:

## Chapter I — Backyard Circuit

Theme:

- rural;
- improvised arenas;
- smaller crowds;
- inexperienced fighters;
- low stakes;
- early reputation building.

Purpose:

Teach basic combat archetypes.

## Chapter II — Provincial Pits

Theme:

- organized local venues;
- recognizable fighters;
- larger crowds;
- increased rewards;
- fighters begin adapting and exploiting weaknesses.

Purpose:

Introduce deeper combat behavior.

## Chapter III — Regional Circuit

Theme:

- professional competition;
- established records;
- dangerous specialists;
- rivalries;
- meaningful rankings.

## Chapter IV — National Circuit

Theme:

- elite fighters;
- prestigious venues;
- media/reputation presentation;
- championship qualifiers;
- highly adaptive AI.

## Chapter V — Grand Championship

Theme:

- elite presentation;
- unique entrance sequence;
- championship atmosphere;
- strongest opponents;
- career-defining fights.

---

# 7. Boss Identity System

Every important PvE opponent needs an identity beyond stats.

A boss definition should support presentation fields such as:

```ts
interface PveOpponentPresentation {
  title: string;
  nickname?: string;
  tagline: string;
  quote?: string;
  reputation?: string;
  scoutReport: string;
  knownFor: string[];
  record?: {
    wins: number;
    losses: number;
    kos: number;
  };
  venueId?: string;
  circuitId: string;
  nodeType: "standard" | "gatekeeper" | "rival" | "qualifier" | "championship" | "special";
}
```

Exact storage/model design may differ from this example.

Do not duplicate combat configuration unnecessarily. Presentation metadata can extend existing boss definitions.

---

# 8. Boss Archetypes as Combat Lessons

PvE opponents should naturally teach the game's combat systems.

Do not display these as explicit tutorials.

Their behavior should make the lesson obvious through play.

Example identities:

## The Charger

> "There is no feeling-out process."

Combat lesson:

- surviving immediate pressure;
- creating distance;
- punishing overcommitment.

## The Wall

> "You can hit him. The problem is making it matter."

Combat lesson:

- breaking defensive fighters;
- stamina management;
- avoiding wasted offense.

## The Striker

> "One mistake. That's all he needs."

Combat lesson:

- speed;
- counters;
- respecting dangerous openings.

## The Grinder

> "He doesn't need to win quickly. He just needs you to break first."

Combat lesson:

- endurance;
- fatigue;
- sustained pressure.

## The Feint Master

> "Fight what you see and you've already lost."

Combat lesson:

- tells;
- false tells;
- patience;
- behavioral reads.

## The Pressure King

> "Everybody has a plan until they can't breathe."

Combat lesson:

- sustained pressure;
- composure;
- recovery windows.

## The Veteran

> "He's already seen whatever you're planning."

Role:

**Gatekeeper**

Combat lesson:

- adaptation;
- avoiding predictable behavior;
- changing tactics during a fight.

---

# 9. Boss Encounter Screen

Clicking a campaign opponent opens a dedicated **Boss Encounter** screen.

This replaces the current generic boss detail page.

## Layout

Use the available screen space.

Suggested composition:

```text
┌──────────────────────────────────────────────────────────────┐
│ PROVINCIAL CIRCUIT                              BOSS 10      │
│                                                              │
│ THE VETERAN                         [ LARGE 3D ROOSTER ]      │
│ ★★★★☆                                                        │
│ GATEKEEPER                                                   │
│                                                              │
│ "The old guard doesn't step aside.                          │
│  You take his place."                                       │
│                                                              │
│ ADAPTIVE FIGHTER                                             │
│                                                              │
│ SCOUT REPORT                                                 │
│ Patient early. Reads repeated behavior and becomes           │
│ increasingly dangerous as the fight continues.               │
│                                                              │
│ KNOWN FOR                                                    │
│ ◆ Reads repeated attacks                                    │
│ ◆ Punishes reckless pressure                                │
│ ◆ Changes tactics mid-fight                                 │
│                                                              │
│ 19 W · 4 L · 11 KO                                          │
│                                                              │
│ REWARD                                                       │
│ 800 Credits · Combat XP · Veteran Crest                      │
│                                                              │
│                    [ CHOOSE YOUR FIGHTER ]                    │
└──────────────────────────────────────────────────────────────┘
```

The opponent's 3D model should be a major visual element.

Do not place all content inside small centered cards with large amounts of unused screen space.

---

# 10. Scout Report Instead of Raw Stats

Avoid showing exact internal boss stats as the primary information.

Current presentation such as:

```text
Strength ████████
Speed    ████████
Endurance████████
```

should be replaced or deemphasized.

The player should receive **scouting information** rather than implementation details.

Example:

> **SCOUT REPORT**  
> The Veteran fights patiently during the opening exchanges. He observes repeated patterns and becomes significantly more dangerous against predictable opponents. Constant pressure may work early but becomes increasingly risky as he adapts.

Known tendencies:

```text
ADAPTATION      VERY HIGH
PRESSURE        MODERATE
COUNTER THREAT  HIGH
ENDURANCE       HIGH
PREDICTABILITY  LOW
```

These are player-facing qualitative ratings, not direct internal values.

---

# 11. Fighter Selection Revamp

Remove the plain text rooster list.

The player has genetically and visually unique fighters. Fighter selection must showcase them.

Use a horizontal/grid roster of **Rooster Cards**.

Example:

```text
┌─────────────────┐
│                 │
│   3D ROOSTER    │
│                 │
│   VINDICATOR    │
│   Aggressive    │
│                 │
│   52 W · 8 L    │
│   31 KO         │
│                 │
│ GOOD MATCHUP    │
└─────────────────┘
```

Each card should surface only useful decision information:

- 3D rooster preview;
- name;
- fighting style;
- W/L/KO record;
- current condition;
- fatigue;
- injuries where relevant;
- major traits;
- optional matchup assessment.

Do not overload the default card.

Detailed stats can appear when selected.

---

# 12. Matchup Assessment

The fighter selection screen may provide a **non-deterministic scouting assessment**.

Examples:

```text
FAVORABLE
EVEN
RISKY
DANGEROUS
UNKNOWN
```

This should NOT calculate or expose exact win probability.

Assessment can consider broad factors such as:

- style interaction;
- condition;
- injuries;
- experience;
- known opponent tendencies;
- physical profile;
- relevant combat traits.

It must remain advisory rather than guaranteeing the result.

---

# 13. Remove the Current Generic Start Battle Page

The current intermediate screen containing:

```text
YOUR ROOSTER VS THE VETERAN

THE VETERAN
Description...

[ START BATTLE ]
```

should be removed.

It adds an extra click without adding meaningful anticipation.

After fighter confirmation, transition directly into the reusable **pre-fight presentation / matchup sequence**.

---

# 14. Pre-Fight Sequence

PvE should use the shared matchup/battle presentation system rather than implementing a completely separate battle UI.

Sequence:

```text
Fighter Confirmed
      ↓
Venue Establishing Shot
      ↓
Opponent Introduction
      ↓
Player Fighter Introduction
      ↓
Tale of the Tape / VS Presentation
      ↓
Arena Camera Transition
      ↓
FIGHT
      ↓
Continuous 3D Combat
```

---

# 15. Venue Establishing Shot

Before major fights, briefly establish location.

Example:

```text
PROVINCIAL CIRCUIT
SAN JOAQUIN, ILOILO
```

Possible presentation:

- fade from black;
- ambient crowd sound;
- arena/environment shot;
- subtle camera movement;
- location title;
- transition toward fighters.

Standard fights can use a shortened sequence.

Gatekeepers, rivals, qualifiers, and championships should use the full presentation.

---

# 16. Opponent Introduction

Example:

```text
PROVINCIAL CIRCUIT
GATEKEEPER

THE VETERAN
19–4 · 11 KO

"Let's see what they taught you."
```

Use the opponent's 3D model with a short cinematic camera shot.

Potential presentation:

- low camera angle;
- slow orbit;
- idle/stalking animation;
- crowd ambience;
- opponent title card.

Keep dialogue extremely short.

The game should not become a visual novel.

---

# 17. Player Fighter Introduction

Example:

```text
CHALLENGER

VINDICATOR
52–8 · 31 KO

PROVINCIAL RANK #18
```

Important accomplishments can optionally appear:

```text
BACKYARD CIRCUIT CHAMPION
6 FIGHT WIN STREAK
```

This reinforces the player's emergent career story.

---

# 18. Tale of the Tape

Use the shared matchup screen.

Example:

```text
VINDICATOR
52–8 · 31 KO

        VS

THE VETERAN
19–4 · 11 KO

PROVINCIAL CIRCUIT
GATEKEEPER FIGHT
```

Do not create a separate PvE-only implementation if the tournament/live/challenge systems can reuse the same component.

The matchup presentation should accept contextual metadata.

Example:

```ts
type MatchContext =
  | "pve"
  | "tournament"
  | "championship"
  | "challenge"
  | "ranked"
  | "rivalry";
```

---

# 19. Battle Scene Integration

After the intro, transition seamlessly into the existing 3D battle scene.

Do not reload into a visually unrelated page if avoidable.

The battle should retain contextual information such as:

- venue;
- event;
- opponent;
- circuit;
- championship/rival status.

Major PvE fights may modify presentation through:

- crowd density;
- arena environment;
- intro camera;
- fight title;
- commentary/event banners;
- victory presentation.

Combat mechanics themselves should continue using the shared combat system.

PvE should configure combatants and context rather than fork combat logic.

---

# 20. Post-Fight Flow

Do not return immediately to the campaign map after displaying WIN/KO.

Use the shared expanded post-fight flow.

PvE adds campaign-specific stages.

Suggested sequence:

```text
KO / Fight End
      ↓
Cinematic Result Moment
      ↓
Official Result
      ↓
Performance / Rewards
      ↓
Injury + Experience Resolution
      ↓
Campaign Consequence
      ↓
World / Reputation Reaction
      ↓
Next Objective
      ↓
Return to Campaign
```

---

# 21. Campaign Consequence Screen

Important wins should communicate what changed.

Example:

```text
THE OLD GUARD FALLS

Vindicator defeats The Veteran by KO.

The Veteran's seven-fight home winning streak has ended.
Vindicator is beginning to attract attention across the
Provincial Circuit.

REPUTATION       +120
RANKING          #18 → #11
CREDITS          +800
COMBAT XP        +420

NEW CIRCUIT UNLOCKED
REGIONAL CIRCUIT
```

This is where PvE becomes a story rather than a checklist.

---

# 22. World Reaction System

Major accomplishments can produce lightweight world reactions.

Examples:

```text
THE VETERAN'S STREAK ENDS

VINDICATOR BREAKS INTO THE PROVINCIAL TOP 15

PRESSURE KING CALLS OUT VINDICATOR

UNDEFEATED ROOSTER ENTERS REGIONAL CIRCUIT

SON OF FORMER CHAMPION WINS FIRST TITLE
```

These do not require a full NPC dialogue system.

They can appear as:

- news ticker;
- fight poster;
- campaign notification;
- newspaper-style card;
- commentator line;
- event feed.

The content should derive from actual game state whenever possible.

---

# 23. Reputation

PvE progression should eventually connect to reputation.

Reputation can be influenced by:

- defeating ranked opponents;
- defeating bosses;
- championships;
- KO victories;
- win streaks;
- upset victories;
- rivalry victories;
- undefeated records;
- successful title defenses.

Reputation can unlock:

- circuits;
- invitations;
- special challenges;
- championship qualifiers;
- higher-profile opponents;
- tournaments;
- special venues.

Avoid making reputation another grind bar. It should mostly represent meaningful accomplishments.

---

# 24. Rankings

Later circuits should support rankings.

Example:

```text
PROVINCIAL RANKINGS

#1  The Executioner
#2  Pressure King
#3  The Veteran
...
#11 Vindicator ↑7
```

Not every early backyard fight requires rankings.

Rankings become relevant as the player enters organized circuits.

Rank movement should primarily result from meaningful fights rather than XP grinding.

---

# 25. Rivals

PvE should support recurring rivals.

A rival can emerge from:

- losing to an opponent;
- narrowly defeating an opponent;
- repeated tournament encounters;
- similar ranking;
- championship history;
- scripted campaign relationships.

Example:

```text
RIVALRY

VINDICATOR          THE STRIKER
     1        —         2

NEXT FIGHT: DECIDER
```

Rivals should retain head-to-head history.

This creates stories without requiring predefined narratives.

---

# 26. Rematches

Previously defeated bosses should not become permanently irrelevant.

Possible rematch reasons:

- boss gains experience;
- boss changes fighting style;
- revenge challenge;
- championship qualifier;
- tournament encounter;
- title defense;
- rivalry continuation.

A rematch should not simply replay the exact same boss configuration when avoidable.

Example:

```text
THE VETERAN — REMATCH

Since your previous fight:

ADAPTATION ↑
COUNTER EXPERIENCE ↑
PRESSURE RESPONSE ↑
```

---

# 27. Championships

Circuits should culminate in championship or gatekeeper events.

Championship fights receive enhanced presentation:

- unique event title;
- larger venue;
- stronger crowd atmosphere;
- championship intro;
- fighter records;
- championship belt/trophy presentation;
- enhanced result screen;
- permanent career accomplishment.

Winning should add persistent history to the rooster.

Example:

```text
PROVINCIAL CHAMPION
Won September 18, 2026
Defeated The Executioner by KO
```

This should remain part of that rooster's career record permanently.

---

# 28. Bloodline Integration

Long term, campaign accomplishments should strengthen the existing bloodline fantasy.

A descendant may surface ancestry such as:

```text
SON OF VINDICATOR

Bloodline Accomplishments
• Provincial Champion
• Regional Finalist
• 42 Career KOs
```

This gives historical value to retired champions and makes breeding emotionally meaningful.

Do not directly convert championship history into huge genetic bonuses. Accomplishments are primarily identity/history; genetics remain governed by the breeding system.

---

# 29. Visual Direction

Keep the established Cockfight Chronicles identity:

- black / very dark backgrounds;
- warm gold highlights;
- serif display typography;
- premium old-world fighting poster aesthetic.

But reduce dependence on opaque brown rectangles.

Use more:

- environment art;
- full-screen backgrounds;
- 3D rooster renders;
- gradients;
- subtle vignette;
- translucent/glass panels;
- atmospheric lighting;
- cinematic framing;
- typography directly over backgrounds where readable.

The interface should feel like a **game world**, not an admin dashboard.

---

# 30. UI Layering

Recommended visual hierarchy:

```text
ENVIRONMENT / CAMPAIGN ART
        ↓
DARK CINEMATIC GRADIENT
        ↓
3D ROOSTERS / VENUE
        ↓
TRANSLUCENT INFORMATION PANELS
        ↓
GOLD TYPOGRAPHY / CONTROLS
```

Avoid placing every piece of information inside a bordered card.

Cards should organize secondary information, not define the entire screen.

---

# 31. Responsive / Performance Requirements

The campaign experience must remain usable without expensive presentation features.

Requirements:

- lazy-load 3D opponent previews;
- avoid loading every campaign rooster model simultaneously;
- use static thumbnails/placeholders until a node/opponent is focused;
- reduce animation on lower-performance devices;
- campaign map must remain navigable on mobile;
- fighter cards should become horizontally scrollable or compact grid on small screens;
- cinematic transitions must never block gameplay because an asset failed to load.

Respect reduced-motion preferences.

---

# 32. Data / Architecture Principles

The revamp should build on existing systems rather than replace working combat functionality.

Preserve:

- existing boss combat definitions;
- existing combat simulator/state machine;
- rooster records;
- experience system;
- injury system;
- rewards;
- existing battle scene;
- shared matchup flow;
- shared post-fight flow.

Add a presentation/campaign layer around these systems.

Avoid:

- PvE-specific combat forks;
- duplicate rooster components;
- duplicate matchup components;
- duplicate result systems;
- hardcoding campaign progression directly into page components.

---

# 33. Suggested Domain Model

Conceptually:

```ts
interface PveCircuit {
  id: string;
  name: string;
  subtitle?: string;
  order: number;
  description: string;
  environmentId: string;
  nodes: PveCampaignNode[];
  unlockRequirement?: CampaignRequirement;
}

interface PveCampaignNode {
  id: string;
  circuitId: string;
  order: number;
  type:
    | "standard"
    | "gatekeeper"
    | "rival"
    | "challenge"
    | "qualifier"
    | "championship"
    | "special";

  opponentId?: string;
  venueId: string;
  requirements?: CampaignRequirement[];
  rewards?: CampaignReward[];
}
```

This is conceptual. Adapt it to the existing repository architecture rather than forcing this exact model.

---

# 34. Progress State

Track campaign state separately from boss definitions.

Potential state:

```ts
interface PlayerCampaignProgress {
  completedNodes: string[];
  unlockedCircuits: string[];
  opponentHistory: Record<string, OpponentHistory>;
  currentRank?: Record<string, number>;
  reputation: number;
}

interface OpponentHistory {
  wins: number;
  losses: number;
  kosFor: number;
  kosAgainst: number;
  lastFightAt?: Date;
}
```

Do not treat `boss cleared = boolean` as sufficient long-term state.

The system should be capable of remembering history between fighters.

---

# 35. Recommended MVP Scope

Do NOT attempt every system above in the first implementation.

## Phase 1 — Presentation Revamp

Implement:

- circuit/chapter model;
- campaign map;
- visual boss nodes;
- boss encounter screen;
- scout reports;
- 3D opponent preview;
- fighter card selection;
- remove generic Start Battle page;
- connect to shared matchup flow;
- campaign-aware post-fight result;
- chapter unlock presentation.

Use the existing bosses and existing progression rules underneath.

## Phase 2 — Career Layer

Add:

- reputation;
- rankings;
- world reactions;
- improved career history;
- circuit championships;
- gatekeeper logic.

## Phase 3 — Dynamic Stories

Add:

- rivals;
- rematches;
- callouts;
- optional challenges;
- invitationals;
- dynamic opponent progression;
- special encounters.

## Phase 4 — Legacy

Connect campaign history into:

- bloodlines;
- descendants;
- retired rooster history;
- Hall of Fame;
- legendary fighters;
- historical championship records.

---

# 36. Target Player Flow

Final desired flow:

```text
PvE / Road to Glory
        ↓
Campaign Map
        ↓
Select Fight Node
        ↓
Boss Encounter / Scout Report
        ↓
Choose Rooster
        ↓
Confirm Fighter
        ↓
Venue Establishing Shot
        ↓
Opponent Introduction
        ↓
Player Introduction
        ↓
Tale of the Tape
        ↓
3D Battle
        ↓
KO / Decision
        ↓
Cinematic Result
        ↓
Rewards + Injuries + Experience
        ↓
Campaign Consequence
        ↓
Ranking / Reputation / Unlock
        ↓
Next Fight Revealed
        ↓
Campaign Map
```

---

# 37. Experience Goal

The player should not think:

> "I beat boss #10."

They should think:

> "Vindicator finally beat The Veteran and broke into the Regional Circuit."

Later:

> "This is the rooster that beat The Veteran, won the Provincial Championship, lost the regional title fight, came back the next season, and eventually became the foundation of my best bloodline."

That is the target experience.

The PvE campaign exists to turn the game's combat, breeding, genetics, training, experience, championships, and rooster history into **stories the player remembers**.
