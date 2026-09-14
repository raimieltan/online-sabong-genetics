# Cockfight Chronicles — Ranch Hub / Homepage Revamp

**Status:** Ready for implementation  
**Scope:** Homepage / Ranch landing screen  
**Goal:** Replace the static dashboard feel with a living, contextual ranch and career hub.

---

## 1. Vision

The current homepage has a strong visual foundation but behaves mostly like a static dashboard. It shows information, but it does not make the ranch feel alive or clearly communicate what the player should do next.

The revamped homepage should answer three questions immediately:

1. **What is happening at my ranch right now?**
2. **What should I do next?**
3. **How is my fighter/career progressing?**

The Ranch Hub should become the connective layer between the game's existing systems: fighters, breeding, training, medical/recovery, PvE progression, tournaments, championships, challenges, rivals, bloodlines, eggs, rewards, and battle history.

This is primarily an **information architecture, integration, and interaction revamp**, not a complete visual redesign.

---

# 2. Non-Negotiable Requirement — NO PLACEHOLDERS

## Absolutely no placeholder gameplay data

The finished homepage must contain:

- no mock fighters
- no fake records
- no fake events
- no fake tournament dates
- no hardcoded ranch counts
- no hardcoded egg counts
- no fake rankings
- no fake opponents
- no fake rewards
- no static activity-feed entries
- no fake training sessions
- no fake injuries
- no fake challenges
- no hardcoded career progression
- no sample notifications presented as real data

**Every piece of gameplay information displayed on the homepage must originate from real game state, existing APIs, the database, or a deterministic derivation of those systems.**

Before implementing each section, inspect the existing codebase and identify the canonical source of truth.

Do not create parallel homepage-only versions of existing systems.

For example:

```text
Existing battle history
        ↓
Homepage recent activity

Existing chicken records
        ↓
Active fighter card

Existing training sessions
        ↓
Ranch attention

Existing PvE progression
        ↓
Road to Glory
```

## Missing data

If the data required for a section genuinely does not exist, **do not fabricate it to make the UI look populated.**

Use a legitimate state instead:

```text
No active challenge

No eggs ready to hatch

No fighter currently training

No upcoming tournament

No injuries requiring treatment

Complete your first fight to begin your career history
```

If a small backend/API integration is required to expose existing game state to the homepage, implement that integration rather than substituting mock data.

---

# 3. Preserve Existing Visual Identity

Keep the current visual direction.

Preserve:

- cinematic rural Filipino ranch environment
- central 3D rooster presentation
- dark translucent / glass-like panels
- warm gold accents
- current typography direction
- existing top navigation / GameShell
- cinematic lighting
- premium fighting-game presentation
- current overall color palette

Do **not** turn the homepage into a conventional SaaS/admin dashboard.

The UI should feel like the player's headquarters between fights.

---

# 4. Homepage Information Hierarchy

The page should be reorganized around five major systems:

```text
ACTIVE FIGHTER
      ↓
ROAD TO GLORY / NEXT CAREER OBJECTIVE
      ↓
RANCH ATTENTION
      ↓
YOUR STABLE
      ↓
RANCH JOURNAL / WORLD ACTIVITY
```

Contextual actions should connect these sections to the rest of the game.

---

# 5. Active Fighter / Stable Focus

The central rooster should no longer function primarily as decoration.

It represents the player's currently selected / active fighter.

## Display

Show relevant real information such as:

- fighter name
- level/age if applicable
- generation
- bloodline
- W/L record
- KO count
- condition
- fatigue
- current status
- relevant major stats
- streak when meaningful

Do not overload the card with every available stat.

The homepage should provide a quick combat-readiness summary. Detailed stats remain on the fighter page.

Example structure:

```text
MAIN FIGHTER

VUNDICATOR
Generation 4 • Raimiel Bloodline

53W — 8L — 47KO
4 FIGHT WIN STREAK

POWER      █████████
SPEED      ████████
STAMINA    ███████

READY TO FIGHT

[ VIEW FIGHTER → ]
```

All values must come from the actual selected chicken.

---

# 6. Central Rooster State

The 3D fighter should visually respond to real fighter state where practical.

Possible states:

### Ready

Normal confident idle animation.

### Fatigued

Reduced-energy idle behavior.

### Injured

Subdued/recovery presentation where supported by the existing animation system.

### High confidence / winning streak

More aggressive/confident idle behavior where supported.

### Training

If the game's architecture allows the fighter to be unavailable while training, communicate this clearly.

### Recovery

Communicate recovery/medical state rather than showing the fighter as fully battle-ready.

