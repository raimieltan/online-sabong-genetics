# Combat UI Rework — Full UI Specification

> **Scope:** UI/UX only  
> **Do not change combat rules, AI, simulation, networking, state machine, damage logic, tell logic, command logic, or backend behavior in this pass.**  
> The goal is to rebuild the combat presentation so the fight feels cinematic, readable, premium, and game-like while preserving the current combat system underneath.

---

# 1. High-Level Goal

Rework the entire combat screen into a premium cinematic rooster-fighting interface with:

- a large unobstructed 3D fight arena as the visual priority;
- a compact top HUD for both fighters;
- clear but restrained tell presentation;
- a central command wheel near the bottom of the screen;
- a contextual coach callout;
- a minimal right-side tell legend;
- strong visual feedback during Circle, Read, Clash, and Disengage;
- less "web dashboard" feeling;
- less card-grid feeling;
- less text-heavy UI;
- more atmosphere, hierarchy, depth, and cinematic framing.

The target visual direction is:

- dark rural arena;
- weathered brass / bronze accents;
- muted charcoal glass panels;
- parchment / warm ivory typography;
- subtle red warnings;
- subtle green condition accents;
- amber stamina accents;
- dusty, smoky, gritty, grounded;
- premium sports broadcast + dark strategy game;
- Filipino sabong visual influence without turning the interface into a novelty theme.

The UI should feel like a **fight broadcast controlled by a coach**, not a management dashboard.

---

# 2. Core Design Principles

## 2.1 Arena First

The 3D fight must occupy approximately **75–85% of visual attention**.

Do not surround the fight with oversized panels.

UI should frame the fight rather than compete with it.

---

## 2.2 Information Appears Where It Matters

Use contextual information near the relevant rooster whenever possible.

Examples:

- opponent tell appears above or near the opponent;
- injury warning appears near the affected fighter;
- command result appears briefly near the player rooster;
- coach advice appears bottom-left;
- persistent fighter stats stay in the top HUD.

Avoid forcing the player to scan unrelated corners of the screen.

---

## 2.3 Reduce Permanent UI

Only keep truly important information permanently visible.

Persistent:

- fighter names;
- portraits;
- condition;
- stamina;
- round;
- round timer;
- command controls;
- optional tell legend;
- current major injury/status icons.

Transient:

- tells;
- command acknowledgement;
- command failure;
- clash result;
- stagger/injury alerts;
- tactical feedback;
- momentum change;
- coach callouts.

---

## 2.4 Readable at a Glance

Combat information must be understandable in under one second.

Avoid long tooltips during live action.

Use:

- short labels;
- strong iconography;
- one-line sublabels;
- restrained color coding;
- short animation cues.

---

## 2.5 UI Must Feel Embedded in the World

Use translucent dark surfaces, soft blur, thin borders, subtle brass trims, and vignette integration.

Avoid:

- flat white cards;
- bright SaaS panels;
- default Tailwind dashboard styling;
- excessive rectangular boxes;
- large opaque blocks.

---

# 3. Overall Screen Layout

The combat screen is divided into five major UI zones.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ LEFT FIGHTER HUD              ROUND / TIMER             RIGHT FIGHTER HUD   │
│                                                                             │
│                                                                             │
│                                                                             │
│                           3D COMBAT ARENA                                   │
│                                                                             │
│     Coach Callout                         Contextual Tell                    │
│                                                                             │
│                                                                             │
│                          Command Wheel                                      │
│                                                                             │
│                                                         Tell Legend          │
└─────────────────────────────────────────────────────────────────────────────┘
```

The arena remains fully visible behind all overlays.

---

# 4. Top Fighter HUD

Create mirrored fighter HUDs in the top-left and top-right.

## 4.1 Left Fighter HUD

Contains:

- portrait;
- fighter name;
- owner / stable / lineage subtitle;
- Condition bar;
- Stamina bar;
- active status icons.

### Visual Structure

```text
[portrait]  RAGSIK
            Sean's Rooster

            Condition  ███████░░
            Stamina    █████░░░░

            [status icons]
