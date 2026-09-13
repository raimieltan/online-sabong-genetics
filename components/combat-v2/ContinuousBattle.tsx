'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Chicken } from '@/lib/types';
import { ACTIONS, AWAKENING_DURATION_TICKS, CombatSession, COMBAT_VERSION, TACTICAL_MODES, type TacticalMode, type MatchResult, type AwakeningType } from '@/lib/combat-v2';
import { toCombatV2Snapshot } from '@/lib/combatV2Snapshot';
import type { AnimIntent, AnimState } from '@/lib/animation/types';
import type { FighterAnim } from '@/components/chicken3d/ChickenModel';
import type { ImpactVFXHandle } from '@/components/chicken3d/ImpactVFX';
import { BattleStage3D, ANIM_PX_TO_WORLD, WORLD_HALF_GAP } from '@/components/chicken3d/BattleStage3D';
import type { CameraCue, ScreenAnchor, FighterPosture } from '@/components/chicken3d/BattleStage3D';
import { ComicCommentary, type CommentaryBurst } from '@/components/live/ComicCommentary';
import { AudioEngine } from '@/lib/audioEngine';
import { BattleDirector, type BattleHudVisibility } from '@/lib/animation/battleDirector';
import { FighterHud } from '@/components/combat-v2/hud/FighterHud';
import { RoundHeader } from '@/components/combat-v2/hud/RoundHeader';
import { TellIndicator } from '@/components/combat-v2/hud/TellIndicator';
import { CoachCallout } from '@/components/combat-v2/hud/CoachCallout';
import { CommandWheel, type CommandFeedback } from '@/components/combat-v2/hud/CommandWheel';
import { TellLegend } from '@/components/combat-v2/hud/TellLegend';
import { engagementToUiPhase, describeReadTell, injuriesToStatusIcons, fighterSubtitle, type CombatUiPhase, type TellUiState } from '@/components/combat-v2/hud/uiAdapter';
import type { ReadTellType } from '@/lib/combat-v2';

const pose = (): FighterAnim => ({ offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });
const animation: Record<string, AnimState> = { neutral: 'ready', advancing: 'walk', retreating: 'backstep', circling: 'walk', feinting: 'tell_risk', defending: 'ready', evading: 'backstep', recovering: 'recovery', staggered: 'stagger', down: 'death', finished: 'victory', peck_strike: 'peck_attack', spur_lunge: 'heavy_kick', jump_kick: 'jump_attack', flying_spur: 'flying_kick', wing_counter: 'wing_strike', guard: 'ready', sidestep: 'backstep', feint: 'tell_risk' };
type FighterDisplay = { name: string; hp: number; maxHp: number; stamina: number; tactic: string; engagement: string; intent: string; compliance?: string; awakening?: string; awakeningRemaining?: number; awakeningAttempted: boolean };
type MatchStats = { hits: [number, number]; damage: [number, number]; lastDamage: { id: number; amount: number; side: 'left' | 'right' } | null };
const COMMAND_CARDS: Record<TacticalMode, { title: string; subtitle: string; icon: string; hotkey: string }> = {
  pressure: { title: 'Sugod', subtitle: 'Apply pressure', icon: '↑', hotkey: '1' },
  balanced: { title: 'Timbang', subtitle: 'Read the opening', icon: '◷', hotkey: '2' },
  defensive: { title: 'Bantay', subtitle: 'Guard and counter', icon: '⛨', hotkey: '3' },
  counter: { title: 'Abang', subtitle: 'Punish the miss', icon: '↶', hotkey: '4' },
  recover: { title: 'Hinga', subtitle: 'Regain stamina', icon: '⬡', hotkey: '5' },
  all_in: { title: 'Todo', subtitle: 'Risk everything', icon: '⚡', hotkey: '6' },
};
const COMMAND_ORDER: TacticalMode[] = ['pressure', 'balanced', 'defensive', 'counter', 'recover', 'all_in'];
/** Minimum strength before a forming tell is worth showing in the HUD at all
 * (docs/combat/tell-revamped.md §22 — below this it's still "invisible" or
 * only physically hinted, not yet a real read). */