These visual states must derive from actual fighter state.

Do not fake state-specific animations if the underlying status does not exist.

---

# 7. Fighter Selection

Allow the player to switch the homepage's focused fighter without navigating away.

Potential controls:

- previous / next fighter arrows
- stable strip selection
- clicking fighter cards

When selection changes:

- central 3D model changes
- fighter summary changes
- readiness changes
- contextual actions update
- career recommendation can update where appropriate

Do not maintain a duplicate homepage-only copy of fighter state.

---

# 8. Road to Glory / Career Objective

Replace the generic **Next Event** card with a meaningful career/progression card.

This section answers:

> What fight or milestone should I pursue next?

It should integrate with the existing PvE / Road to Glory / tournament / championship systems.

## Possible states

### PvE progression available

```text
ROAD TO GLORY

ILOILO CIRCUIT
Qualifier III

Vundicator
VS
El Diablo

Counter Fighter
18W • 4L • 9KO

●──●──●──○──🏆

Win to advance to the Provincial Championship.

[ VIEW FIGHT → ]
```

### Tournament currently active

Prioritize the tournament if the player has an active tournament run.

Show:

- tournament name
- current round
- next opponent
- bracket progress
- entry/fight status

Action:

```text
CONTINUE TOURNAMENT →
```

### Championship unlocked

Surface the championship as the primary career objective.

### Challenge pending

A meaningful rival/player/NPC challenge may become the contextual objective depending on priority.

### No objective available

Use a real empty state rather than fake content.

Example:

```text
ROAD TO GLORY

No fight currently selected.

Choose your next challenge and continue building your fighter's career.

[ FIND A FIGHT → ]
```

---

# 9. Career Progress Visualization

Where supported by the existing progression system, provide a compact visual representation of progression.

Example:

```text
ROOKIE      BRAWLER      STRIKER      VETERAN      CHAMPION
  ●────────────●────────────●────────────○────────────🏆
```

The visualization must derive from actual progression/clear state.

Do not hardcode bosses as completed.

If progression is now structured around circuits, tournaments, or championships rather than the old five-boss ladder, derive the visualization from the newer system instead.

---

# 10. Ranch Attention

Replace passive ranch statistics with an **attention system**.

Raw totals can still exist, but the primary purpose is to tell the player which ranch systems currently require or reward interaction.

Examples of real attention items:

```text
🥚 2 EGGS READY TO HATCH

🏋 BANTAY FINISHED TRAINING
Speed EV +3

❤️ VUNDICATOR RECOVERED
Cleared to fight

🐓 KIDLAT REACHED FIGHTING AGE
Ready for evaluation
```

Potential sources include:

- eggs ready to hatch
- training completed
- training slots available
- injuries requiring treatment
- recovery completed
- fighter fatigue
- newly matured chickens
- rewards waiting to be claimed
- breeding completion
- newly available PvE fights
- tournament state
- challenges

## Priority

Attention items should be ordered by usefulness/urgency rather than arbitrarily.

Suggested priority:

```text
1. Blocking/urgent fighter state
2. Active competition state
3. Completed actions/rewards
4. New opportunities
5. Routine ranch management
```

---

# 11. Contextual Quick Actions

Remove or reduce generic static actions such as permanently displaying:

```text
FEED ALL
COLLECT
TRAINING
```

Quick Actions should respond to current game state.

Examples:

## After a fight

```text
TREAT FIGHTER
REVIEW FIGHT
CLAIM REWARD
```

## Fighter ready

```text
FIND FIGHT
START TRAINING
BREED
```

## Tournament active

```text
VIEW BRACKET
SCOUT OPPONENT
CONTINUE TOURNAMENT
```

## Eggs ready

```text
HATCH EGGS
```

## Injury present

```text
VISIT CLINIC
```

Every action must actually navigate to or invoke an existing game feature.

**No dead buttons.**

If an action cannot currently work, do not render it as though it does.

---

# 12. Your Stable

Introduce a compact roster strip allowing the player to see the state of several fighters immediately.

Example:

```text
YOUR STABLE

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ VUNDICATOR │ │ BANTAY     │ │ KIDLAT     │ │ MAYHEM     │
│ LV.25      │ │ LV.18      │ │ LV.14      │ │ LV.21      │
│ 53W 8L     │ │ 12W 3L     │ │ 7W 1L      │ │ 21W 5L     │
│ ● READY    │ │ TRAINING   │ │ FATIGUED   │ │ INJURED    │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

Again, this is structural only — actual displayed fighters and values must come from the player's roster.

## Interaction

Clicking a fighter should:

1. select that fighter as the homepage focus
2. update the central model
3. update the fighter card
4. update relevant contextual actions

Provide access to the complete Coop/Roster when the player owns more fighters than can reasonably fit here.

Example:

```text
VIEW ALL 18 →
```

The count must be real.

---

# 13. Ranch Journal

Replace the current sparse **Recent Activity** section with a meaningful Ranch Journal.

The journal tells the story of what has happened to the player's ranch and fighters.

Potential entries:

### Battle

```text
VUNDICATOR DEFEATED THE STRIKER
KO • 02:41
Winning streak increased to 4.
```

### Training

```text
BANTAY COMPLETED COUNTER DRILLS
Counter experience increased.
```

### Breeding

```text
A NEW CHICK HATCHED
View inherited genetics and bloodline.
```

### Recovery

```text
VUNDICATOR FULLY RECOVERED
Cleared for competition.
```

### Tournament

```text
VUNDICATOR ADVANCED TO THE SEMIFINAL
Next opponent is now available.
```

### Championship

```text
PROVINCIAL CHAMPIONSHIP UNLOCKED
Your stable is eligible to compete.
```

Entries should be derived from existing history/event/state data.

---

# 14. Journal Architecture

Prefer a normalized activity representation rather than writing homepage-specific rendering logic for every database model.

Conceptually:

```ts
type RanchActivity = {
  id: string;
  type:
    | "battle"
    | "training"
    | "breeding"
    | "hatching"
    | "recovery"
    | "injury"
    | "tournament"
    | "championship"
    | "challenge"
    | "progression"
    | "reward";
  occurredAt: Date;
  chickenId?: string;
  title: string;
  summary?: string;
  destination?: string;
};
```

This is illustrative, not mandatory.

Inspect existing schemas before introducing a new persistent model. If the journal can be reliably derived from existing battle/training/breeding/etc. records, prefer that over unnecessary duplication.

---

# 15. World / Career News

Where the game already has enough underlying simulation data, the Ranch Journal may also surface world/career developments.

Examples:

```text
PROVINCIAL RANKINGS UPDATED
Vundicator moved to #7.
```

```text
RIVAL CHALLENGE
A rival has challenged Vundicator.
```

```text
TOURNAMENT RESULTS
The semifinal bracket has been decided.
```

These must follow the same rule:

> No fabricated events presented as game state.

If NPC/world simulation does not currently exist, do not invent random news solely for homepage flavor.

World news can be expanded later when the supporting simulation exists.

---

# 16. Return-to-Game Summary

The homepage should make returning to the game satisfying.

When meaningful changes occurred since the player's previous session/visit, surface them prominently.

Concept:

```text
WELCOME BACK

3 things happened at your ranch.

✓ Bantay completed training
✓ Vundicator recovered
✓ 2 eggs are ready to hatch

[ VIEW RANCH ]
```

Do not manufacture offline events.

Only display changes that actually occurred.

Avoid showing this modal/panel when nothing meaningful happened.

---

# 17. Homepage Priority Engine

The homepage should not treat every system as equally important.

Determine the player's most relevant current objective.

Suggested conceptual priority:

```text
ACTIVE TOURNAMENT MATCH
        ↓
ACTIVE CHAMPIONSHIP
        ↓
PENDING IMPORTANT CHALLENGE
        ↓
NEXT ROAD TO GLORY FIGHT
        ↓
FIGHTER RECOVERY / INJURY
        ↓
COMPLETED TRAINING / BREEDING
        ↓
AVAILABLE TRAINING / BREEDING
        ↓
