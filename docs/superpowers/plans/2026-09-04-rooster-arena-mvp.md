# Rooster Arena MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete TypeScript Next.js Canvas-based rooster battle simulator MVP with rooster selection, betting, animated battle, log, results, audio, and credit persistence.

**Architecture:** Keep battle math in pure TypeScript utilities under `lib/`, keep UI in focused client components under `components/`, and use `app/page.tsx` as the game-state orchestrator. Canvas rendering stays dependency-free and receives engine snapshots/events from `BattleArena.tsx`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Canvas 2D API, Web Audio API, localStorage.

**Spec:** `docs/superpowers/specs/2026-09-04-rooster-arena-design.md`

## Global Constraints

- Use TypeScript (`.ts`/`.tsx`) to match the current project.
- No Phaser, Pixi, image libraries, or external animation/game libraries.
- Battle turns execute every 500ms.
- Battle ends when HP ≤ 0 or turn 300 is reached.
- Initial credits are 5000 and are fictional only.
- Rooster stats are Speed, Stamina, Damage, Aggression, Defense, Luck, each 0-100.
- Derived HP is `50 + (Stamina * 1.5)`.
- Critical chance is `Luck / 400` with max effective 25%.
- Damage reduction is `Defense / 250` with max effective 40%.
- Random rooster stat pools should total 300-350 points.
- Use Canvas API and vanilla TypeScript for animation.
- Audio uses Web Audio synthesis only and is muted by default.
- Wrap localStorage and AudioContext access in browser-safe try/catch.
- Read relevant Next.js docs before modifying App Router files.

---

## File Structure

- Create `lib/types.ts`: shared data contracts for roosters, battle logs, results, betting, and animation events.
- Create `lib/roosterGenerator.ts`: preset roster, derived stat helpers, stat totals, random rooster generation.
- Create `lib/battleEngine.ts`: pure turn-based simulator class implementing combat formulas and win conditions.
- Create `lib/audioEngine.ts`: small browser-only Web Audio helper with hit, crit, miss, fatigue, victory sounds.
- Create `lib/storage.ts`: localStorage helpers for credits and audio preference.
- Create `components/StatsDisplay.tsx`: reusable stat bar display.
- Create `components/RoosterSelector.tsx`: preset/random rooster cards and two-corner selection.
- Create `components/BettingPanel.tsx`: stat comparison, odds, bet amount validation, and bet placement.
- Create `components/BattleLog.tsx`: scrollable color-coded combat log.
- Create `components/BattleArena.tsx`: Canvas draw loop, turn timer, animation effects, audio toggle, and battle end callback.
- Create `components/ResultsScreen.tsx`: winner, final HP, payout summary, battle stats, new battle button.
- Modify `app/page.tsx`: client-side game state machine and layout composition.
- Modify `app/layout.tsx`: metadata for Rooster Arena.
- Modify `app/globals.css`: arcade theme tokens, responsive layout helpers, and Canvas-safe page styling.

---

### Task 1: Foundation Libraries

**Files:**
- Create: `lib/types.ts`
- Create: `lib/roosterGenerator.ts`
- Create: `lib/battleEngine.ts`
- Create: `lib/storage.ts`
- Create: `lib/audioEngine.ts`

**Interfaces:**
- Produces: `Rooster`, `BattleLogEntry`, `BattleResult`, `Bet`, `BattleEngine`, `generateRandomRooster(name?: string): Rooster`, `PRESET_ROOSTERS: Rooster[]`, `getStatTotal(rooster: Rooster): number`, `calculateOdds(selected: Rooster, opponent: Rooster): number`, `loadCredits(): number`, `saveCredits(credits: number): void`, `loadAudioEnabled(): boolean`, `saveAudioEnabled(enabled: boolean): void`, `AudioEngine`.

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export type StatKey = "speed" | "stamina" | "damage" | "aggression" | "defense" | "luck";

export type RoosterColorScheme = {
  body: string;
  head: string;
  comb: string;
  tail: string;
  feet: string;
};

export type Rooster = {
  id: string;
  name: string;
  type: string;
  speed: number;
  stamina: number;
  damage: number;
  aggression: number;
  defense: number;
  luck: number;
  maxHp: number;
  hp: number;
  fatigued: boolean;
  colorScheme: RoosterColorScheme;
};

export type BattleLogEntry = {
  turn: number;
  attacker: string;
  defender: string;
  attackerId: string;
  defenderId: string;
  damage: number;
  defenderHp: number;
  isMiss: boolean;
  isCrit: boolean;
  isFatigueTriggered: boolean;
  timestamp: number;
};

export type BattleResult = {
  winner: Rooster;
  loser: Rooster;
  logs: BattleLogEntry[];
  totalTurns: number;
  r1FinalHp: number;
  r2FinalHp: number;
  outcomeReason: "ko" | "timeout";
};

