# GLOBAL UI STYLE SYSTEM — COCKFIGHT CHRONICLES

Use this styling system across all game screens.

The target is NOT a traditional web app.

The UI should feel like a polished PC game interface layered over a cinematic world.

Visual direction:

FILIPINO RURAL GAME WORLD
+
SMOKED GLASS HUD
+
AGED GOLD / BRASS ACCENTS
+
WARM CINEMATIC LIGHTING
+
PREMIUM FIGHTING-GAME PRESENTATION

The environment should remain visible behind the interface.

Panels should feel like translucent HUD overlays, not solid dashboard cards.

---

# 1. CORE MATERIAL STYLE

Primary UI material:

SMOKED GLASS

Use dark translucent panels with:

- background transparency
- backdrop blur
- subtle brown tint
- soft black shadow
- thin brass/gold border
- faint inner highlight
- very slight warm gradient

Example visual target:

background:
rgba(15, 10, 6, 0.62)

backdrop-filter:
blur(16px) saturate(120%)

border:
1px solid rgba(215, 164, 65, 0.35)

box-shadow:
0 18px 50px rgba(0, 0, 0, 0.35)

inner highlight:
inset 0 1px 0 rgba(255, 225, 170, 0.05)

Avoid:
- solid black boxes
- opaque brown cards
- flat gray panels
- white SaaS cards
- excessive neon

The background/world must still read through the panel.

---

# 2. PANEL OPACITY LEVELS

Use different opacity strengths depending on importance.

## Light HUD

For small labels, badges, lightweight overlays:

rgba(10, 8, 6, 0.35–0.5)

Blur:
10–14px

## Standard Panel

For stats, fighter info, match details:

rgba(12, 9, 6, 0.58–0.72)

Blur:
14–20px

## Heavy Panel

For modals or dense configuration:

rgba(10, 7, 4, 0.82–0.9)

Blur:
20–26px

Do not make every panel equally opaque.

Use transparency to create depth.

---

# 3. GLASS EDGES

Borders should feel metallic rather than plain CSS.

Use:

outer border:
rgba(209, 159, 66, 0.35)

active border:
rgba(239, 190, 91, 0.85)

selected glow:
0 0 24px rgba(218, 163, 64, 0.15)

Optional corner decorations:

- tiny brass corner ticks
- clipped corners
- subtle ornamental line breaks
- thin double-line edge on important panels

Do not use thick gold outlines everywhere.

Gold should feel premium.

---

# 4. COLOR PALETTE

Primary:

BLACK
#070503

CHARCOAL
#0d0a07

DARK BROWN
#171009

WARM BROWN
#2a1b0f

AGED GOLD
#b98b3f

BRIGHT GOLD
#e1b65c

CREAM
#f1e4c2

MUTED TAN
#a99a7a

Use accent colors only for game meaning.

BLUE CORNER
#379ed8

RED CORNER
#d64b4b

SUCCESS
#55c778

WARNING
#dda63f

EPIC
#a849db

RARE
#3485d0

Do not introduce random modern SaaS colors.

---

# 5. TYPOGRAPHY

Use a clear three-font hierarchy.

## DISPLAY FONT

For:
- screen titles
- fighter names
- tournament titles
- VICTORY
- VS
- champion labels

Style should resemble:

- Cinzel
- Marcellus
- Cormorant Garamond
- Libre Baskerville
- Trajan-like serif

Use uppercase sparingly.

Examples:

VICTORY
RONIN
CHAMPIONSHIP
BREEDING

Letter spacing:
0.02em–0.08em

Weight:
600–800

---

## UI FONT

For:
- buttons
- stats
- labels
- menus
- HUD numbers

Use something clean and compact like:

- Inter
- Manrope
- Sora
- Rajdhani
- Exo 2
- IBM Plex Sans

Prefer slightly condensed / game-like appearance.

Buttons should feel technical but readable.

---

## FLAVOR FONT

For occasional Filipino slogans, quotes, handwritten banners, or atmospheric text only.

Use a handwritten / brush style such as:

- Caveat
- Kalam
- Permanent Marker
- Bebas-style brush
- custom handwritten script

Do NOT use this for normal UI.

---

# 6. TYPOGRAPHIC HIERARCHY

Example:

EYEBROW
10–12px
uppercase
letter-spacing 0.2em
gold/muted

TITLE
28–52px
display serif

SUBTITLE
14–16px
cream/muted

