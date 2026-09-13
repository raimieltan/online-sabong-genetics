import { COMBAT_DT, COMMAND_BUFFER_TICKS } from './constants';
import { createMatch, queueCommand, stepCombat, triggerAwakening } from './engine';
import type { AwakeningType, CombatEvent, CombatMatchState, MatchConfig, TacticalMode, Vec3 } from './types';

/** Client-controlled fixed clock. Frame debt is retained; no simulation ticks are dropped. */
export class CombatSession {
  readonly state: CombatMatchState;
  accumulator = 0;
  previousPositions: Vec3[];
  private listeners = new Set<(events: readonly CombatEvent[]) => void>();
  constructor(config: MatchConfig) {
    this.state = createMatch(config);
    this.previousPositions = this.state.fighters.map(f => ({ ...f.position }));
  }
  get alpha() { return Math.min(1, this.accumulator / COMBAT_DT); }
  start() { if (this.state.phase === 'paused') this.state.phase = 'active'; }
  stop() { if (this.state.phase === 'active') this.state.phase = 'paused'; }
  subscribe(listener: (events: readonly CombatEvent[]) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  update(frameDelta: number) {
    if (!Number.isFinite(frameDelta) || frameDelta < 0) throw new Error('Invalid frame delta');
    if (this.state.phase !== 'active') return;
    this.accumulator += frameDelta;
    // Bound work per frame after tab suspension; carry remaining debt into subsequent frames.
    let steps = 0;
    while (this.accumulator + 1e-10 >= COMBAT_DT && this.state.phase === 'active' && steps++ < 240) {
      this.previousPositions = this.state.fighters.map(f => ({ ...f.position }));
      stepCombat(this.state);
      this.accumulator = Math.max(0, this.accumulator - COMBAT_DT);
      for (const listener of this.listeners) listener(this.state.eventBuffer);
    }
  }
  issueCommand(fighterId: string, mode: TacticalMode) {
    const f = this.state.fighters.find(f => f.snapshot.fighterId === fighterId);
    if (!f || this.state.phase !== 'active') throw new Error('No active fighter');
    const previous = this.state.commands.filter(c => c.fighterId === fighterId).at(-1);
    queueCommand(this.state, { playerId: f.snapshot.playerId, fighterId, command: mode, issuedTick: this.state.tick, effectiveTick: this.state.tick + COMMAND_BUFFER_TICKS, sequence: (previous?.sequence ?? -1) + 1 });
  }
  triggerAwakening(fighterId: string, type?: AwakeningType) {
    triggerAwakening(this.state, fighterId, type);
  }
}
