# Tournament Feature Revamp — Flow Specification

**Status:** Planning  
**Scope:** Tournament gameplay flow only  
**UI styling:** Out of scope for this document

---

## 1. Goal

Revamp tournaments from a simple:

```text
Choose bracket size
→ Choose difficulty
→ Generate roster
→ Fight round
→ Repeat
```

into a persistent championship run where the player:

- chooses an actual tournament event,
- registers one rooster,
- sees a generated bracket,
- progresses through that bracket,
- manages the fighter between rounds,
- sees simulated results from the rest of the tournament,
- reaches increasingly important rounds,
- and receives a proper tournament conclusion.

The tournament should feel like a short competitive campaign rather than a sequence of disconnected PvE fights.

---

# 2. Core Tournament Flow

```text
CHAMPIONSHIP CIRCUIT
        ↓
SELECT TOURNAMENT
        ↓
TOURNAMENT DETAILS
        ↓
REGISTER FIGHTER
        ↓
LOCK TOURNAMENT ENTRY
        ↓
GENERATE TOURNAMENT FIELD
        ↓
BRACKET DRAW
        ↓
ROUND HUB
        ↓
PLAYER MATCHUP
        ↓
PRE-FIGHT
        ↓
BATTLE
        ↓
POST-FIGHT RESULT
        ↓
UPDATE FIGHTER CONDITION
        ↓
SIMULATE OTHER MATCHES
        ↓
UPDATE BRACKET
        ↓
ELIMINATED?
   ┌────┴────┐
  YES        NO
   ↓          ↓
TOURNAMENT   BETWEEN-ROUND
SUMMARY      PHASE
              ↓
         NEXT ROUND HUB
              ↓
         NEXT MATCHUP
              ↓
             ...
              ↓
        CHAMPIONSHIP FINAL
              ↓
          FINAL BATTLE
              ↓
      CHAMPIONSHIP CEREMONY
              ↓
       TOURNAMENT SUMMARY
```

---

# 3. Phase 1 — Championship Circuit

The player enters the tournament system through the **Championship Circuit**.

This screen should represent the available PvE competition structure.

Instead of primarily asking:

- bracket size,
- difficulty,

the system should present named tournament events.

Example:

```text
Barangay Open
Panay Invitational
Visayas Championship
National Championship
Legends Cup
```

Each tournament definition owns its rules.

Example:

```ts
interface TournamentDefinition {
  id: string;
  name: string;
  circuitTier: TournamentCircuitTier;

  bracketSize: 8 | 16 | 32;
  difficulty: TournamentDifficulty;

  entryFee: number;
  rewards: TournamentRewards;

  eligibility: TournamentEligibility;
  rules: TournamentRules;

  arenaPool?: string[];
}
```

This makes bracket size and difficulty properties of the event rather than the event itself.

---

# 4. Tournament Progression Structure

Recommended PvE tournament hierarchy:

```text
LOCAL CIRCUIT
    ↓
REGIONAL CIRCUIT
    ↓
MAJOR CIRCUIT
    ↓
NATIONAL CIRCUIT
    ↓
ELITE / LEGENDS CIRCUIT
```

Example progression:

```text
Barangay Open
8 Bird
Beginner
        ↓
Iloilo Open
8 Bird
Rookie
        ↓
Panay Invitational
16 Bird
Rookie / Veteran
        ↓
Visayas Championship
16 Bird
Veteran
        ↓
Philippine Championship
32 Bird
Champion
        ↓
Legends Invitational
16 Bird
Elite
```

Higher tournaments can require:

- previous tournament wins,
- fighter rating,
- career wins,
- championship titles,
- prestige,
- minimum age,
- minimum condition,
- or special qualification.

---

# 5. Phase 2 — Tournament Details

Selecting an event opens the tournament details phase.

The player reviews:

```text
Tournament name
Circuit level
Bracket size
Difficulty
Entry fee
Prize pool
Tournament rules
Eligibility requirements
Previous best result
Previous championships
```

The player can either:

```text
BACK
```

or:

```text
REGISTER FIGHTER
```

No tournament instance exists yet.

