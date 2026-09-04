# Rooster Arena — Battle Simulator Design Spec

**Date**: 2026-09-04  
**Status**: Draft  
**Architecture Path**: New project (cockfighting battle simulator web app)

---

## Overview

Web-based sabong (cockfighting) battle simulator with real-time Canvas-rendered 1v1 rooster battles. Users create/select roosters with randomized stats, place bets, watch animated turn-based combat, and earn/lose credits.

**Tech Stack**: Next.js 16 (App Router), TypeScript, Canvas 2D API, Tailwind CSS v4, Web Audio API (synthesis only — zero external assets).

**Zero external animation/game libraries** — pure Canvas + vanilla TypeScript.

---

## Success Criteria

✅ Two roosters can be selected (preset or random generation)  
✅ Bet placement with live odds calculation  
✅ Real-time battle (1 turn every 500ms)  
✅ Canvas shows roosters, health bars, names, floating damage text  
✅ Battle ends on KO (HP ≤ 0) or timeout (turn 300)  
✅ Results screen with winner, payout calculation, updated balance  
✅ Visual polish: attack lunges, damage popups, particle effects, screen shake on crits  
✅ Sound effects via Web Audio API synthesis  
✅ Persistent credits/history in localStorage  
✅ Dark neon/arcade sabong aesthetic  

---

## Architecture

### File Structure

```
rooster-arena/
├── app/
│   ├── page.tsx              # Main orchestrator (game state machine)
│   ├── layout.tsx            # Root layout (fonts, metadata)
│   └── globals.css           # Tailwind + custom arcade theme
├── components/
│   ├── BattleArena.tsx       # Canvas renderer + turn loop
│   ├── RoosterSelector.tsx   # Rooster picker (preset + random gen)
│   ├── BettingPanel.tsx      # Bet input + odds display
│   ├── ResultsScreen.tsx     # Post-battle payout/stats
│   ├── BattleLog.tsx         # Scrolling turn-by-turn log feed
│   └── StatsDisplay.tsx      # Rooster stat bars (reusable)
├── lib/
│   ├── types.ts              # Core types (Rooster, BattleLogEntry, BattleResult)
│   ├── battleEngine.ts       # Pure battle simulator (no UI coupling)
│   ├── roosterGenerator.ts   # Random stat generation + presets
│   ├── audioEngine.ts        # Web Audio synthesis (hit/crit/miss SFX)
│   └── storage.ts            # localStorage wrapper (credits, history)
└── public/
    └── (SVG icons already present)
```

---

## Data Model (`lib/types.ts`)

### Rooster Type
```typescript
interface Rooster {
  id: string;
  name: string;
  type: string;  // "Speed Demon" | "Tank" | "Balanced" | "Custom"
  
  // Base stats (0-100)
  speed: number;
  stamina: number;
  damage: number;
  aggression: number;
  defense: number;
  luck: number;
  
  // Derived stats
  maxHp: number;  // 50 + (stamina × 1.5)
  hp: number;
  fatigued: boolean;
  
  // Visual customization
  colorScheme: {
    body: string;
    head: string;
    comb: string;
    tail: string;
    feet: string;
  };
}
```

### Battle Log Entry
```typescript
interface BattleLogEntry {
  turn: number;
  attacker: string;
  defender: string;
  damage: number;
  defenderHp: number;
  isMiss: boolean;
  isCrit: boolean;
  isFatigueTriggered: boolean;
  timestamp: number;
}
```

### Battle Result
```typescript
interface BattleResult {
  winner: Rooster;
  loser: Rooster;
  logs: BattleLogEntry[];
  totalTurns: number;
  r1FinalHp: number;
  r2FinalHp: number;
  outcomeReason: "ko" | "timeout";
}
```

---

## Battle Mechanics (`lib/battleEngine.ts`)

### Core Formula Sheet

**Derived Stats**:
- `maxHp = 50 + (stamina × 1.5)`
- `critChance = (luck / 400)` — max 25%
- `defenseReduction = (defense / 250)` — max 40%

**Turn Order**:
- Higher `aggression` attacks first
- If tied: `Math.random() > 0.5` decides