GENERAL RANCH MANAGEMENT
```

This does not need to become an over-engineered rules engine initially.

A deterministic selector/helper is sufficient.

Example concept:

```ts
resolvePrimaryRanchObjective(gameState)
```

It should return enough information for the homepage to render the primary CTA.

---

# 18. Layout Direction

Maintain the existing cinematic composition while improving information hierarchy.

Suggested desktop layout:

```text
┌───────────────────────────────────────────────────────────────────────┐
│                            GAME SHELL                                 │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐                          ┌────────────────────┐ │
│  │ ACTIVE FIGHTER   │                          │ ROAD TO GLORY      │ │
│  │                  │                          │                    │ │
│  │ Name             │          3D             │ Next objective     │ │
│  │ Record           │        ROOSTER           │ Opponent           │ │
│  │ Condition        │                          │ Progress           │ │
│  │ Stats            │                          │                    │ │
│  │                  │                          │ [ CONTINUE → ]     │ │
│  └──────────────────┘                          └────────────────────┘ │
│                                                                       │
│                         VUNDICATOR                                    │
│                     READY • 4 WIN STREAK                              │
│                                                                       │
│  ┌────────────────────────────┐ ┌───────────────────────────────────┐ │
│  │ RANCH ATTENTION            │ │ YOUR STABLE                       │ │
│  │                            │ │                                   │ │
│  │ Eggs ready                 │ │ Fighter cards                     │ │
│  │ Training completed         │ │                                   │ │
│  │ Recovery                   │ │                                   │ │
│  └────────────────────────────┘ └───────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────┐ ┌─────────────────┐ │
│  │ RANCH JOURNAL                               │ │ QUICK ACTIONS   │ │
│  │                                             │ │                 │ │
│  │ Recent meaningful activity                  │ │ Contextual      │ │
│  │                                             │ │ actions         │ │
│  └─────────────────────────────────────────────┘ └─────────────────┘ │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

Do not cover the cinematic background with excessive panels.

Negative space and visibility of the 3D rooster/environment are important.

---

# 19. Responsive Behavior

## Desktop

Use the full cinematic composition.

## Tablet

Allow secondary cards to stack while keeping the fighter and primary objective prominent.

## Mobile

Prioritize:

```text
Active Fighter
↓
Primary Objective
↓
Ranch Attention
↓
Quick Actions
↓
Stable
↓
Journal
```

The 3D fighter should remain visible where performance/layout permits.

Avoid tiny desktop-style glass cards squeezed onto mobile.

---

# 20. Loading States

Loading states are allowed.

Placeholder **gameplay data** is not.

Use skeleton UI while actual state loads.

Valid:

```text
████████
████ ████
```

Invalid:

```text
Vundicator
53W / 8L
```

when those values are hardcoded while waiting for the API.

---

# 21. Empty States

Every section must gracefully support real empty states.

Examples:

## No fighters

```text
YOUR STABLE IS EMPTY

Acquire or hatch your first rooster to begin building your bloodline.
```

## No activity

```text
YOUR STORY STARTS HERE

Fight, train, and breed your roosters to begin your Ranch Journal.
```

## No tournament

```text
NO ACTIVE TOURNAMENT

Check available competitions when you're ready to test your stable.
```

## No attention items

```text
RANCH IS IN GOOD SHAPE

Nothing currently requires your attention.
```

Empty states should still provide a useful next action when appropriate.

---

# 22. Error States

Do not silently replace failed API requests with fake content.

If a homepage section fails to load:

```text
Unable to load tournament status.

[ RETRY ]
```

Log errors appropriately and preserve the rest of the homepage when possible.

One failed subsystem should not necessarily make the entire Ranch Hub unusable.

---

# 23. API / Data Aggregation

Avoid turning the homepage into a waterfall of dozens of unrelated client-side API requests if the current architecture makes aggregation practical.

Consider a homepage/ranch summary endpoint such as:

```text
GET /api/ranch/overview
```

Potential response shape:

```ts
type RanchOverview = {
  activeFighter: ...;
  rosterSummary: ...;
  primaryObjective: ...;
  attentionItems: ...;
  recentActivity: ...;
  quickActions: ...;
  ranchSummary: ...;
};
```

This is a design direction, not a requirement to blindly create this exact interface.

Inspect the current Next.js/API architecture first.

Reuse existing endpoints where they already provide an appropriate clean solution.

---

# 24. Server Authority

The homepage is a presentation layer.

It must not become an alternate authority for gameplay state.

For example:

- battle records come from battle results
- training state comes from the training system
- injuries come from the medical/condition system
- tournament state comes from tournament logic
- progression comes from PvE/career state
- genetics come from chicken/genetics data

The client may derive presentation states, but it should not invent canonical gameplay state.

---

# 25. Performance

The homepage already contains a 3D scene, so avoid unnecessary work.

Requirements:

- avoid excessive polling
- avoid unnecessary duplicate fetches
- memoize expensive derived state where appropriate
- lazy-load secondary information where sensible
- keep the central fighter model responsive
- avoid reloading the GLB unnecessarily when unrelated homepage state changes
- avoid mounting multiple full 3D fighter scenes for the stable strip

Stable cards should use lightweight representations rather than several simultaneous expensive 3D scenes unless performance testing proves otherwise.

---

# 26. Interaction Polish

Use restrained game-like interaction feedback.

Examples:

- subtle panel hover
- gold border emphasis
- small transitions when switching fighters
- objective card emphasis when a new fight becomes available
- attention-item completion/removal transitions
- smooth fighter model transition when selecting another stable member