```

Use a wide, shallow horizontal panel.

Recommended dimensions:

- height: 70–88 px desktop;
- width: 430–520 px;
- top margin: 12–20 px;
- left margin: 24–40 px.

### Styling

- background: near-black glass;
- opacity: 60–72%;
- blur: 10–18 px;
- 1 px warm metallic border;
- slight inner glow;
- subtle corner detailing;
- no large drop shadow.

Portrait should be about 56–72 px square.

Use a slightly stylized frame rather than a perfect rectangle.

---

## 4.2 Right Fighter HUD

Mirror the left HUD.

Name aligns to the right.

Example:

```text
                         EL GALLO NEGRO  [portrait]
                         San Isidro Line

                    Condition  ███████░░
                    Stamina    ████░░░░░

                    [status icons]
```

Do not simply CSS-flip everything if it causes awkward text flow.

---

# 5. Fighter Resource Bars

## 5.1 Condition

Condition should visually communicate overall fight capability.

Use:

- dark green / desaturated emerald fill;
- muted background track;
- very subtle highlight line;
- smooth transitions.

Do not make it neon.

Possible thresholds:

- healthy: muted green;
- pressured: dull olive;
- dangerous: dark red-orange;
- critical: muted red.

Threshold color changes should be gradual.

---

## 5.2 Stamina

Use:

- warm amber / ochre;
- slight brightness pulse when recovering;
- minor shake or brief flicker if stamina crashes.

Keep the bar visually thinner than Condition.

---

# 6. Status / Injury Icons

Under each fighter HUD, show only the most important active conditions.

Examples:

- leg injury;
- wing injury;
- bleeding;
- dazed;
- fatigued;
- shaken;
- recovery lockout.

Maximum permanently visible icons:

**4**

If there are more:

```text
[icon] [icon] [icon] +2
```

Hover can reveal full details.

Icons should feel like combat symbols, not medical dashboard icons.

Use:

- monochrome base;
- red/orange highlights for injury;
- dim gray for inactive / expired;
- no colorful emoji-like iconography.

---

# 7. Center Round Header

Centered at the top.

Contains:

- ROUND X;
- timer;
- optional small match-state ornament.

Example:

```text
ROUND 1
02:41
```

The timer should be more visually prominent than "ROUND 1".

Use serif / display typography for the timer.

Do not place it inside a big card.

Use two fine angled ornaments or thin brass lines extending outward.

---

# 8. Arena Framing

The UI should allow the environment to remain cinematic.

Add:

- subtle vignette;
- mild top gradient behind HUD;
- mild bottom gradient behind controls;
- optional dust / haze;
- low-contrast edge darkening.

Do not blur the entire arena.

Only the UI panels themselves should use backdrop blur.

---

# 9. Contextual Tell Indicator

Tells should appear **near the opponent**, not in a large central notification box.

Example:

```text
      ↗
Weight Forward
Likely to Attack
```

Position the tell:

- near the opponent's upper body;
- offset so it does not cover the rooster;
- projected from 3D world position into screen space if possible;
- gently tracks with the fighter.

Tell component anatomy:

- icon;
- short tell name;
- optional short interpretation line.

Example:

```text
[icon] Weight Forward
       Likely to Attack
```

Avoid giant labels.

---

# 10. Tell Visual States

Tell indicators need three presentation states.

## 10.1 New Tell

On first appearance:

- 120–180 ms fade in;
- slight scale from 0.94 → 1;
- soft glow;
- small directional motion;
- no exaggerated pop animation.

---

## 10.2 Active Tell

Remain visible but calmer.

Opacity:

- 85–100% for first second;
- 65–80% after.

---

## 10.3 Fading Tell

When no longer relevant:

- fade over 250–400 ms;
- slight upward drift;
- no abrupt removal.

---

# 11. Tell Naming Style

UI tell names should sound observational rather than tutorial-like.

Preferred examples:

- Weight Forward
- Closing Distance
- Wing Adjust
- Head Low
- Guard Open
- Rear Leg Loaded
- Hesitating
- Recovering
- Angle Shift
- Side-On Stance
- Overextended
- Resetting

Avoid labels such as:

- "Attack Incoming";
- "Use Counter Now";
- "Press This Button";
- "Enemy Weak";
- "Guaranteed Opening".

The UI should show evidence, not solve the fight for the player.

---

# 12. Tell Interpretation Text

Optional smaller subtitle under the tell.

Examples:

```text
Weight Forward
Likely to commit
```

```text
Closing Distance
Cutting the angle
```

```text
Recovering
Movement slowed
```

Keep subtitle under 4 words where possible.

Make it lower contrast than the tell name.

---

# 13. Tell Legend Panel

Place a small collapsible panel on the right edge.

Default position:

- right: 24–36 px;
- vertical center or slightly below center.

Example:

```text
TELL INDICATORS

