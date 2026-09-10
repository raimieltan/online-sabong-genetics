/# Cockfight Chronicles — Post-Fight Experience

**Status:** Approved for implementation  
**Scope:** Battle presentation / frontend / animation / progression reveal  
**Applies to:** PvE, Boss, Sparring, Tournament, Championship, PvP, Challenge

## Purpose

Replace the abrupt `COMBAT → KO → VICTORY POPUP` flow with:

`FINAL CLASH → KO → FIGHTERS REACT → WINNER MOMENT → RESULT → REWARDS → PROGRESSION → CONSEQUENCES → NEXT ACTION`

Victory is not a popup. Victory is the final phase of combat.

## Critical Architecture Rule

Do not unmount `BattleStage3D` when combat ends. Keep the arena, winner, defeated rooster, camera, lighting, particles, and environment alive while post-fight UI is layered over the scene.

```text
BattleStage3D
├── Arena
├── Winner
├── Defeated Fighter
├── Camera
├── Environment Effects
└── PostFightPresentation
    ├── KO Reveal
    ├── Result Reveal
    ├── Rewards
    ├── XP
    ├── Progression
    ├── Condition
    ├── Special Events
    └── Next Actions
```

Do not immediately navigate to a separate result page.

## Post-Fight State Machine

Do not build the sequence from scattered `setTimeout()` calls.

```ts
export type PostFightState =
  | "inactive"
  | "final_impact"
  | "ko_confirm"
  | "defeat_settle"
  | "winner_reaction"
  | "result_reveal"
  | "reward_reveal"
  | "xp_reveal"
  | "progression_reveal"
  | "condition_reveal"
  | "special_event"
  | "next_action";
```

```text
COMBAT
↓
FINAL_IMPACT
↓
KO_CONFIRM
↓
DEFEAT_SETTLE
↓
WINNER_REACTION
↓
RESULT_REVEAL
↓
REWARD_REVEAL
↓
XP_REVEAL
├── LEVEL_UP
↓
PROGRESSION_REVEAL
├── TRAIT DEVELOPED
├── BEHAVIOR DEVELOPED
├── TITLE AWARDED
└── NONE
↓
CONDITION_REVEAL
├── INJURY
├── FATIGUE
├── STRESS
└── RECOVERY STATE
↓
SPECIAL_EVENT
↓
NEXT_ACTION
```

## Final Impact

When the fight-ending attack lands, let the attack complete visually before declaring the result.

`ATTACK → CONTACT → HIT STOP → REACTION → KNOCKBACK/STAGGER → FALL → KO CONFIRMED`

Use roughly 100–180ms finishing hit-stop depending on severity.

The camera should tighten around contact, follow the fall, briefly settle on the defeated fighter, and only then reframe toward the winner.

## Defeated Fighter

Once KO is confirmed, the defeated rooster remains physically present.

```text
AIRBORNE
↓
FALL
↓
GROUND IMPACT
↓
DOWNED
↓
DEFEATED_IDLE
```

Do not despawn it, reset it to idle, teleport it, resume combat locomotion, or allow it to attack/circle. This must prevent defeated fighters from flapping indefinitely or standing back up.

## KO Reveal

After the defeated fighter settles, show a brief impact presentation. Optional local impact text can use `KALABOG!!`, followed by a central `K.O.`.

Do not show rewards yet.

## Scene Breathing Period

Give the scene roughly 0.7–1.5 seconds of minimal UI after KO. The loser stays down, the winner recognizes victory, the camera reframes, and the arena/crowd reacts.

The player should visually understand the victory before the UI announces it.

## Winner Reaction

Support reactions such as dominant posture, feather shake, wing flare, crow, head raise, opponent stare, pacing away, and exhausted victory stance.

Where practical, select reactions based on fighting style, behavior, fatigue, health, confidence, or victory severity. Initial implementation may use a smaller shared animation set.

## Result Reveal

Only after the winner moment should the main result appear.

```text
WINNER
RONIN
VICTORY
KNOCKOUT
```

