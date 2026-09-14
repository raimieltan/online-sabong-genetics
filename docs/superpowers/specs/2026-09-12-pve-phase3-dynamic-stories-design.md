# PvE Campaign — Phase 3: Dynamic Stories

**Status:** Design / implementation specification
**Parent spec:** `docs/story/pve_campaign_revamp.md` §35 (Phase 3 — Dynamic Stories)
**Depends on:** Phase 1 (presentation revamp) and Phase 2 (reputation/rankings) — both already implemented in `lib/pve/`.

---

## 1. Goal

Implement the seven Phase 3 items from the parent spec as one cohesive pass:

- rivals
- rematches
- callouts
- optional challenges
- invitationals
- dynamic opponent progression
- special encounters

Reuse the existing boss combat pipeline (`buildBossFighter` → `LiveCombatV2Session` → `finishBossFight`) and the existing `PveOpponentHistory` / `PveProgress` / `PveCampaignState` tables. No new combat engine, no PvE-specific battle UI fork.

---

## 2. Core Insight

Rivals, rematches, and dynamic opponent progression are one mechanic: an **escalation engine** driven by the head-to-head record already captured in `PveOpponentHistory` (wins, losses, kosFor, kosAgainst, lastFightAt per playerId+bossId).

Callouts, optional challenges, invitationals, and special encounters are a **content layer** built on top of that engine plus the existing node-type/reputation system.

---

## 3. Escalation Engine

**File:** `lib/pve/escalation.ts`

```ts
export type EscalationDelta = { label: string; direction: "up" | "down" };

export function escalationTier(history: PveOpponentHistorySummary): 0 | 1 | 2 | 3;

export function escalateBoss(boss: PveBossDefinition, history: PveOpponentHistorySummary | null): {
  fighter overrides: Partial<{ ev: StatBlock; behaviorOverrides: Partial<BehavioralProfile>; condition: number }>;
  deltas: EscalationDelta[];
};
```

- Tier is derived from `history.wins + history.losses` (fight count) and the record margin — more fights and/or more player losses raise the tier.
- Higher tier nudges the rebuilt boss fighter's `ev` slightly toward whatever stat the player has been beating them with, and raises `behaviorOverrides` (adaptation-adjacent fields: `caution`, `counterPreference`, `persistence`) a bounded amount per tier. This never exceeds a small ceiling — bosses stay beatable, they just stop being byte-identical on rematch.
- Deltas are a small list of human-readable labels (`"ADAPTATION ↑"`, `"COUNTER THREAT ↑"`) shown in the boss encounter screen for a rematch (parent spec §26).
- Wired into `buildBossFighter` in `lib/pve/service.ts`: `startBossFight` fetches the existing `PveOpponentHistory` row for that boss and passes it through `escalateBoss` before constructing the fighter. First-time fights (`history === null`) are unaffected — bosses never scale before the player has actually met them.

This directly satisfies **rematches** and **dynamic opponent progression**.

---

## 4. Rivalry (derived, not authored)

**File:** `lib/pve/rivalry.ts`

```ts
export type RivalryStatus = { isRival: boolean; record: { wins: number; losses: number }; deciderDue: boolean };

export function rivalryStatus(history: PveOpponentHistorySummary | null): RivalryStatus;
```

- A boss becomes a rivalry once `wins + losses >= 3` and `Math.abs(wins - losses) <= 1`, OR the player has ever lost to them at all (an underdog rivalry starts immediately on a first loss).
- `deciderDue` is true when the record is tied and there have been at least 2 fights — flags the next fight as a decider in the UI (matches parent spec §25 example: "NEXT FIGHT: DECIDER").
- This is additive to the existing static `nodeType === "rival"` (the "challenger" boss keeps its authored gatekeeper-adjacent rival framing from `lib/pve/campaign.ts`). Rivalry status can now also surface on **any** boss based on actual play, without touching `campaignPresentation`'s node type — it's a banner, not a re-classification.
- Surfaced via a new field on `BossListEntry`: `rivalry: RivalryStatus`, computed in `listBosses`/`campaignProgress` alongside the existing progress view.

This satisfies **rivals**.

---

## 5. Campaign Events (Callouts)

**New table:** `PveEncounterEvent`

```prisma
model PveEncounterEvent {
  id        String   @id @default(uuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  kind      String   // "callout" | "rivalry_decider" | "invitational_unlocked" | "special_encounter_unlocked" | "milestone"
  bossId    String?
  headline  String
  detail    String
  seen      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([playerId, createdAt])
}
```

**File:** `lib/pve/events.ts`

```ts
export function deriveCampaignEvents(ctx: {
  playerId: string; boss: PveBossDefinition; won: boolean;
  history: PveOpponentHistorySummary; rivalry: RivalryStatus;
  campaign: CampaignProgressView; newlyUnlockedSideEncounters: SideEncounterDefinition[];
}): NewCampaignEvent[];
```

- Called once inside the `finishBossFight` transaction (after the existing history/progress upserts), state-based only — no scripted narrative branches:
  - a boss's win streak against the player ends → callout ("THE VETERAN'S STREAK ENDS")
  - `rivalry.deciderDue` flips true → rivalry callout ("NEXT FIGHT: DECIDER")
  - a side encounter's unlock condition newly evaluates true → `invitational_unlocked` / `special_encounter_unlocked` event
  - reputation crosses a round threshold (100/250/500...) → milestone event
