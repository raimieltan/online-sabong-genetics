# Rooster Clinic Revamp Specification

## Overview

`/clinic` is the game’s roster-wide medical dashboard, treatment hub, and clinic-upgrade system.

The current implementation is functionally strong, but visually and interactively it feels like an administrative status page rather than a game facility. The goal of this revamp is to preserve the existing medical architecture while significantly improving:

- readability,
- roster triage,
- treatment flow,
- treatment feedback,
- facility progression,
- visual immersion,
- and integration with the rest of the game.

This is **not** intended to be a backend rewrite.

The existing medical logic should remain intact wherever possible.

The revamp should primarily focus on:

1. a better roster-wide medical dashboard,
2. a better treatment flow,
3. a proper active-treatment queue,
4. a proper clinic progression UI,
5. a 3D clinic environment,
6. better battle-readiness feedback,
7. and finally completing illness treatment support.

---

# 1. Current Clinic Responsibilities

The current `/clinic` page acts as the game’s central medical management screen.

It currently:

- polls medical state every 15 seconds,
- separates chickens needing care from healthy chickens,
- displays:
  - health,
  - condition,
  - stress,
  - morale,
  - injuries,
  - illnesses,
  - medical status,
  - treatment timers,
- allows individual injury treatment,
- allows missing HP restoration,
- allows free medical rest,
- allows clinic upgrades,
- and reflects wider battle eligibility restrictions.

The current page is therefore more than just a “healing screen”.

It is simultaneously:

- a medical command center,
- a treatment queue,
- a roster health overview,
- and a facility progression screen.

The redesign should embrace this.

---

# 2. Existing Medical Architecture

The current backend should be preserved.

## Clinic Levels

There are four clinic levels.

Clinic upgrades currently improve:

- maximum treatable injury severity,
- treatment speed,
- treatment discounts,
- permanent-damage reduction.

Upgrade costs:

- Level 1 → Level 2: `1,500 credits`
- Level 2 → Level 3: `4,000 credits`
- Level 3 → Level 4: `9,000 credits`

## Injury Treatment Costs

Base treatment costs:

- Minor injury: `120 credits`
- Serious injury: `450 credits`
- Career-altering injury: `1,200 credits`

Higher clinic levels may reduce:

- cost,
- treatment duration,
- permanent damage.

## HP Restoration

Missing HP currently costs:

`8 credits × missing HP`

before clinic-level discounts.

## Medical Rest

Medical Rest is free.

It should remain a distinct recovery action rather than becoming another direct treatment.

## Transactional Safety

Server-side treatment operations already validate:

- chicken ownership,
- injury severity,
- existing treatment state,
- credit balance,
- treatment eligibility.

Credits are deducted transactionally before a `MedicalTreatment` record is created.

This should remain unchanged.

## Lazy Treatment Resolution

Completed medical treatments are resolved lazily when clinic or medical APIs are accessed.

There is currently no requirement for a background worker.

The redesign should preserve this behavior.

The existing 15-second polling loop is compatible with the new UI.

## Wider Game Integration

Medical state already affects battle eligibility.

Things such as:

- serious injury,
- illness,
- low health,
- low condition,
- overtraining,

can block battle eligibility.

The redesigned Clinic should expose this much more clearly.

---

# 3. Main Design Goal

The redesigned Clinic should answer four questions immediately:

1. **How healthy is my roster?**
2. **Who needs attention right now?**
3. **What treatments are currently active?**
4. **What does upgrading my clinic improve?**

The current page presents many data points with similar visual weight.

The redesign should create stronger hierarchy.

---

# 4. Core Page Structure

The recommended page layout is:

1. Clinic header / facility status
2. 3D clinic environment
3. Medical overview
4. Roster triage sections
5. Active treatment queue
6. Healthy roster summary
7. Upgrade interface

The page should remain usable even if the 3D scene is disabled or still loading.

The 3D environment should enhance the page, not become a dependency for core actions.

---

# 5. High-Level Layout

Suggested desktop structure:

```text
┌───────────────────────────────────────────────────────────────┐
│ MEDICAL WARD                                   4,820 credits │
│ Rooster Clinic · Level 1                                     │
│                                                               │
│ 2 NEED CARE      1 CRITICAL      1 ACTIVE      3 HEALTHY      │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                    3D CLINIC ENVIRONMENT                      │
│                                                               │
│    [Treatment Bay]     [Recovery Pen]      [Empty Bay]        │
│       V3 Test          Bright Queen                            │
│                                                               │
│                                                 [UPGRADE]      │
├───────────────────────────────────────────────────────────────┤
│ NEEDS ATTENTION                                               │
│                                                               │
│ [ V3 Test ]        [ Bright Queen ]                           │
│ Critical           Critical                                  │
│ Severe wounds      Low HP                                    │
│ 0 / 100 HP         22 / 100 HP                               │
│                                                               │
│ [Examine]          [Examine]                                 │
├───────────────────────────────────────────────────────────────┤
│ ACTIVE TREATMENTS                                             │
│                                                               │
│ Malay       Wing Injury       04:42 remaining                 │
├───────────────────────────────────────────────────────────────┤
│ HEALTHY ROSTER                                                │
│ Untamed Duke    Berdugo    ...                                │
└───────────────────────────────────────────────────────────────┘
```

---

# 6. 3D Clinic Environment

The Clinic should become a real 3D facility screen, in the same spirit as the revamped Training and Coop pages.

The desired tone is:

- grounded,
- rural,
- warm,
- practical,
- game-like,
- and visually consistent with the rest of the rooster-management world.

Avoid making it look like a futuristic hospital.

## Environment Direction

A Level 1 clinic could contain:

- wooden or concrete treatment room,
- simple treatment table,
- recovery pens,
- medicine cabinet,
- hanging lamp,
- basic fan,
- shelves,
- water bowls,
- towels,
- bandages,
- crates,
- simple examination tools.

The environment should feel like a practical rural veterinary ward.

## 3D Scene Purpose

The 3D scene should visually reflect actual medical state.

Examples:

- active treatment → chicken appears in treatment bay,
- medical rest → chicken appears in recovery pen,
- no patients → bays are visibly empty,
- clinic upgrade → environment visibly improves.

The scene should never maintain a separate medical simulation.

It should simply visualize server state.

---

# 7. Clinic Level Visual Progression

Facility upgrades should visibly change the 3D clinic.

## Level 1 — Basic Clinic

Visual character:

- small treatment room,
- simple wooden or metal table,
- basic medicine shelf,
- few recovery pens,
- minimal equipment.

Gameplay identity:

- basic care,
- limited injury severity,
- slowest treatment,
- minimal permanent-damage reduction.

## Level 2 — Veterinary Center

Visual improvements:

- larger interior,
- better lighting,
- proper examination table,
- additional shelving,
- cleaner recovery bays,
- more equipment.

Gameplay identity:

- serious injury treatment,
- improved speed,
- better treatment discounts,
- improved permanent-damage reduction.

## Level 3 — Advanced Clinic

Visual improvements:

- more treatment bays,
- dedicated rehabilitation area,
- more advanced instruments,
- cleaner interior,
- organized medicine area.

Gameplay identity:

- higher-tier injuries,
- better cost efficiency,
- significantly faster treatment,
- better permanent-damage protection.

## Level 4 — Elite Medical Center

Visual improvements:

- premium trauma bay,
- rehabilitation equipment,
- monitoring area,
- fully upgraded clinic appearance,
- most polished and organized environment.

Gameplay identity:

- maximum medical capability,
- maximum treatment efficiency,
- best permanent-damage reduction.

---

# 8. Medical Overview Header

At the top of the Clinic page, show a compact roster-wide medical summary.

Example:

```text
ROOSTER CLINIC · LEVEL 2

2 NEED CARE
1 CRITICAL
1 ACTIVE
0 ILL
3 HEALTHY
```

This should be derived dynamically from the current roster.

Recommended summary categories:

- Critical
- Needs Care
- Recovering
- Ill
- Healthy
- Active Treatments

The player should understand the roster health state within a few seconds.

---

# 9. Roster Triage Categories

Instead of a single flat list, divide chickens into medical categories.