↑ Closing Distance
↗ Weight Forward
🪽 Wing Adjust
? Hesitating
○ Recovering
```

This panel should be compact and optional.

On desktop:

- expanded by default for onboarding;
- user can collapse to an icon.

On experienced-player mode:

- collapsed by default.

Do not make this panel visually stronger than the arena.

---

# 14. Coach Callout

Bottom-left.

Use a compact horizontal callout.

Example:

```text
[coach portrait]

Coach
He's lowering his head...
Possible entry!
```

The coach UI should feel like a corner-man giving advice.

Use:

- portrait;
- small label "Coach";
- one short observation;
- optionally one emphasized phrase.

Do not present long paragraphs.

Recommended maximum:

**2 lines + 1 emphasis line**

---

# 15. Coach Callout Styling

Panel:

- dark translucent surface;
- minimal border;
- left portrait embedded into panel;
- warm ivory body text;
- muted gray metadata;
- italic emphasis allowed.

Example:

```text
He's lowering his head...
Possible entry!
```

The emphasized line can be slightly brighter.

---

# 16. Command Wheel

The main interaction element sits bottom-center.

Commands:

- PRESS;
- WAIT;
- COUNTER;
- RECOVER.

Layout:

```text
            PRESS

      WAIT   [rooster]  COUNTER

           RECOVER
```

The wheel should feel like a tactical control interface rather than four rectangular buttons.

---

# 17. Command Wheel Geometry

Use four curved / wedge-shaped segments surrounding a central circular portrait.

Recommended structure:

```text
             ┌─────────┐
             │  PRESS  │
        ╭────┴─────────┴────╮
        │                   │
      WAIT      [portrait]     COUNTER
        │                   │
        ╰────┬─────────┬────╯
             │ RECOVER │
             └─────────┘