export type Bet = {
  amount: number;
  roosterId: string;
  roosterName: string;
  odds: number;
};
```

- [ ] **Step 2: Create `lib/roosterGenerator.ts`**

Implement exact formulas:
```ts
export function createRooster(input: Omit<Rooster, "id" | "maxHp" | "hp" | "fatigued"> & { id?: string }): Rooster {
  const maxHp = 50 + input.stamina * 1.5;
  return { ...input, id: input.id ?? cryptoSafeId(input.name), maxHp, hp: maxHp, fatigued: false };
}

export function getStatTotal(rooster: Pick<Rooster, StatKey>): number {
  return STAT_KEYS.reduce((total, key) => total + rooster[key], 0);
}

export function calculateOdds(selected: Rooster, opponent: Rooster): number {
  return Math.max(1.05, Number(((getStatTotal(opponent) / getStatTotal(selected)) * 1.8).toFixed(2)));
}
```

Random generation requirements:
- Pick `totalPoints = 300 + Math.floor(Math.random() * 51)`.
- Generate six random positive weights.
- Normalize to stat values summing close to `totalPoints`, clamped to 20-100 for more playable roosters.
- Rebalance any rounding drift by adjusting random stats while preserving 0-100.

- [ ] **Step 3: Create `lib/battleEngine.ts`**

Implement:
```ts
export default class BattleEngine {
  constructor(rooster1: Rooster, rooster2: Rooster)
  executeNextTurn(): BattleLogEntry | null
  getAllLogs(): BattleLogEntry[]
  getRoosters(): { r1: Rooster; r2: Rooster }
  getResult(): BattleResult | null
  get isActive(): boolean
  get winner(): Rooster | null
  get turn(): number
  get maxTurns(): number
}
```

Combat formulas must match Global Constraints and spec. Apply attacker fatigue multiplier before defender defense reduction. Set defender fatigue when `defender.hp < defender.maxHp * 0.3`, and set `isFatigueTriggered` only the first turn it happens.

- [ ] **Step 4: Create `lib/storage.ts`**

Use keys:
```ts
const CREDIT_KEY = "rooster_arena_credits";
const AUDIO_KEY = "rooster_arena_audio_enabled";
```
Functions must never throw in SSR or blocked-storage browsers.

- [ ] **Step 5: Create `lib/audioEngine.ts`**

Implement browser-safe class:
```ts
export class AudioEngine {
  constructor(enabled: boolean)
  setEnabled(enabled: boolean): void
  getEnabled(): boolean
  playHit(): void
  playCrit(): void
  playMiss(): void
  playFatigue(): void
  playVictory(): void
}
```
Lazy-create `AudioContext` inside a private `ensureContext()` after user interaction; catch failures and no-op.

- [ ] **Step 6: Verify foundation**

Run: `yarn lint`
Expected: PASS or only pre-existing warnings unrelated to new files.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/roosterGenerator.ts lib/battleEngine.ts lib/storage.ts lib/audioEngine.ts
git commit -m "feat: add rooster battle foundation"
```

---

### Task 2: Selection and Betting UI

**Files:**
- Create: `components/StatsDisplay.tsx`
- Create: `components/RoosterSelector.tsx`
- Create: `components/BettingPanel.tsx`

**Interfaces:**
- Consumes: `Rooster`, `StatKey`, `PRESET_ROOSTERS`, `generateRandomRooster`, `getStatTotal`, `calculateOdds`, `Bet` from Task 1.
- Produces: `RoosterSelector({ onConfirm }: { onConfirm: (r1: Rooster, r2: Rooster) => void })`, `BettingPanel({ rooster1, rooster2, credits, onBet }: { rooster1: Rooster; rooster2: Rooster; credits: number; onBet: (bet: Bet) => void })`, `StatsDisplay({ rooster, compact? }: { rooster: Rooster; compact?: boolean })`.

- [ ] **Step 1: Create `components/StatsDisplay.tsx`**

Render all six stats with labels, numeric values, color-coded bars, and stat total. Use Tailwind classes only; no external UI library.

- [ ] **Step 2: Create `components/RoosterSelector.tsx`**

Requirements:
- Client component.
- Show preset roosters and up to four generated random roosters.
- Button `Generate Contender` adds a random rooster.
- Clicking a rooster selects red corner first, blue corner second.
- Clicking selected rooster removes it from that corner.
- Disable confirm until two different roosters are selected.
- Confirm calls `onConfirm(r1, r2)`.

- [ ] **Step 3: Create `components/BettingPanel.tsx`**

Requirements:
- Client component.
- Show side-by-side stat comparison and derived odds for each rooster.
- Default selected bet target is rooster1.
- Default amount is 500 or current credits if less.
- Validate amount: integer, `1 <= amount <= credits`.
- Confirm calls `onBet({ amount, roosterId, roosterName, odds })`.
- Show expected payout: `Math.round(amount * odds)`.