Avoid excessive glowing, bouncing, pulsing, or mobile-game notification spam.

The presentation should remain premium and cinematic.

---

# 27. Notification Philosophy

Not everything deserves a notification badge.

Use badges for genuinely actionable/new information.

Good:

```text
Clinic • 1
Tournament • Match Ready
Eggs • 2 Ready
```

Bad:

```text
Coop • 18 chickens
Training • available
Market • exists
```

The homepage should reduce noise, not create it.

---

# 28. Existing Systems to Inspect

Before implementation, inspect the repository for the existing implementations of:

- chicken roster / coop
- selected/main fighter
- chicken stats
- physical profile
- mutations
- bloodlines / ancestry
- battle records
- KO records
- battle history
- condition
- fatigue
- injuries
- medical/clinic
- training
- experience / battle hardening
- eggs
- breeding
- growth/aging
- PvE bosses
- Road to Glory
- championships
- tournaments
- challenges
- rivals
- rewards / currency

Do not assume schemas or APIs.

Use the codebase as the source of truth.

---

# 29. Implementation Order

Recommended order:

## Phase 1 — Audit

Identify real data sources for every homepage section.

Document anything that genuinely does not exist.

## Phase 2 — Data Layer

Create/reuse the minimum API/selectors necessary to obtain:

- focused fighter
- roster summary
- primary objective
- attention items
- activity
- contextual actions

## Phase 3 — Core Layout

Implement:

- Active Fighter
- central fighter state
- Road to Glory
- Ranch Attention
- Stable
- Ranch Journal
- contextual Quick Actions

## Phase 4 — Integration

Wire every button and card to real game systems.

## Phase 5 — State Handling

Implement:

- loading
- empty
- error
- locked
- unavailable

states.

## Phase 6 — Polish

Add transitions, responsive behavior, and interaction polish.

---

# 30. Acceptance Criteria

The homepage revamp is complete when:

- [ ] Existing cinematic visual identity is preserved.
- [ ] The central rooster represents a real player-owned fighter.
- [ ] Fighter stats and record are real.
- [ ] The player can change the focused fighter.
- [ ] Road to Glory displays real career/progression state.
- [ ] Tournament state is surfaced when relevant.
- [ ] Championship state is surfaced when relevant.
- [ ] Ranch Attention is generated from real game state.
- [ ] Stable cards use the player's actual roster.
- [ ] Ranch Journal entries originate from real game history/state.
- [ ] Quick Actions are contextual.
- [ ] Every rendered action works.
- [ ] Empty states exist for unavailable data/features.
- [ ] Failed requests never fall back to fake gameplay content.
- [ ] Loading uses skeletons rather than fake data.
- [ ] No mock fighters remain.
- [ ] No hardcoded records remain.
- [ ] No fake events remain.
- [ ] No fake tournament/championship data remains.
- [ ] No placeholder ranch counts remain.
- [ ] No dead buttons remain.
- [ ] Homepage state is derived from existing authoritative systems.
- [ ] The page clearly communicates what the player should do next.

---

# 31. Final UX Goal

The Ranch Hub should feel different depending on what is actually happening in the player's game.

A player returning after several developments might see:

```text
WELCOME BACK

Bantay completed training.
Two eggs are ready to hatch.
Vundicator has recovered.
Your next Provincial Qualifier is available.
```

Another player might see:

```text
TOURNAMENT IN PROGRESS

Quarterfinal won by KO.
Semifinal opponent confirmed.
Vundicator condition: 71%.

Recover before continuing or risk entering fatigued.
```

Another might see:

```text
RANCH IS QUIET

No fighters are injured.
No training sessions are complete.
No competition is currently active.

Vundicator is ready.

[ FIND A FIGHT ]
```

All three are valid because they represent **real state**.

The homepage should no longer merely display the game's systems.

It should **connect them into the player's current story.**

---

# 32. Codex Implementation Rule

Before writing implementation code:

1. Inspect the existing homepage and GameShell.
2. Locate the real data models/APIs for every proposed section.
3. Reuse existing components and systems where appropriate.
4. Do not introduce fake data to complete the visual design.
5. Do not duplicate canonical gameplay logic in frontend components.
6. Implement legitimate loading/empty/error states where data is unavailable.
7. Keep the current visual identity unless this specification explicitly requires a structural change.

**NO PLACEHOLDERS. NO MOCK GAMEPLAY DATA. NO DEAD UI.**

The finished Ranch Hub must be a real interface over the existing game.