**Damage Calculation** (per turn):
1. **Base Damage**: `10 + (attacker.damage / 10)`
2. **Variance**: `baseDamage × 0.2 × (Math.random() - 0.5) × 2`
3. **Miss Check**: 
   ```typescript
   missChance = Math.max(0, (defender.speed - attacker.speed) / 100 × 0.15)
   if (Math.random() < missChance) return 0  // MISS
   ```
4. **Critical Hit**:
   ```typescript
   isCrit = Math.random() < (attacker.luck / 400)
   critMult = isCrit ? 1.5 : 1.0
   ```
5. **Fatigue Penalty** (attacker):
   ```typescript
   if (attacker.hp < attacker.maxHp × 0.3) {
     fatigueMult = 0.8  // 20% damage penalty
   } else {
     fatigueMult = 1.0
   }
   ```
6. **Defense Reduction** (defender):
   ```typescript
   defenseReduction = defender.defense / 250
   ```
7. **Final Damage**:
   ```typescript
   finalDamage = Math.max(0.5, 
     (baseDamage + variance) × critMult × fatigueMult × (1 - defenseReduction)
   )
   defender.hp -= finalDamage
   ```

**Fatigue Status**:
- Triggers when `hp < maxHp × 0.3`
- Visual indicator: red pulsing aura around rooster
- Applies 20% damage penalty to attacks

**Win Conditions**:
- **KO**: `defender.hp <= 0`
- **Timeout**: Turn 300 reached → higher remaining HP wins

**Turn Interval**: 500ms

---

## BattleEngine Class Design

```typescript
class BattleEngine {
  private r1: Rooster;
  private r2: Rooster;
  private turn: number;
  private maxTurns: number = 300;
  private battleLog: BattleLogEntry[] = [];
  private isActive: boolean = true;
  private winner: Rooster | null = null;

  constructor(rooster1: Rooster, rooster2: Rooster) {
    this.r1 = { ...rooster1, hp: rooster1.maxHp, fatigued: false };
    this.r2 = { ...rooster2, hp: rooster2.maxHp, fatigued: false };
    this.turn = 0;
  }

  executeNextTurn(): BattleLogEntry | null {
    // Determine attacker/defender via aggression
    // Calculate damage via formula
    // Apply defense reduction
    // Update HP, check fatigue
    // Log entry
    // Check win conditions
    // Return log entry or null if battle ended
  }

  getResult(): BattleResult | null {
    // Returns BattleResult if battle finished, null otherwise
  }

  getRoosters(): { r1: Rooster; r2: Rooster } {
    // Returns current rooster states (for HP bars)
  }
}
```

**Engine is pure** — no UI coupling, no side effects, testable in isolation.

---

## Rooster Generation (`lib/roosterGenerator.ts`)

### Random Generation
- Total stat pool: **300-350 points** (randomized)
- Each stat: 0-100
- Normalize after generation to hit target pool
- Assign random color scheme from palette

### Preset Roosters
```typescript
const PRESET_ROOSTERS: Rooster[] = [
  {
    name: "Lightning",
    type: "Speed Demon",
    speed: 85, stamina: 40, damage: 70, 
    aggression: 80, defense: 20, luck: 50,
    colorScheme: { body: "#d4514f", head: "#c0622e", ... }
  },
  {
    name: "Fortress",
    type: "Tank",
    speed: 40, stamina: 90, damage: 50,
    aggression: 30, defense: 85, luck: 30,
    colorScheme: { body: "#4a7c59", head: "#2d5f3d", ... }
  },
  {
    name: "Champion",
    type: "Balanced",
    speed: 65, stamina: 70, damage: 65,
    aggression: 60, defense: 60, luck: 50,
    colorScheme: { body: "#8b6f47", head: "#6b5637", ... }
  }
];
```

### Color Palette (Dark Neon Theme)
- Reds: `#d4514f`, `#c0622e`, `#ff4444`
- Greens: `#4a7c59`, `#2d5f3d`, `#66cc88`
- Browns: `#8b6f47`, `#6b5637`, `#a0826d`
- Accents: `#ff8c00` (beak), `#ff0000` (comb)

---

## Canvas Rendering (`components/BattleArena.tsx`)