- [ ] **Step 4: Verify UI compile**

Run: `yarn lint`
Expected: PASS or only pre-existing warnings unrelated to new files.

- [ ] **Step 5: Commit**

```bash
git add components/StatsDisplay.tsx components/RoosterSelector.tsx components/BettingPanel.tsx
git commit -m "feat: add selection and betting UI"
```

---

### Task 3: Battle Arena, Log, Results, and Page Integration

**Files:**
- Create: `components/BattleLog.tsx`
- Create: `components/BattleArena.tsx`
- Create: `components/ResultsScreen.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: all Task 1 and Task 2 exports.
- Produces: working game states `selection -> betting -> battle -> results -> selection`.

- [ ] **Step 1: Read Next App Router docs**

Read relevant docs before modifying App Router files:
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`

- [ ] **Step 2: Create `components/BattleLog.tsx`**

Client component rendering latest logs in reverse chronological or auto-scrolled chronological order. Format:
- Miss: `Turn N: Attacker missed Defender.`
- Crit: `Turn N: CRIT! Attacker hit Defender for X.`
- Normal: `Turn N: Attacker hit Defender for X.`
- Fatigue: append `Defender is fatigued.`

- [ ] **Step 3: Create `components/BattleArena.tsx`**

Requirements:
- Client component.
- Initialize `BattleEngine` once per rooster pair.
- Run requestAnimationFrame continuously while active.
- Execute one engine turn every 500ms.
- Draw 800x500 logical canvas scaled responsively with CSS.
- Draw dark arena, ring lines, rooster bodies, names, turn counter, HP bars, fatigue aura.
- Animate lunges, hit shake, floating text, hit particles, critical screen shake.
- Play appropriate sounds if audio enabled.
- Call `onBattleEnd(result)` once when result exists.
- Include `BattleLog` sidebar below or beside the canvas.

- [ ] **Step 4: Create `components/ResultsScreen.tsx`**

Requirements:
- Show winner, outcome reason, total turns, final HP bars.
- Show bet amount, selected rooster, odds, payout, net result, and new credit balance.
- Compute stats from logs: total damage by rooster, crits, misses.
- Button calls `onNewBattle()`.

- [ ] **Step 5: Modify `app/page.tsx`**

Make it a client component. Manage:
```ts
type GameState = "selection" | "betting" | "battle" | "results";
const [credits, setCredits] = useState(5000);
```
Load credits after mount using `loadCredits()`. On battle end:
```ts
const payout = didWin ? Math.round(bet.amount * bet.odds) : 0;
const newCredits = credits - bet.amount + payout;
saveCredits(newCredits);
```
Reset rooster/bet/result on new battle.

- [ ] **Step 6: Modify `app/layout.tsx`**

Set metadata title to `Rooster Arena` and description to `Canvas-based rooster battle simulator`.

- [ ] **Step 7: Modify `app/globals.css`**

Add dark arcade theme tokens and body styles. Keep `@import "tailwindcss";` and existing `@theme inline` mapping compatible with Tailwind v4.

- [ ] **Step 8: Verify integration**

Run: `yarn lint`
Expected: PASS.

Run: `yarn build`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css components/BattleArena.tsx components/BattleLog.tsx components/ResultsScreen.tsx
git commit -m "feat: integrate rooster arena gameplay"
```

---

### Task 4: Manual Runtime Verification and Polish Fixes

**Files:**
- Modify only files needed to fix defects found during runtime verification.

**Interfaces:**
- Consumes: complete app from Tasks 1-3.
- Produces: verified MVP with recorded evidence.

- [ ] **Step 1: Run production checks**

Run:
```bash
yarn lint
yarn build
```
Expected: both PASS.

- [ ] **Step 2: Run app locally**

Run:
```bash
yarn dev
```
Open `http://localhost:3000`.

- [ ] **Step 3: Manual smoke test**

Verify:
1. Two roosters can be selected.
2. Random rooster generation works.
3. Betting rejects invalid amounts and accepts valid amounts.
4. Battle starts and turns advance every 500ms.
5. Canvas shows roosters, HP bars, names, damage text, particles, and fatigue aura when applicable.
6. Battle ends at KO or timeout.
7. Results show winner, payout, final HP, and stats.
8. New battle returns to selection.
9. Refresh preserves credits.
10. Audio toggle persists and does not crash browser.

- [ ] **Step 4: Fix any runtime defects**

If a defect is found, patch the smallest relevant file and rerun:
```bash
yarn lint
yarn build
```

- [ ] **Step 5: Commit fixes**

```bash
git add app components lib
git commit -m "fix: polish rooster arena runtime"
```

