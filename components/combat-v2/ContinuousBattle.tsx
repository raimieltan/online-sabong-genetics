'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import type { Chicken } from '@/lib/types';
import { ACTIONS, AWAKENING_DURATION_TICKS, CombatSession, COMBAT_VERSION, type TacticalMode, type MatchResult, type AwakeningType } from '@/lib/combat-v2';
import { toCombatV2Snapshot } from '@/lib/combatV2Snapshot';
import type { AnimIntent, AnimState } from '@/lib/animation/types';
import type { FighterAnim } from '@/components/chicken3d/ChickenModel';
import type { ImpactVFXHandle } from '@/components/chicken3d/ImpactVFX';
import { BattleStage3D, ANIM_PX_TO_WORLD, WORLD_HALF_GAP } from '@/components/chicken3d/BattleStage3D';
import type { CameraCue, ScreenAnchor, FighterPosture } from '@/components/chicken3d/BattleStage3D';
import { ComicCommentary, type CommentaryBurst } from '@/components/live/ComicCommentary';
import { AudioEngine } from '@/lib/audioEngine';
import { BattleDirector, type BattleHudVisibility } from '@/lib/animation/battleDirector';
import { tellPostureCue } from '@/lib/animation/tellPosture';
import { FighterHud } from '@/components/combat-v2/hud/FighterHud';
import { RoundHeader } from '@/components/combat-v2/hud/RoundHeader';
import { TellIndicator } from '@/components/combat-v2/hud/TellIndicator';
import { CoachCallout } from '@/components/combat-v2/hud/CoachCallout';
import { CommandWheel, type CommandFeedback } from '@/components/combat-v2/hud/CommandWheel';
import { TellLegend } from '@/components/combat-v2/hud/TellLegend';
import { DamageCounters, type DamageCounterUi } from '@/components/combat-v2/hud/DamageCounters';
import { ExchangeRecap } from '@/components/combat-v2/hud/ExchangeRecap';
import { createExchangeRecapQueue, dismissActiveExchangeRecap, enqueueExchangeRecaps, EXCHANGE_RECAP_DURATION_MS } from '@/components/combat-v2/hud/recapQueue';
import { engagementToUiPhase, describeReadTell, injuriesToStatusIcons, fighterSubtitle, type CombatUiPhase, type TellUiState } from '@/components/combat-v2/hud/uiAdapter';
import type { ReadTellType } from '@/lib/combat-v2';
import type { AuthoritativeCombatResult, CoachingCommand, PublicFighterState } from '@/lib/combat-v2/canonical';

const pose = (): FighterAnim => ({ offsetX: 0, offsetY: 0, offsetZ: 0, rot: 0, yaw: 0, roll: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });
const animation: Record<string, AnimState> = { neutral: 'ready', advancing: 'walk', retreating: 'backstep', circling: 'walk', feinting: 'tell_risk', defending: 'ready', evading: 'backstep', recovering: 'recovery', staggered: 'stagger', down: 'death', finished: 'victory', peck_strike: 'peck_attack', spur_lunge: 'heavy_kick', jump_kick: 'jump_attack', flying_spur: 'flying_kick', wing_counter: 'wing_strike', guard: 'ready', sidestep: 'backstep', feint: 'tell_risk' };
type FighterDisplay = { name: string; hp: number; maxHp: number; stamina: number; tactic: string; engagement: string; intent: string; compliance?: string; awakening?: string; awakeningRemaining?: number; awakeningAttempted: boolean };
type MatchStats = { hits: [number, number]; damage: [number, number]; lastDamage: { id: number; amount: number; side: 'left' | 'right' } | null };
type PlayerTacticalMode = Exclude<TacticalMode, 'balanced'>;

const COMMAND_CARDS: Record<PlayerTacticalMode, { title: string; subtitle: string; icon: string; hotkey: string }> = {
  pressure: { title: 'Press', subtitle: 'Close distance', icon: '↑', hotkey: '1' },
  defensive: { title: 'Wait', subtitle: 'Hold position', icon: '◷', hotkey: '2' },
  counter: { title: 'Counter', subtitle: 'Read & react', icon: '↶', hotkey: '3' },
  recover: { title: 'Recover', subtitle: 'Conserve stamina', icon: '⬡', hotkey: '4' },
};
const COMMAND_ORDER: PlayerTacticalMode[] = ['pressure', 'defensive', 'counter', 'recover'];
/** Minimum strength before a forming tell is worth showing in the HUD at all
 * (docs/combat/tell-revamped.md §22 — below this it's still "invisible" or
 * only physically hinted, not yet a real read). */
const TELL_HUD_THRESHOLD = 0.22;
const AWAKENING_LABELS: Record<string, string> = { unbreakable: 'Unbreakable', berserker: 'Berserker', 'flow-state': 'Flow State', 'second-wind': 'Second Wind', apex: 'Apex' };
// Each /sync call is a DB read + a transactional write on the server (engine
// checkpoint restore/advance/persist), not a cheap poll — the interval must
// stay conservative. Smoothness instead comes from client-side velocity
// extrapolation (see the animate loop) filling the gaps between snapshots.
const AUTHORITATIVE_SYNC_INTERVAL_MS = 150;
const MAX_EVENT_REPLAY_WINDOW_MS = 250;