```

The exact geometry can use:

- CSS clip-path;
- SVG;
- pseudo-elements;
- layered divs.

Prefer a shape that feels slightly hand-crafted / ornamental.

Avoid perfect sci-fi radial menu styling.

---

# 18. Command Button Content

Each segment includes:

- icon;
- command name;
- short tactical description.

## PRESS

```text
↑
PRESS
Close Distance
```

## WAIT

```text
◷
WAIT
Hold Position
```

## COUNTER

```text
↶
COUNTER
Read & React
```

## RECOVER

```text
⬡
RECOVER
Conserve Stamina
```

Do not exceed one subtitle line.

---

# 19. Command Wheel States

Each command needs:

- default;
- hover;
- pressed;
- queued;
- acknowledged;
- refused / ignored;
- disabled;
- cooldown / unavailable.

---

## 19.1 Default

- low-opacity dark background;
- thin metallic border;
- command name readable;
- icon muted.

---

## 19.2 Hover

- subtle golden highlight;
- border becomes brighter;
- segment lifts 2–4 px visually;
- label brightens.

---

## 19.3 Pressed

- short inward scale;
- 80–120 ms;
- soft impact flash.

---

## 19.4 Queued

A thin glowing edge travels around the selected segment.

Show:

```text
PRESS
Queued
```

or a small dot / pulse.

Do not replace the entire button with a loading spinner.

---

## 19.5 Acknowledged

Briefly flash the command segment and show a short acknowledgement near the rooster.

Examples:

```text
PRESS acknowledged
```

Better visually:

```text
PRESS ✓
```

Then fade.

---

## 19.6 Ignored / Refused

If the rooster does not follow the command:

- segment briefly dims;
- small amber/red ripple;
- show compact feedback:

```text
Ignored
```

or

```text
Held instinct
```

Do not turn this into a full-screen warning.

---

## 19.7 Disabled

Use:

- 35–45% opacity;
- no glow;
- no hover;
- optional reason on hover.

---

# 20. Center Rooster Portrait

Place the player's rooster portrait in the center of the command wheel.

Purpose:

- anchors the command control to the player's fighter;
- visually reinforces "you are coaching this rooster";
- avoids the wheel feeling like a generic menu.

The portrait can have:

- circular frame;
- subtle status ring;
- minimal condition tint;
- tiny active-command pip.

---

# 21. Bottom Screen Gradient

Add a soft black vertical gradient from bottom upward.

Purpose:

- improve command wheel readability;
- prevent controls from looking like floating HTML;
- preserve arena visibility.

Do not use a full opaque footer.

---

# 22. Combat Phase Presentation

The fight has four visually distinct presentation phases:

1. Circle
2. Read
3. Clash
4. Disengage

This is a UI presentation layer only.

---

# 23. Circle Phase UI

During Circle:

- command wheel remains visible;
- tells are subtle;
- coach can comment;
- camera/arena dominate;
- HUD is calm;
- no giant phase banner.

Optional phase indicator:

```text
CIRCLE
```

Small text near timer or just above command wheel.

Avoid a large "PHASE 1" card.

---

# 24. Read Phase UI

During Read:

- relevant tell becomes more visible;
- command wheel slightly brightens;
- coach advice can appear;
- tell legend can softly pulse for new players.

This should feel like the player's main decision window.

Optional one-time text:

```text
READ THE MOVEMENT
```

Very subtle and only during onboarding.

---

# 25. Clash Phase UI

During Clash:

Reduce UI clutter.

Recommended behavior:

- command wheel fades to 25–40% opacity;
- tell legend dims;
- coach panel fades;
- active tell disappears;
- top fighter HUD remains;
- arena becomes the visual focus.

During impact:

- condition/stamina bars can animate;
- injury icon may appear;
- brief hit event labels may show.

The player should watch the clash, not menus.

---

# 26. Disengage Phase UI

When fighters separate:

- command wheel returns;
- result feedback appears;
- new injury/status can be shown;
- coach may comment;
- tell system resets.

Possible short outcome feedback:

```text
Left Leg Compromised
Movement Reduced
```

or

```text
Won the exchange
```

Keep this short and contextual.

---

# 27. Clash Result Feedback

Do not show MMO-style floating numbers everywhere.

Avoid:

```text
-12 HP
-4 stamina
+7 momentum
```

Instead use meaningful combat feedback.

Examples:

- Clean hit
- Glancing contact
- Forced back
- Missed
- Staggered
- Leg compromised
- Wing clipped
- Lost balance
- Strong recovery

Numeric detail can remain available in optional logs/debug UI.

---

# 28. Injury Alert UI

When a significant injury occurs, show a compact alert near the affected fighter.

Example:

```text
[leg icon]
Left Leg Compromised
Movement Reduced
```

Duration:

1.5–2.5 seconds.

Then collapse into a persistent status icon in the fighter HUD.

---

# 29. Status Tooltip

Hovering a status icon shows a small tooltip.

Example:

```text
LEFT LEG COMPROMISED