The tournament should only become active once registration is confirmed.

---

# 6. Phase 3 — Fighter Registration

The player chooses one eligible rooster from the coop.

Important information:

```text
Name
Rating
Record
Fighting style
Condition
Fatigue
Injuries
Tournament eligibility
Recent form
```

Possible states:

```text
ELIGIBLE
INJURED
FATIGUED
UNDERAGE
RATING TOO HIGH
RATING TOO LOW
DOES NOT MEET QUALIFICATION
ALREADY REGISTERED
```

Once selected:

```text
REGISTER <FIGHTER>
```

should show a final confirmation.

Example:

```text
Register Vindictor for the Panay Invitational?

Entry Fee: ₱500

Once the tournament begins:
- this fighter cannot be replaced,
- current condition carries into the event,
- tournament injuries persist,
- elimination ends the run.
```

Then:

```text
CONFIRM ENTRY
```

---

# 7. Phase 4 — Tournament Instance Creation

After registration, create a persistent tournament instance.

Example:

```ts
interface TournamentRun {
  id: string;

  tournamentDefinitionId: string;
  playerChickenId: string;

  status:
    | "registered"
    | "active"
    | "eliminated"
    | "champion"
    | "completed";

  currentRound: TournamentRound;

  entrants: TournamentEntrant[];
  matches: TournamentMatch[];

  startedAt: Date;
  completedAt?: Date;
}
```

This run must survive:

- page refreshes,
- navigation away from tournaments,
- closing the browser,
- reconnecting later.

The player should be able to resume an unfinished tournament.

---

# 8. Phase 5 — Generate Tournament Field

Fill the remaining bracket slots with AI fighters.

For a 16-bird tournament:

```text
1 player fighter
15 generated / existing AI fighters
```

AI fighter generation should respect tournament difficulty.

Do not make all opponents identical.

Create a distribution of:

```text
weak opponents
average opponents
strong opponents
dangerous seeds
possible tournament favorites
```

Example:

```text
16 entrants

2 weak
7 average
4 strong
2 elite-for-tier
1 player
```

Difficulty controls the distribution, not merely a flat stat bonus.

---

# 9. Optional Seeding

Tournament draws can eventually support seeding.

Example:

```text
Seed #1
Seed #2
Seed #3
Seed #4
Unseeded entrants
```

Strong AI fighters should preferably be separated across the bracket.

The player can be:

```text
unseeded
```

unless their career prestige qualifies them.

This allows tournament stories like:

```text
Vindictor draws the #2 seed in the Quarterfinal.
```

---

# 10. Phase 6 — Bracket Draw

Once entrants are ready, generate the entire bracket.

Example:

```text
ROUND OF 16

Match 1
Vindictor
vs
Copper Sinner

Match 2
Bagwis
vs
Tigre

Match 3
Gitgit
vs
Cursed Cobra

...
```

Every future bracket slot exists but remains unresolved.

Example:

```text
R16 Match 1 winner
        ┐
        ├─ Quarterfinal Match 1
        │
R16 Match 2 winner
```

The player's entire possible route to the championship should be visible.

---

# 11. Round Lifecycle

Each tournament round uses the same lifecycle.

```text
ROUND START
    ↓
ROUND HUB
    ↓
PLAYER MATCH IDENTIFIED
    ↓
PRE-FIGHT MATCHUP
    ↓
BATTLE
    ↓
POST-FIGHT RESULT
    ↓
PLAYER WIN?
 ┌──────┴───────┐
NO              YES
↓                ↓
ELIMINATION    CONDITION UPDATE
↓                ↓
SIM OTHER      SIM OTHER MATCHES
MATCHES           ↓
↓             BRACKET UPDATE
SUMMARY           ↓
             ROUND COMPLETE
                  ↓
          BETWEEN-ROUND PHASE
```

---

# 12. Phase 7 — Round Hub

The Round Hub becomes the home screen while the tournament is active.

It should answer:

```text
What round am I in?
How many fighters remain?
Who am I fighting?
What condition is my rooster in?
What happened in the tournament?
What happens next?
```

