'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Chicken } from '@/lib/types';
import { ACTIONS, CombatSession, COMBAT_VERSION, COMMAND_COOLDOWN_TICKS, TACTICAL_MODES, type TacticalMode } from '@/lib/combat-v2';
import { toCombatV2Snapshot } from '@/lib/combatV2Snapshot';
import type { AnimIntent, AnimState } from '@/lib/animation/types';
import type { FighterAnim } from '@/components/chicken3d/ChickenModel';
import type { ImpactVFXHandle } from '@/components/chicken3d/ImpactVFX';
import { BattleStage3D, ANIM_PX_TO_WORLD, WORLD_HALF_GAP } from '@/components/chicken3d/BattleStage3D';
import { ArenaBackdrop } from '@/components/chicken3d/ArenaBackdrop';

const pose = (): FighterAnim => ({ offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });
const animation: Record<string, AnimState> = { neutral: 'ready', advancing: 'walk', retreating: 'backstep', circling: 'walk', feinting: 'tell_risk', defending: 'ready', evading: 'backstep', recovering: 'recovery', staggered: 'stagger', down: 'death', finished: 'victory', peck_strike: 'peck_attack', spur_lunge: 'heavy_kick', jump_kick: 'jump_attack', flying_spur: 'flying_kick', wing_counter: 'wing_strike', guard: 'ready', sidestep: 'backstep', feint: 'tell_risk' };