function coachCaption(phase: string | null, tellType?: string, command?: string): string {
  if (tellType) {
    const readable = describeReadTell(tellType as ReadTellType, 1);
    const observation = readable.interpretation || 'Watch the movement';
    return `${readable.label} — ${observation}.`;
  }
  if (phase === 'READ') return `Keep your eyes on him — Change ${command ?? 'the instruction'} before he commits.`;
  if (phase === 'CLASH') return 'Stay with it — Let the exchange resolve.';
  if (phase === 'DISENGAGE') return 'He is resetting — Read the next opening.';
  return 'Watch the distance — Keep the corner calm.';
}

/** Production presentation for the deterministic V2 combat session. */
type AuthoritativeEvent = { id: string; cursor: number; logicalTick: number; exchangeIndex: number; type: string; payload: Record<string, unknown> };
type AuthoritativeView = {
  sessionId: string; status: string; revision: number; phase: string | null; exchangeIndex: number;
  logicalTick: number; phaseDeadlineTick?: number | null; phaseDeadlineAt?: string | null; activeCommand: CoachingCommand; latestEventCursor: number; fighters?: [Chicken, Chicken];
  projection: PublicFighterState[]; events: AuthoritativeEvent[];
  result: AuthoritativeCombatResult | null; settlement: Record<string, unknown> | null;
  allowedActions: { command: boolean; awakening: boolean; sync: boolean };
};

type ContinuousBattleProps = {
  chickenA?: Chicken; chickenB?: Chicken; matchSeed?: number; sessionId?: string; initialView?: AuthoritativeView;
  autoStart?: boolean; showControls?: boolean; onComplete?: (result: MatchResult | AuthoritativeCombatResult, settlement?: Record<string, unknown> | null) => void;
  audioEnabled?: boolean; onToggleAudio?: () => void;
};

// The HUD receives network state at up to 4 Hz, while the expensive Three.js tree
// only consumes stable fighter assets and mutable animation refs. Memoizing
// this boundary prevents every sync response from reconciling the full arena.
const AuthoritativeBattleStage = memo(function AuthoritativeBattleStage({
  chickenA, chickenB, animA, animB, intentA, intentB, awakeningA, awakeningB, screenAnchorA, screenAnchorB, postureA, postureB, vfx, cameraCue, hitStopScale,
}: {
  chickenA: Chicken; chickenB: Chicken;
  animA: RefObject<FighterAnim>; animB: RefObject<FighterAnim>;
  intentA: RefObject<AnimIntent | null>; intentB: RefObject<AnimIntent | null>;
  awakeningA: RefObject<AwakeningType | null>; awakeningB: RefObject<AwakeningType | null>;
  screenAnchorA: RefObject<ScreenAnchor>; screenAnchorB: RefObject<ScreenAnchor>;
  postureA: RefObject<FighterPosture | null>; postureB: RefObject<FighterPosture | null>;
  vfx: RefObject<ImpactVFXHandle | null>;
  cameraCue: RefObject<CameraCue | null>; hitStopScale: RefObject<number>;
}) {
  return <BattleStage3D simulationDriven fighterA={chickenA} fighterB={chickenB} animA={animA} animB={animB} intentA={intentA} intentB={intentB} awakeningA={awakeningA} awakeningB={awakeningB} screenAnchorA={screenAnchorA} screenAnchorB={screenAnchorB} postureA={postureA} postureB={postureB} vfxRef={vfx} cameraCue={cameraCue} hitStopScaleRef={hitStopScale} />;
});

/** Production uses the durable authoritative player. The local engine remains
 * available only for explicitly supplied sandbox chickens and is labelled as
 * non-authoritative below. */
export default function ContinuousBattle(props: ContinuousBattleProps) {
  if (props.sessionId) return <AuthoritativeContinuousBattle key={props.sessionId} {...props} sessionId={props.sessionId} />;
  if (!props.chickenA || !props.chickenB) throw new Error('Authoritative combat requires a sessionId');
  return <SandboxContinuousBattle {...props} chickenA={props.chickenA} chickenB={props.chickenB} />;
}

