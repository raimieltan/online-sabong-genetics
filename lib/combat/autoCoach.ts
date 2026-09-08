import type { CoachFn } from "./simulator";

/**
 * The default game-plan policy for `auto` mode (spec: "Auto-Coach (first-
 * class from Phase A)") — same action-scoring path as `manual`, this just
 * supplies a static playerCommandModifier instead of a live human one, so
 * idle/casual play is never blocked by the coaching layer.
 */
export function autoCoachPolicy(): CoachFn {
  return (obs) => {
    if (obs.own.commandPoints < 1) return null;
    if (obs.own.mentalState === "desperate" || obs.own.mentalState === "exhausted") return "RECOVER";
    if (obs.opponentContextState === "EXHAUSTED" || obs.opponentContextState === "VULNERABLE") return "PRESS";
    if (obs.opponentContextState === "DOMINANT" || obs.opponentContextState === "PRESSURING") return "WAIT";
    return null;
  };
}