Example:

```text
PANAY INVITATIONAL

Quarterfinal
8 fighters remain

Your Fighter
Vindictor

Next Opponent
Bagwis

Tournament Record
1-0

NEXT MATCH
Vindictor vs Bagwis
```

From here:

```text
VIEW BRACKET
SCOUT OPPONENT
PREPARE FOR MATCH
```

---

# 13. Phase 8 — Opponent Scouting

Before a match, the player may inspect the opponent.

Basic known information:

```text
name
visual appearance
record
rating
fighting style
size
previous tournament result
```

Advanced information may depend on scouting systems:

```text
aggression tendency
counter tendency
preferred range
stamina weakness
opening tendencies
injuries
recent fatigue
```

Not all information should necessarily be available for free.

This creates a future connection to:

- coaching,
- scouting,
- facilities,
- staff,
- experience.

---

# 14. Phase 9 — Pre-Fight Matchup

The player enters the reusable matchup flow already used by normal battles.

Tournament context is injected.

Example:

```text
PANAY INVITATIONAL
QUARTERFINAL

VINDICTOR
vs
BAGWIS

Winner advances to the Semifinal.
```

Then:

```text
ENTER ARENA
```

---

# 15. Phase 10 — Battle

Tournament battles should use the same main combat system as all other fight types.

The tournament system should not maintain a separate combat simulator.

It provides context:

```text
event
round
stakes
fighter condition
persistent tournament state
```

The battle engine returns:

```ts
interface TournamentBattleResult {
  winnerId: string;
  loserId: string;

  method: "KO" | "TKO" | "decision" | "doctor_stoppage";

  durationMs: number;

  fighterConditionDelta: FighterConditionDelta;

  injuries: InjuryResult[];

  combatResultId: string;
}
```

---

# 16. Phase 11 — Immediate Fight Result

At battle completion:

```text
VICTORY
```

or:

```text
DEFEAT
```

is shown first.

This is the immediate emotional payoff.

Do not immediately dump the player back into the tournament screen.

Recommended sequence:

```text
KO / RESULT MOMENT
        ↓
FIGHT RESULT
        ↓
TOURNAMENT CONSEQUENCES
        ↓
BRACKET UPDATE
```

---

# 17. Phase 12 — Tournament Consequences

After the result, apply persistent effects.

Possible changes:

```text
health
fatigue
condition
injuries
confidence
stress
experience
battle hardening
career record
tournament record
```

Example:

```text
Vindictor advances.

Health: 74%
Fatigue: Moderate
Condition: 81%

No injuries.

Tournament Record:
2-0
```

These values carry into the next round.

---

# 18. Elimination Flow

If the player loses:

```text
DEFEAT
    ↓
PLAYER ELIMINATED
    ↓
SIMULATE REST OF TOURNAMENT
    ↓
DETERMINE CHAMPION
    ↓
TOURNAMENT SUMMARY
```

Optional future feature:

```text
WATCH REMAINING TOURNAMENT
```

but this should not be required.

The player should still see:

```text
Final placement
Winner
Prize earned
XP earned
Career changes
Injuries
Tournament highlights
```

Example:

```text
PANAY INVITATIONAL

Vindictor
Eliminated in Quarterfinal

Final Placement
5th–8th

Record
1-1

Winner
Blazing Vanguard
```

---

# 19. Phase 13 — Simulate Other Matches

After the player's fight, resolve the remaining matches in that round.

Do not necessarily resolve them before the player fights.

This allows presentation such as:

```text
YOUR RESULT
Vindictor defeats Copper Sinner

OTHER RESULTS

Bagwis defeats Tigre — KO
Gitgit defeats Cursed Cobra — Decision
Blazing Vanguard defeats Noble Guardian — TKO
```

Then update the bracket.

---

# 20. Bracket Reveal Sequence

Recommended sequence after winning:

```text
1. Highlight player's completed match
2. Advance player's fighter into next slot
3. Reveal nearby match result
4. Advance next opponent
5. Reveal remaining tournament results
6. Highlight next matchup
```

Example:

```text
Vindictor ──────┐
                ├── VINDICTOR ───┐
Copper Sinner ──┘                 │
                                  ├── ?
Bagwis ─────────┐                 │
                ├── BAGWIS ──────┘
Tigre ──────────┘
```

Then:

```text
NEXT MATCH

VINDICTOR
vs
BAGWIS
```

---

# 21. Phase 14 — Between-Round Phase

After a round is complete, allow a limited recovery/preparation phase.

The fighter should not simply become completely fresh.

Example actions:

```text
REST
TREATMENT
SCOUT
WARM UP
COACHING
```

Initially, implement only a small version.

Recommended V1:

```text
Choose ONE between-round action.
```

---

# 22. Rest

```text
REST
```

Effects:

```text
reduce fatigue
small condition recovery
no scouting bonus
```

Example:

```text
Fatigue -20%
Condition +5%
```

---

# 23. Treatment

```text
TREATMENT
```

Effects:

```text
improve minor injury
reduce injury penalties
small health recovery
```

Severe injuries should not disappear instantly.

---

# 24. Scout

```text
SCOUT OPPONENT
```

Effects:

```text
reveal behavior tendencies
reveal recent fight performance
reveal possible weaknesses
```

No physical recovery.

---

# 25. Warm Up

```text
WARM UP
```

Effects:

```text
temporary readiness bonus
temporary confidence bonus
possibly slight fatigue cost
```

This should be small enough to avoid becoming mandatory.

---

# 26. Coaching

Future option:

```text
COACHING SESSION
```

Can affect:

```text
tell recognition
command compliance
opening strategy
counter-plan
mental readiness
```

This connects tournaments to the Strategy Fighter / coaching system.

---

# 27. Limited Between-Round Resources

Eventually tournaments can restrict resources.

Example:

```text
Medical Treatments Remaining: 1
Scout Reports Remaining: 2
Rest: Unlimited
```

or:

```text
Preparation Points: 2
```

Each action consumes points.

For V1, one action per round is sufficient.

---

# 28. Round Advancement

When preparation is complete:

```text
CONTINUE TO NEXT ROUND
```

Then return to:

```text
ROUND HUB
```

with:

```text
new round
new opponent
updated tournament bracket
updated fighter condition
```

---

# 29. Tournament Round Naming

### 8-Bird

```text
Quarterfinal
Semifinal
Final
```

### 16-Bird

```text
Round of 16
Quarterfinal
Semifinal
Final
```

### 32-Bird

```text
Round of 32
Round of 16
Quarterfinal
Semifinal
Final
```

Never show generic:

```text
Round 1
Round 2
Round 3
```

when a proper tournament round name exists.

---

# 30. Increasing Stakes Per Round

The tournament should progressively feel more important.

Example:

### Early Round

```text
normal presentation
normal arena
short intro
```

### Quarterfinal

```text
slightly stronger presentation
opponent history shown
```

### Semifinal

```text
special intro
crowd emphasis
higher commentary intensity
```

### Final

```text
unique championship presentation
special camera sequence
championship graphics
longer fighter introductions
championship arena variant
```

The combat mechanics remain consistent.

Presentation changes.

---

# 31. Championship Final Flow

When the player reaches the final:

```text
SEMIFINAL WIN
      ↓
BRACKET UPDATE
      ↓
FINALIST CONFIRMED
      ↓
BETWEEN-ROUND PREPARATION
      ↓
CHAMPIONSHIP FINAL INTRO
      ↓
FINAL MATCHUP
      ↓
ARENA INTRO
      ↓
FINAL BATTLE
```

The final should never feel identical to an ordinary PvE match.

---

# 32. Winning the Tournament

If the player wins the final:

```text
FINAL VICTORY
      ↓
CHAMPION MOMENT
      ↓
CHAMPIONSHIP CEREMONY
      ↓
FINAL BRACKET
      ↓
TOURNAMENT REWARDS
      ↓
CAREER UPDATES
      ↓
TOURNAMENT SUMMARY
```

---

# 33. Championship Ceremony

The ceremony records the achievement.

Example:

```text
TOURNAMENT CHAMPION

Vindictor

Panay Invitational
2026

4 Wins
3 KOs
```

Apply:

```text
championship title
career win
prestige
credits
experience
bloodline prestige
fighter history entry
```

---

# 34. Permanent Fighter History

Tournament participation should become part of the rooster's permanent history.

Example:

```ts
interface TournamentHistoryEntry {
  tournamentRunId: string;
  tournamentName: string;

  date: Date;

  placement: number | "champion";

  wins: number;
  losses: number;
  knockouts: number;

  prizeEarned: number;
}
```

Example fighter profile:

```text
VINDICTOR

Tournament History

🏆 Panay Invitational Champion
🥈 Iloilo Open Runner-Up
   Barangay Open — Quarterfinal

Tournament Record
9-2

Championships
1
```

---

# 35. Bloodline Integration

Tournament achievements should eventually influence bloodline prestige.

Example:

```text
Sire:
Vindictor

Achievements:
Panay Invitational Champion
11 tournament wins
7 tournament KOs
```

Possible derived value:

```ts
bloodlinePrestige += championshipPrestige;
```

This gives tournament success value beyond credits.

---

# 36. Tournament Rewards

Rewards should exist at multiple levels.

Example:

```text
Match Win
+ Credits
+ XP

Round Advancement
+ Prestige

Placement
+ Credits

Championship
+ Major Credits
+ Prestige
+ Title
+ Trophy
```

Example:

```text
ROUND OF 16 WIN
₱250

QUARTERFINAL WIN
₱400

SEMIFINAL WIN
₱750

CHAMPION
₱5,000
+ Regional Champion title
+ 100 Prestige
```

---

# 37. Tournament Resume Flow

If the player leaves mid-tournament:

```text
COOP
    ↓
TOURNAMENT
    ↓
ACTIVE TOURNAMENT DETECTED
    ↓
RESUME PANAY INVITATIONAL
```

Display:

```text
ACTIVE TOURNAMENT

Panay Invitational
Quarterfinal

Vindictor vs Bagwis

[ RESUME TOURNAMENT ]
```

Do not regenerate opponents or the bracket.

---

# 38. Abandon Tournament

Provide an explicit:

```text
WITHDRAW
```

option.

Confirmation:

```text
Withdraw Vindictor from the Panay Invitational?

This will count as tournament elimination.
Entry fees will not be refunded.
```

Then:

```text
WITHDRAW
CANCEL
```

---

# 39. Tournament State Machine

Recommended high-level state machine:

```ts
type TournamentState =
  | "registration"
  | "draw"
  | "round_hub"
  | "pre_fight"
  | "fighting"
  | "post_fight"
  | "simulating_round"
  | "bracket_update"
  | "between_rounds"
  | "eliminated"
  | "final"
  | "champion"
  | "completed";
```

Typical successful run:

```text
registration
→ draw
→ round_hub
→ pre_fight
→ fighting
→ post_fight
→ simulating_round
→ bracket_update
→ between_rounds
→ round_hub
→ ...
→ final
→ fighting
→ champion
→ completed
```

---

# 40. Match State

Each match should have independent state.

```ts
interface TournamentMatch {
  id: string;

  tournamentRunId: string;

  round: TournamentRound;
  matchIndex: number;

  fighterAId?: string;
  fighterBId?: string;

  winnerId?: string;

  status:
    | "waiting"
    | "ready"
    | "active"
    | "completed";

  combatResultId?: string;
}
```

---

# 41. Advancement Logic

Example:

```text
R16 Match 1 winner
→ QF Match 1 fighter A

R16 Match 2 winner
→ QF Match 1 fighter B
```

Bracket mapping should be deterministic.

Do not rebuild the bracket after every round.

Generate the bracket structure once.

Then fill advancing slots.

---

# 42. AI Tournament Simulation

Non-player matches can use a faster server simulation.

They do not need full rendered combat.

However, they should use compatible fighter stats and combat logic so outcomes feel believable.

Generate result details:

```text
winner
method
duration
remaining health
injuries
```

Example:

```text
Bagwis defeats Tigre
KO
01:43
```

