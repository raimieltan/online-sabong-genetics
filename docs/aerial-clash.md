# Aerial clash animation

ContinuousBattle (the local V2 practice fight) uses each fighter's persistent
`aerial` runtime to drive the rig. Grounded legacy reward fights still use their
existing animation/event pipeline. No reward or server routes were changed.

The first jump has 100–133 ms of preload, roughly 117 ms of takeoff, then a
chamber before a 100–117 ms active window. Both feet leave the ground together.
Launch velocity is 3.8–4.6 units/second forward with gravity of 18 units/second².
Only launch supplies the initial impulse; subsequent ticks integrate momentum,
gravity and contact impulses, even if an action is interrupted.

`aerial.phase` exposes PRELOAD, TAKEOFF, AIRBORNE, STRIKE_ACTIVE, IMPACT,
RECOVERY and LAND. Phase changes are published as STATE_CHANGED event details.
The renderer consumes phase time and simulation ticks, so pausing also pauses
wing beats and recoil. Land is entered on ground contact, not clip completion.

A recovered airborne fighter may independently choose left/right kicks,
close pecks or a push-off based on spacing, balance, persistence and stamina.
Each action has its own active window and hit latch. At most two follow-ups
and bounded lift impulses prevent indefinite hovering. Wing phases differ by
agility and commitment time. Attacks remain subject to the existing per-fighter
engagement rhythm.

Active aerial kicks test left/right shank-to-foot volumes against head, neck,
body, wing and leg hurt spheres. Airborne leg and wing anchors shift with the
pose. All hits are collected before damage and recoil are applied. Existing
event details distinguish AIR_KICK_HIT, AIR_KICK_TRADE, AIR_KICK_COUNTERED,
AIR_KICK_MISS, AIR_KICK_EVADED and AIR_COLLISION.

The current 14-bone rig has foot bones but no independent toe bones. Feet can
pitch and fan outward; individual claw spreading needs a rig extension. These
are model-independent collision approximations, not mesh collision. The
existing debug overlay displays reference hurt volumes rather than the full
animated attack capsules.

Regression coverage: simultaneous and lethal aerial trades, fighter-order
reversal, airborne follow-ups and eventual landing, chambered legs, wing beats
and additive head recoil. Visual review in the 3D practice scene remains useful
for tuning the rig's shank-axis convention and amplitudes.