function AuthoritativeContinuousBattle({ sessionId, initialView, onComplete, audioEnabled = true, onToggleAudio }: ContinuousBattleProps & { sessionId: string }) {
  const [view, setView] = useState<AuthoritativeView | null>(initialView ?? null);
  const [sceneFighters, setSceneFighters] = useState<[Chicken, Chicken] | null>(() => initialView?.fighters ?? null);
  const [error, setError] = useState('');
  const [damageCounters, setDamageCounters] = useState<DamageCounterUi[]>([]);
  const [commandFeedback, setCommandFeedback] = useState<CommandFeedback | null>(null);
  const [authoritativeTell, setAuthoritativeTell] = useState<TellUiState | null>(null);
  const [recaps, setRecaps] = useState(createExchangeRecapQueue);
  const [awakeningPending, setAwakeningPending] = useState<AwakeningType | null>(null);
  const [bursts, setBursts] = useState<CommentaryBurst[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tellLabels, setTellLabels] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedEffects, setReducedEffects] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [audioOverride, setAudioOverride] = useState<boolean | null>(null);
  const localAudio = audioOverride ?? audioEnabled;
  const reducedEffectsRef = useRef(reducedEffects);
  const cursor = useRef(initialView?.latestEventCursor ?? 0);
  const revision = useRef(initialView?.revision ?? 0);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const animA = useRef(pose()), animB = useRef(pose());
  const targetA = useRef(pose()), targetB = useRef(pose());
  const velocityA = useRef({ x: 0, y: 0, z: 0 }), velocityB = useRef({ x: 0, y: 0, z: 0 });
  const lastSyncAt = useRef(performance.now());
  const intentA = useRef<AnimIntent | null>(null), intentB = useRef<AnimIntent | null>(null);
  const awakeningA = useRef<AwakeningType | null>(initialView?.projection[0]?.awakening?.type ?? null);
  const awakeningB = useRef<AwakeningType | null>(initialView?.projection[1]?.awakening?.type ?? null);
  const actionA = useRef<string | null>(null), actionB = useRef<string | null>(null);
  const screenAnchorA = useRef<ScreenAnchor>({ xPct: 14, yPct: 38, visible: true });
  const screenAnchorB = useRef<ScreenAnchor>({ xPct: 86, yPct: 38, visible: true });
  const postureA = useRef<FighterPosture | null>(null);
  const postureB = useRef<FighterPosture | null>(null);
  const vfx = useRef<ImpactVFXHandle | null>(null);
  const audio = useRef<AudioEngine | null>(null);
  const cameraCue = useRef<CameraCue | null>(null);
  const hitStopScale = useRef(1);
  const hitStopUntil = useRef(0);
  const burstId = useRef(1);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { reducedEffectsRef.current = reducedEffects; }, [reducedEffects]);
  useEffect(() => {
    if (!recaps.active) return;
    const timer = window.setTimeout(() => setRecaps(dismissActiveExchangeRecap), EXCHANGE_RECAP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [recaps.active]);
  useEffect(() => {
    const engine = new AudioEngine(localAudio); audio.current = engine; engine.playMusic();
    return () => { engine.stopMusic(); audio.current = null; };
  }, [localAudio]);

  // Network snapshots are authoritative targets, not animation frames. The
  // render loop eases mutable transforms toward those targets so a DB/network
  // round trip can never turn into visible movement stutter.
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      hitStopScale.current = now < hitStopUntil.current ? 0 : 1;
      const blend = 1 - Math.exp(-8 * dt);
      // Dead-reckon the authoritative target between /sync responses using the
      // fighter's last known velocity, so network latency/jitter shows up as a
      // (self-correcting) drift instead of the fighter freezing until the next
      // snapshot lands. Extrapolation is capped so a stalled connection settles
      // instead of running the fighter away from its true position.
      const sinceSync = now - lastSyncAt.current;
      const extrapolate = sinceSync < MAX_EVENT_REPLAY_WINDOW_MS * 2;
      for (const [current, target, velocity] of [[animA.current, targetA.current, velocityA.current], [animB.current, targetB.current, velocityB.current]] as const) {
        if (extrapolate) {
          target.offsetX += velocity.x * dt;
          target.offsetY += velocity.y * dt;
          target.offsetZ += velocity.z * dt;
        }
        current.offsetX += (target.offsetX - current.offsetX) * blend;
        current.offsetY += (target.offsetY - current.offsetY) * blend;
        current.offsetZ += (target.offsetZ - current.offsetZ) * blend;
        current.rot += (target.rot - current.rot) * blend;
        current.scaleX += (target.scaleX - current.scaleX) * blend;
        current.scaleY += (target.scaleY - current.scaleY) * blend;
        const yawDelta = Math.atan2(Math.sin(target.yaw - current.yaw), Math.cos(target.yaw - current.yaw));
        current.yaw += yawDelta * blend;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    const eventTimers = new Set<number>();
    let eventReplayAvailableAt = performance.now();
    const sync = async () => {
      const syncStartedAt = performance.now();
      try {
        const response = await fetch(`/api/combat/sessions/${sessionId}/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ afterCursor: cursor.current, observedRevision: revision.current }) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? 'Combat sync failed');
        if (stopped) return;
        const next = body as AuthoritativeView;
        revision.current = next.revision;
        let newEvents = next.events.filter(event => event.cursor > cursor.current).sort((a, b) => a.cursor - b.cursor);
        if (newEvents.length && newEvents[0].cursor !== cursor.current + 1) {
          const recovery = await fetch(`/api/combat/sessions/${sessionId}?after=${cursor.current}`);
          if (!recovery.ok) throw new Error('Authoritative event gap could not be recovered');
          Object.assign(next, await recovery.json());
          newEvents = next.events.filter(event => event.cursor > cursor.current).sort((a, b) => a.cursor - b.cursor);
        }
        cursor.current = next.latestEventCursor;
        setRecaps(current => enqueueExchangeRecaps(current, newEvents));
        // A response often contains several ticks of semantic events. Present
        // them in logical-time order instead of collapsing the entire batch
        // into one frame (which made production combat look like a slideshow).
        const presentEvent = (event: AuthoritativeEvent) => {
          const fighterIndex = next.projection.findIndex(fighter => fighter.fighterId === event.payload.fighterId);
          const side = fighterIndex === 0 ? 'left' : 'right';
          const burst = (text: string, kind: CommentaryBurst['kind']) => {
            const id = burstId.current++; setBursts(previous => [...previous.slice(-3), { id, text, side, kind }]);
            window.setTimeout(() => setBursts(previous => previous.filter(item => item.id !== id)), reducedEffectsRef.current ? 350 : 1100);
          };
          if (['HIT', 'COUNTER_TRIGGERED', 'HEALTH_CHANGED', 'STAGGER', 'KNOCKDOWN', 'SESSION_TERMINAL', 'AWAKENING_STARTED', 'ACTION_ENDED'].includes(event.type)) {
            const major = event.type === 'COUNTER_TRIGGERED' || event.type === 'STAGGER' || event.type === 'KNOCKDOWN' || Number(event.payload.value ?? 0) >= 9;
            cameraCue.current = { attacker: fighterIndex === 0 ? 'r1' : 'r2', startTime: performance.now(), isCrit: major, isMiss: event.type === 'ACTION_ENDED' && String(event.payload.engineType) === 'ATTACK_MISSED', stagger: major ? 'heavy' : 'light', seq: event.cursor, cueName: event.type === 'SESSION_TERMINAL' ? 'victory' : major ? 'critical' : 'impact_light', focus: event.type === 'SESSION_TERMINAL' ? 'midpoint' : fighterIndex === 0 ? 'r2' : 'r1' };
            if (major && !reducedEffectsRef.current) hitStopUntil.current = performance.now() + 52;
          }
          if (event.type === 'EVADE' && String(event.payload.detail) === 'MIRAGE_EVADE' && !reducedEffectsRef.current) {
            cameraCue.current = { attacker: fighterIndex === 0 ? 'r1' : 'r2', startTime: performance.now(), isCrit: false, isMiss: false, stagger: 'light', seq: event.cursor, cueName: 'impact_light', focus: fighterIndex === 0 ? 'r2' : 'r1' };
            hitStopUntil.current = performance.now() + 48;
          }
          if (event.type === 'ACTION_ENDED' && String(event.payload.engineType) === 'ATTACK_MISSED') { audio.current?.playMiss(); burst('LIHIS!', 'miss'); }
          if (event.type === 'HIT' || event.type === 'COUNTER_TRIGGERED') { const majorHit = Number(event.payload.value ?? 0) >= 9 || event.type === 'COUNTER_TRIGGERED'; if (majorHit) audio.current?.playCrit(); else audio.current?.playHit(); burst(event.type === 'COUNTER_TRIGGERED' ? 'SAGOT!' : 'TAMA!', majorHit ? 'crit' : 'hit'); }
          if (event.type === 'STAGGER' || event.type === 'KNOCKDOWN') { audio.current?.playCrit(); burst('BUWAL!', 'crit'); }
          if (event.type === 'AWAKENING_STARTED') { audio.current?.playCrit(); burst('AWAKENING!', 'ko'); }
          if (event.type === 'SESSION_TERMINAL') { audio.current?.playVictory(); burst('TAPOS NA!', 'ko'); }
          if (event.type === 'COMMAND_RESOLVED' && fighterIndex === 0) {
            const grade = String(event.payload.grade ?? 'PARTIAL');
            const mode = commandModeForPresentation(String(event.payload.command ?? next.activeCommand) as CoachingCommand);
            setCommandFeedback({ mode, status: grade === 'FULL' ? 'acknowledged' : grade === 'PARTIAL' ? 'partial' : 'ignored' });
          }
          if (event.type === 'HEALTH_CHANGED') {
            const defenderId = String(event.payload.fighterId ?? '');
            const attackerId = String(event.payload.targetId ?? '');
            const defenderIndex = next.projection.findIndex(fighter => fighter.fighterId === defenderId);
            const attackerIndex = next.projection.findIndex(fighter => fighter.fighterId === attackerId);
            const amount = Math.max(0, Math.round(Number(event.payload.value ?? 0)));
            if (defenderIndex >= 0 && amount > 0) {
              const anchor = defenderIndex === 0 ? screenAnchorA.current : screenAnchorB.current;
              setDamageCounters(previous => [...previous.slice(-4), { id: event.cursor, amount, side: defenderIndex === 0 ? 'left' : 'right', anchor: { ...anchor } }]);
              const defender = next.projection[defenderIndex];
              const attacker = next.projection[attackerIndex >= 0 ? attackerIndex : 1 - defenderIndex];
              const point = new THREE.Vector3(defender.position.x, -2.1 + defender.position.y, defender.position.z);
              const normal = new THREE.Vector3(
                defender.position.x - attacker.position.x,
                0.15,
                defender.position.z - attacker.position.z,
              ).normalize();
              vfx.current?.spawn(amount >= 9 ? 'heavy_impact' : 'light_impact', point, normal);
              vfx.current?.spawnBlood(point, normal, amount >= 9 ? 1.45 : 0.85);
            }
          }
          if (event.type !== 'ACTION_STARTED' && event.type !== 'ACTION_CHAINED') return;
          const index = next.projection.findIndex(fighter => fighter.fighterId === event.payload.fighterId);
          if (index < 0) return;
          const state = animation[String(event.payload.actionId ?? '')] ?? 'ready';
          const intent: AnimIntent = { state, startedAt: event.cursor, speed: 1, moveKind: String(event.payload.actionId ?? state), facing: index === 0 ? 'right' : 'left', tacticalMode: index === 0 ? commandModeForPresentation(next.activeCommand) : 'balanced', fatal: false, awakening: next.projection[index]?.awakening?.type ?? null };
          if (index === 0) { actionA.current = state; intentA.current = intent; }
          else { actionB.current = state; intentB.current = intent; }
        };
        if (newEvents.length) {
          const firstTick = newEvents[0].logicalTick;
          const lastTick = newEvents[newEvents.length - 1].logicalTick;
          const authoritativeSpanMs = Math.max(0, (lastTick - firstTick) * 1000 / 60);
          const replayWindowMs = Math.min(authoritativeSpanMs, MAX_EVENT_REPLAY_WINDOW_MS);
          const now = performance.now();
          const replayStartedAt = Math.max(now, eventReplayAvailableAt);
          for (const event of newEvents) {
            const relativeDelay = lastTick === firstTick ? 0 : (event.logicalTick - firstTick) / (lastTick - firstTick) * replayWindowMs;
            const delay = replayStartedAt - now + relativeDelay;
            const eventTimer = window.setTimeout(() => {
              eventTimers.delete(eventTimer);
              if (!stopped) presentEvent(event);
            }, delay);
            eventTimers.add(eventTimer);
          }
          eventReplayAvailableAt = replayStartedAt + replayWindowMs;
        }
        if (!sceneFighters && next.fighters) setSceneFighters(next.fighters);
        lastSyncAt.current = performance.now();
        next.projection.forEach((fighter, index) => {
          const target = index === 0 ? targetA.current : targetB.current;
          const velocity = index === 0 ? velocityA.current : velocityB.current;
          target.offsetX = (fighter.position.x - (index === 0 ? -WORLD_HALF_GAP : WORLD_HALF_GAP)) / ANIM_PX_TO_WORLD;
          target.offsetY = -fighter.position.y / ANIM_PX_TO_WORLD;
          target.offsetZ = fighter.position.z / ANIM_PX_TO_WORLD;
          // Server velocity is authoritative-space units/sec; convert with the
          // same scale used for position so extrapolation tracks 1:1 between syncs.
          const atRest = fighter.mentalState === 'down' || next.status !== 'ACTIVE';
          velocity.x = atRest ? 0 : fighter.velocity.x / ANIM_PX_TO_WORLD;
          velocity.y = atRest ? 0 : -fighter.velocity.y / ANIM_PX_TO_WORLD;
          velocity.z = atRest ? 0 : fighter.velocity.z / ANIM_PX_TO_WORLD;
          const primaryTell = fighter.readTells[0];
          const cue = tellPostureCue(primaryTell?.type as ReadTellType | undefined, primaryTell?.strength ?? 0, index === 0 ? 'left' : 'right');
          target.rot = cue.rot;
          target.scaleX = 1;
          target.scaleY = cue.scaleY;
          target.yaw = -fighter.facing + (index === 0 ? 0 : Math.PI) + cue.yawOffset;
          const posture: FighterPosture = {
            mode: index === 0 ? commandModeForPresentation(next.activeCommand) : 'balanced',
            hesitating: primaryTell?.type === 'hesitating',
            strength: primaryTell?.strength ?? 0,
            tellType: primaryTell ? primaryTell.type as ReadTellType : null,
          };
          if (index === 0) postureA.current = posture;
          else postureB.current = posture;
          const state = animation[fighter.actionId ?? fighter.mentalState] ?? 'ready';
          const tellPosture = primaryTell ? { type: primaryTell.type as ReadTellType, strength: primaryTell.strength } : null;
          const previousAction = index === 0 ? actionA : actionB;
          const currentIntent = index === 0 ? intentA : intentB;
          // No tick-freshness window here: /sync only lands every
          // AUTHORITATIVE_SYNC_INTERVAL_MS (150ms/9 ticks), far coarser than a
          // couple of ticks, so a narrow "just happened" check almost always
          // misses the poll. lastMirageEvadeTick persists server-side until the
          // next evade, and ChickenModel already diffs afterimageKey against the
          // last value it saw, so forwarding the raw tick is sufficient to fire
          // exactly once per evade.
          const recentMirageEvade = fighter.awakening?.type === 'flow-state' && fighter.lastMirageEvadeTick !== null
            ? fighter.lastMirageEvadeTick * 10 + 2
            : undefined;
          if (state !== previousAction.current) {
            previousAction.current = state;
            currentIntent.current = { state, startedAt: next.logicalTick, speed: 1, moveKind: fighter.actionId ?? fighter.mentalState, facing: index === 0 ? 'right' : 'left', tacticalMode: index === 0 ? commandModeForPresentation(next.activeCommand) : 'balanced', tellPosture, fatal: fighter.health <= 0, afterimageKey: recentMirageEvade };
          } else if (currentIntent.current) {
            currentIntent.current = {
              ...currentIntent.current,
              tellPosture,
              ...(recentMirageEvade !== undefined ? { afterimageKey: recentMirageEvade } : {}),
            };
          }
        });
        const observedTell = next.projection[1]?.readTells[0];
        awakeningA.current = next.projection[0]?.awakening?.type ?? null;
        awakeningB.current = next.projection[1]?.awakening?.type ?? null;
        if (observedTell) {
          const meta = describeReadTell(observedTell.type as ReadTellType, observedTell.strength);
          setAuthoritativeTell({ id: observedTell.startedTick, fighterSide: 'right', strength: observedTell.strength, anchor: { ...screenAnchorB.current }, ...meta });
        } else setAuthoritativeTell(null);
        setView(next);
        if (next.result && !completed.current) { completed.current = true; onCompleteRef.current?.(next.result, next.settlement); }
        // Keep authoritative targets frequent enough that the frame-rate
        // interpolator never catches and waits on the next snapshot.
        setError('');
        if (next.allowedActions.sync) {
          const remaining = Math.max(0, AUTHORITATIVE_SYNC_INTERVAL_MS - (performance.now() - syncStartedAt));
          timer = window.setTimeout(sync, remaining);
        }
      } catch (cause) {
        if (!stopped) {
          setError(cause instanceof Error ? cause.message : 'Combat connection lost');
          // A single dropped begin/sync request must not permanently stop the
          // authoritative clock. The service makes CREATED syncs self-starting,
          // so retrying also repairs the countdown-to-battle handoff.
          timer = window.setTimeout(sync, 750);
        }
      }
    };
    void sync();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      eventTimers.forEach(eventTimer => clearTimeout(eventTimer));
      eventTimers.clear();
    };
  }, [sceneFighters, sessionId]);

  const issue = useCallback(async (command: CoachingCommand) => {
    const mode = commandModeForPresentation(command);
    setCommandFeedback({ mode, status: 'queued' });
    const response = await fetch(`/api/combat/sessions/${sessionId}/commands`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commandId: crypto.randomUUID(), command, observedRevision: view?.revision ?? 0 }) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error === 'COMMAND_LOCKED' ? 'Instruction locked for this exchange.' : body.error ?? 'Command rejected');
      setCommandFeedback({ mode, status: 'ignored' });
      return;
    }
    setError('');
    setCommandFeedback({ mode, status: 'acknowledged' });
  }, [sessionId, view?.revision]);

  const awaken = useCallback(async (type: AwakeningType) => {
    setAwakeningPending(type);
    const response = await fetch(`/api/combat/sessions/${sessionId}/awakenings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: crypto.randomUUID(), type, observedRevision: view?.revision ?? 0 }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Awakening rejected');
    } else {
      setError('');
      awakeningA.current = type;
    }
    setAwakeningPending(null);
  }, [sessionId, view?.revision]);

  useEffect(() => {
    const commands = ['PRESS', 'WAIT', 'COUNTER', 'RECOVER'] as const;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches('input, textarea, select, button')) return;
      const command = commands[Number(event.key) - 1];
      if (command && view?.allowedActions.command) { event.preventDefault(); void issue(command); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [issue, view?.allowedActions.command]);

  useEffect(() => {
    if (!commandFeedback || commandFeedback.status === 'queued') return;
    const timer = window.setTimeout(() => setCommandFeedback(null), 1400);
    return () => window.clearTimeout(timer);
  }, [commandFeedback]);

  if (!view || !sceneFighters) return <div className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">{error || 'Connecting to the authoritative arena…'}</div>;
  const [chickenA, chickenB] = sceneFighters;
  const [left, right] = view.projection;
  const readTell = right?.readTells[0];
  const cards = COMMAND_ORDER.map(mode => ({ mode, ...COMMAND_CARDS[mode] }));
  const activeMode = commandModeForPresentation(view.activeCommand);
  const decisionWindow = view.phase === 'READ' && view.allowedActions.command;
  const commandLocked = view.status === 'ACTIVE' && !view.allowedActions.command;
  const unlockedAwakenings = left?.unlockedAwakenings ?? [];
  const canAwaken = view.allowedActions.awakening && unlockedAwakenings.length > 0;
  return <section className={`relative h-[calc(100dvh-5.5rem)] min-h-[560px] overflow-hidden bg-[#090706] text-white ${highContrast ? 'contrast-125 saturate-125' : ''}`}>
    <div className="absolute inset-0"><AuthoritativeBattleStage chickenA={chickenA} chickenB={chickenB} animA={animA} animB={animB} intentA={intentA} intentB={intentB} awakeningA={awakeningA} awakeningB={awakeningB} screenAnchorA={screenAnchorA} screenAnchorB={screenAnchorB} postureA={postureA} postureB={postureB} vfx={vfx} cameraCue={cameraCue} hitStopScale={hitStopScale} /></div>
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(7,5,3,.17)_72%,rgba(3,2,1,.64)_100%)]" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/65" />
    <div className="pointer-events-none absolute inset-x-4 top-3 z-20 flex items-start justify-between gap-3 sm:inset-x-6">
      <FighterHud chicken={chickenA} subtitle={fighterSubtitle(chickenA)} hp={left?.health ?? 0} maxHp={left?.maxHealth ?? 1} stamina={left?.stamina ?? 0} maxStamina={100} statuses={injuriesToStatusIcons(chickenA.injuries)} side="left" />
      <RoundHeader elapsedSeconds={view.logicalTick / 60} phase={view.phase ?? 'TERMINAL'} statusLabel={`Exchange ${view.exchangeIndex + 1}`} />
      <FighterHud chicken={chickenB} subtitle={fighterSubtitle(chickenB)} hp={right?.health ?? 0} maxHp={right?.maxHealth ?? 1} stamina={right?.stamina ?? 0} maxStamina={100} statuses={injuriesToStatusIcons(chickenB.injuries)} side="right" />
    </div>
    <TellIndicator tell={authoritativeTell ? { ...authoritativeTell, label: tellLabels ? authoritativeTell.label : '', interpretation: tellLabels ? authoritativeTell.interpretation : '' } : null} />
    {recaps.active && <ExchangeRecap eventId={recaps.active.id} payload={recaps.active.payload} reducedMotion={reducedEffects} highContrast={highContrast} />}
    <DamageCounters counters={damageCounters} />
    <ComicCommentary bursts={bursts} caption={null} />
    <CoachCallout chicken={chickenA} caption={coachCaption(view.phase, readTell?.type, view.activeCommand)} dimmed={view.phase === 'CLASH'} />
    <TellLegend dimmed={view.phase === 'CLASH'} />
    <div className="pointer-events-auto absolute inset-x-0 bottom-3 z-30 flex flex-col items-center sm:bottom-4">
      <p className={`mb-1 rounded-full border px-3 py-0.5 text-[9px] uppercase tracking-[.14em] ${decisionWindow ? 'border-emerald-300/30 bg-emerald-950/40 text-emerald-200' : 'border-amber-300/20 bg-black/50 text-amber-100/70'}`}>{decisionWindow ? `${view.activeCommand} selected · Change until commit` : `${view.activeCommand} locked for this exchange`}</p>
      {canAwaken && <div className="mb-2 flex flex-wrap justify-center gap-2">
        {unlockedAwakenings.map(type => <button
          key={type}
          type="button"
          disabled={awakeningPending !== null}
          aria-busy={awakeningPending === type}
          onClick={() => void awaken(type)}
          className="rounded-full border border-[#f1cf77]/60 bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#f1cf77] backdrop-blur-sm transition-colors hover:bg-[#f1cf77]/15 disabled:cursor-wait disabled:opacity-60"
        >
          {awakeningPending === type ? 'Awakening…' : `Awaken · ${AWAKENING_LABELS[type] ?? type}`}
        </button>)}
      </div>}
      <CommandWheel chicken={chickenA} cards={cards} activeMode={activeMode} disabledAll={view.status !== 'ACTIVE'} locked={commandLocked} feedback={commandFeedback} onSelect={mode => void issue(mode === 'pressure' ? 'PRESS' : mode === 'counter' ? 'COUNTER' : mode === 'recover' ? 'RECOVER' : 'WAIT')} />
      {error && <p role="alert" className="absolute bottom-1 rounded bg-red-950/85 px-3 py-1 text-xs text-red-200">{error}</p>}
    </div>
    <div className="absolute right-5 top-[108px] z-40 flex gap-2">
      <button type="button" onClick={() => { if (onToggleAudio) onToggleAudio(); else setAudioOverride(value => !(value ?? audioEnabled)); }} aria-label={localAudio ? 'Mute arena audio' : 'Unmute arena audio'} className="rounded-full border border-[#b99b5f]/30 bg-black/60 px-3 py-2 backdrop-blur-sm">{localAudio ? '🔊' : '🔇'}</button>
      <button type="button" onClick={() => setSettingsOpen(value => !value)} aria-label="Combat accessibility settings" className="rounded-full border border-[#b99b5f]/30 bg-black/60 px-3 py-2 backdrop-blur-sm">⚙</button>
    </div>
    {settingsOpen && <div className="absolute right-5 top-[154px] z-40 w-56 rounded-lg border border-white/15 bg-black/85 p-3 text-xs backdrop-blur">
      <p className="mb-2 font-semibold uppercase tracking-widest text-(--color-gold-bright)">Combat display</p>
      <label className="mb-2 flex items-center justify-between gap-3">Tell labels<input type="checkbox" checked={tellLabels} onChange={event => setTellLabels(event.target.checked)} /></label>
      <label className="mb-2 flex items-center justify-between gap-3">Reduced effects<input type="checkbox" checked={reducedEffects} onChange={event => setReducedEffects(event.target.checked)} /></label>
      <label className="flex items-center justify-between gap-3">High contrast<input type="checkbox" checked={highContrast} onChange={event => setHighContrast(event.target.checked)} /></label>
      <p className="mt-3 text-[10px] text-white/55">Keys 1–4: Press, Wait, Counter, Recover.</p>
    </div>}
  </section>;
}