- Rows are inserted in the same `prisma.$transaction` as the rest of `finishBossFight` so events never desync from the fight that caused them.

**API:** `app/api/pve/events/route.ts` — `GET` returns unseen-first recent events for the player; a `PATCH` marks ids as seen.

**UI:** a compact feed section on `/pve` (`components/pve/CampaignFeed.tsx`) rendering the latest events as poster/ticker-style cards, matching the existing gold/black visual language — reuses `PageHeader`-adjacent styling already established across PvE pages, no new design system.

This satisfies **callouts**.

---

## 6. Side Encounters (Optional Challenges / Invitationals / Special Encounters)

These are opponents outside the fixed 20-boss ladder (`PVE_BOSS_ORDER`), so a linear "previous boss cleared" unlock doesn't apply to them.

**File:** `lib/pve/sideEncounters.ts`

```ts
export type SideEncounterKind = "challenge" | "invitational" | "special";

export type SideEncounterRequirement =
  | { type: "reputation"; min: number }
  | { type: "circuitCompleted"; circuitId: string }
  | { type: "cleanRecord"; maxLosses: number }
  | { type: "rivalryDecider"; bossId: PveBossId };

export type SideEncounterDefinition = PveBossDefinition & {
  kind: SideEncounterKind;
  circuitId: string; // which circuit's map it attaches to, as a branch node
  requirement: SideEncounterRequirement;
};

export const PVE_SIDE_ENCOUNTERS: readonly SideEncounterDefinition[];
export function isSideEncounterUnlocked(def: SideEncounterDefinition, ctx: UnlockContext): boolean;
```

- Reuses the exact `PveBossDefinition` shape (iv/ev/behaviorOverrides/rewards/presentation) so it flows through the **same** `buildBossFighter`, `LiveCombatV2Session`, and `finishBossFight` code paths untouched. `getBoss(id)` in `lib/pve/bosses.ts` is extended to also check `PVE_SIDE_ENCOUNTERS` by id, so the existing fight/start/step/finish routes need no changes beyond that lookup.
- `PveProgress` and `PveOpponentHistory` already key by a free-form `bossId` string column — no schema change needed to track side-encounter clears/history.
- Ship with a small curated set to start (YAGNI — not a generator):
  - 2 **optional challenges** (e.g. a special-ruleset "no recovery windows" fight per circuit, bonus credits, not required to unlock the next circuit)
  - 2 **invitationals** (unlocked by `reputation` threshold or `cleanRecord`, framed as "the circuit is taking notice")
  - 1–2 **special encounters** (rare/legendary framing — reuse existing `behaviorOverrides`/`condition` fields for a distinct fighting feel, no new ruleset engine)
- Unlock evaluation happens in `campaignProgress`/`listBosses`-adjacent function `listSideEncounters(playerId)` in `lib/pve/service.ts`, returning the same `BossListEntry`-shaped list so UI components don't need a parallel type.

This satisfies **optional challenges**, **invitationals**, and **special encounters**.

---

## 7. UI Changes

- **Campaign map** (`components/pve/CampaignMap.tsx`): side encounters render as small branch nodes attached near their circuit's path (not inline in the main chain), using the existing `NODE_ICON` map extended with `challenge`/`invitational`/`special` already-declared icons (`!`, and two new: `✉` invitational, `✵` special). Rivalry status adds a small `⚔` overlay badge to any node, independent of its base icon.
- **Boss encounter page** (`app/pve/[bossId]/page.tsx`): when `rivalry.isRival`, render a head-to-head panel (`VINDICATOR 1 — 2 THE STRIKER`, "NEXT FIGHT: DECIDER" when due). When `escalation.deltas.length`, render a "Since your last fight" panel above the scout report.
- **`/pve` page**: new "Call-Outs & Invitationals" feed section (`CampaignFeed`) above or beside the circuit list, plus a "Side Fights" list surfacing unlocked-but-not-required encounters.
- **Post-fight consequence** (`lib/pve/presentation.ts` `campaignConsequence`): extend to mention rivalry record changes and side-encounter unlocks in the copy, reusing the same headline/copy/reputation shape already consumed by `PostFightOverlay`.

No changes to `ContinuousBattle`, `MatchupScreen`, or `PostFightOverlay`'s prop contracts beyond what `campaignConsequence` already passes through `campaign={...}`.

---

## 8. Data / Architecture Principles (unchanged from parent spec §32)

- No PvE-specific combat forks — side encounters go through the identical fighter-build/session/finish pipeline as ladder bosses.
- No duplicate progress tables — `PveProgress`/`PveOpponentHistory` are reused as-is for side encounters via their existing string `bossId` column.
- One new table only: `PveEncounterEvent`, purely for the event feed — everything else (rivalry, escalation, unlocks) is derived at read time from existing rows, not separately persisted, to avoid a second competing progression store (parent spec §34).

---

## 9. Out of Scope (explicitly deferred)

- A full custom ruleset engine for special encounters (e.g. arbitrary combat modifiers) — MVP special encounters use existing `behaviorOverrides`/`condition`/`ev` knobs only.
- Bloodline/legacy integration (Phase 4) — not touched here.
- Rankings-driven matchmaking against other players — Phase 3 is entirely PvE/boss-driven, consistent with the parent spec.
