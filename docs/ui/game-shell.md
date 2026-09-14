# Cockfight Chronicles — Game Shell

## Purpose

The Game Shell is the persistent presentation layer surrounding Cockfight Chronicles.

The application must feel like a PC game, not a website or SaaS dashboard.

The shell provides:

- global game navigation
- player identity
- level / XP
- currencies and resources
- notifications
- settings
- navigation transitions
- immersive/fullscreen page behavior

The shell must NEVER compete visually with the actual game scene.

---

# 1. Core Layout

The old permanent left sidebar is deprecated.

Do NOT build new screens around sidebar navigation.

Default structure:

<GameShell>
  <TopGameHUD />
  <main>
    {children}
  </main>
</GameShell>

Visually:

┌─────────────────────────────────────────────────────────────┐
│ LOGO  RANCH COOP BREED TRAIN CLINIC MARKET TOURNAMENT LIVE │
│                                  ⚡120 🪙3276 🎟0  ✉ 🔔 ⚙ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    GAME CONTENT                             │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

There should NOT be a permanent sidebar.

---

# 2. Top Game HUD

The Top Game HUD is the primary global navigation.

Desktop target height:

64–80px

It should be compact enough that the game world retains most of the viewport.

Suggested structure:

[BRAND]
[RANCH]
[COOP]
[BREEDING]
[TRAINING]
[CLINIC]
[MARKET]
[TOURNAMENT]
[LIVE]

                         [⚡] [CREDITS] [SPECIAL]
                         [MAIL] [NOTIFICATIONS] [SETTINGS]

The exact items may change as features are added.

Do not hardcode navigation independently on each page.

Use one shared component.

---

# 3. Branding

Left side:

Cockfight Chronicles logo / rooster mark

COCKFIGHT
CHRONICLES

Optional small tagline:

BREED. FIGHT. RULE.

Keep branding compact.

The logo should not consume significant horizontal space.

Clicking the brand returns to Ranch/Home.

---

# 4. Primary Navigation

Primary destinations:

RANCH
COOP
BREEDING
TRAINING
CLINIC
MARKET
TOURNAMENT
LIVE

Use appropriate game icons.

Prefer a consistent icon library rather than emoji in production.

Each item:

ICON
LABEL

The navigation should resemble a game menu / HUD.

It should NOT resemble browser tabs.

---

# 5. Active Navigation State

The active destination should be obvious without becoming a giant button.

Use:

- warm translucent highlight
- gold bottom border
- brighter gold/cream icon
- brighter label
- subtle glow

Example:

background:
linear-gradient(
  180deg,
  rgba(215,164,65,.12),
  rgba(215,164,65,.03)
)

border-bottom:
2px solid var(--gold)

Avoid large rounded selected rectangles.

---

# 6. Player Resources

The right side contains global player resources.

Examples:

⚡ ENERGY
🪙 CREDITS
🎟 PREMIUM / EVENT CURRENCY

Use actual game resources.

Do not invent resources merely to fill the HUD.

Each resource uses a compact translucent HUD capsule.

Example:

⚡ 120 +

🪙 3,276 +

The "+" action should only exist when it has actual functionality.

Resource values should update globally after:

- training
- breeding
- purchases
- battle rewards
- other resource-changing actions

Avoid stale duplicated resource state.

---

# 7. Player Identity

Player identity may appear either:

A. inside the global HUD

or

B. prominently on Ranch/Home only.

Avoid unnecessarily repeating large player information on every screen.

Compact version:

[avatar]
ROOSTER#1234
LV. 25
────── XP

If horizontal space becomes constrained, collapse this information.

---

# 8. Utility Controls

Rightmost controls may include:

MAIL
NOTIFICATIONS
SETTINGS

Use compact icon buttons.

Visual style:

smoked glass
+
subtle brass border
+
cream icon

Unread notifications may use a small red counter.

Do not use oversized buttons.

---

# 9. Main Content

The main content area should NOT automatically apply:

- max-width containers
- white backgrounds
- giant cards
- generic page padding

Different game screens require different compositions.

The GameShell should allow:

FULL BLEED

and

MANAGEMENT

layouts.

---

# 10. Full-Bleed Screens

Use full-bleed presentation for immersive game screens.

Examples:

- Ranch
- Matchup
- Battle
- Victory / Defeat
- Tournament presentation
- major breeding presentation
- selected training scenes

Structure:

┌─────────────────────────────────────────────────┐
│ GAME HUD                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│             FULL GAME ENVIRONMENT               │
│                                                 │
│       UI FLOATS OVER THE ENVIRONMENT            │
│                                                 │
└─────────────────────────────────────────────────┘

No conventional centered webpage container.

Environment fills available viewport.

---

# 11. Management Screens

Some screens require more information density.

Examples:

- rooster management
- pedigree
- market listings
- detailed training management
- medical history

These may use constrained content layouts.

However, they must still follow the game UI system.

Use:

- smoked glass panels
- environmental backgrounds
- game HUD controls
- strong visual hierarchy

Do NOT regress into generic SaaS dashboards.

---

# 12. Immersive Mode

Certain states should optionally hide or minimize the global HUD.

Examples:

BATTLE
MATCH INTRO
VICTORY
DEFEAT
CINEMATIC REVEAL

Provide an immersive shell state:

<GameShell immersive>

or equivalent.

In immersive mode:

- primary navigation may disappear
- resource counters disappear unless relevant
- settings/exit may remain accessible
- game scene fills the viewport

The transition should feel intentional.

---

# 13. Battle Flow

Battle-related navigation should feel continuous.

Preferred flow:

GAME MODE
   ↓
FIGHTER / OPPONENT SELECTION
   ↓
MATCHUP SCREEN
   ↓
BATTLE
   ↓
RESULT
   ↓
RETURN / NEXT MATCH

Avoid:

page
→ obvious browser navigation
→ page
→ obvious browser navigation

Use transitions to visually connect these states.

---

# 14. Matchup Shell Behavior

The global matchup screen is shared by:

- PvE
- boss fights
- sparring
- tournament
- championship
- PvP
- challenges

During matchup:

the standard Game HUD may remain visible in compact form.

The matchup itself should consume the remaining viewport.

Do not show sidebar navigation.

---

# 15. Battle Shell Behavior

Once combat begins:

enter immersive mode.

Hide unnecessary global navigation.

BattleCanvas should receive as much screen space as possible.

Keep only battle-relevant HUD:

- fighter health
- stamina
- coaching commands
- round/time
- contextual information
- pause/settings where necessary

Global navigation should not visually compete with combat.

---

# 16. Result Shell Behavior

Victory / defeat should remain immersive.

Do not immediately return to normal management UI.

Preferred:

BATTLE
   ↓
arena remains visible
   ↓
VICTORY / DEFEAT overlay
   ↓
rewards / consequences
   ↓
CONTINUE

The environment and fighters should remain behind the result UI where technically practical.

Do NOT display a tiny result modal over a black page.

---

# 17. Ranch/Home

Ranch is the game's main menu.

It replaces the old website-style Home page.

Ranch should feel like:

PLAYER HEADQUARTERS
+
MAIN GAME MENU

It should be primarily visual.

Use:

- rural Filipino environment
- player's featured/current rooster
- current progression
- important events
- contextual navigation

Do not display:

COCKFIGHT CHRONICLES

followed by four generic CTA buttons in a centered card.

The environment itself should establish the game.

---

# 18. Navigation Philosophy

Navigation should communicate locations and game systems.

The player should think:

"I'm going to the training camp."

rather than:

"I'm opening the training page."

Likewise:

COOP
BREEDING PEN
CLINIC
MARKET
ARENA
TOURNAMENT

should feel like parts of the game world.

Even when implemented using Next.js routes, presentation should hide the website metaphor.

---

# 19. Back Navigation

Deep screens should use contextual back navigation.