STAT LABEL
11–13px
uppercase or small caps

NUMBER
13–16px
high contrast

BUTTON
13–16px
semi-bold
slight tracking

Large victory/title text can be much bigger.

---

# 7. BUTTON STYLE

Buttons should feel like game controls.

## Primary Button

Gold gradient:

linear-gradient(
  180deg,
  #f0c76b,
  #d5a342
)

Text:
#201309

Border:
rgba(255, 220, 150, 0.85)

Shadow:
0 8px 24px rgba(0,0,0,.35)

Inner highlight:
inset 0 1px 0 rgba(255,255,255,.35)

Hover:
- slightly brighter
- tiny lift
- warm glow

Pressed:
- scale 0.98
- reduced shadow

---

## Secondary Button

Smoked glass:

background:
rgba(15,10,6,.55)

border:
1px solid rgba(215,164,65,.35)

text:
cream

Hover:
stronger border + warmer tint

---

## Danger Button

Dark red glass:

rgba(95, 20, 18, 0.65)

border:
rgba(210,70,60,.6)

---

# 8. STAT BARS

Stat bars should look like game HUDs.

Track:

rgba(255,255,255,.08)

Fill:
gradient based on semantic color

Example blue:

linear-gradient(
  90deg,
  #2878a8,
  #48b5e5
)

Example red:

linear-gradient(
  90deg,
  #9f2d35,
  #e45757
)

Use subtle glow only on the fill.

Keep bars thin:
6–10px

Rounded ends are okay but avoid mobile-app pill overload.

---

# 9. BADGES

Badges should be compact.

Examples:

CHAMPION
BALANCED
VETERAN
RARE
AGGRESSIVE

Style:

background:
rgba(20,15,10,.6)

border:
1px solid rgba(...)

padding:
4px 8px

font-size:
10–12px

Use semantic accent colors.

Avoid large rounded SaaS chips.

---

# 10. NAVIGATION

Navigation should look like a game HUD, not website tabs.

Use:

- icon above or beside label
- transparent background
- gold hover
- subtle active glow
- bottom gold indicator

Active example:

background:
linear-gradient(
  180deg,
  rgba(215,164,65,.12),
  rgba(215,164,65,.03)
)

border-bottom:
2px solid #d7a441

Do not use chunky selected rectangles unless the design calls for it.

---

# 11. RESOURCE PILLS

Currency / energy counters should be compact glass capsules.

Example:

⚡ 120
🪙 3,276
🎟 0

background:
rgba(8,6,4,.68)

border:
1px solid rgba(215,164,65,.28)

backdrop-filter:
blur(12px)

Numbers should be bright and easy to scan.

The icon may use semantic color.

---

# 12. FIGHTER PANELS

Fighter UI should feel like corner HUDs.

Do not put rooster information in heavy cards.

Use asymmetrical glass overlays.

For left fighter:

dark-to-blue translucent gradient

background:
linear-gradient(
  90deg,
  rgba(5,22,32,.82),
  rgba(5,15,20,.55),
  transparent
)

Right fighter:

background:
linear-gradient(
  270deg,
  rgba(48,9,10,.82),
  rgba(22,7,7,.55),
  transparent
)

This lets the rooster remain visually dominant.

---

# 13. MODALS

Modals should feel like in-game overlays.

Backdrop:
rgba(0,0,0,.55)

Optional:
backdrop-filter blur(4px)

Panel:
rgba(15,10,6,.88)

blur:
22px

border:
gold/brass

Do not make modals look like generic browser dialogs.

Add:

- large title
- contextual icon
- strong primary action
- compact secondary actions

---

# 14. GAME SCENE FIRST

Most important rule:

The UI must support the environment.

Do not cover 70% of the screen with panels.

Aim for roughly:

60–75% visible environment / character
25–40% UI overlays

For immersive screens:

- matchup
- battle
- victory
- ranch

go even lighter on UI.

---

# 15. DEPTH SYSTEM

Use depth layers.

Layer 1:
world / background

Layer 2:
3D rooster

Layer 3:
soft tint / vignette

Layer 4:
glass HUD

Layer 5:
important buttons / titles

Layer 6:
effects / particles / alerts

This creates a real game-like composition.

---

# 16. SHADOWS

Use soft shadows, not harsh web-card shadows.

Panel:

0 20px 50px rgba(0,0,0,.35)

Floating HUD:

0 8px 24px rgba(0,0,0,.28)

