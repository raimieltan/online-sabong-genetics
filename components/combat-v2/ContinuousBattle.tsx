'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Chicken } from '@/lib/types';
import { ACTIONS, CombatSession, COMBAT_VERSION, COMMAND_COOLDOWN_TICKS, TACTICAL_MODES, type TacticalMode, type MatchResult } from '@/lib/combat-v2';
import { toCombatV2Snapshot } from '@/lib/combatV2Snapshot';
import type { AnimIntent, AnimState } from '@/lib/animation/types';
import type { FighterAnim } from '@/components/chicken3d/ChickenModel';
import type { ImpactVFXHandle } from '@/components/chicken3d/ImpactVFX';
import { BattleStage3D, ANIM_PX_TO_WORLD, WORLD_HALF_GAP } from '@/components/chicken3d/BattleStage3D';
import type { CameraCue } from '@/components/chicken3d/BattleStage3D';
import { ComicCommentary, type CommentaryBurst } from '@/components/live/ComicCommentary';
import { AudioEngine } from '@/lib/audioEngine';
import { PageHeader } from '@/components/PageHeader';
import { BattleDirector, type BattleHudVisibility } from '@/lib/animation/battleDirector';

const pose = (): FighterAnim => ({ offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });
const animation: Record<string, AnimState> = { neutral: 'ready', advancing: 'walk', retreating: 'backstep', circling: 'walk', feinting: 'tell_risk', defending: 'ready', evading: 'backstep', recovering: 'recovery', staggered: 'stagger', down: 'death', finished: 'victory', peck_strike: 'peck_attack', spur_lunge: 'heavy_kick', jump_kick: 'jump_attack', flying_spur: 'flying_kick', wing_counter: 'wing_strike', guard: 'ready', sidestep: 'backstep', feint: 'tell_risk' };
type FighterDisplay = { name: string; hp: number; maxHp: number; stamina: number; tactic: string };
type MatchStats = { hits: [number, number]; damage: [number, number]; lastDamage: { id: number; amount: number; side: 'left' | 'right' } | null };
const COMMAND_CARDS: Record<TacticalMode, { title: string; subtitle: string; icon: string; tone: string }> = {
  pressure: { title: 'Sugod', subtitle: 'Apply pressure', icon: '01', tone: 'border-red-300/35 bg-[#24120e]/80 hover:bg-[#352018]' },
  balanced: { title: 'Timbang', subtitle: 'Read the opening', icon: '02', tone: 'border-amber-300/35 bg-[#21170e]/80 hover:bg-[#342414]' },
  defensive: { title: 'Bantay', subtitle: 'Guard and counter', icon: '03', tone: 'border-sky-200/30 bg-[#10191c]/80 hover:bg-[#17262b]' },
  counter: { title: 'Abang', subtitle: 'Punish the miss', icon: '04', tone: 'border-violet-200/25 bg-[#1b1520]/80 hover:bg-[#2a2032]' },
  recover: { title: 'Hinga', subtitle: 'Regain stamina', icon: '05', tone: 'border-emerald-200/25 bg-[#121d17]/80 hover:bg-[#1b2b21]' },
  all_in: { title: 'Todo', subtitle: 'Risk everything', icon: '06', tone: 'border-orange-200/30 bg-[#26160e]/80 hover:bg-[#372115]' },
};
const bar = (value: number, max: number) => `${Math.max(0, Math.min(100, Math.round(value / max * 100)))}%`;

