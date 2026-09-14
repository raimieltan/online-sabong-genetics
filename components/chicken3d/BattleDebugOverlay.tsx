"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { AttackPhase } from "@/lib/animation/choreography";
import type { CameraCueName } from "@/lib/animation/cameraDirector";

/**
 * Dev-only battle presentation debug overlay (spec §25). Fed by a plain
 * mutable ref that BattleCanvas writes every frame; this component samples it
 * on a ~12Hz interval so it never forces a per-frame React render.
 */
export interface BattleDebugState {
  turn: number;
  attacker: string;
  defender: string;
  move: string;
  attackerAnim: string;
  defenderAnim: string;
  phase: AttackPhase | "TELL" | "—";
  distance: number;
  idealDistance: number;
  attackRange: number;
  minDistance: number;
  hitStopMs: number;
  knockback: boolean;
  stagger: string;
  knockdown: boolean;
  cameraCue: CameraCueName | "—";
  personaA: string;
  personaB: string;
  preferredA: number;
  preferredB: number;
  bandA: string;
  bandB: string;
  intentA: string;
  intentB: string;
  pressureA: number;
  pressureB: number;
  arenaRadius: number;
  posA: string;
  posB: string;
  cameraTarget: string;
  cameraDesiredDistance: number;
}

export function makeDebugState(): BattleDebugState {
  return {
    turn: 0,
    attacker: "—",
    defender: "—",
    move: "—",
    attackerAnim: "—",
    defenderAnim: "—",
    phase: "—",
    distance: 0,
    idealDistance: 0,
    attackRange: 0,
    minDistance: 0,
    hitStopMs: 0,
    knockback: false,
    stagger: "none",
    knockdown: false,
    cameraCue: "—",
    personaA: "—",
    personaB: "—",
    preferredA: 0, preferredB: 0, bandA: "—", bandB: "—", intentA: "—", intentB: "—",
    pressureA: 0, pressureB: 0, arenaRadius: 0,
    posA: "—", posB: "—", cameraTarget: "—", cameraDesiredDistance: 0,
  };
}

const ROW = "flex justify-between gap-4 tabular-nums";

export function BattleDebugOverlay({ stateRef }: { stateRef: RefObject<BattleDebugState> }) {
  const [snap, setSnap] = useState<BattleDebugState>(makeDebugState);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let last = 0;
    const tick = (t: number) => {
      raf.current = requestAnimationFrame(tick);
      if (t - last < 80) return;
      last = t;
      const s = stateRef.current;
      if (s) setSnap({ ...s });
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [stateRef]);

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-50 w-72 rounded-md border border-white/15 bg-black/75 p-2 font-mono text-[10px] leading-tight text-white/80 shadow-lg">
      <div className="mb-1 font-bold text-emerald-300">V2 PRESENTATION DEBUG</div>
      <div className={ROW}><span>turn</span><span>{snap.turn}</span></div>
      <div className={ROW}><span>attacker</span><span>{snap.attacker}</span></div>
      <div className={ROW}><span>defender</span><span>{snap.defender}</span></div>
      <div className={ROW}><span>move</span><span>{snap.move}</span></div>
      <div className={ROW}><span>phase</span><span className="text-amber-300">{snap.phase}</span></div>
      <div className="my-1 border-t border-white/10" />
      <div className={ROW}><span>anim A</span><span>{snap.attackerAnim}</span></div>
      <div className={ROW}><span>anim B</span><span>{snap.defenderAnim}</span></div>
      <div className="my-1 border-t border-white/10" />
      <div className={ROW}><span>distance</span><span>{snap.distance.toFixed(2)}</span></div>
      <div className={ROW}><span>ideal</span><span>{snap.idealDistance.toFixed(2)}</span></div>
      <div className={ROW}><span>atk range</span><span>{snap.attackRange.toFixed(2)}</span></div>
      <div className={ROW}><span>min dist</span><span>{snap.minDistance.toFixed(2)}</span></div>
      <div className={ROW}><span>A pref / band</span><span>{snap.preferredA.toFixed(2)} / {snap.bandA}</span></div>
      <div className={ROW}><span>B pref / band</span><span>{snap.preferredB.toFixed(2)} / {snap.bandB}</span></div>
      <div className={ROW}><span>A intent / pressure</span><span>{snap.intentA} / {snap.pressureA.toFixed(2)}</span></div>
      <div className={ROW}><span>B intent / pressure</span><span>{snap.intentB} / {snap.pressureB.toFixed(2)}</span></div>
      <div className={ROW}><span>arena radius</span><span>{snap.arenaRadius.toFixed(1)}</span></div>
      <div className={ROW}><span>A position</span><span>{snap.posA}</span></div>
      <div className={ROW}><span>B position</span><span>{snap.posB}</span></div>
      <div className={ROW}><span>camera target</span><span>{snap.cameraTarget}</span></div>
      <div className={ROW}><span>camera distance</span><span>{snap.cameraDesiredDistance.toFixed(2)}</span></div>
      <div className="my-1 border-t border-white/10" />
      <div className={ROW}>
        <span>hit-stop</span>
        <span className={snap.hitStopMs > 0 ? "text-red-400" : ""}>{snap.hitStopMs.toFixed(0)}ms</span>
      </div>
      <div className={ROW}><span>stagger</span><span>{snap.stagger}</span></div>
      <div className={ROW}>
        <span>knockback / down</span>
        <span>{snap.knockback ? "Y" : "n"} / {snap.knockdown ? "Y" : "n"}</span>
      </div>
      <div className={ROW}><span>camera</span><span className="text-sky-300">{snap.cameraCue}</span></div>
      <div className="my-1 border-t border-white/10" />
      <div className={ROW}><span>persona A</span><span>{snap.personaA}</span></div>
      <div className={ROW}><span>persona B</span><span>{snap.personaB}</span></div>
    </div>
  );
}