Active element:

0 0 20px rgba(215,164,65,.12)

Avoid giant black drop shadows.

---

# 17. BACKDROP BLUR

Use blur selectively.

Typical:

backdrop-filter:
blur(14px) saturate(120%)

Heavy modal:

blur(22px)

Tiny HUD:
blur(8px)

Do not blur the entire game scene.

Only blur behind UI surfaces.

---

# 18. VIGNETTE

Most cinematic pages should have a subtle vignette.

Example:

background overlay:

radial-gradient(
  circle at center,
  transparent 45%,
  rgba(0,0,0,.3) 100%
)

This pulls focus toward the main content.

---

# 19. NO GENERIC WEB CONTROLS

Avoid default:

<select>
<input>
<button>
checkboxes
browser-looking dropdowns

Style all controls as game UI.

Replace select-heavy interactions with:

- roster drawers
- card selection
- carousel selectors
- popover menus
- game panels

Default browser styles should never be visible.

---

# 20. ICON STYLE

Use a consistent icon library.

Prefer:
- Lucide
- Phosphor
- Heroicons

Use thin or medium-weight icons.

Avoid mixing random emoji in production UI.

Emoji are okay during prototyping only.

Use gold / cream icons by default.

Semantic actions may use other colors.

---

# 21. ANIMATION

Animations should be subtle and premium.

Hover:
120–180ms

Panel reveal:
200–300ms

Screen transitions:
300–500ms

VS impact:
300–450ms

Victory reveal:
500–800ms

Use:
- opacity
- translate
- scale
- slight blur

Avoid:
- bouncing
- spinning
- constant pulsing
- excessive glow

---

# 22. INTERACTION FEEDBACK

Every clickable UI element should react.

Hover:
border brightness increases
slight tint
cursor change

Press:
scale 0.98

Selected:
gold edge
soft glow

Disabled:
lower opacity
remove glow
desaturate

---

# 23. CORNER DECORATIONS

Important panels can use subtle game-frame details.

Examples:

┌───
│
│
└───

or small gold ticks in corners.

Use sparingly.

This helps avoid the "plain div with border-radius" look.

---

# 24. BORDER RADIUS

Do not over-round everything.

Preferred:

small controls:
6–8px

cards:
8–12px

large panels:
10–16px

Avoid:
20–30px SaaS-style pill cards.

This game should feel sturdy and grounded.

---

# 25. BACKGROUND INTEGRATION

When placing glass panels over bright environments:

add local gradient behind UI.

Example:

linear-gradient(
  90deg,
  rgba(0,0,0,.6),
  transparent
)

Do not simply increase panel opacity until the art disappears.

---

# 26. RESPONSIVE SCALING

Use `clamp()` heavily.

Example:

font-size:
clamp(24px, 3vw, 48px)

padding:
clamp(12px, 2vw, 24px)

Avoid fixed giant pixel values that only work at 1920x1080.

Target:

1920×1080
1680×1050
1440×900
1366×768

---

# 27. DESIGN TOKEN IMPLEMENTATION

Centralize these styles.

Example:

--glass-light
--glass-medium
--glass-heavy

--gold
--gold-bright
--gold-muted

--text-primary
--text-secondary
--text-muted

--corner-blue
--corner-red

--shadow-panel
--shadow-active

--blur-light
--blur-medium
--blur-heavy

Do not hardcode slightly different variants per screen.

---

# 28. OVERALL FEEL

The final interface should feel closer to:

- a fighting-game HUD
- a sports broadcast package
- an RPG management screen
- a cinematic PC game menu

and much farther away from:

- admin dashboard
- SaaS
- ecommerce website
- Bootstrap
- Material Design
- generic Tailwind cards

The game world should feel physically behind the glass UI.

Players should see:

roosters
arena
ranch
coop
training facility

through and around the interface.

The UI should feel like an overlay ON the game, not the game itself.

---

# FINAL VISUAL RULE

When designing any component, ask:

"Would this look believable floating over a 3D game scene?"

If the answer is no, redesign it.

The desired result is:

CINEMATIC ENVIRONMENT
+
REAL 3D ROOSTERS
+
SMOKED TRANSLUCENT GLASS
+
AGED GOLD EDGES
+
PREMIUM TYPOGRAPHY
+
MINIMAL BUT STRONG HUD ELEMENTS

not:

DARK WEBSITE WITH GOLD CARDS.