Reduced lateral movement.
Worsens under repeated impact.
```

This tooltip appears only outside high-intensity clash moments if possible.

---

# 30. Match Feed

Do not use a traditional scrolling combat log on the main UI.

Instead, add an optional compact event strip.

Position:

bottom-left or lower-right.

Example:

```text
12s  BAGSik forced back
09s  El Gallo Negro missed
05s  Left leg compromised
```

Collapsed by default.

This is secondary information.

---

# 31. Typography

Use two font categories.

## Display / Fighter Names

Use a strong serif or cinematic slab serif.

Suggested characteristics:

- narrow to medium;
- uppercase friendly;
- slightly weathered feel;
- strong contrast.

Use for:

- fighter names;
- round number;
- timer;
- command names;
- major alerts.

---

## Body / UI Text

Use a clean humanist sans.

Use for:

- subtitles;
- descriptions;
- tell interpretations;
- coach copy;
- tooltip body;
- status labels.

Avoid pure futuristic fonts.

---

# 32. Type Scale

Desktop suggestion:

```text
Fighter Name        20–24 px
Round Label         13–15 px
Timer               32–40 px
Command Name        18–22 px
Command Subtitle    11–13 px
Tell Name           16–18 px
Tell Subtitle       12–14 px
Coach Label         11–12 px
Coach Body          13–15 px
Status Tooltip      12–14 px
```

---

# 33. Color Palette

Use a restrained palette.

## Base

```text
Background Black      #0B0B0A
Charcoal              #151513
Panel                  rgba(18, 18, 16, 0.68)
Warm Ivory             #E8E0D0
Muted Text             #9E998F
```

## Metallic Accent

```text
Old Brass              #A48652
Muted Gold             #C0A66A
Deep Bronze            #5B4630
```

## State Colors

```text
Condition Green        #4F7F69
Stamina Amber          #C49B46
Danger Red             #A54337
Warning Rust           #B66743
Inactive Gray          #5F625F
```

Avoid saturated RGB colors.

---

# 34. Borders

Use thin 1 px borders.

Preferred:

```css
border: 1px solid rgba(190, 160, 100, 0.28);
```

Hover:

```css
border-color: rgba(210, 180, 110, 0.52);
```

Do not use thick gold borders everywhere.

---

# 35. Panel Styling

All main overlays should share one visual language.

Base:

```css
background: rgba(12, 12, 11, 0.68);
backdrop-filter: blur(12px);
border: 1px solid rgba(185, 155, 95, 0.24);
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.03),
  0 12px 32px rgba(0,0,0,0.18);