### Canvas Setup
- Dimensions: 800×500px
- Background: `#1a1a1a` (dark arena floor texture)
- 60 FPS render loop via `requestAnimationFrame`
- Turn timer: execute battle logic every 500ms

### Rooster Drawing (`drawRooster()`)
**Body** (ellipse):
- Position: left rooster at x=150, right at x=650
- Body: 40×50px ellipse
- Head: 25px circle, offset left/right
- Eye: 5px black circle
- Beak: orange triangle (15px length)
- Comb: 3 stacked red circles (6px radius)
- Tail feathers: quadratic curve from body

**Fatigue Indicator**:
- Red pulsing aura (alpha oscillates 0.2-0.4)
- Drawn as large circle behind rooster

**Attack Animation**:
- Attacker lunges 30px toward opponent over 150ms
- Recoils back over 100ms
- Defender shakes horizontally ±5px on hit

**Health Bar** (`drawHealthBar()`):
- 120×20px bar above rooster
- Background: `#333`
- HP fill color:
  - Green (`#00aa00`): > 50%
  - Orange (`#ffaa00`): 25-50%
  - Red (`#aa0000`): < 25%
- Text: `hp / maxHp` centered

**Floating Damage Text** (`drawFloatingText()`):
- Spawn on hit at defender position
- Font: bold 24px, color based on type:
  - Critical: `#ff3333` + "CRIT!" prefix
  - Miss: `#aaaaaa` + "MISS"
  - Normal: `#ffffff`
- Floats upward 80px over 800ms
- Alpha fades 1.0 → 0.0

**Particle Effects** (`drawParticles()`):
- On hit: 8-12 yellow particles explode from impact point
- Velocity: random radial, gravity applied
- Lifespan: 600ms
- On critical: screen shake ±10px for 200ms

**Turn Counter**:
- Centered top: `Turn X / 300`
- Font: 20px, `#ffffff`

---

## Audio Engine (`lib/audioEngine.ts`)

### Web Audio Synthesis (Zero External Assets)

**Hit Sound**:
- Oscillator: sawtooth wave, 150Hz → 80Hz over 100ms
- Gain envelope: 0.3 → 0 over 100ms

**Critical Hit**:
- Two oscillators: 250Hz + 500Hz (fifths)
- Harsh attack, 150ms decay
- Gain: 0.4 → 0

**Miss Sound**:
- White noise burst, 50ms
- Bandpass filter 2kHz-4kHz
- Gain: 0.15 → 0

**Fatigue Trigger**:
- Low rumble: sine 40Hz, 300ms
- Gain: 0.2 → 0

**Victory Fanfare**:
- Ascending arpeggio: C4-E4-G4-C5 (130-164-196-262 Hz)
- Each note 200ms, square wave
- Gain: 0.3

```typescript
class AudioEngine {
  private context: AudioContext;
  
  playHit(): void { /* synthesis code */ }
  playCrit(): void { /* synthesis code */ }
  playMiss(): void { /* synthesis code */ }
  playFatigue(): void { /* synthesis code */ }
  playVictory(): void { /* synthesis code */ }
}
```

**User Control**: Toggle button in UI (muted by default, localStorage persists preference).

---

## Component Design

### `app/page.tsx` — Game State Machine
```typescript
type GameState = "selection" | "betting" | "battle" | "results";

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("selection");
  const [rooster1, setRooster1] = useState<Rooster | null>(null);
  const [rooster2, setRooster2] = useState<Rooster | null>(null);
  const [bet, setBet] = useState<{ amount: number; roosterName: string } | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [credits, setCredits] = useState<number>(() => loadCredits());

  // Transition handlers for each state
  // Persist credits to localStorage on update
}
```

### `RoosterSelector.tsx`
- Display 3 preset roosters as cards
- Button: "Generate Random Rooster" → shows new random rooster
- User picks 2 roosters (red corner vs blue corner)
- Each card shows:
  - Name, type
  - Stat bars (6 stats as horizontal bars)
  - Color preview (small canvas)
- Button: "Confirm Selection" → transitions to betting

