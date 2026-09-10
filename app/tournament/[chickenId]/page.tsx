"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import type { BattleReport } from "@/lib/combat/battleReport";
import type { PlayerCommand } from "@/lib/combat/command";
import { getTournamentDefinition, roundLabel, TIER_LABELS } from "@/lib/tournament";
import type { BracketEntrant, TournamentSize, TournamentTier } from "@/lib/tournament";
import type { Chicken, CombatResult } from "@/lib/types";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { BattleReportPanel } from "@/components/BattleReportPanel";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";
import { TournamentBracket } from "@/components/tournament/TournamentBracket";
import { TournamentAction, TournamentShell } from "@/components/tournament/TournamentShell";

type Phase =
  | "loading"
  | "picker"
  | "starting"
  | "roster"
  | "matchup"
  | "live"
  | "round-banner"
  | "report"
  | "final"
  | "error";

type TournamentView = {
  id: string;
  chickenId: string;
  size: TournamentSize;
  tier: TournamentTier;
  totalRounds: number;
  currentRound: number;
  status: "in_progress" | "complete";
  entrants: BracketEntrant[];
  history: { round: number; slotA: number; slotB: number; winnerSlot: number; isPlayerMatch: boolean; result: CombatResult }[][];
  placement: 1 | 2 | 3 | null;
  tokensAwarded: number;
  definitionId: string;
};

const ROUND_BANNER_DELAY_MS = 1500;
const LIVE_STEP_INTERVAL_MS = 900;

type LiveSnapshot = { hp: number; maxHp: number; stamina: number; maxStamina: number; commandPoints: number; mentalState: string };

const PLACEMENT_LABEL: Record<string, string> = {
  "1": "🏆 Champion",
  "2": "🥈 Runner-up",
  "3": "🥉 3rd Place",
  null: "Eliminated",
};

function FighterReadout({ label, fighter, highlight = false }: { label: string; fighter: Chicken; highlight?: boolean }) {
  return <section className={`tournament-fighter p-4 ${highlight ? "tournament-fighter-selected" : ""}`}><p className="tournament-kicker">{label}</p><div className="mt-3 flex items-center gap-3"><ChickenThumbnail chicken={fighter} className="h-16 w-16" /><div className="min-w-0"><h2 className="truncate font-display text-xl text-(--color-parchment)">{fighter.name}</h2><p className="text-[10px] uppercase tracking-[.13em] text-(--color-text-muted)">{fighter.fightingStyle} · {fighter.record.wins}W–{fighter.record.losses}L</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="tournament-stat"><label>Condition</label><strong>{fighter.condition ?? 100}%</strong></div><div className="tournament-stat"><label>Health</label><strong>{fighter.health}%</strong></div></div></section>;
}