Recommended sections:

## Urgent

Contains chickens with one or more of:

- critical HP,
- severe/career-threatening injury,
- serious illness,
- battle-ineligible medical state,
- dangerous condition state.

These should receive the strongest visual priority.

## Needs Care

Contains chickens with:

- minor injuries,
- moderate HP loss,
- elevated stress,
- low condition,
- mild illness,
- non-critical recovery needs.

## Recovering

Contains chickens with:

- active injury treatment,
- active HP restoration,
- active illness treatment,
- medical rest,
- recovery cooldown.

## Healthy

Contains chickens that are:

- free from treatment-required injuries,
- free from illness,
- sufficiently healthy,
- not in active treatment.

Healthy chickens should have the lowest visual priority on this page.

---

# 10. Healthy Roster Presentation

The current large “In Good Health” section is too prominent.

Healthy roster entries should be compact.

Example:

```text
HEALTHY ROSTER

Untamed Duke
Malay
Berdugo
+ 4 more
```

Optionally:

`View Full Roster Health`

Healthy chickens should not consume as much space as injured or recovering chickens.

---

# 11. Patient Card Design

Each patient card should surface the most actionable information first.

Recommended card structure:

```text
V3 TEST

CRITICAL
UNFIT FOR COMBAT

HP            0 / 100
Condition       100

Severe Wounds
Serious Injury

Treatment available

[EXAMINE]
```

Avoid showing every stat at equal visual weight.

The card should emphasize:

1. severity,
2. battle readiness,
3. primary problem,
4. actionability.

Secondary stats can remain visible but visually subdued.

---

# 12. Medical Readiness

Every chicken should expose a medical readiness state.

Recommended readiness states:

- READY
- RESTRICTED
- UNFIT

Examples:

```text
V3 TEST

UNFIT FOR COMBAT

Reasons:
• Health below minimum
• Serious injury
```

```text
BRIGHT QUEEN

RESTRICTED

Reasons:
• Critically low health
```

```text
MALAY

READY
```

The Clinic should not require the player to infer eligibility from several stats.

The existing medical eligibility logic should be reused.

---

# 13. Selected Patient Drawer

Clicking a chicken should open a detailed patient drawer.

Do not expand giant inline cards.

The drawer should become the primary place for:

- detailed stats,
- injuries,
- illnesses,
- HP restoration,
- medical rest,
- readiness reasons,
- treatment actions.

Suggested structure:

```text
V3 TEST

CRITICAL
UNFIT FOR COMBAT

HP
0 / 100

Condition      100
Stress           8
Morale          68

────────────────────

INJURIES

Severe Wounds
SERIOUS

Treatment available
450 credits
Estimated time: 12m

[TREAT INJURY]

────────────────────

GENERAL HEALTH

Restore HP
Missing: 100 HP

800 credits
8m

[RESTORE HEALTH]

────────────────────

RECOVERY

Medical Rest
Free

Improves:
Condition
Stress recovery
General recovery state

[BEGIN MEDICAL REST]
```

---

# 14. Injury Treatment UI

Treatment actions should provide more context.

Current style:

```text
Treat · 624c / 6m
```

Recommended style:

```text
TREAT SERIOUS INJURY

450 credits
12 minutes

Clinic bonus:
-10% treatment cost
+15% treatment speed

[TREAT INJURY]
```

The full modifier breakdown does not need to be permanently visible.

It may appear:

- in a tooltip,
- secondary text,
- expandable detail,
- or treatment confirmation dialog.

The player should still understand that clinic progression is producing real benefits.

---

# 15. HP Restoration

HP restoration should remain a separate treatment type.

Do not collapse HP loss into the injury system.

Suggested UI:

```text
RESTORE HEALTH

Current HP
22 / 100

Missing HP
78

Base cost
624 credits

Clinic discount
-10%

Final cost
562 credits

Estimated time
6m 30s

[BEGIN TREATMENT]
```

This preserves the current architecture while making the action more readable.

---

# 16. Medical Rest

Medical Rest should have a clearer identity.

It should not look like “free treatment”.

Suggested presentation:

```text
MEDICAL REST

Free

Recommended for:
• fatigue
• stress
• mild illness recovery
• general recovery
• low condition

Does not directly remove:
• serious injury
• permanent damage
• severe trauma

[BEGIN MEDICAL REST]
```

This makes it clear why paid treatment still matters.

---

# 17. Illness Treatment

This is the largest known functional gap.

Illnesses are already visible on the Clinic page.

The treatment completion logic already recognizes `TREAT_ILLNESS`.

However, there is currently no complete player-facing illness treatment action.

This revamp should complete the feature.

## Required Work

Add:

- illness treatment API action,
- player-facing illness treatment UI,
- cost calculation,
- treatment duration,
- clinic-level compatibility if appropriate,
- transaction validation,
- active treatment representation,
- completion handling.

Example:

```text
RESPIRATORY INFECTION

SERIOUS ILLNESS

Effects:
- reduced stamina recovery
- increased stress
- battle prohibited

Treatment:
650 credits
14 minutes

[TREAT ILLNESS]
```

Medical Rest may continue to support slow natural illness recovery.

Dedicated illness treatment should be faster and more reliable.

---

# 18. Active Treatment Queue

The Clinic should gain a dedicated active-care section.

Example:

```text
ACTIVE CARE

V3 TEST
HP Restoration
██████████████░░░░
05:42 remaining

BRIGHT QUEEN
Medical Rest
████████░░░░░░░░░░
13:18 remaining

MALAY
Treating Wing Injury
███████████████░░░
03:08 remaining
```

Each treatment row should show:

- chicken,
- treatment type,
- status,
- remaining time,
- progress,
- treatment target.

This is especially important because treatments resolve lazily.

The existing 15-second polling is sufficient.

---

# 19. Treatment Completion Feedback

When polling detects that a treatment has resolved, provide clear visual feedback.

Examples:

```text
TREATMENT COMPLETE

V3 Test
Health restored to 100.
```

```text
RECOVERY COMPLETE

Bright Queen
Medical rest completed.
```

```text
INJURY TREATED

Malay
Wing Injury removed.
```

The UI should then move the chicken automatically between categories.

Example:

`Recovering → Healthy`

or:

`Recovering → Needs Care`

if other unresolved medical problems remain.

---

# 20. Lazy Resolution Compatibility

Do not add a background worker only for the sake of the UI revamp.

Existing behavior:

1. treatment reaches end time,
2. next medical API access occurs,
3. completed treatment resolves,
4. frontend receives updated state.

This is fully compatible with the new Clinic.

The 15-second polling loop can continue to trigger resolution naturally.

---

# 21. Clinic Upgrade UI

The current upgrade button should become a proper progression interface.

Instead of:

```text
Upgrade to Veterinary Center — 1500 credits
```

use a dedicated upgrade drawer or modal.

Suggested layout:

```text
CLINIC DEVELOPMENT

CURRENT FACILITY
LEVEL 1
Basic Clinic

Current capabilities:
✓ Minor injury treatment
✓ HP restoration
✓ Medical rest
× Serious trauma treatment
× Advanced treatment

──────────────────────────────

NEXT LEVEL
LEVEL 2
Veterinary Center

Cost:
1,500 credits

UNLOCKS
+ Serious injury treatment

IMPROVEMENTS
Treatment speed       +15%
Treatment discount    +5%
Permanent damage      -10%

[UPGRADE CLINIC]
```

---

# 22. Full Facility Progression Screen

The player should be able to see all four clinic levels.

Recommended layout:

```text
Basic Clinic
     ↓
Veterinary Center
     ↓
Advanced Clinic
     ↓
Elite Medical Center
```

Each level should show:

- unlock cost,
- treatable severity,
- speed modifier,
- discount modifier,
- permanent-damage reduction,
- visual preview if available.

Locked future levels should still be inspectable.

---

# 23. Treatment Bay Representation

Active treatment records can be mapped directly into 3D treatment slots.

Example:

```text
MedicalTreatment
chickenId = V3_TEST
type = RESTORE_HEALTH
remaining = 6m
```

3D representation:

```text
Treatment Bay 1
V3 Test
HP Restoration
6m remaining
```