### `BettingPanel.tsx`
- Side-by-side rooster stat comparison
- Odds calculation:
  ```typescript
  totalR1 = sum of rooster1's 6 stats
  totalR2 = sum of rooster2's 6 stats
  oddsR1 = totalR2 / totalR1 × 1.8
  oddsR2 = totalR1 / totalR2 × 1.8
  ```
- Bet input: number field + max button
- Radio: select which rooster to bet on
- Display: "Bet X on [Rooster] → Win Y (Odds: Z:1)"
- Button: "Place Bet" → transitions to battle

### `BattleArena.tsx`
- Canvas element (800×500px)
- Turn counter display
- Mute button (sound toggle)
- Battle log sidebar (scrolling feed)
- Hooks:
  ```typescript
  useEffect(() => {
    const engine = new BattleEngine(rooster1, rooster2);
    let lastTurnTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      if (now - lastTurnTime >= 500) {
        const logEntry = engine.executeNextTurn();
        if (logEntry) {
          appendLog(logEntry);
          playSound(logEntry);
        }
        const result = engine.getResult();
        if (result) {
          onBattleEnd(result);
          return; // stop loop
        }
        lastTurnTime = now;
      }
      drawFrame(canvas, engine.getRoosters(), animations);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [rooster1, rooster2]);
  ```

### `BattleLog.tsx`
- Scrolling div (max-height: 400px, overflow-y: auto)
- Each log entry:
  ```
  Turn 42: Lightning attacks Fortress for 18 damage (CRIT!)
  Turn 43: Fortress attacks Lightning for 12 damage
  Turn 44: Lightning's attack MISSED
  ```
- Color-coded:
  - Critical: red text
  - Miss: gray text
  - Fatigue trigger: orange text
- Auto-scrolls to bottom on new entry

### `ResultsScreen.tsx`
- Winner announcement (large text + rooster name)
- Final HP bars for both roosters
- Bet outcome:
  - If won: "You bet X on [Winner] → Won Y! (+Z)"
  - If lost: "You bet X on [Loser] → Lost X"
- New balance display
- Battle statistics:
  - Total turns
  - Damage dealt by each rooster
  - Critical hits landed
  - Misses
- Button: "New Battle" → resets to selection state

### `StatsDisplay.tsx` (Reusable)
- Takes `stats: { [key: string]: number }` (0-100 scale)
- Renders 6 horizontal bars:
  - Label: stat name
  - Bar: colored by value (green > 70, yellow 40-70, red < 40)
  - Value: numeric display
- Used in RoosterSelector cards and BettingPanel

---

## UI Theme (Tailwind + Custom CSS)