```

Use moderate corner radius:

```text
8–14 px
```

Avoid modern SaaS 20–30 px rounded cards.

---

# 36. Ornamental Detailing

Use decoration sparingly.

Allowed:

- thin angled brass lines;
- tiny diamond separators;
- corner flourishes;
- etched divider lines;
- small fight insignia;
- subtle texture masks.

Avoid:

- excessive filigree;
- fantasy scrollwork;
- giant rooster logos;
- decorative clutter.

---

# 37. Background Contrast Handling

HUD needs readable contrast without hiding the arena.

Use:

- per-panel blur;
- top/bottom gradients;
- subtle text shadow;
- low-opacity black halo behind world-space labels.

World-space tell labels should have:

```css
text-shadow: 0 2px 12px rgba(0,0,0,.9);
```

---

# 38. Motion Design

Motion should feel restrained and physical.

Preferred durations:

```text
Hover                   120 ms
Button press             80–120 ms
Panel open               160–220 ms
Tell appear              120–180 ms
Tell disappear           250–400 ms
Coach callout            180–250 ms
Alert slide              180–240 ms
HUD resource change      250–450 ms
```

Avoid springy mobile-app animations.

---

# 39. Damage / Resource Animation

When Condition drops:

- bar decreases smoothly;
- damaged amount can briefly remain as a darker trailing segment;
- no bright white flash.

When Stamina drops:

- shorter trailing effect;
- low stamina can gently pulse.

---

# 40. Low Stamina Treatment

When player stamina becomes low:

- stamina bar becomes slightly more saturated amber;
- command wheel RECOVER segment gains subtle emphasis;
- no giant "LOW STAMINA!" banner.

The UI can guide without shouting.

---

# 41. Critical Condition Treatment

When Condition is critical:

- bar moves toward muted red;
- fighter portrait border subtly warms;
- very faint red edge vignette is acceptable.

Do not make the entire screen flash red continuously.

---

# 42. Command Hotkeys

Desktop hotkeys can be shown subtly.

Example:

```text
PRESS     1
WAIT      2
COUNTER   3
RECOVER   4
```

Place hotkey in a tiny corner of each segment.

Do not make hotkeys part of the primary label.

---

# 43. Keyboard Feedback

When a command is triggered by keyboard:

- animate the corresponding segment exactly as if clicked;
- never make keyboard controls feel secondary.

---

# 44. Cursor

Use a subtle custom cursor only if already supported globally.

Otherwise use standard pointer states.

Do not build a novelty cursor for this screen.

---

# 45. Responsive Desktop Layout

Priority order when width decreases:

1. preserve arena;
2. preserve fighter HUDs;
3. preserve command wheel;
4. collapse tell legend;
5. simplify coach panel;
6. reduce secondary text.

At 1280 px:

- HUD widths shrink;
- subtitles may truncate;
- tell legend collapses;
- command wheel remains full-size or 90%.

---

# 46. Small Laptop Layout

For heights under ~800 px:

- reduce top HUD height;
- move command wheel lower;
- shrink coach portrait;
- reduce vertical padding;
- hide nonessential footer text;
- do not shrink fighter model visibility.

---

# 47. Mobile / Tablet

Not required for this first UI pass unless the game already supports it.

If touched:

- command wheel becomes a bottom command strip;
- fighter HUDs stack more compactly;
- tell legend becomes an info button;
- coach callout becomes a toast.

Do not compromise desktop UI just to force mobile parity.

---

# 48. Optional Bottom-Corner Flavor Text

Very subtle atmospheric text can exist.

Examples:

Left:

```text
SABONG LIVES ON
```

Right:

```text
OBSERVE • ADAPT • ENDURE • WIN
```

This should be extremely low contrast.

It is visual seasoning only.

---

# 49. Do Not Add the Four Reference Cards to the Actual Combat Screen

The provided concept image shows four bottom reference cards:

1. Circle
2. Read
3. Clash
4. Disengage

These are **concept explanation cards**, not part of the production fight HUD.

Do not include them in the actual gameplay screen.

If an onboarding/tutorial page is later built, they can be reused there.

---

# 50. Suggested Component Structure

UI-only component breakdown:

```text
CombatScreen
├── CombatArenaViewport
├── CombatTopHUD
│   ├── FighterHUDLeft
│   │   ├── FighterPortrait
│   │   ├── FighterIdentity
│   │   ├── ConditionBar
│   │   ├── StaminaBar
│   │   └── FighterStatusIcons
│   ├── RoundHeader
│   └── FighterHUDRight
├── WorldOverlayLayer
│   ├── FighterTellIndicator
│   ├── FighterInjuryAlert
│   ├── CommandAckIndicator
│   └── ClashFeedback
├── CoachCallout
├── CombatCommandWheel
│   ├── CommandSegmentPress
│   ├── CommandSegmentWait
│   ├── CommandSegmentCounter
│   ├── CommandSegmentRecover
│   └── PlayerRoosterPortrait
├── TellLegend
└── CombatAtmosphereOverlay
```

---

# 51. Suggested React State Needed by UI

Do not rewrite simulation state.

Consume existing combat state and adapt it into UI props.

Suggested UI-facing shape:

```ts
type CombatUiState = {
  round: number;
  timeRemaining: number;

  player: FighterUiState;
  opponent: FighterUiState;

  currentPhase:
    | "circle"
    | "read"
    | "clash"
    | "disengage";

  activeTell?: TellUiState;

  coachMessage?: CoachMessageUiState;

  selectedCommand?:
    | "press"
    | "wait"
    | "counter"
    | "recover";

  commandState?:
    | "idle"
    | "queued"
    | "acknowledged"
    | "ignored"
    | "disabled";

  transientAlerts: CombatUiAlert[];
};
```

This is an adapter layer only.

Do not make the UI responsible for determining combat truth.

---

# 52. Fighter UI State

```ts
type FighterUiState = {
  id: string;
  name: string;
  subtitle?: string;
  portraitUrl?: string;

  condition: number;
  maxCondition: number;

  stamina: number;
  maxStamina: number;

  statuses: FighterStatusUi[];
};
```

---

# 53. Tell UI State

```ts
type TellUiState = {
  id: string;
  fighterId: string;

  type:
    | "closing_distance"
    | "weight_forward"
    | "wing_adjust"
    | "hesitating"
    | "recovering"
    | string;

  label: string;
  interpretation?: string;

  severity?: "low" | "medium" | "high";
};
```

Again: UI does not determine tells.

It only renders what combat state provides.

---

# 54. Command UI State

```ts
type CombatCommand =
  | "press"
  | "wait"
  | "counter"
  | "recover";