A Medical Rest treatment may place a chicken in a recovery pen rather than an examination bay.

This representation should be purely visual.

The backend remains authoritative.

---

# 24. Suggested 3D Zones

The Clinic scene may be divided into several visual zones.

## Examination Area

Used for:

- injury treatment,
- illness treatment,
- assessment visuals.

## Treatment Bay

Used for:

- serious injury treatment,
- HP restoration,
- more active care.

## Recovery Pen

Used for:

- Medical Rest,
- post-treatment recovery visuals.

## Upgrade Area

May visually show:

- building expansions,
- additional equipment,
- locked future areas.

This can help facility progression feel physical.

---

# 25. UI Visual Direction

The current Clinic screen feels too flat and document-like.

The revamp should move toward:

- translucent game panels,
- layered HUD elements,
- strong visual hierarchy,
- warm medical accents,
- subtle glass surfaces,
- readable typography,
- less spreadsheet-like layout.

Avoid:

- giant beige rectangles,
- equal-weight stat lines,
- administrative table styling,
- large unused whitespace,
- oversized healthy-roster sections.

Recommended feel:

**game facility UI layered over a living 3D medical environment.**

---

# 26. Severity Styling

Severity should be consistent across the entire Clinic.

Suggested hierarchy:

## Critical

Used for:

- extremely low HP,
- severe/career-threatening problems,
- dangerous medical states.

Strong visual prominence.

## Serious

Used for:

- serious injury,
- meaningful illness,
- battle-blocking condition.

## Moderate

Used for:

- manageable but relevant issues.

## Minor

Used for:

- low-risk problems.

Do not rely on color alone.

Use:

- label text,
- iconography,
- border treatment,
- typography,
- and optionally color.

---

# 27. UX Rules

The following UX rules should guide implementation.

## Rule 1

The player must understand who needs help immediately.

## Rule 2

Healthy chickens must never dominate the page.

## Rule 3

The player should never need to infer whether a chicken can fight.

## Rule 4

Treatment actions should explain:

- what they do,
- what they cost,
- and how long they take.

## Rule 5

Clinic upgrades should visibly communicate value.

## Rule 6

The 3D environment must reflect actual server state.

## Rule 7

No new client-side medical authority.

The server remains authoritative.

---

# 28. Revised Player Flow

Recommended end-to-end flow:

```text
Battle / Training
      ↓
Medical state changes
      ↓
Eligibility system recalculates
      ↓
Clinic dashboard categorizes chicken
      ↓
Player sees:
URGENT / NEEDS CARE / RECOVERING / HEALTHY
      ↓
Player selects chicken
      ↓
Medical drawer opens
      ↓
Available actions:
• Treat Injury
• Restore HP
• Treat Illness
• Medical Rest
      ↓
Server validates transaction
      ↓
Credits deducted if required
      ↓
MedicalTreatment created
      ↓
Chicken appears in ACTIVE CARE
      ↓
Treatment timer progresses
      ↓
Clinic polling requests updated state
      ↓
Lazy completion resolves treatment
      ↓
UI receives new medical state
      ↓
Chicken moves between categories
      ↓
Eligibility recalculates
      ↓
READY FOR COMBAT
```

---

# 29. Recommended Functional Changes

The redesign should prioritize the following functional additions.

## Required

1. Add a proper `TREAT_ILLNESS` player action.
2. Add medical readiness states to Clinic UI.
3. Add medical roster categorization.
4. Add dedicated active treatment queue.
5. Add selected-patient drawer.
6. Add improved clinic-upgrade interface.
7. Add treatment completion feedback.

## Strongly Recommended

8. Add 3D clinic environment.
9. Map active treatments into treatment bays.
10. Visually change clinic by facility level.
11. Add modifier breakdowns for cost and duration.
12. Make Medical Rest benefits clearer.

---

# 30. Things That Should NOT Be Rewritten

Avoid unnecessary backend churn.

Do not rewrite:

- transactional credit handling,
- treatment validation,
- treatment persistence,
- injury completion rules,
- lazy completion architecture,
- existing clinic progression config,
- existing battle eligibility rules,