This creates history inside the tournament.

---

# 43. Opponent Persistence

If Bagwis wins a previous match:

```text
Bagwis condition
Bagwis fatigue
Bagwis injuries
```

should also carry into their next match.

AI competitors should obey the same tournament persistence rules as the player where practical.

Otherwise the player is penalized for persistence while AI fighters magically reset.

---

# 44. Tournament Story Generation

Because opponents persist, tournaments naturally generate stories.

Example:

```text
Round of 16
Bagwis wins by KO.

Quarterfinal
Bagwis survives a close decision.

Semifinal
Vindictor faces an exhausted Bagwis.
```

Or:

```text
Blazing Vanguard
#1 tournament seed

won three consecutive KOs

now faces Vindictor in the final.
```

No scripted narrative system is required initially.

The bracket itself generates stories.

---

# 45. Tournament Favorites

At tournament creation, identify several notable entrants.

Possible labels:

```text
Tournament Favorite
Dark Horse
Veteran
Unbeaten
Knockout Artist
Former Champion
```

These can be based on fighter data.

Example:

```text
BLAZING VANGUARD

Tournament Favorite
Rating 2,126
Record 18-3
12 KO
```

This increases anticipation if the player sees them advancing through the opposite bracket.

---

# 46. Upsets

Track tournament upsets.

Example:

```text
UPSET

#12 Copper Sinner
defeats
#3 Noble Guardian
```

Upsets should simply emerge from combat outcomes.

They can appear in tournament highlights.

---

# 47. Tournament Highlights

Maintain a lightweight event log.

```ts
interface TournamentHighlight {
  type:
    | "knockout"
    | "upset"
    | "close_fight"
    | "player_win"
    | "injury"
    | "championship";

  matchId: string;

  text: string;
}
```

Examples:

```text
Fastest KO
Bagwis — 00:38

Biggest Upset
Tigre defeats #2 seed Gitgit

Fight of the Tournament
Vindictor vs Bagwis
```

---

# 48. Final Tournament Summary

Every tournament concludes with a summary.

Example:

```text
PANAY INVITATIONAL
COMPLETE

Champion
Vindictor

Your Placement
Champion

Record
4-0

Knockouts
3

Prize Earned
₱6,400

XP Earned
920

Prestige
+120

Injuries
Minor wing strain

Tournament Highlights
Fastest KO — Vindictor vs Tigre
Fight of the Tournament — Vindictor vs Bagwis
```

---

# 49. Initial V1 Scope

Do not build every expansion immediately.

Recommended first implementation:

### Required

```text
Named tournament definitions
Tournament selection
Tournament details
Fighter registration
Persistent tournament run
8 / 16 / 32 bracket generation
Bracket progression
Player matchup identification
Normal battle integration
Post-fight result
AI match simulation
Persistent health / fatigue
Bracket update
Elimination
Tournament victory
Rewards
Tournament history
Resume tournament
```

### Add shortly afterward

```text
Between-round action
Opponent scouting
Tournament seeding
Tournament favorites
Highlights
Prestige
Circuit unlock progression
```

### Later

```text
Qualification tournaments
Seasonal circuits
Invitationals
Defending championships
NPC rivalries
Tournament sponsorships
Online tournaments
Spectator mode
Ranked championships
Live PvP brackets
```

---

# 50. Final Player Experience

The intended experience should be:

```text
I found an event I want to enter.
        ↓
I chose the rooster I'm willing to risk.
        ↓
The draw revealed my path.
        ↓
I know my first opponent.
        ↓
I fought and survived.
        ↓
My rooster is now tired.
        ↓
I watched the bracket change around me.
        ↓
A dangerous fighter is advancing toward my side.
        ↓
I have one preparation decision before the next fight.
        ↓
I reach the semifinal.
        ↓
The presentation becomes more intense.
        ↓
I reach the championship.
        ↓
The final feels important.
        ↓
I win.
        ↓
That championship permanently belongs to this rooster
and its career history.
```

That is the core tournament flow.

The separate UI specification should be built around this flow rather than designing each screen independently.