const TELL_HUD_THRESHOLD = 0.22;
/** Subtle procedural lean/posture nudge per tell type, scaled by strength —
 * the physical cue the spec wants to read *before* the HUD label does
 * (§23). Purely additive on top of the existing combat animation root
 * transform; `rot`/`scaleY`/extra `yaw` are otherwise unused by the idle/
 * circling states. */
const TELL_LEAN: Partial<Record<ReadTellType, { rot?: number; scaleY?: number; yaw?: number }>> = {
  weight_forward: { rot: .05 },
  closing_distance: { rot: .035 },
  overextended: { rot: .08, scaleY: -.02 },
  rear_leg_loaded: { scaleY: -.03, rot: -.02 },
  head_low: { rot: .06 },
  guard_open: { scaleY: -.015 },
  recovering: { rot: -.03, scaleY: .015 },
  resetting: { rot: -.02 },
  angle_shift: { yaw: .12 },
  side_on_stance: { yaw: .18 },
};
const AWAKENING_LABELS: Record<string, string> = { unbreakable: 'Unbreakable', berserker: 'Berserker', 'flow-state': 'Flow State', 'second-wind': 'Second Wind', apex: 'Apex' };

/** Production presentation for the deterministic V2 combat session. */
export default function ContinuousBattle({ chickenA, chickenB, matchSeed = 81726354, autoStart = false, showControls = true, onComplete, audioEnabled = true, onToggleAudio }: { chickenA: Chicken; chickenB: Chicken; matchSeed?: number; autoStart?: boolean; showControls?: boolean; onComplete?: (result: MatchResult) => void; audioEnabled?: boolean; onToggleAudio?: () => void }) {
  const [display, setDisplay] = useState({ tick: 0, phase: 'paused', result: '', fighters: [] as FighterDisplay[] });
  const [stats, setStats] = useState<MatchStats>({ hits: [0, 0], damage: [0, 0], lastDamage: null });
  const [bursts, setBursts] = useState<CommentaryBurst[]>([]);
  const [caption, setCaption] = useState<string | null>('Handa na ang sabungan — sino ang mananaig?');
  const [hudVisibility, setHudVisibility] = useState<BattleHudVisibility>('FULL');
  const [error, setError] = useState('');
  const [uiPhase, setUiPhase] = useState<CombatUiPhase>('circle');
  const [tell, setTell] = useState<TellUiState | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<CommandFeedback | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<CombatSession | null>(null);
  const completedRef = useRef(false);
  const burstId = useRef(0);
  const audioRef = useRef<AudioEngine | null>(null);
  const animA = useRef(pose()), animB = useRef(pose());
  const awakeningA = useRef<AwakeningType | null>(null), awakeningB = useRef<AwakeningType | null>(null);
  const intentA = useRef<AnimIntent | null>(null), intentB = useRef<AnimIntent | null>(null);
  // World->screen head projection for each fighter, refreshed every render
  // frame inside the Canvas — lets the tell HUD track the actual on-screen
  // fighter instead of a fixed corner. Seeded near the static side lanes so
  // the first HUD tick (before the tracker's first frame lands) isn't at 0,0.
  const screenAnchorA = useRef<ScreenAnchor>({ xPct: 14, yPct: 38, visible: true });
  const screenAnchorB = useRef<ScreenAnchor>({ xPct: 86, yPct: 38, visible: true });
  const postureA = useRef<FighterPosture | null>(null), postureB = useRef<FighterPosture | null>(null);
  const vfx = useRef<ImpactVFXHandle | null>(null);
  const directorRef = useRef(new BattleDirector());
  const cameraCue = useRef<CameraCue | null>(null);
  const hitStopScale = useRef(1);
  const hitStopUntil = useRef(0);
  const hudVisibilityRef = useRef<BattleHudVisibility>('FULL');
  const collisionDebugFighters = useMemo(() => [toCombatV2Snapshot(chickenA, 'local-player', chickenB.id), toCombatV2Snapshot(chickenB, 'local-ai', chickenA.id)] as [ReturnType<typeof toCombatV2Snapshot>, ReturnType<typeof toCombatV2Snapshot>], [chickenA, chickenB]);

  useEffect(() => {
    const audio = new AudioEngine(audioEnabled); audioRef.current = audio; audio.playMusic();
    return () => audio.stopMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { audioRef.current?.setEnabled(audioEnabled); }, [audioEnabled]);

  useEffect(() => {
    const seed = matchSeed;
    const session = new CombatSession({ id: `arena-${seed}`, version: COMBAT_VERSION, seed, fighterA: toCombatV2Snapshot(chickenA, 'local-player', chickenB.id), fighterB: toCombatV2Snapshot(chickenB, 'local-ai', chickenA.id), arena: { radius: 8 }, maxTicks: 60 * 120 });
    if (!autoStart) session.stop();
    sessionRef.current = session; completedRef.current = false;
    const resetFrame = requestAnimationFrame(() => {
      setStats({ hits: [0, 0], damage: [0, 0], lastDamage: null });
      setBursts([]);
      setHudVisibility('FULL');
      setCaption(autoStart ? `Sugod! ${chickenA.name} laban kay ${chickenB.name}!` : 'Piliin ang taktika at simulan ang laban.');
    });
    const effects = vfx.current; const damageTick = [-100, -100]; const dustTick = [-100, -100];
    directorRef.current.reset();
    hudVisibilityRef.current = 'FULL';
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
        if (event.type === 'COMMAND_RESPONSE' && fighterIndex === 0) {
          const [mode, response] = (event.detail ?? '').split(':');
          const feeling = response === 'commit' ? 'LOCKED IN' : response === 'obey' ? 'DISCIPLINED' : response === 'partial' ? 'HESITATING' : response === 'resist' ? 'RESTLESS' : 'INSTINCT TAKES OVER';
          setCaption(`${feeling} — ${chickenA.name} ${response === 'ignore' ? 'breaks from' : 'works with'} the ${mode.toUpperCase()} plan.`);
          const acknowledged = response === 'commit' || response === 'obey' || response === 'partial';
          if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
          setCommandFeedback({ mode: mode as TacticalMode, status: acknowledged ? 'acknowledged' : 'ignored' });
          feedbackTimer.current = window.setTimeout(() => setCommandFeedback(null), 1400);
        }
        if (event.type === 'SIGNATURE_TECHNIQUE') { burst((event.detail ?? 'SIGNATURE').replaceAll('-', ' ').toUpperCase(), fighterIndex === 0 ? 'left' : 'right', 'crit'); setCaption('A familiar career pattern appears in the exchange.'); }
        if (event.type === 'AWAKENING_STARTED') { const point = session.state.fighters[fighterIndex]?.position; if (point) { const origin = new THREE.Vector3(point.x, -2.92, point.z); vfx.current?.spawn('landing_dust', origin); vfx.current?.spawn('heavy_impact', origin); } audioRef.current?.playCrit(); burst('AWAKENING', fighterIndex === 0 ? 'left' : 'right', 'ko'); setCaption(`${event.detail?.replaceAll('-', ' ').toUpperCase()} — the fighter draws on everything its career taught it.`); }
        if (event.type === 'AWAKENING_ENDED') { burst('AWAKENING ENDED', fighterIndex === 0 ? 'left' : 'right', 'crit'); setCaption(`${event.detail?.replaceAll('-', ' ').toUpperCase()} fades after 30 seconds.`); }
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
        const primaryTell = fighter.readTells[0]; const lean = primaryTell && TELL_LEAN[primaryTell.type];
        const posture: FighterPosture = { mode: fighter.tacticalMode, hesitating: primaryTell?.type === 'hesitating', strength: primaryTell?.strength ?? 0, tellType: primaryTell?.type ?? null };
        if (index === 0) postureA.current = posture; else postureB.current = posture;
        current.rot = (lean?.rot ?? 0) * (primaryTell?.strength ?? 0);
        current.scaleY = 1 + (lean?.scaleY ?? 0) * (primaryTell?.strength ?? 0);
        current.scaleX = 1;
        if (lean?.yaw) current.yaw += lean.yaw * (primaryTell?.strength ?? 0) * (index === 0 ? 1 : -1);
        const runtime = fighter.currentAction, action = runtime && ACTIONS[runtime.id]; let progress = Math.min(1, (state.tick - fighter.stateEnteredTick) / 20);
        if (runtime && action) { const age = state.tick - runtime.startedTick; progress = runtime.phase === 'startup' ? age / action.startupTicks * .52 : runtime.phase === 'active' ? .52 + (age - action.startupTicks) / action.activeTicks * .2 : .72 + (age - action.startupTicks - action.activeTicks) / action.recoveryTicks * .28; }
        const aerial = fighter.aerial && (fighter.aerial.launchedTick < 0 || !fighter.grounded || fighter.aerial.phase === 'LAND') && fighter.groundedTicks <= 10 ? fighter.aerial : undefined;
        const recentMirageEvade = fighter.lastMirageEvadeTick !== undefined && state.tick - fighter.lastMirageEvadeTick <= 2
          ? fighter.lastMirageEvadeTick * 10 + 2
          : undefined;
        const flowStep = fighter.awakening?.type === 'flow-state' && (fighter.state === 'evading' || runtime?.id === 'sidestep')
          ? (runtime?.startedTick ?? fighter.stateEnteredTick) * 10 + 1
          : undefined;
        const intent: AnimIntent = { state: animation[(aerial?.phase === 'LAND' ? undefined : runtime)?.id ?? fighter.state] ?? 'ready', startedAt: (runtime?.startedTick ?? fighter.stateEnteredTick) * 1000 / 60, speed: 1, facing: index === 0 ? 'right' : 'left', simulationProgress: progress, tacticalMode: fighter.tacticalMode, fatal: fighter.state === 'down', afterimageKey: recentMirageEvade ?? flowStep };
        if (aerial && state.phase !== 'finished') intent.aerial = { ...aerial, tick: state.tick + alpha, actionId: runtime?.id, strikeProgress: runtime?.phase === 'active' && action ? (state.tick + alpha - runtime.startedTick - action.startupTicks) / action.activeTicks : undefined, phaseProgress: (state.tick + alpha - aerial.phaseTick) / (aerial.phase === 'PRELOAD' ? action?.aerial?.takeoffTick ?? 6 : aerial.phase === 'STRIKE_ACTIVE' ? action?.activeTicks ?? 6 : 8) };
        if (index === 0) intentA.current = intent; else intentB.current = intent;
        if (index === 0) awakeningA.current = fighter.awakening?.type ?? null; else awakeningB.current = fighter.awakening?.type ?? null;
        // Bounded, pooled dirt response: landings and fast grounded movement
        // only. This is visual evidence of force, never a movement system.
        const planarSpeed = Math.hypot(fighter.velocity.x, fighter.velocity.z);
        if (fighter.grounded && (fighter.justLanded || planarSpeed > 1.45) && state.tick - dustTick[index] > 16) {
          dustTick[index] = state.tick;
          vfx.current?.spawn(fighter.justLanded ? 'landing_dust' : 'dust', new THREE.Vector3(fighter.position.x, -2.97, fighter.position.z));
        }
      });
      if (now - lastHud >= 80) {
        lastHud = now;
        setDisplay({ tick: state.tick, phase: state.phase, result: state.result ? state.result.finishReason.replaceAll('_', ' ') : '', fighters: state.fighters.map(fighter => ({ name: fighter.snapshot.name, hp: fighter.health, maxHp: fighter.snapshot.maxHealth, stamina: fighter.stamina, tactic: fighter.tacticalMode, engagement: fighter.engagement.phase, intent: fighter.currentIntent, compliance: fighter.coaching?.compliance, awakening: fighter.awakening?.type, awakeningRemaining: fighter.awakening ? Math.max(0, Math.ceil((AWAKENING_DURATION_TICKS - (state.tick - fighter.awakening.startedTick)) / 60)) : undefined, awakeningAttempted: fighter.awakeningAttempted })) });
        setUiPhase(engagementToUiPhase(state.fighters[0]?.engagement.phase ?? 'stalking'));
        let nextTell: TellUiState | null = null;
        state.fighters.forEach((fighter, index) => {
          const [primary, secondaryTell] = fighter.readTells;
          if (!primary || primary.strength < TELL_HUD_THRESHOLD) return;
          const meta = describeReadTell(primary.type, primary.strength);
          const secondary = secondaryTell && secondaryTell.strength >= TELL_HUD_THRESHOLD
            ? { label: describeReadTell(secondaryTell.type, secondaryTell.strength).label, icon: describeReadTell(secondaryTell.type, secondaryTell.strength).icon }
            : undefined;
          const anchorRef = index === 0 ? screenAnchorA : screenAnchorB;
          nextTell = { id: primary.startedTick * 10 + index, fighterSide: index === 0 ? 'left' : 'right', strength: primary.strength, secondary, anchor: { ...anchorRef.current }, ...meta };
        });
        // Re-set on every HUD tick (not just when the tell id changes) so the
        // strength-driven ramp (opacity/scale/glow) animates smoothly instead
        // of only updating once per tell.
        setTell(nextTell);
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(resetFrame); cancelAnimationFrame(frameId); unsubscribe(); session.stop(); sessionRef.current = null; effects?.clear(); if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current); };
  }, [chickenA, chickenB, matchSeed, autoStart, onComplete]);

  function command(mode: TacticalMode) {
    try {
      sessionRef.current?.issueCommand(chickenA.id, mode);
      setCaption(mode === 'pressure' || mode === 'all_in' ? 'Sugod! I-pressure natin siya!' : mode === 'defensive' || mode === 'counter' ? 'Bantay muna — hintayin ang butas!' : mode === 'recover' ? 'Hinga muna — balik ang stamina!' : 'Timbang lang, coach. Basahin ang galaw niya.');
      setError('');
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
      setCommandFeedback({ mode, status: 'queued' });
    }
    catch (reason) {
      // docs/combat/tell-revamped.md §6 — a locked-out click (opponent already
      // committed) is expected, frequent input, not a failure. Keep it a
      // subtle per-card flash rather than the visible error banner.
      if (reason instanceof Error && reason.message === 'COMMAND_LOCKED') {
        if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
        setCommandFeedback({ mode, status: 'ignored' });
        feedbackTimer.current = window.setTimeout(() => setCommandFeedback(null), 900);
        return;
      }
      setError(reason instanceof Error ? reason.message : 'Hindi naipasok ang utos.');
    }
  }

  function awaken(type: AwakeningType) {
    try {
      sessionRef.current?.triggerAwakening(chickenA.id, type);
      setError('');
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Hindi ma-trigger ang awakening.'); }
  }

  const [left, right] = display.fighters;
  const unlockedAwakenings = collisionDebugFighters[0].evolution.awakenings;
  const canAwaken = display.phase === 'active' && !left?.awakening && !left?.awakeningAttempted && unlockedAwakenings.length > 0;
  // docs/combat/tell-revamped.md §5-6: coaching is only accepted while the
  // fighter is still reading (`stalking`) — once committed the exchange
  // locks until the next window, rather than gating re-issue on a cooldown.
  const decisionWindow = left?.engagement === 'stalking';
  const commandLocked = left?.engagement === 'committing' || left?.engagement === 'clashing';
  const commandStatus = display.phase !== 'active' ? 'Fight complete' : commandLocked ? 'Command locked' : decisionWindow ? 'Decision window open' : 'Watching the clash — choose for the next read';
  const dimForClash = hudVisibility === 'CINEMATIC' || hudVisibility === 'HIDDEN';
  const cards = COMMAND_ORDER.map(mode => ({ mode, ...COMMAND_CARDS[mode] }));

  return (
    <section className="w-full max-w-none px-3 pb-3 pt-3 sm:px-4">
      <div
        className="
        relative
        h-[calc(100dvh-150px)]
        min-h-[600px]
        w-full
        overflow-hidden
        rounded-2xl
        border-[3px]
        border-[#160d08]
        bg-[#090706]
        shadow-[0_0_0_2px_rgba(212,162,78,.45),0_18px_35px_rgba(0,0,0,.6)]
      "
      >
        {/* =========================
          3D BATTLE ARENA
      ========================== */}
        <div className="absolute inset-0">
          <BattleStage3D
            simulationDriven
            fighterA={chickenA}
            fighterB={chickenB}
            animA={animA}
            animB={animB}
            intentA={intentA}
            intentB={intentB}
            awakeningA={awakeningA}
            awakeningB={awakeningB}
            screenAnchorA={screenAnchorA}
            screenAnchorB={screenAnchorB}
            postureA={postureA}
            postureB={postureB}
            cameraCue={cameraCue}
            hitStopScaleRef={hitStopScale}
            vfxRef={vfx}
            collisionDebugFighters={collisionDebugFighters}
          />
        </div>

        {/* =========================
          CINEMATIC GRADING
      ========================== */}
        <div
          className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(9,6,4,.16)_70%,rgba(5,3,2,.56)_100%)]
        "
        />

        <div
          className="
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-b
          from-black/45
          via-transparent
          to-transparent
        "
        />

        <div
          className="
          pointer-events-none
          absolute
          inset-0
          bg-gradient-to-t
          from-black/55
          via-transparent
          to-transparent
        "
        />

        {/* =========================
          TOP HUD
      ========================== */}
        <div
          className={`
          pointer-events-none
          absolute
          inset-x-3
          top-3
          z-20
          flex
          items-start
          justify-between
          gap-3
          transition-opacity
          duration-200

          sm:inset-x-5
          sm:top-4

          ${hudVisibility === 'HIDDEN'
              ? 'opacity-0'
              : hudVisibility === 'CINEMATIC'
                ? 'opacity-45'
                : 'opacity-100'
            }
        `}
        >
          <FighterHud
            chicken={chickenA}
            subtitle={fighterSubtitle(chickenA)}
            hp={left?.hp ?? 0}
            maxHp={left?.maxHp ?? 1}
            stamina={left?.stamina ?? 0}
            maxStamina={100}
            statuses={injuriesToStatusIcons(chickenA.injuries)}
            side="left"
            awakening={left?.awakening}
            awakeningRemaining={left?.awakeningRemaining}
          />

          <RoundHeader
            elapsedSeconds={display.tick / 60}
            phase={uiPhase.toUpperCase()}
            statusLabel={
              display.phase === 'active'
                ? '● Live match'
                : display.phase === 'finished'
                  ? 'Final bell'
                  : 'Ready'
            }
          />

          <FighterHud
            chicken={chickenB}
            subtitle={fighterSubtitle(chickenB)}
            hp={right?.hp ?? 0}
            maxHp={right?.maxHp ?? 1}
            stamina={right?.stamina ?? 0}
            maxStamina={100}
            statuses={injuriesToStatusIcons(chickenB.injuries)}
            side="right"
            awakening={right?.awakening}
            awakeningRemaining={right?.awakeningRemaining}
          />
        </div>

        {/* =========================
          AUDIO CONTROL
      ========================== */}
        {onToggleAudio && (
          <button
            type="button"
            onClick={onToggleAudio}
            aria-label={
              audioEnabled ? 'Mute arena audio' : 'Unmute arena audio'
            }
            className={`
            pointer-events-auto
            absolute
            right-3
            top-[100px]
            z-30

            rounded-full
            border
            border-[rgba(190,160,100,0.3)]
            bg-black/40

            px-2.5
            py-1.5
            text-sm

            backdrop-blur-sm

            transition-all
            duration-200

            hover:bg-black/60

            sm:right-5
            sm:top-[110px]

            ${dimForClash
                ? 'opacity-30'
                : 'opacity-100'
              }
          `}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        )}

        {/* =========================
          COMBAT OVERLAYS
      ========================== */}
        <TellIndicator tell={tell} dimmed={dimForClash} />

        <CoachCallout
          chicken={chickenA}
          caption={caption}
          dimmed={dimForClash}
        />

        <TellLegend dimmed={dimForClash} />

        <ComicCommentary
          bursts={bursts}
          caption={null}
        />

        {/* =========================
          MATCH RESULT
      ========================== */}
        {display.result && (
          <div
            className="
            pointer-events-none
            absolute
            inset-x-0
            top-[38%]
            z-40
            flex
            justify-center
          "
          >
            <span
              className="
              rounded-xl
              border-2
              border-black
              bg-[#f5ecd8]
              px-5
              py-2
              font-comic
              text-xl
              text-black
              shadow-[4px_4px_0_rgba(0,0,0,.65)]
            "
            >
              {display.result.toUpperCase()}
            </span>
          </div>
        )}

        {/* =========================
          COMMAND AREA
      ========================== */}
        {showControls && (
          <div
            className={`
            pointer-events-auto
            absolute
            inset-x-0
            bottom-2
            z-30

            flex
            flex-col
            items-center

            transition-opacity
            duration-200

            sm:bottom-4

            ${dimForClash
                ? 'opacity-30'
                : hudVisibility === 'REDUCED'
                  ? 'opacity-70'
                  : 'opacity-100'
              }
          `}
          >
            {/* Command / phase status */}
            <p
              className={`
              mb-1
              rounded-full
              border
              px-3
              py-0.5

              text-center
              text-[9px]
              font-semibold
              uppercase
              tracking-[.12em]

              ${decisionWindow && !commandLocked
                  ? `
                    border-emerald-300/30
                    bg-emerald-950/40
                    text-emerald-200
                  `
                  : `
                    border-amber-300/20
                    bg-black/40
                    text-amber-200
                  `
                }
            `}
            >
              {commandStatus}
            </p>

            {/* Compliance */}
            {left?.compliance && (
              <p
                className="
                mb-1
                text-center
                text-[9px]
                uppercase
                tracking-[.16em]
                text-amber-100/70
              "
              >
                {left.compliance}
                {' · '}
                {left.intent.replaceAll('_', ' ')}
              </p>
            )}

            {/* Manual awakening trigger */}
            {canAwaken && (
              <div className="mb-2 flex justify-center gap-2">
                {unlockedAwakenings.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => awaken(type)}
                    className="
                      rounded-full
                      border
                      border-[#f1cf77]/60
                      bg-black/40
                      px-3
                      py-1
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[.14em]
                      text-[#f1cf77]
                      backdrop-blur-sm
                      transition-colors
                      hover:bg-[#f1cf77]/15
                    "
                  >
                    Awaken · {AWAKENING_LABELS[type] ?? type}
                  </button>
                ))}
              </div>
            )}

            {/* Tactical commands */}
            <CommandWheel
              chicken={chickenA}
              cards={cards}
              activeMode={
                display.fighters[0]?.tactic as
                | TacticalMode
                | undefined
              }
              disabledAll={display.phase !== 'active'}
              locked={commandLocked}
              decisionWindow={decisionWindow}
              feedback={commandFeedback}
              onSelect={command}
            />
          </div>
        )}
      </div>

      {/* =========================
        ERROR
    ========================== */}
      {error && (
        <p
          role="alert"
          className="mt-3 text-center text-sm text-red-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}