/** Production presentation for the deterministic V2 combat session. */
export default function ContinuousBattle({ chickenA, chickenB, autoStart = false, showControls = true, onComplete, audioEnabled = true, onToggleAudio }: { chickenA: Chicken; chickenB: Chicken; autoStart?: boolean; showControls?: boolean; onComplete?: (result: MatchResult) => void; audioEnabled?: boolean; onToggleAudio?: () => void }) {
  const [display, setDisplay] = useState({ tick: 0, phase: 'paused', result: '', fighters: [] as FighterDisplay[], cooldown: 0 });
  const [stats, setStats] = useState<MatchStats>({ hits: [0, 0], damage: [0, 0], lastDamage: null });
  const [bursts, setBursts] = useState<CommentaryBurst[]>([]);
  const [caption, setCaption] = useState<string | null>('Handa na ang sabungan — sino ang mananaig?');
  const [hudVisibility, setHudVisibility] = useState<BattleHudVisibility>('FULL');
  const [error, setError] = useState('');
  const sessionRef = useRef<CombatSession | null>(null);
  const completedRef = useRef(false);
  const burstId = useRef(0);
  const audioRef = useRef<AudioEngine | null>(null);
  const animA = useRef(pose()), animB = useRef(pose());
  const intentA = useRef<AnimIntent | null>(null), intentB = useRef<AnimIntent | null>(null);
  const vfx = useRef<ImpactVFXHandle | null>(null);
  const directorRef = useRef(new BattleDirector());
  const cameraCue = useRef<CameraCue | null>(null);
  const hitStopScale = useRef(1);
  const hitStopUntil = useRef(0);
  const hudVisibilityRef = useRef<BattleHudVisibility>('FULL');
  const collisionDebugFighters = useMemo(() => [toCombatV2Snapshot(chickenA, 'local-player'), toCombatV2Snapshot(chickenB, 'local-ai')] as [ReturnType<typeof toCombatV2Snapshot>, ReturnType<typeof toCombatV2Snapshot>], [chickenA, chickenB]);

  useEffect(() => {
    const audio = new AudioEngine(audioEnabled); audioRef.current = audio; audio.playMusic();
    return () => audio.stopMusic();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { audioRef.current?.setEnabled(audioEnabled); }, [audioEnabled]);

  useEffect(() => {
    const seed = 81726354;
    const session = new CombatSession({ id: `arena-${seed}`, version: COMBAT_VERSION, seed, fighterA: toCombatV2Snapshot(chickenA, 'local-player'), fighterB: toCombatV2Snapshot(chickenB, 'local-ai'), arena: { radius: 8 }, maxTicks: 60 * 120 });
    if (!autoStart) session.stop();
    sessionRef.current = session; completedRef.current = false;
    const resetFrame = requestAnimationFrame(() => {
      setStats({ hits: [0, 0], damage: [0, 0], lastDamage: null });
      setBursts([]);
      setCaption(autoStart ? `Sugod! ${chickenA.name} laban kay ${chickenB.name}!` : 'Piliin ang taktika at simulan ang laban.');
    });
    const effects = vfx.current; const damageTick = [-100, -100]; const dustTick = [-100, -100];
    directorRef.current.reset();
    hudVisibilityRef.current = 'FULL';
    setHudVisibility('FULL');
    const burst = (text: string, side: CommentaryBurst['side'], kind: CommentaryBurst['kind']) => {
      const id = burstId.current++; setBursts(previous => [...previous.slice(-3), { id, text, side, kind }]);
      window.setTimeout(() => setBursts(previous => previous.filter(item => item.id !== id)), 1100);
    };
    const unsubscribe = session.subscribe(events => {
      for (const event of events) {
        const fighterIndex = session.state.fighters.findIndex(f => f.snapshot.fighterId === event.fighterId);
        const targetIndex = session.state.fighters.findIndex(f => f.snapshot.fighterId === event.targetId);
        const presentation = directorRef.current.consume(event, id => session.state.fighters.findIndex(f => f.snapshot.fighterId === id));
        const cueAttacker = fighterIndex === 0 ? 'r1' : 'r2';
        cameraCue.current = {
          attacker: cueAttacker,
          startTime: performance.now(),
          isCrit: presentation.camera === 'critical',
          isMiss: event.type === 'ATTACK_MISSED',
          stagger: event.type === 'STAGGER' ? 'heavy' : 'light',
          seq: presentation.sequence,
          cueName: presentation.camera,
          focus: presentation.focus,
        };
        if (presentation.hitStopSeconds > 0) hitStopUntil.current = performance.now() + presentation.hitStopSeconds * 1000;
        audioRef.current?.setBattleIntensity(presentation.crowd, presentation.duckAudio);
        if (presentation.hud !== hudVisibilityRef.current) {
          hudVisibilityRef.current = presentation.hud;
          setHudVisibility(presentation.hud);
        }
        if (event.type === 'ATTACK_MISSED') { audioRef.current?.playMiss(); burst('LIHIS!', fighterIndex === 0 ? 'right' : 'left', 'miss'); setCaption('Wala sa oras — nakaiwas! Basahin ang galaw, coach!'); }
        if (event.type === 'ATTACK_LANDED' || event.type === 'COUNTER_LANDED') {
          const critical = event.type === 'COUNTER_LANDED' || (event.value ?? 0) >= 9;
          if (critical) audioRef.current?.playCrit(); else audioRef.current?.playHit();
          if (fighterIndex >= 0) setStats(previous => ({ ...previous, hits: previous.hits.map((value, index) => index === fighterIndex ? value + 1 : value) as [number, number] }));
          // Large impact words are reserved for counters/major moments; normal
          // contact remains legible through motion, reaction, audio and dust.
          if (critical) burst('SOLIDONG TAMA!', fighterIndex === 0 ? 'right' : 'left', 'crit');
          setCaption(critical ? 'Grabe ang balik! Ramdam ng buong sabungan!' : 'Tama! Unti-unting kumakapit ang lamang!');
        }
        if (event.type === 'DAMAGE' && targetIndex >= 0) {
          const amount = Math.max(0, Math.round(event.value ?? 0)); damageTick[fighterIndex] = event.tick;
          const point = session.state.fighters[fighterIndex]?.position;
          if (point) {
            const impactPoint = new THREE.Vector3(point.x, -2.1 + point.y, point.z);
            vfx.current?.spawn(presentation.vfx ?? (amount > 8 ? 'heavy_impact' : 'light_impact'), impactPoint);
            if (presentation.secondaryVfx) vfx.current?.spawn(presentation.secondaryVfx, impactPoint);
          }
          setStats(previous => ({ ...previous, damage: previous.damage.map((value, index) => index === targetIndex ? value + amount : value) as [number, number], lastDamage: { id: event.tick, amount, side: fighterIndex === 0 ? 'left' : 'right' } }));
        }
        if (event.type === 'STAGGER') { audioRef.current?.playCrit(); burst('BUWAL!', fighterIndex === 0 ? 'left' : 'right', 'crit'); setCaption('Nawalan ng balanse! Ito ang pagkakataon — sugod!'); }
        if (event.type === 'MATCH_FINISHED') { audioRef.current?.playVictory(); burst('TAPOS NA!', 'center', 'ko'); }
      }
    });
    let last = 0, frameId = 0, lastHud = -1000;
    const draw = (now: number) => {
      const delta = last ? (now - last) / 1000 : 0; last = now;
      // Only rendering presentation freezes: authoritative simulation keeps
      // its deterministic tick cadence while the camera/VFX hold briefly.
      hitStopScale.current = now < hitStopUntil.current ? 0 : 1;
      session.update(delta); const state = session.state;
      if (state.result && !completedRef.current) {
        completedRef.current = true;
        const winner = state.result.winnerId ? state.fighters.find(f => f.snapshot.fighterId === state.result!.winnerId)?.snapshot.name : null;
        setCaption(winner ? `TAPOS NA! Panalo si ${winner}!` : 'Tapos ang laban — tabla sa sabungan!'); onComplete?.(state.result);
      }
      state.fighters.forEach((fighter, index) => {
        const current = index === 0 ? animA.current : animB.current, prior = session.previousPositions[index], alpha = state.phase === 'active' ? session.alpha : 1;
        current.offsetX = (prior.x + (fighter.position.x - prior.x) * alpha - (index === 0 ? -WORLD_HALF_GAP : WORLD_HALF_GAP)) / ANIM_PX_TO_WORLD;
        current.offsetY = -(prior.y + (fighter.position.y - prior.y) * alpha) / ANIM_PX_TO_WORLD; current.offsetZ = (prior.z + (fighter.position.z - prior.z) * alpha) / ANIM_PX_TO_WORLD;
        current.yaw = -fighter.facing + (index === 0 ? 0 : Math.PI); current.flash = Math.max(0, 1 - (state.tick - damageTick[index]) / 8);
        const runtime = fighter.currentAction, action = runtime && ACTIONS[runtime.id]; let progress = Math.min(1, (state.tick - fighter.stateEnteredTick) / 20);
        if (runtime && action) { const age = state.tick - runtime.startedTick; progress = runtime.phase === 'startup' ? age / action.startupTicks * .52 : runtime.phase === 'active' ? .52 + (age - action.startupTicks) / action.activeTicks * .2 : .72 + (age - action.startupTicks - action.activeTicks) / action.recoveryTicks * .28; }
        const aerial = fighter.aerial && (fighter.aerial.launchedTick < 0 || !fighter.grounded || fighter.aerial.phase === 'LAND') && fighter.groundedTicks <= 10 ? fighter.aerial : undefined;
        const intent: AnimIntent = { state: animation[(aerial?.phase === 'LAND' ? undefined : runtime)?.id ?? fighter.state] ?? 'ready', startedAt: (runtime?.startedTick ?? fighter.stateEnteredTick) * 1000 / 60, speed: 1, facing: index === 0 ? 'right' : 'left', simulationProgress: progress, fatal: fighter.state === 'down' };
        if (aerial && state.phase !== 'finished') intent.aerial = { ...aerial, tick: state.tick + alpha, actionId: runtime?.id, strikeProgress: runtime?.phase === 'active' && action ? (state.tick + alpha - runtime.startedTick - action.startupTicks) / action.activeTicks : undefined, phaseProgress: (state.tick + alpha - aerial.phaseTick) / (aerial.phase === 'PRELOAD' ? action?.aerial?.takeoffTick ?? 6 : aerial.phase === 'STRIKE_ACTIVE' ? action?.activeTicks ?? 6 : 8) };
        if (index === 0) intentA.current = intent; else intentB.current = intent;
        // Bounded, pooled dirt response: landings and fast grounded movement
        // only. This is visual evidence of force, never a movement system.
        const planarSpeed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
        if (fighter.grounded && (fighter.justLanded || planarSpeed > 1.45) && state.tick - dustTick[index] > 16) {
          dustTick[index] = state.tick;
          vfx.current?.spawn(fighter.justLanded ? 'landing_dust' : 'dust', new THREE.Vector3(fighter.position.x, -2.97, fighter.position.z));
        }
      });
      if (now - lastHud >= 80) {
        lastHud = now; const priorCommand = state.commands.filter(command => command.fighterId === chickenA.id).at(-1);
        setDisplay({ tick: state.tick, phase: state.phase, result: state.result ? state.result.finishReason.replaceAll('_', ' ') : '', fighters: state.fighters.map(fighter => ({ name: fighter.snapshot.name, hp: fighter.health, maxHp: fighter.snapshot.maxHealth, stamina: fighter.stamina, tactic: fighter.tacticalMode })), cooldown: priorCommand ? Math.max(0, priorCommand.effectiveTick + COMMAND_COOLDOWN_TICKS - state.tick) : 0 });
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(resetFrame); cancelAnimationFrame(frameId); unsubscribe(); session.stop(); sessionRef.current = null; effects?.clear(); };
  }, [chickenA, chickenB, autoStart, onComplete]);

  function command(mode: TacticalMode) {
    try { sessionRef.current?.issueCommand(chickenA.id, mode); setCaption(mode === 'pressure' || mode === 'all_in' ? 'Sugod! I-pressure natin siya!' : mode === 'defensive' || mode === 'counter' ? 'Bantay muna — hintayin ang butas!' : mode === 'recover' ? 'Hinga muna — balik ang stamina!' : 'Timbang lang, coach. Basahin ang galaw niya.'); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Hindi naipasok ang utos.'); }
  }

  const [left, right] = display.fighters;
  return <section className="mx-auto w-full max-w-[142.2vh] px-3 pb-6 pt-3 sm:px-5 lg:max-w-[calc(142.2vh+232px)]">
    <PageHeader
      eyebrow="Sabong Championship"
      title="Arena Battle"
      right={<>
        <div className="text-center"><p className="font-comic text-sm text-(--foreground)">Round 1</p><p className="text-[10px] uppercase tracking-[.18em] text-(--color-gold-bright)/65">{display.phase === 'active' ? '● Live match' : display.phase === 'finished' ? 'Final bell' : 'Ready'}</p></div>
        {onToggleAudio ? <button type="button" onClick={onToggleAudio} aria-label={audioEnabled ? 'Mute arena audio' : 'Unmute arena audio'} className="rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-2 text-lg transition hover:bg-(--color-gold)/15">{audioEnabled ? '🔊' : '🔇'}</button> : <div className="w-10" />}
      </>}
    />
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
    <div className="relative aspect-video w-full self-start overflow-hidden rounded-2xl border-[3px] border-[#160d08] bg-[#090706] shadow-[0_0_0_2px_rgba(212,162,78,.45),0_18px_35px_rgba(0,0,0,.6)]">
      <div className="absolute inset-0"><BattleStage3D simulationDriven fighterA={chickenA} fighterB={chickenB} animA={animA} animB={animB} intentA={intentA} intentB={intentB} cameraCue={cameraCue} hitStopScaleRef={hitStopScale} vfxRef={vfx} collisionDebugFighters={collisionDebugFighters} /></div>
      {/* Cheap cinematic grading layer: it keeps distant scenery subdued and
          leaves the centre clear without a permanent post-processing pass. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(9,6,4,.16)_70%,rgba(5,3,2,.56)_100%)]" />
      <div className={`pointer-events-none absolute inset-x-3 top-3 flex justify-between gap-3 transition-opacity duration-200 sm:inset-x-5 sm:top-5 ${hudVisibility === 'HIDDEN' ? 'opacity-0' : hudVisibility === 'CINEMATIC' ? 'opacity-45' : 'opacity-100'}`}><FighterCard fighter={left} side="left" hits={stats.hits[0]} damage={stats.damage[0]} /><div className="pt-1 text-center"><span className="rounded-full border border-amber-300/50 bg-black/70 px-3 py-1 font-comic text-xs text-amber-200">VS</span><p className="mt-2 rounded bg-black/55 px-2 py-1 text-[10px] font-semibold tracking-wider text-white/70">{(display.tick / 60).toFixed(1)}s</p></div><FighterCard fighter={right} side="right" hits={stats.hits[1]} damage={stats.damage[1]} /></div>
      {stats.lastDamage && <div key={stats.lastDamage.id} className={`pointer-events-none absolute top-[38%] z-30 animate-comic-burst font-comic text-3xl font-black text-red-400 [-webkit-text-stroke:1.5px_black] sm:text-5xl ${stats.lastDamage.side === 'left' ? 'left-[24%]' : 'right-[24%]'}`}>-${stats.lastDamage.amount}</div>}
      <ComicCommentary bursts={bursts} caption={caption} />
      {display.result && <div className="absolute inset-x-0 top-[38%] flex justify-center"><span className="rounded-xl border-2 border-black bg-[#f5ecd8] px-5 py-2 font-comic text-xl text-black shadow-[4px_4px_0_rgba(0,0,0,.65)]">{display.result.toUpperCase()}</span></div>}
    </div>
    {showControls && <div className={`mt-4 flex flex-col rounded-2xl border border-amber-300/25 bg-gradient-to-b from-[#2a180e] to-[#120c08] p-3 shadow-xl transition-all duration-200 sm:p-4 lg:mt-0 lg:border-l-2 lg:border-l-amber-300/40 ${hudVisibility === 'CINEMATIC' || hudVisibility === 'HIDDEN' ? 'pointer-events-none max-h-0 overflow-hidden border-transparent p-0 opacity-0' : hudVisibility === 'REDUCED' ? 'opacity-65' : 'opacity-100'}`}><div className="mb-3"><p className="font-comic text-lg text-[#f5ecd8]">Utos ng Mananabong</p><p className="text-xs text-amber-100/60">Piliin ang diskarte sa tamang sandali.</p>{display.cooldown > 0 && <p className="mt-2 rounded-full bg-black/30 px-3 py-1 text-center text-xs text-amber-200">Utos ulit sa {(display.cooldown / 60).toFixed(1)}s</p>}</div><div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1" aria-label="Tactical commands">{TACTICAL_MODES.map(mode => { const card = COMMAND_CARDS[mode] ?? COMMAND_CARDS.balanced, active = display.fighters[0]?.tactic === mode; return <button key={mode} aria-pressed={active} disabled={display.phase !== 'active' || display.cooldown > 0} onClick={() => command(mode)} className={`relative min-h-24 rounded-xl border p-2 text-left transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-28 sm:p-3 ${card.tone} ${active ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#1a100b]' : ''}`}><span className="block text-2xl sm:text-3xl">{card.icon}</span><span className="mt-1 block font-comic text-sm text-white sm:text-base">{card.title}</span><span className="block text-[10px] text-white/60 sm:text-xs">{card.subtitle}</span></button>; })}</div></div>}
    </div>
    {error && <p role="alert" className="mt-3 text-center text-sm text-red-300">{error}</p>}
  </section>;
}

function FighterCard({ fighter, side, hits, damage }: { fighter?: FighterDisplay; side: 'left' | 'right'; hits: number; damage: number }) {
  const isLeft = side === 'left';
  const corner = isLeft ? 'from-[#163451] to-[#379ed8]' : 'from-[#55191d] to-[#d64b4b]';
  return <div className={`w-[40%] max-w-64 rounded-lg border border-[#d7a441]/30 bg-[#0d0a07]/65 p-2 shadow-lg backdrop-blur-md sm:p-3 ${isLeft ? 'text-left' : 'text-right'}`}><p className="truncate font-comic text-sm leading-none text-[#f1e4c2] sm:text-lg">{fighter?.name ?? '...'}</p><div className="mt-1 h-2 overflow-hidden rounded-full border border-black/70 bg-[#261814]"><div className={`h-full bg-gradient-to-r ${corner}`} style={{ width: bar(fighter?.hp ?? 0, fighter?.maxHp ?? 1) }} /></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#201c12]"><div className={`h-full ${isLeft ? 'bg-gradient-to-r' : 'ml-auto bg-gradient-to-l'} from-[#75602d] to-[#d4b869]`} style={{ width: bar(fighter?.stamina ?? 0, 100) }} /></div><div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[.12em] text-[#f1e4c2]/60"><span>{hits} hit{hits === 1 ? '' : 's'}</span><span>{damage} dmg</span></div></div>;
}