Keep this first reveal minimal. Do not immediately display rewards, XP, injuries, progression, stats, and buttons.

Follow `docs/ui/visual-style.md`: smoked translucent glass, aged gold/brass, cream typography, restrained blur, and arena visibility. Do not cover the scene with a giant opaque card.

## Defeat Flow

```text
PLAYER FIGHTER FALLS
↓
OPPONENT REACTION
↓
DEFEAT
↓
EXPERIENCE
↓
CONDITION
↓
CONSEQUENCES
↓
NEXT ACTION
```

Do not immediately kick the player back to another page.

## Rewards and XP

Reveal rewards progressively instead of dumping them simultaneously.

```text
VICTORY
↓
+500 CREDITS
↓
+120 XP
↓
FIRST CLEAR BONUS
+250 CREDITS
```

Animate/count values where practical. Support existing reward types rather than hardcoding credits only.

XP should visibly fill the progress bar. If a threshold is crossed, interrupt with a short `LEVEL UP!` moment and then resume the sequence.

## Combat Experience and Development

Expose meaningful gains from existing behavioral combat experience systems.

```text
BATTLE EXPERIENCE
OFFENSIVE       +3
COUNTER         +8
RECOVERY        +2
PRESSURE        +4
```

Skip unchanged categories.

If battle hardening, behavior, or traits change, reveal them as dedicated progression events. Never invent these client-side; only present authoritative changes.

Example:

```text
TRAIT DEVELOPED
COUNTER FIGHTER
RARE
```

## Record and Condition

Show meaningful record changes when applicable:

```text
12W → 13W
4 KO → 5 KO
WIN STREAK 3 → 4
```

Then show the cost of the fight:

```text
FIGHT CONDITION
HEALTH      82% → 61%
ENERGY      74% → 34%
FATIGUE     28% → 72%
MORALE      65 → 71
CONFIDENCE  64 → 72
```

## Injuries

If an injury occurs, give it a dedicated reveal using authoritative injury and recovery data.

```text
⚠ INJURY
SPRAINED WING
Agility temporarily reduced.
```

Major persistent consequences must never be silently applied.

## Special Event Queue

Queue major events instead of showing them simultaneously.

```ts
interface PostFightEvent {
  id: string;
  type:
    | "level_up"
    | "trait_unlock"
    | "behavior_change"
    | "injury"
    | "title_award"
    | "tournament_advance"
    | "championship"
    | "unlock";
  priority: number;
  payload: unknown;
}
```

Suggested priority: championship/title → critical consequence → level up → trait → behavior → tournament progression → standard unlock.

## Mode-Specific Flows

### Normal PvE

`FINAL HIT → KO → WINNER REACTION → VICTORY → REWARDS → XP/PROGRESSION → CONDITION → CONTINUE`

Target roughly 4–7 seconds before control returns, depending on events.

### Boss

`FINAL HIT → BOSS FALLS → KO → WINNER REACTION → BOSS DEFEATED → FIRST CLEAR → SPECIAL REWARDS → PROGRESSION → NEXT BOSS/RETURN`

### Sparring

`FIGHT ENDS → WINNER → SPARRING COMPLETE → TRAINING EXPERIENCE → CONDITION/FATIGUE → RETURN TO TRAINING`

Keep this less dramatic than competitive fights.

### Tournament

`KO → VICTORY → REWARDS → PROGRESSION → BRACKET REVEAL → ADVANCEMENT → NEXT ACTION`

Do not immediately return to tournament management.

### Championship

`FINAL HIT → OPPONENT FALLS → CROWD REACTION → WINNER HERO SHOT → DRAMATIC PAUSE → CHAMPION REVEAL → TITLE → REWARDS → RECORD → BLOODLINE PRESTIGE → PROGRESSION → CONTINUE`

Example:

```text
🏆
BAGONG KAMPEON
RONIN
```

Target roughly 8–12 seconds for the major sequence, with later sections acceleratable.

### PvP