Examples:

← RANCH

← COOP

← TOURNAMENT

← FIGHTER

Do not depend exclusively on the browser Back button.

Avoid breadcrumb chains like:

Home / Coop / Chicken / Details

unless absolutely necessary.

That's web-app language.

---

# 20. Page Titles

Avoid giant generic dashboard headers.

Instead use small contextual game headers layered over the environment.

Example:

BLOODLINE PAIRING
BREEDING

or:

FIGHTER CAMP
TRAINING

or:

CHAMPIONSHIP
QUARTERFINALS

These can float directly over the scene.

Not every title needs its own rectangular container.

---

# 21. Backgrounds

Game screens should have environmental context.

Examples:

Ranch:
rural homestead

Coop:
coop / stable

Breeding:
breeding pen

Training:
fighter camp

Clinic:
veterinary area

Market:
provincial market

Tournament:
arena/event venue

Battle:
combat arena

Use backgrounds consistently enough that these locations feel like the same world.

---

# 22. 3D Character Integration

Where appropriate, use the actual existing 3D chicken renderer.

Do not replace real player chickens with generic static artwork.

Important screens should display actual:

- genome
- proportions
- colors
- patterns
- mutations
- physical characteristics

Especially:

Ranch
Coop
Breeding
Training
Matchup
Battle
Victory

The rooster is the player's primary game character.

Treat it accordingly.

---

# 23. Loading

Avoid generic:

"Loading..."

on otherwise empty pages.

Use a game loading state.

Examples:

small animated rooster mark

PREPARING ARENA...

ENTERING COOP...

LOADING BLOODLINE...

PREPARING FIGHT...

Keep loading states short and unobtrusive.

---

# 24. Route Transitions

Where technically reasonable, transitions between major destinations should use:

150–350ms fade

or:

fade + slight translate

Battle transitions may be more dramatic.

Avoid long animations that slow navigation.

Never make the player wait purely for presentation.

---

# 25. Responsive Behavior

Desktop is primary.

Target:

1920×1080
1680×1050
1440×900
1366×768

At smaller widths:

- collapse navigation labels before destroying content
- retain icons
- compact resources
- reduce logo width
- move secondary controls into an overflow menu if required

Do not restore the sidebar simply because the viewport becomes narrower.

Mobile may use a separate bottom navigation strategy later.

---

# 26. Z-INDEX SYSTEM

Keep layering predictable.

Suggested:

world/background        0
3D scene               10
environment effects    20
HUD panels             30
navigation             40
dropdowns               50
modals                  60
notifications           70
transition overlay      100

Centralize these values where practical.

---

# 27. Shared Components

Prefer shared components such as:

GameShell
GameHUD
GameNavigation
GameLogo
PlayerIdentity
ResourceHUD
GameIconButton
GamePageHeader
ImmersiveOverlay
GameLoadingScreen
RouteTransition

Do not recreate navigation/resource UI per route.

---

# 28. Visual Style

All GameShell components must follow:

`docs/ui/visual-style.md`

In particular:

- smoked translucent glass
- backdrop blur
- warm black/brown tint
- aged brass/gold edges
- cream typography
- restrained shadows
- game HUD rather than web navbar
- environment visible underneath

---

# 29. Architecture Rule

GameShell handles presentation and global navigation.

It should NOT become responsible for:

- combat simulation
- breeding calculations
- training calculations
- chicken genetics
- tournament simulation
- persistence

Keep domain logic separate.

The shell may consume existing state/services required to DISPLAY:

- player
- XP
- currencies
- notifications

but should not own game simulation.

---

# 30. Final Rule

The GameShell exists to make Next.js routes stop FEELING like Next.js routes.

Technically this is still a web application.

Experientially it should feel like navigating a game.

The hierarchy is:

GAME WORLD
↓
CHARACTERS
↓
HUD
↓
NAVIGATION

not:

NAVIGATION
↓
PAGE
↓
CARDS
↓
CONTENT