unless required to support illness treatment or a clearly identified bug.

The current backend already provides a solid foundation.

---

# 31. Recommended Component Structure

Possible frontend structure:

```text
app/clinic/page.tsx

components/clinic/
  ClinicHeader.tsx
  ClinicOverview.tsx
  ClinicScene.tsx
  ClinicSceneFallback.tsx

  MedicalTriageSection.tsx
  PatientCard.tsx
  PatientDrawer.tsx

  ActiveTreatments.tsx
  TreatmentProgress.tsx

  InjuryTreatmentAction.tsx
  HpTreatmentAction.tsx
  IllnessTreatmentAction.tsx
  MedicalRestAction.tsx

  ClinicUpgradeButton.tsx
  ClinicUpgradeDrawer.tsx
  ClinicLevelTrack.tsx

  HealthyRosterSummary.tsx
  MedicalReadinessBadge.tsx
  SeverityBadge.tsx
```

This is only a suggested organization.

Follow the existing project conventions where appropriate.

---

# 32. Suggested Client State

The page may maintain UI-only state such as:

```ts
selectedChickenId
isPatientDrawerOpen
isUpgradeDrawerOpen
activeRosterFilter
sceneFocusedChickenId
```

Do not duplicate medical domain state unnecessarily.

Medical state should continue to come from server responses.

---

# 33. Suggested Derived Medical Groups

Roster groups can be derived client-side from authoritative server state.

Example concept:

```ts
type ClinicRosterGroup =
  | "urgent"
  | "needs-care"
  | "recovering"
  | "healthy";
```

Pseudo logic:

```ts
if (hasCriticalMedicalState(chicken)) {
  return "urgent";
}

if (hasActiveTreatment(chicken)) {
  return "recovering";
}

if (needsMedicalAttention(chicken)) {
  return "needs-care";
}

return "healthy";
```

The precise grouping rules should reuse existing medical severity and eligibility logic where possible.

---

# 34. Medical Readiness Derivation

The Clinic should expose existing eligibility reasons rather than invent new client logic.

Ideal server response shape if not already available:

```ts
{
  eligible: false,
  status: "unfit",
  reasons: [
    "Health below minimum",
    "Serious injury"
  ]
}
```

Frontend:

```text
UNFIT FOR COMBAT

• Health below minimum
• Serious injury
```

If existing APIs already expose sufficient information, avoid adding redundant endpoints.

---

# 35. Treatment Confirmation

For paid actions, consider a lightweight confirmation dialog.

Example:

```text
TREAT SERIOUS INJURY?

Chicken:
V3 Test

Cost:
405 credits

Duration:
8m 30s

Clinic benefits:
-45 credits
-1m 30s

[CONFIRM TREATMENT]
[CANCEL]
```

This is especially useful for expensive career-altering injuries.

---

# 36. Upgrade Confirmation

Clinic upgrades should also show consequences clearly.

Example:

```text
UPGRADE TO VETERINARY CENTER?

Cost:
1,500 credits

Unlocks:
• Serious injury treatment

Improves:
• Treatment speed
• Treatment discounts
• Permanent-damage reduction

[UPGRADE]
[CANCEL]
```

---

# 37. Empty States

The Clinic needs polished empty states.

## No Chickens Need Care

```text
ROSTER HEALTHY

No chickens currently require treatment.

3 fighters are cleared for combat.
```

The 3D scene may show empty treatment bays.

## No Active Treatments

```text
NO ACTIVE TREATMENTS

Your treatment bays are currently available.
```

## No Healthy Chickens

Avoid showing an awkward empty section.

Only render the healthy roster section when relevant.

---

# 38. Loading State

Because the page polls and may load multiple medical states, loading should feel intentional.

Suggested:

- preserve previous state during polling,
- avoid full-page flashes,
- show subtle updating indicator,
- only show skeletons on initial load.

Example:

```text
Medical status updating…
```

Do not reset the entire Clinic screen every 15 seconds.

---

# 39. Polling Behavior

Keep the 15-second polling behavior unless there is a strong technical reason to change it.

Recommended UX:

- background refresh,
- no layout jump,
- no drawer close,
- no loss of selected patient,
- no 3D camera reset,
- smooth category transition when state changes.

---

# 40. Treatment Completion Transition

When a treatment resolves during polling:

1. detect changed treatment state,
2. show completion toast/banner,
3. update active treatment list,
4. recalculate roster group,
5. update readiness,
6. update 3D treatment bay,
7. keep current selected patient open if still relevant.

Avoid abrupt full-screen rerenders.

---

# 41. Mobile / Narrow Layout

On smaller screens:

- 3D scene remains full-width,
- triage cards become horizontally scrollable or stacked,
- patient details open as bottom sheet,
- upgrade progression opens as full-screen sheet,
- active treatment queue becomes compact.

Do not attempt to preserve a desktop multi-column dashboard on narrow devices.

---

# 42. Accessibility

Medical state must not rely on color alone.

Use:

- severity labels,
- readable status text,
- icons,
- consistent button labels,
- sufficient contrast,
- accessible treatment progress text.

Progress bars should still expose:

- treatment type,
- time remaining,
- completion state.

---

# 43. Animation Guidance

Animations should be subtle.

Recommended:

- smooth card transition between medical categories,
- treatment progress animation,
- selected patient focus transition,
- treatment bay camera focus,
- clinic upgrade presentation,
- gentle idle movement in 3D.

Avoid excessive UI motion around critical medical information.

---

# 44. Audio Guidance

Optional later enhancement:

- soft clinic ambience,
- low fan sound,
- subtle medicine-room soundscape,
- confirmation sound on treatment completion.

Avoid cartoon hospital sounds.

---

# 45. Future Expansion Opportunities

The redesign should leave room for future systems without requiring them now.

Possible future additions:

- rehabilitation specialization,
- treatment supplies,
- specialist vets,
- rare recovery events,
- permanent scar tracking,
- medical history,
- recovery traits,
- medical staff progression,
- post-fight medical reports.

These should not block the initial revamp.

---

# 46. Recommended Implementation Phases

## Phase 1 — Information Architecture

Implement:

- roster triage groups,
- medical overview,
- readiness badges,
- compact healthy roster,
- selected patient drawer.

No major backend changes.

## Phase 2 — Treatment UX

Implement:

- improved injury treatment actions,
- HP restoration UI,
- Medical Rest clarity,
- active treatment queue,
- completion notifications.

## Phase 3 — Illness Treatment

Implement:

- illness treatment API/action,
- treatment validation,
- player-facing UI,
- completion flow.

## Phase 4 — Upgrade Revamp

Implement:

- clinic progression interface,
- level track,
- clearer upgrade modifiers,
- improved upgrade confirmation.

## Phase 5 — 3D Clinic

Implement:

- clinic environment,
- treatment bays,
- recovery pens,
- active patient representation,
- visual clinic-level progression.

## Phase 6 — Polish

Implement:

- transitions,
- responsive behavior,
- treatment completion polish,
- camera focus,
- empty states,
- visual consistency.

---

# 47. Acceptance Criteria

The Clinic revamp is successful when:

- the player can identify urgent cases immediately,
- healthy chickens no longer dominate the page,
- battle readiness is visible without inference,
- every active treatment has a clear timer,
- treatment completion is obvious,
- injury, HP, illness, and Medical Rest actions are clearly differentiated,
- clinic upgrades clearly communicate gameplay benefits,
- illness treatment is fully usable,
- the 3D clinic visually represents actual server state,
- lazy completion continues to work,
- the server remains authoritative,
- and the page feels like a game facility rather than a spreadsheet.

---

# 48. Final Product Direction

The final Clinic should feel like:

> **a living medical command center for the player’s entire roster**

rather than:

> **a list of wounded chickens with treatment buttons**

The strongest version of `/clinic` is one where:

- the roster’s health can be understood at a glance,
- urgent medical problems demand attention,
- active recovery is visually represented,
- treatment choices are clear,
- facility upgrades feel meaningful,
- and the clinic becomes visibly more capable as the player progresses.

The backend is already strong enough to support this direction.

The revamp should therefore preserve the medical architecture and focus on transforming the player experience around it.