### Color Palette
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-arena: #2a2a2a;
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --accent-red: #ff3333;
  --accent-gold: #ffd700;
  --accent-green: #00ff88;
  --border: #333333;
}
```

### Typography
- Headings: `font-bold text-3xl` (Geist Sans)
- Body: `text-base text-secondary`
- Monospace (stats): Geist Mono

### Layout
- Max width: 1200px (centered)
- Padding: 2rem
- Dark background gradient: `bg-gradient-to-b from-bg-primary to-bg-secondary`

### Components
- Cards: `bg-bg-secondary border border-border rounded-lg p-4`
- Buttons: `bg-accent-red hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold`
- Inputs: `bg-bg-arena border border-border text-white px-4 py-2 rounded`

---

## Storage (`lib/storage.ts`)

### Credits System
- Initial balance: **5000 credits**
- Persisted in `localStorage` as `rooster_arena_credits`
- Updated after each battle

### Battle History (Optional Enhancement)
- Store last 10 battles in `localStorage` as `rooster_arena_history`
- Each entry: `{ date, r1, r2, winner, bet, payout }`
- Displayed in future "History" tab

---

## Error Handling

### Canvas Rendering
- Check `canvas.getContext("2d")` exists
- Fallback text if Canvas unsupported: "Canvas not supported in this browser"

### Audio
- Wrap `new AudioContext()` in try-catch
- If fails: disable audio silently, show "(Audio unavailable)" in toggle

### LocalStorage
- Wrap all `localStorage` calls in try-catch
- If blocked: use in-memory fallback for credits (session-only)

### Battle Logic
- Clamp all damage calculations to `>= 0.5` (prevent negative HP bugs)
- Max turn cap prevents infinite loops

---

## Testing Strategy

### Unit Tests (Future)
- `battleEngine.ts`: Damage calculation formulas
- `roosterGenerator.ts`: Stat normalization, total pool validation
- `audioEngine.ts`: Oscillator frequency validation

### Manual Testing Checklist
1. Generate 10 random roosters → verify stat totals in 300-350 range
2. Run battle with two identical roosters → should timeout at turn 300
3. Run battle with max damage (100) vs max defense (100) → verify damage reduction
4. Trigger fatigue (HP < 30%) → verify 20% damage penalty
5. Land critical hit → verify 1.5× damage
6. Test miss calculation with speed差 → verify miss rate
7. Test bet payout math → verify odds calculation
8. Test localStorage persistence → refresh page, verify credits persist
9. Test audio toggle → verify sounds play/mute correctly
10. Test responsive layout → resize to mobile width

---

## Performance Considerations

### Canvas Optimization
- Object pooling for particle systems (reuse particle objects)
- Dirty rectangle rendering (future optimization if needed)
- Culling: don't render off-screen particles

### Memory
- Clear battle log after 100 entries to prevent memory leak
- Dispose AudioContext nodes after each sound play

### Bundle Size
- No external dependencies for rendering/audio
- Expect final bundle < 200KB (gzipped)

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
1. **Custom Rooster Builder**:
   - Name input
   - Stat allocation UI (300 point pool to distribute)
   - Color picker for custom color scheme
   - Save to localStorage favorites

2. **Tournament Mode**:
   - Bracket system (8 roosters)
   - Progressive betting
   - Championship payout bonus

3. **Replay System**:
   - Serialize battle log
   - Playback mode with speed controls (0.5×, 1×, 2×, instant)

4. **Leaderboard**:
   - Track win/loss record per rooster
   - Credits high score

5. **Sound Enhancements**:
   - Crowd ambience (synthesized)
   - Victory/defeat music loops

6. **Mobile Optimization**:
   - Touch controls for betting
   - Vertical layout for small screens
   - Canvas scaling for different resolutions

---

## Implementation Order (Recommended)

1. **Foundation**: Types, BattleEngine, RoosterGenerator
2. **UI Shell**: page.tsx state machine, basic layout
3. **RoosterSelector**: Display presets + random generation
4. **BattingPanel**: Odds calculation, bet input
5. **BattleArena**: Canvas setup, basic rooster drawing
6. **Battle Loop**: Turn execution, HP updates
7. **Visual Polish**: Attack animations, damage text, particles
8. **Audio**: Web Audio synthesis, sound toggle
9. **ResultsScreen**: Payout calculation, stats display
10. **BattleLog**: Scrolling feed, color-coded entries
11. **Storage**: Credits persistence, error handling
12. **Testing**: Manual walkthrough, edge case validation

---

## Open Questions / Assumptions

1. **Assumption**: Bet payout uses 1.8× multiplier (can adjust for balance).
2. **Assumption**: Fatigue triggers at 30% HP (can tune for gameplay feel).
3. **Assumption**: Miss chance caps at 15% max (speed diff / 100 × 0.15).
4. **Assumption**: Audio muted by default (user must enable).

---

## Dependencies

**Runtime**:
- `next`: ^16.3.4
- `react`: ^19.2.8
- `react-dom`: ^19.2.8

**Dev**:
- `typescript`: ^5
- `@types/node`, `@types/react`, `@types/react-dom`
- `tailwindcss`: ^4
- `eslint`, `eslint-config-next`

**External Resources**: None (pure Canvas + Web Audio synthesis)

---

## Deployment

### Vercel (Recommended)
```bash
yarn build
vercel deploy
```

### Environment Variables
None required (no API keys, no external services)

### Build Output
- Static generation for `page.tsx` (SSG)
- Client-side JavaScript for Canvas/Audio

---

## Compliance & Safety

- No real gambling (credits are fictional, not redeemable)
- No graphic violence (cartoon rooster shapes only)
- No user accounts / data collection
- Fully client-side (no server data persistence)

---

**End of Design Spec**