```

Each command definition:

```ts
type CommandUiDefinition = {
  id: CombatCommand;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  hotkey?: string;
};
```

---

# 55. Accessibility

Required:

- command buttons are real buttons;
- keyboard focus state;
- readable contrast;
- tooltips accessible by focus;
- icons include labels;
- don't communicate injuries only by color;
- reduced motion support.

Example:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 56. Audio-UI Hook Points

Do not implement sound in this UI pass unless already available.

But expose clear moments where sound can later be attached:

- tell appeared;
- command selected;
- command acknowledged;
- command ignored;
- clash start;
- significant injury;
- low stamina;
- round end.

UI components should not directly own audio logic.

---

# 57. Visual Priority Order

The screen should read in this order:

1. Roosters
2. Current opponent movement / tell
3. Command wheel
4. Condition + stamina
5. Round timer
6. Coach
7. Status icons
8. Tell legend
9. Flavor text

If something lower on the list visually overpowers something above it, reduce it.

---

# 58. What to Remove from the Current UI

Remove or heavily reduce:

- dashboard-like cards;
- large opaque stat panels;
- redundant labels;
- full-width footer bars;
- repeated combat information;
- oversized command buttons;
- permanent instructional text;
- large textual phase explanations;
- excessive counters;
- debug-looking numbers;
- unnecessary borders around every element.

---

# 59. What to Preserve

Preserve from existing gameplay UI where applicable:

- fighter identity;
- condition;
- stamina;
- injury/status data;
- round;
- timer;
- commands;
- tell information;
- coach guidance;
- current active combat state.

Only presentation changes in this pass.

---

# 60. Desired Final Feel

The rebuilt UI should make the player feel like:

> "I am watching a real fight unfold and coaching my rooster between exchanges."

It should **not** feel like:

> "I am operating a browser dashboard with two 3D chickens in the middle."

The interface should disappear during intense moments and become useful during decision moments.

---

# 61. Implementation Order

Implement in this order:

1. global combat screen layout;
2. top fighter HUDs;
3. round/timer header;
4. bottom command wheel;
5. world-space tell indicator;
6. coach callout;
7. status/injury icons;
8. transient combat alerts;
9. tell legend;
10. phase-based UI fading;
11. responsive layout;
12. animation polish;
13. accessibility pass;
14. final visual cleanup.

Do not polish individual components before the overall hierarchy works.

---

# 62. Acceptance Criteria

The UI pass is complete when:

- the 3D fight is visually dominant;
- both fighter HUDs are readable without taking excessive space;
- command wheel is immediately understandable;
- tells appear near the relevant fighter;
- tell text never overwhelms the fight;
- coach UI feels contextual;
- clash phase automatically feels less cluttered;
- injuries are surfaced clearly;
- permanent UI is minimal;
- interface no longer resembles a spreadsheet or SaaS dashboard;
- all visual components share one consistent dark/brass combat theme;
- layout works well at common desktop sizes;
- no gameplay logic has been rewritten;
- no combat behavior has been changed.

---

# 63. Explicit Non-Goals for This Pass

Do **not** implement or redesign:

- combat simulation;
- state machine;
- server timing;
- attack resolution;
- command obedience;
- tell generation;
- rooster AI;
- stat formulas;
- injuries system logic;
- PvP networking;
- latency compensation;
- matchmaking;
- replay system;
- tournament flow;
- backend API contracts unless required to expose already-existing UI data.

If UI data is missing, create the smallest presentation adapter possible rather than redesigning combat logic.

---

# 64. Claude Implementation Instruction

Use the existing combat screen as the source of truth for data and behavior.

Refactor the presentation into reusable combat UI components and reproduce the layout and visual direction described above.

Prioritize:

1. visual hierarchy;
2. arena visibility;
3. command clarity;
4. tell readability;
5. cinematic presentation;
6. consistency.

Do not invent new gameplay rules.

Do not create placeholder cards or fake data when real combat data already exists.

Where the current combat state does not yet expose a purely visual field, leave a typed TODO at the adapter boundary rather than hardcoding gameplay assumptions.

The end result should look like a premium live combat interface built around the 3D fight, with the four-command coaching system clearly integrated into the bottom-center HUD.