`OPPONENT DOWN → VICTORY → RATING CHANGE → REWARDS → RECORD → CONDITION → REMATCH/EXIT`

Respect actual PvP/ranking rules.

## Post-Fight Actions

Only show actions after the important presentation completes. Use one clear primary CTA based on context.

Examples: `NEXT FIGHT`, `CONTINUE`, `NEXT MATCH`, `VISIT CLINIC`, `RETURN TO TRAINING`, `REMATCH`.

## Skip / Accelerate

Protect the finishing impact and initial KO. After the core result reveal, allow click/Space/Enter to accelerate presentation.

Suggested rule: first ~1.5–2 seconds cannot be skipped; later reveals can be accelerated.

Acceleration affects presentation only. It must never skip server processing, duplicate rewards, or automatically navigate away.

## Animation Ownership

Post-fight presentation takes explicit ownership of fighter animation states.

```ts
type FighterPostFightAnimation =
  | "downed"
  | "defeated_idle"
  | "victory_idle"
  | "victory_crow"
  | "victory_flare"
  | "victory_exhausted";
```

Combat animation commands must stop once post-fight begins.

```text
COMBAT_ACTIVE
↓
FINISHING_EXCHANGE
↓
COMBAT_COMPLETE
↓
POST_FIGHT
```

After `COMBAT_COMPLETE`, do not allow `STALK`, `CIRCLE`, `DASH`, `CLASH`, `DISENGAGE`, `ATTACK`, or `RECOVER` to resume.

## Server Authority

The server/domain layer remains authoritative for winner, rewards, XP, injuries, traits, progression, tournament advancement, titles, records, and condition changes.

The frontend only presents those results.

## Camera Cues

Extend the existing `BattleStage3D` camera cue architecture.

```ts
type PostFightCameraCue =
  | "final-impact"
  | "defeated-focus"
  | "winner-reframe"
  | "winner-hero"
  | "result-wide"
  | "championship-hero";
```

## Suggested Components

```text
components/battle/postfight/
PostFightController.tsx
PostFightOverlay.tsx
KOReveal.tsx
ResultReveal.tsx
RewardReveal.tsx
XPReveal.tsx
ProgressionReveal.tsx
ConditionReveal.tsx
SpecialEventReveal.tsx
TournamentAdvance.tsx
ChampionshipReveal.tsx
PostFightActions.tsx
```

Keep state/sequencing, visual presentation, and authoritative domain result data separated.

## Timing Guidance

```text
FINAL IMPACT       0.0s
DEFEATED SETTLE    0.2–0.8s
KO                 0.8–1.5s
WINNER REACTION    1.3–2.5s
VICTORY            2.3–3.3s
REWARDS            3.0s+
PROGRESSION        after rewards
PLAYER CONTROL     ~4–7s
```

Prefer animation completion/events over rigid timers. Use timeout fallbacks only so failed animation events cannot trap the player.

## Required Tests

Test normal KO win, player loss, level up, injury, tournament advancement, championship victory, no progression events, animation failure, rapid skip input, and replay behavior.

Replay must never persist rewards twice.

## Do Not

Do not instantly show a victory modal, immediately navigate away, unmount `BattleStage3D`, despawn the defeated fighter, return it to idle, let combat AI continue after KO, calculate persistent rewards client-side, invent progression events, use giant opaque result cards, make every victory equally dramatic, or force players through long repetitive sequences.

## Final Experience

```text
I LANDED THE FINAL HIT.
↓
I WATCHED THE OPPONENT GO DOWN.
↓
MY ROOSTER REALIZED IT WON.
↓
THE ARENA REACTED.
↓
THE GAME DECLARED THE RESULT.
↓
I SAW WHAT I EARNED.
↓
I SAW HOW MY ROOSTER DEVELOPED.
↓
I SAW WHAT THE FIGHT COST ME.
↓
I CHOSE WHAT TO DO NEXT.
```

The fight does not end when HP reaches zero. It ends when the player has experienced the consequence of the result.