export default function TournamentPage({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [tournament, setTournament] = useState<TournamentView | null>(null);
  const selectedEvent = getTournamentDefinition(searchParams.get("event") ?? "");
  const [lastMatch, setLastMatch] = useState<{ result: CombatResult; opponent: Chicken } | null>(null);
  const [battleReport, setBattleReport] = useState<BattleReport | null>(null);
  const [tokensThisRound, setTokensThisRound] = useState(0);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [liveOpponent, setLiveOpponent] = useState<Chicken | null>(null);
  const [liveSnapshotA, setLiveSnapshotA] = useState<LiveSnapshot | null>(null);
  const [liveSnapshotB, setLiveSnapshotB] = useState<LiveSnapshot | null>(null);
  const [queuedCommand, setQueuedCommand] = useState<PlayerCommand | null>(null);
  // Holds the already-resolved round result until the fight animation finishes —
  // the roster/chicken state shouldn't update until the player has watched it play out.
  const pendingTournament = useRef<TournamentView | null>(null);
  const pendingChicken = useRef<Chicken | null>(null);
  const liveSessionRef = useRef<string | null>(null);
  const queuedCommandRef = useRef<PlayerCommand | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveOpponentRef = useRef<Chicken | null>(null);
  // On load: fetch the chicken, and check for an already-running tournament to resume.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [chickenRes, activeRes] = await Promise.all([
        fetch(`/api/chickens/${chickenId}`),
        fetch(`/api/chickens/${chickenId}/tournament`),
      ]);
      if (cancelled) return;
      if (!chickenRes.ok) {
        setError("Chicken not found");
        setPhase("error");
        return;
      }
      setChicken(await chickenRes.json());
      const activeBody = await activeRes.json();
      if (activeBody.tournament) {
        setTournament(activeBody.tournament);
        setPhase(activeBody.tournament.status === "complete" ? "final" : "roster");
      } else {
        setPhase("picker");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chickenId]);

  // Auto-advance from the round-result banner into the battle report.
  useEffect(() => {
    if (phase !== "round-banner") return;
    const timer = setTimeout(() => setPhase("report"), ROUND_BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => () => { if (liveTimerRef.current) clearTimeout(liveTimerRef.current); }, []);

  async function handleStart() {
    setPhase("starting");
    const res = await fetch(`/api/chickens/${chickenId}/tournament`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: selectedEvent?.id }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Could not start the tournament");
      setPhase("error");
      return;
    }
    setTournament(body.tournament);
    setPhase("roster");
  }

  function currentOpponentEntrant(t: TournamentView): BracketEntrant | null {
    const alive = t.entrants.filter((e) => e.eliminatedRound === null).sort((a, b) => a.slot - b.slot);
    const playerIndex = alive.findIndex((e) => e.isPlayer);
    if (playerIndex === -1) return null;
    const pairIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
    return alive[pairIndex] ?? null;
  }

  async function handleFight() {
    if (!tournament) return;
    const opponentEntrant = currentOpponentEntrant(tournament);
    if (!opponentEntrant) return;
    const res = await fetch(`/api/tournaments/${tournament.id}/fight/start`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "The round could not be resolved");
      setPhase("error");
      return;
    }

    liveSessionRef.current = body.sessionId;
    setLiveSessionId(body.sessionId); setLiveOpponent(opponentEntrant.chicken); liveOpponentRef.current = opponentEntrant.chicken;
    setLiveSnapshotA(body.snapshotA); setLiveSnapshotB(body.snapshotB); setQueuedCommand(null); queuedCommandRef.current = null;
    setPhase("live");
    liveTimerRef.current = setTimeout(() => void stepLive(), LIVE_STEP_INTERVAL_MS);
  }

  async function stepLive() {
    if (!tournament || !liveSessionRef.current) return;
    const res = await fetch(`/api/tournaments/${tournament.id}/fight/${liveSessionRef.current}/step`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ command: queuedCommandRef.current }) });
    if (!res.ok) { const body = await res.json().catch(() => ({})); setError(body.error ?? "Lost the tournament fight connection"); setPhase("error"); return; }
    const body = await res.json();
    queuedCommandRef.current = null; setQueuedCommand(null); setLiveSnapshotA(body.snapshotA); setLiveSnapshotB(body.snapshotB);
    if (body.fightOver) {
      if (body.tournament && body.chicken && body.result && liveOpponentRef.current) {
        setLastMatch({ result: body.result, opponent: liveOpponentRef.current }); setBattleReport(body.battleReport); setTokensThisRound(body.tournament.tokensAwarded - tournament.tokensAwarded); pendingTournament.current = body.tournament; pendingChicken.current = body.chicken; handleReplayEnd();
      }
      liveSessionRef.current = null; liveOpponentRef.current = null; setLiveSessionId(null); return;
    }
    liveTimerRef.current = setTimeout(() => void stepLive(), LIVE_STEP_INTERVAL_MS);
  }

  function queueCommand(command: PlayerCommand) {
    if (!liveSnapshotA || liveSnapshotA.commandPoints < 1) return;
    queuedCommandRef.current = command; setQueuedCommand(command);
  }

  function handleReplayEnd() {
    if (pendingTournament.current) setTournament(pendingTournament.current);
    if (pendingChicken.current) setChicken(pendingChicken.current);
    setPhase("round-banner");
  }

  function handleContinue() {
    if (tournament?.status === "complete") {
      setPhase("final");
    } else {
      setPhase("roster");
    }
  }

  if (phase === "loading" || phase === "error") {
    return (
      <main className="p-6">
        {phase === "error" ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <p className="text-sm opacity-70">Loading...</p>
        )}
        <Link href="/coop" className="mt-2 inline-block text-sm underline">
          ← Back to Coop
        </Link>
      </main>
    );
  }

  if (phase === "picker" && chicken) {
    if (!selectedEvent) {
      return (
        <TournamentShell context="Tournament entry"><section className="tournament-panel mx-auto mt-16 max-w-xl p-8 text-center"><p className="tournament-kicker">Entry required</p><h1 className="mt-3 font-display text-3xl">Choose a championship event</h1><p className="tournament-copy mt-3">Return to the circuit to select the tournament your fighter will enter.</p><Link href="/tournament" className="tournament-action mt-6 inline-block">Championship circuit</Link></section></TournamentShell>
      );
    }
    return (
      <TournamentShell context={`${selectedEvent.name} · Entry confirmation`} footer={<><Link href="/tournament" className="tournament-action">Back to circuit</Link><TournamentAction className="tournament-action-primary" onClick={handleStart}>Confirm entry</TournamentAction></>}><section className="tournament-panel tournament-panel-strong mx-auto mt-14 max-w-2xl p-7 text-center sm:p-10"><p className="tournament-kicker">The bracket awaits</p><h1 className="mt-3 font-display text-3xl text-(--color-parchment)">{selectedEvent.name}</h1><p className="mt-2 text-xs uppercase tracking-[.16em] text-(--color-gold-bright)">{selectedEvent.bracketSize}-bird · {TIER_LABELS[selectedEvent.tier]} · single elimination</p><div className="mx-auto mt-7 max-w-xs"><FighterReadout label="Registered fighter" fighter={chicken} highlight /></div><p className="tournament-copy mx-auto mt-6 max-w-lg">Condition carries into every round. Injuries persist. Once the draw is made, this fighter cannot be replaced.</p></section></TournamentShell>
    );
  }

  if (phase === "starting") {
    return <TournamentShell context="Tournament draw"><section className="tournament-panel mx-auto mt-24 max-w-lg p-10 text-center"><p className="tournament-kicker">Championship draw</p><p className="mt-4 font-display text-2xl text-(--color-parchment)">Building the bracket…</p></section></TournamentShell>;
  }

  if (phase === "roster" && tournament && chicken) {
    const event = getTournamentDefinition(tournament.definitionId);
    const alive = tournament.entrants.filter((e) => e.eliminatedRound === null).sort((a, b) => a.slot - b.slot);
    const opponent = currentOpponentEntrant(tournament);
    return (
      <TournamentShell context={`${event?.name ?? "Championship"} · ${roundLabel(tournament.totalRounds, tournament.currentRound)}`} footer={<><Link href="/coop" className="tournament-action">Return to coop</Link><TournamentAction className="tournament-action-primary" onClick={() => setPhase("matchup")}>Prepare for match</TournamentAction></>}><section className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="tournament-kicker">Round hub</p><h1 className="mt-2 font-display text-3xl text-(--color-parchment) sm:text-4xl">{roundLabel(tournament.totalRounds, tournament.currentRound)}</h1><p className="tournament-copy mt-2">{alive.length} fighters remain in {event?.name ?? "the championship"}.</p></div><div className="tournament-progress"><span>Draw</span>{Array.from({ length: tournament.totalRounds }, (_, index) => <i key={index} className={index <= tournament.currentRound ? "active" : ""} />)}<span>Final</span></div></section><section className="mt-6 grid gap-4 lg:grid-cols-2"><FighterReadout label="Your fighter" fighter={chicken} highlight />{opponent && <FighterReadout label="Next opponent" fighter={opponent.chicken} />}</section><TournamentBracket size={tournament.size} totalRounds={tournament.totalRounds} currentRound={tournament.currentRound} entrants={tournament.entrants} history={tournament.history} player={chicken} /></TournamentShell>
    );
  }

  if (phase === "matchup" && tournament && chicken) {
    const opponentEntrant = currentOpponentEntrant(tournament);
    if (!opponentEntrant) return null;
    return (
      <main className="min-h-screen bg-(--color-ink)">
        <MatchupScreen
          chicken={chicken}
          opponent={opponentEntrant.chicken}
          fighting={false}
          onFight={handleFight}
          eyebrow={getTournamentDefinition(tournament.definitionId)?.name ?? "Championship"}
          title={roundLabel(tournament.totalRounds, tournament.currentRound)}
          subtitle={tournament.currentRound === tournament.totalRounds - 1 ? "The winner is crowned champion." : `Winner advances to the ${roundLabel(tournament.totalRounds, tournament.currentRound + 1)}.`}
          matchInfo={`Round ${tournament.currentRound} of ${tournament.totalRounds}`}
        />
      </main>
    );
  }

  if (phase === "live" && chicken && liveOpponent && liveSnapshotA && liveSnapshotB) {
    const percent = (value: number, max: number) => `${Math.max(0, Math.round(value / max * 100))}%`;
    return <TournamentShell context={`${getTournamentDefinition(tournament?.definitionId ?? "")?.name ?? "Championship"} · Live V2 match`}><section className="tournament-panel tournament-panel-strong mt-8 p-5 sm:p-7"><div className="flex items-center justify-between"><p className="tournament-kicker">Live V2 session</p><p className="text-[10px] uppercase tracking-[.14em] text-(--color-gold-bright)">Server authoritative · {liveSessionId ? "connected" : "finishing"}</p></div><div className="mt-6 grid gap-4 md:grid-cols-2"><FighterReadout label="Your fighter" fighter={chicken} highlight /><FighterReadout label="Opponent" fighter={liveOpponent} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="tournament-stat"><label>{chicken.name} · HP / stamina</label><strong>{Math.round(liveSnapshotA.hp)} / {Math.round(liveSnapshotA.maxHp)}</strong><div className="mt-2 h-2 overflow-hidden rounded bg-black/40"><div className="h-full bg-red-500" style={{ width: percent(liveSnapshotA.hp, liveSnapshotA.maxHp) }} /></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-black/40"><div className="h-full bg-(--color-gold-bright)" style={{ width: percent(liveSnapshotA.stamina, liveSnapshotA.maxStamina) }} /></div></div><div className="tournament-stat"><label>{liveOpponent.name} · HP / stamina</label><strong>{Math.round(liveSnapshotB.hp)} / {Math.round(liveSnapshotB.maxHp)}</strong><div className="mt-2 h-2 overflow-hidden rounded bg-black/40"><div className="h-full bg-red-500" style={{ width: percent(liveSnapshotB.hp, liveSnapshotB.maxHp) }} /></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-black/40"><div className="h-full bg-(--color-gold-bright)" style={{ width: percent(liveSnapshotB.stamina, liveSnapshotB.maxStamina) }} /></div></div></div><div className="mt-7 border-t border-(--color-gold)/20 pt-5"><p className="tournament-kicker">Your commands · {liveSnapshotA.commandPoints.toFixed(1)} CP {queuedCommand && `· ${queuedCommand} queued`}</p><div className="mt-3 grid grid-cols-3 gap-3">{(["PRESS", "WAIT", "RECOVER"] as const).map((command) => <TournamentAction key={command} disabled={liveSnapshotA.commandPoints < 1} onClick={() => queueCommand(command)}>{command}</TournamentAction>)}</div><p className="tournament-copy mt-4">Your command is sent to the live server session on the next exchange. The opponent is auto-coached.</p></div></section></TournamentShell>;
  }

  if (phase === "round-banner" && lastMatch && chicken) {
    const won = lastMatch.result.winnerId === chicken.id;
    return (
      <main className="min-h-screen bg-(--color-ink)">
        {phase === "round-banner" && (
          <TournamentShell context="Official result"><section className="tournament-panel tournament-panel-strong mx-auto mt-24 max-w-3xl p-8 text-center sm:p-14"><p className="tournament-kicker">{lastMatch.result.outcomeReason}</p><p className={`tournament-result-word mt-5 ${won ? "text-(--color-gold-bright)" : "text-red-300"}`}>{won ? "Victory" : "Defeated"}</p><p className="mt-5 font-display text-xl text-(--color-parchment)">{chicken.name} {won ? "defeats" : "falls to"} {lastMatch.opponent.name}</p></section></TournamentShell>
        )}
      </main>
    );
  }

  if (phase === "report" && battleReport && tournament && chicken) {
    return (
      <TournamentShell context={`${getTournamentDefinition(tournament.definitionId)?.name ?? "Championship"} · Round result`} footer={<TournamentAction className="tournament-action-primary" onClick={handleContinue}>{tournament.status === "complete" ? "See tournament summary" : "Return to round hub"}</TournamentAction>}>
        <section className="tournament-panel mx-auto mt-8 max-w-2xl p-3 sm:p-5"><div className="mb-5 px-2"><p className="tournament-kicker">Official scorecard</p><h1 className="mt-2 font-display text-2xl text-(--color-parchment)">{roundLabel(tournament.totalRounds, Math.max(0, tournament.currentRound - 1))} complete</h1></div><BattleReportPanel report={battleReport} /></section>
        {tokensThisRound > 0 && (
          <p className="mt-4 text-center text-sm text-(--color-gold-bright)">+{tokensThisRound} Tournament Tokens</p>
        )}
      </TournamentShell>
    );
  }

  if (phase === "final" && tournament && chicken) {
    return (
      <TournamentShell context={`${getTournamentDefinition(tournament.definitionId)?.name ?? "Championship"} · Tournament summary`} footer={<Link href="/coop" className="tournament-action tournament-action-primary">Return to coop</Link>}>
        <section className="tournament-panel tournament-panel-strong mx-auto mt-12 max-w-2xl p-7 sm:p-10">
          <div className="mb-7 text-center"><p className="tournament-kicker">Championship ceremony</p><p className="tournament-result-word mt-5 text-(--color-gold-bright)">{tournament.placement === 1 ? "Champion" : "Complete"}</p><p className="mt-4 font-display text-2xl text-(--color-parchment)">{chicken.name}</p><p className="mt-1 text-sm text-(--color-text-muted)">{PLACEMENT_LABEL[String(tournament.placement)]}</p>
            {tournament.tokensAwarded > 0 && (
              <p className="mt-3 text-sm text-(--color-gold-bright)">+{tournament.tokensAwarded} Tournament Tokens total</p>
            )}
          </div>
          <p className="tournament-kicker mb-3">Tournament record</p><ul className="flex flex-col gap-2">
            {tournament.history.map((roundMatches, i) => {
              const match = roundMatches.find((m) => m.isPlayerMatch);
              if (!match) return null;
              const won = match.result.winnerId === chicken.id;
              return (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                    won ? "bg-emerald-900/20 text-emerald-300" : "bg-red-900/20 text-red-300"
                  }`}
                >
                  <span>{roundLabel(tournament.totalRounds, i)}</span>
                  <span className="font-semibold uppercase tracking-wide">
                    {won ? "Win" : "Loss"} · {match.result.outcomeReason}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </TournamentShell>
    );
  }

  return null;
}