function commandModeForPresentation(command: CoachingCommand): TacticalMode {
  return command === 'PRESS' ? 'pressure' : command === 'WAIT' ? 'defensive' : command === 'COUNTER' ? 'counter' : 'recover';
}

function SandboxContinuousBattle({ chickenA, chickenB, matchSeed = 81726354, autoStart = false, showControls = true, onComplete, audioEnabled = true, onToggleAudio }: { chickenA: Chicken; chickenB: Chicken; matchSeed?: number; autoStart?: boolean; showControls?: boolean; onComplete?: (result: MatchResult) => void; audioEnabled?: boolean; onToggleAudio?: () => void }) {
  const [display, setDisplay] = useState({ tick: 0, phase: 'paused', result: '', fighters: [] as FighterDisplay[] });
  const [, setStats] = useState<MatchStats>({ hits: [0, 0], damage: [0, 0], lastDamage: null });
  const [damageCounters, setDamageCounters] = useState<DamageCounterUi[]>([]);
  const [bursts, setBursts] = useState<CommentaryBurst[]>([]);
  const [caption, setCaption] = useState<string | null>('Handa na ang sabungan — sino ang mananaig?');
  const [hudVisibility, setHudVisibility] = useState<BattleHudVisibility>('FULL');
  const [error, setError] = useState('');
  const [uiPhase, setUiPhase] = useState<CombatUiPhase>('circle');
  const [tell, setTell] = useState<TellUiState | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<CommandFeedback | null>(null);
  const feedbackTimer = useRef<number | null>(null);
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
      setDamageCounters([]);
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
        if (event.type === 'EVADE' && String(event.detail) === 'MIRAGE_EVADE') { hitStopUntil.current = performance.now() + 48; }
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
          const point = session.state.fighters[targetIndex]?.position;
          const attackerPoint = session.state.fighters[fighterIndex]?.position;
          if (point && attackerPoint) {
            const impactPoint = new THREE.Vector3(point.x, -2.1 + point.y, point.z);
            const normal = new THREE.Vector3(point.x - attackerPoint.x, 0.15, point.z - attackerPoint.z).normalize();
            vfx.current?.spawn(presentation.vfx ?? (amount > 8 ? 'heavy_impact' : 'light_impact'), impactPoint, normal);
            if (presentation.secondaryVfx) vfx.current?.spawn(presentation.secondaryVfx, impactPoint);
            vfx.current?.spawnBlood(impactPoint, normal, amount > 8 ? 1.45 : 0.85);
          }
          setStats(previous => ({ ...previous, damage: previous.damage.map((value, index) => index === targetIndex ? value + amount : value) as [number, number], lastDamage: { id: event.tick, amount, side: fighterIndex === 0 ? 'left' : 'right' } }));
          const anchor = fighterIndex === 0 ? screenAnchorA.current : screenAnchorB.current;
          setDamageCounters(previous => [...previous.slice(-4), { id: event.tick * 10 + burstId.current++, amount, side: fighterIndex === 0 ? 'left' : 'right', anchor: { ...anchor } }]);
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
        const primaryTell = fighter.readTells[0];
        const cue = tellPostureCue(primaryTell?.type, primaryTell?.strength ?? 0, index === 0 ? 'left' : 'right');
        const posture: FighterPosture = { mode: fighter.tacticalMode, hesitating: primaryTell?.type === 'hesitating', strength: primaryTell?.strength ?? 0, tellType: primaryTell?.type ?? null };
        if (index === 0) postureA.current = posture; else postureB.current = posture;
        current.rot = cue.rot;
        current.scaleY = cue.scaleY;
        current.scaleX = 1;
        current.yaw += cue.yawOffset;
        // `alpha` fractions the current tick, so folding it into these tick
        // differences keeps action progress continuous between 60Hz sim
        // steps instead of jumping once per tick on higher-refresh displays.
        const runtime = fighter.currentAction, action = runtime && ACTIONS[runtime.id]; let progress = Math.min(1, (state.tick + alpha - fighter.stateEnteredTick) / 20);
        if (runtime && action) { const age = state.tick + alpha - runtime.startedTick; progress = runtime.phase === 'startup' ? age / action.startupTicks * .52 : runtime.phase === 'active' ? .52 + (age - action.startupTicks) / action.activeTicks * .2 : .72 + (age - action.startupTicks - action.activeTicks) / action.recoveryTicks * .28; }
        const aerial = fighter.aerial && (fighter.aerial.launchedTick < 0 || !fighter.grounded || fighter.aerial.phase === 'LAND') && fighter.groundedTicks <= 10 ? fighter.aerial : undefined;
        const recentMirageEvade = fighter.lastMirageEvadeTick !== undefined && state.tick - fighter.lastMirageEvadeTick <= 2
          ? fighter.lastMirageEvadeTick * 10 + 2
          : undefined;
        const flowStep = fighter.awakening?.type === 'flow-state' && (fighter.state === 'evading' || runtime?.id === 'sidestep')
          ? (runtime?.startedTick ?? fighter.stateEnteredTick) * 10 + 1
          : undefined;
        const intent: AnimIntent = { state: animation[(aerial?.phase === 'LAND' ? undefined : runtime)?.id ?? fighter.state] ?? 'ready', startedAt: (runtime?.startedTick ?? fighter.stateEnteredTick) * 1000 / 60, speed: 1, moveKind: runtime?.id ?? fighter.state, facing: index === 0 ? 'right' : 'left', simulationProgress: progress, tacticalMode: fighter.tacticalMode, tellPosture: primaryTell ? { type: primaryTell.type, strength: primaryTell.strength } : null, fatal: fighter.state === 'down', afterimageKey: recentMirageEvade ?? flowStep, awakening: fighter.awakening?.type ?? null };
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
      setCaption(mode === 'pressure' ? 'Sugod! I-pressure natin siya!' : mode === 'defensive' || mode === 'counter' ? 'Bantay muna — hintayin ang butas!' : mode === 'recover' ? 'Hinga muna — balik ang stamina!' : 'Timbang lang, coach. Basahin ang galaw niya.');
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

        <DamageCounters counters={damageCounters} />

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