/** Local V2 proving ground. Outcomes here never call progression or reward APIs. */
export default function ContinuousBattle({ chickenA, chickenB }: { chickenA: Chicken; chickenB: Chicken }) {
  const [seed, setSeed] = useState(81726354);
  const [generation, setGeneration] = useState(0);
  const [debug, setDebug] = useState(false);
  const [showColliders, setShowColliders] = useState(false);
  const [display, setDisplay] = useState({ tick: 0, phase: 'paused', result: '', fighters: [] as { name: string; hp: number; maxHp: number; stamina: number; state: string; action: string; tactic: string; reaction: string; utilities: string; y: number; vy: number; grounded: boolean; locomotion: string; animation: string; clip: string; aerialPhase: string; groundedTicks: number }[], events: [] as string[], cooldown: 0 });
  const [error, setError] = useState('');
  const sessionRef = useRef<CombatSession | null>(null);
  const animA = useRef(pose()), animB = useRef(pose());
  const intentA = useRef<AnimIntent | null>(null), intentB = useRef<AnimIntent | null>(null);
  const vfx = useRef<ImpactVFXHandle | null>(null);
  const collisionDebugFighters = useMemo(() => [
    toCombatV2Snapshot(chickenA, 'local-player'),
    toCombatV2Snapshot(chickenB, 'local-ai'),
  ] as [ReturnType<typeof toCombatV2Snapshot>, ReturnType<typeof toCombatV2Snapshot>], [chickenA, chickenB]);

  useEffect(() => {
    // This is the authoritative V2 arena, not merely a visual floor. Its
    // radius permits long reads, diagonals and meaningful post-clash resets.
    const session = new CombatSession({ id: `local-${seed}`, version: COMBAT_VERSION, seed, fighterA: toCombatV2Snapshot(chickenA, 'local-player'), fighterB: toCombatV2Snapshot(chickenB, 'local-ai'), arena: { radius: 8 }, maxTicks: 60 * 90 });
    session.stop(); sessionRef.current = session;
    const effects = vfx.current;
    const latest: string[] = [];
    const damageTick = [-100, -100];
    const unsubscribe = session.subscribe(events => {
      for (const event of events) {
        if (['ATTACK_LANDED', 'COUNTER_LANDED', 'BLOCK', 'STAGGER', 'TELL_DETECTED', 'MATCH_FINISHED'].includes(event.type)) {
          latest.push(`${(event.tick / 60).toFixed(2)}s ${event.type.replaceAll('_', ' ')} ${event.value ? event.value.toFixed(1) : ''}`);
          if (latest.length > 5) latest.shift();
        }
        if (event.type === 'DAMAGE') {
          const i = session.state.fighters.findIndex(f => f.snapshot.fighterId === event.fighterId);
          damageTick[i] = event.tick;
          const p = session.state.fighters[i].position;
          vfx.current?.spawn((event.value ?? 0) > 8 ? 'heavy_impact' : 'light_impact', new THREE.Vector3(p.x, -2.1 + p.y, p.z));
        }
      }
    });
    let last = 0, frameId = 0, lastHud = -1000;
    const draw = (now: number) => {
      const delta = last ? (now - last) / 1000 : 0; last = now;
      session.update(delta);
      const s = session.state;
      s.fighters.forEach((f, i) => {
        const a = i === 0 ? animA.current : animB.current;
        const prior = session.previousPositions[i], alpha = s.phase === 'active' ? session.alpha : 1;
        a.offsetX = (prior.x + (f.position.x - prior.x) * alpha - (i === 0 ? -WORLD_HALF_GAP : WORLD_HALF_GAP)) / ANIM_PX_TO_WORLD;
        a.offsetY = -(prior.y + (f.position.y - prior.y) * alpha) / ANIM_PX_TO_WORLD;
        a.offsetZ = (prior.z + (f.position.z - prior.z) * alpha) / ANIM_PX_TO_WORLD;
        a.yaw = -f.facing + (i === 0 ? 0 : Math.PI);
        a.flash = Math.max(0, 1 - (s.tick - damageTick[i]) / 8);
        const rt = f.currentAction, action = rt && ACTIONS[rt.id];
        let progress = Math.min(1, (s.tick - f.stateEnteredTick) / 20);
        if (rt && action) {
          const age = s.tick - rt.startedTick;
          // Map the authored strike interval (.52–.72) onto the simulation active window.
          progress = rt.phase === 'startup' ? age / action.startupTicks * .52 : rt.phase === 'active' ? .52 + (age - action.startupTicks) / action.activeTicks * .2 : .72 + (age - action.startupTicks - action.activeTicks) / action.recoveryTicks * .28;
        }
        // Presentation consumes simulation contact state. There is no
        // independent Three.js mixer/root-motion path in this renderer; the
        // procedural controller receives this one authoritative intent.
        const visualAerial = f.aerial && (f.aerial.launchedTick < 0 || !f.grounded || f.aerial.phase === 'LAND') && f.groundedTicks <= 10 ? f.aerial : undefined;
        const visualAction = visualAerial?.phase === 'LAND' ? undefined : rt;
        const intent: AnimIntent = { state: animation[visualAction?.id ?? f.state] ?? 'ready', startedAt: (visualAction?.startedTick ?? f.stateEnteredTick) * 1000 / 60, speed: 1, facing: i === 0 ? 'right' : 'left', simulationProgress: progress, fatal: f.state === 'down' };
        if (visualAerial && s.phase !== 'finished') intent.aerial = { ...visualAerial, tick: s.tick + alpha, actionId: visualAction?.id,
          strikeProgress: rt?.phase === 'active' && action ? (s.tick + alpha - rt.startedTick - action.startupTicks) / action.activeTicks : undefined,
          phaseProgress: (s.tick + alpha - visualAerial.phaseTick) / (visualAerial.phase === 'PRELOAD' ? action?.aerial?.takeoffTick ?? 6 : visualAerial.phase === 'STRIKE_ACTIVE' ? action?.activeTicks ?? 6 : 8) };
        if (i === 0) intentA.current = intent; else intentB.current = intent;
      });
      if (now - lastHud >= 80) {
        lastHud = now;
        const previousCommand = s.commands.filter(c => c.fighterId === chickenA.id).at(-1);
        setDisplay({ tick: s.tick, phase: s.phase, result: s.result ? `${s.result.winnerId ? s.fighters.find(f => f.snapshot.fighterId === s.result!.winnerId)!.snapshot.name + ' wins' : 'Draw'} · ${s.result.finishReason.replaceAll('_', ' ')}` : '', fighters: s.fighters.map(f => { const clip = animation[f.currentAction?.id ?? f.state] ?? 'ready'; return { name: f.snapshot.name, hp: f.health, maxHp: f.snapshot.maxHealth, stamina: f.stamina, state: f.state, action: f.currentAction ? `${f.currentAction.id} / ${f.currentAction.phase}` : 'NONE', tactic: f.tacticalMode, reaction: f.reaction ? `Reaction in ${Math.max(0, f.reaction.readyTick - s.tick)} ticks` : '', utilities: Object.entries(f.utilities).map(([k, v]) => `${k}: ${v.toFixed(2)}`).join(' · '), y: f.position.y, vy: f.velocity.y, grounded: f.grounded, locomotion: f.locomotion, animation: f.aerial ? `AERIAL_${f.aerial.phase}` : clip, clip, aerialPhase: f.aerial?.phase ?? 'NONE', groundedTicks: f.groundedTicks }; }), events: [...latest], cooldown: previousCommand ? Math.max(0, previousCommand.effectiveTick + COMMAND_COOLDOWN_TICKS - s.tick) : 0 });
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameId); unsubscribe(); session.stop(); sessionRef.current = null; effects?.clear(); };
  }, [chickenA, chickenB, seed, generation]);

  function command(mode: TacticalMode) {
    try { sessionRef.current?.issueCommand(chickenA.id, mode); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Command failed'); }
  }
  return <section className="mx-auto max-w-7xl space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">Continuous combat · V2</h1><p className="text-sm text-stone-400">Local practice · no rewards or permanent injuries</p></div>
      <div className="flex gap-3 items-center">
        <label className="text-sm">Seed <input aria-label="Combat seed" type="number" min={0} max={4294967295} value={seed} disabled={display.phase === 'active'} onChange={e => setSeed(Math.max(0, Math.min(4294967295, Math.trunc(Number(e.target.value)))))} className="w-32 rounded border border-stone-600 bg-stone-900 p-2" /></label>
        <button className="rounded bg-amber-700 px-4 py-2 disabled:opacity-40" disabled={display.phase === 'finished'} onClick={() => { const s = sessionRef.current; if (s?.state.phase === 'active') s.stop(); else s?.start(); }}>{display.phase === 'active' ? 'Pause' : display.tick ? 'Resume' : 'Start fight'}</button>
        <button className="rounded border border-stone-600 px-3 py-2" onClick={() => { setError(''); setGeneration(n => n + 1); }}>Reset</button>
      </div>
    </div>
    <div className="relative aspect-video overflow-hidden rounded-xl bg-stone-950">
      <ArenaBackdrop />
      <div className="absolute inset-0"><BattleStage3D simulationDriven key={generation} fighterA={chickenA} fighterB={chickenB} animA={animA} animB={animB} intentA={intentA} intentB={intentB} vfxRef={vfx} showCollisionDebug={showColliders} collisionDebugFighters={collisionDebugFighters} /></div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded bg-black/75 px-4 py-2 text-center">{(display.tick / 60).toFixed(1)}s · {display.phase}{display.result && <p className="text-amber-300">{display.result}</p>}</div>
      <div className="absolute inset-x-3 bottom-3 flex justify-between gap-6 pointer-events-none">
        {display.fighters.map((f, i) => <div key={i} className="w-64 rounded-lg bg-black/80 p-3 text-xs sm:text-sm">
          <strong>{f.name}</strong><p>{f.state.replaceAll('_', ' ')} · {f.tactic.replaceAll('_', ' ')}</p><p className="text-amber-200">{f.action.replaceAll('_', ' ')}</p>
          <label className="block">Health {Math.ceil(f.hp)} / {Math.ceil(f.maxHp)}<progress aria-label={`${f.name} health`} value={f.hp} max={f.maxHp} className="block h-2 w-full accent-red-500" /></label>
          <label className="block mt-1">Stamina {Math.floor(f.stamina)}<progress aria-label={`${f.name} stamina`} value={f.stamina} max={100} className="block h-2 w-full accent-amber-400" /></label>
          {f.reaction && <p className="text-amber-300">{f.reaction}</p>}
        </div>)}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2" aria-label="Tactical commands">
      {TACTICAL_MODES.map(mode => <button key={mode} aria-pressed={display.fighters[0]?.tactic === mode} disabled={display.phase !== 'active' || display.cooldown > 0} onClick={() => command(mode)} className="rounded border border-amber-700 px-4 py-2 capitalize aria-pressed:bg-amber-800 disabled:opacity-40">{mode.replaceAll('_', ' ')}</button>)}
      {display.cooldown > 0 && <span className="text-sm text-stone-400">Command ready in {(display.cooldown / 60).toFixed(1)}s</span>}
    </div>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <div className="text-sm text-stone-400">{display.events.map((e, i) => <p key={i}>{e}</p>)}</div>
    <div className="flex flex-wrap gap-4 text-sm">
      <label><input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} /> Show simulation debug</label>
      <label><input type="checkbox" checked={showColliders} onChange={e => setShowColliders(e.target.checked)} /> Show collision volumes</label>
    </div>
    {debug && <div className="rounded border border-stone-700 p-3 text-xs font-mono"><p>Version {COMBAT_VERSION} · seed {seed} · tick {display.tick} · 60 Hz · procedural pose controller (no Three.js mixer actions)</p>{display.fighters.map((f, i) => <div key={i} className="mt-3"><p>{f.name}</p><p>y: {f.y.toFixed(3)} · vy: {f.vy.toFixed(3)} · grounded: {String(f.grounded)} ({f.groundedTicks} ticks)</p><p>locomotion: {f.locomotion} · combat: {f.state} · action: {f.action}</p><p>animation: {f.animation} · current clip: {f.clip} · aerial phase: {f.aerialPhase}</p><p>{f.utilities}</p></div>)}</div>}
  </section>;
}
