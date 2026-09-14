"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import ContinuousBattle from "@/components/combat-v2/ContinuousBattle";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { PostFightOverlay } from "@/components/battle/postfight/PostFightOverlay";
import { TournamentBracket } from "@/components/tournament/TournamentBracket";
import { TournamentAction, TournamentShell } from "@/components/tournament/TournamentShell";
import type { BattleReport } from "@/lib/combat/battleReport";
import { currentOpponent, getTournamentDefinition, TOURNAMENT_DEFINITIONS, type BracketEntrant, type RoundMatch, type TournamentSize, type TournamentTier } from "@/lib/tournament";
import type { Chicken, CombatResult } from "@/lib/types";
import { refreshPlayer } from "@/lib/playerStore";

type TournamentView = {
  id: string; chickenId: string; definitionId: string; size: TournamentSize; tier: TournamentTier;
  totalRounds: number; currentRound: number; status: "in_progress" | "complete";
  entrants: BracketEntrant[]; history: RoundMatch[][]; placement: 1 | 2 | 3 | null; tokensAwarded: number;
};
type Phase = "loading" | "picker" | "hub" | "matchup" | "live" | "result" | "summary" | "error";

export default function TournamentPage({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);
  const search = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [tournament, setTournament] = useState<TournamentView | null>(null);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [report, setReport] = useState<BattleReport | null>(null);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [tournamentTokensEarned, setTournamentTokensEarned] = useState(0);
  const [error, setError] = useState("");
  const [combatConfig, setCombatConfig] = useState<{ coachingMode: "MANUAL" | "AUTO"; openingCommand: "PRESS" | "WAIT" | "COUNTER" | "RECOVER"; disconnectPolicy: "KEEP_INSTRUCTION" | "AUTO_COACH" }>({ coachingMode: "MANUAL", openingCommand: "WAIT", disconnectPolicy: "KEEP_INSTRUCTION" });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch(`/api/chickens/${chickenId}`), fetch(`/api/chickens/${chickenId}/tournament`)]).then(async ([fighterResponse, tournamentResponse]) => {
      if (!fighterResponse.ok || !tournamentResponse.ok) throw new Error("Tournament data unavailable");
      const fighter = await fighterResponse.json() as Chicken;
      const active = (await tournamentResponse.json()).tournament as TournamentView | null;
      if (!cancelled) { setChicken(fighter); setTournament(active); setPhase(active ? "hub" : "picker"); }
    }).catch(cause => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "Tournament unavailable"); setPhase("error"); } });
    return () => { cancelled = true; };
  }, [chickenId]);

  const startTournament = async (eventId: string) => {
    setPhase("loading");
    const response = await fetch(`/api/chickens/${chickenId}/tournament`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Could not enter tournament"); setPhase("error"); return; }
    setTournament(body.tournament); setPhase("hub");
  };

  const enterArena = async () => {
    if (!tournament) return;
    const response = await fetch(`/api/tournaments/${tournament.id}/fight/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(combatConfig) });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Could not open tournament fight"); setPhase("error"); return; }
    setSession(body.combatView ?? body); setPhase("live");
  };

  const finishPresentation = (_authoritative: unknown, settlement?: Record<string, unknown> | null) => {
    const payload = settlement as ({ legacyResult?: CombatResult; battleReport?: BattleReport; chicken?: Chicken; tournament?: TournamentView; creditsEarned?: number; rewards?: { tournamentTokens?: number } } | null | undefined);
    if (!payload?.legacyResult || !payload.tournament) { setError("Settled tournament payload is incomplete"); setPhase("error"); return; }
    setResult(payload.legacyResult); setReport(payload.battleReport ?? null); setChicken(payload.chicken ?? chicken); setTournament(payload.tournament); setPhase("result");
    setCreditsEarned(payload.creditsEarned ?? 0); setTournamentTokensEarned(payload.rewards?.tournamentTokens ?? 0); void refreshPlayer();
  };

  if (phase === "loading") return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">Preparing tournament…</main>;
  if (phase === "error") return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6 text-center"><div><p className="text-red-300">{error}</p><Link href="/tournament" className="mt-4 inline-block text-(--color-gold-bright)">Return to tournaments</Link></div></main>;
  if (!chicken) return null;

  if (phase === "picker") {
    const requested = getTournamentDefinition(search.get("event") ?? "");
    const events = requested ? [requested] : TOURNAMENT_DEFINITIONS;
    return <main className="min-h-screen bg-(--color-ink) p-8 text-(--foreground)"><h1 className="font-display text-4xl">Choose a circuit</h1><div className="mt-6 grid gap-4 md:grid-cols-2">{events.map(event => <button key={event.id} onClick={() => void startTournament(event.id)} className="panel-wood rounded-xl p-6 text-left"><span className="text-xs uppercase tracking-widest text-(--color-gold-bright)">{event.circuit}</span><h2 className="mt-1 font-display text-2xl">{event.name}</h2><p className="mt-2 text-sm text-(--color-text-muted)">{event.bracketSize} fighters · {event.tier}</p></button>)}</div></main>;
  }

  if (phase === "live" && session) return <main className="min-h-screen bg-(--color-ink)"><ContinuousBattle sessionId={session.sessionId as string} initialView={session as never} onComplete={finishPresentation} /></main>;

  if (phase === "result" && result && tournament) return <main className="min-h-screen bg-(--color-ink)"><PostFightOverlay result={result} playerChicken={chicken} creditsEarned={creditsEarned} tournamentTokensEarned={tournamentTokensEarned} battleReport={report ?? undefined} actionLabel={tournament.status === "complete" ? "Tournament Summary" : "Round Hub"} onContinue={() => { setSession(null); setResult(null); setPhase(tournament.status === "complete" ? "summary" : "hub"); }} /></main>;

  if (phase === "summary" && tournament) return <TournamentShell context={`${getTournamentDefinition(tournament.definitionId)?.name ?? "Championship"} · Tournament summary`} footer={<Link href="/tournament" className="tournament-action tournament-action-primary">Leave Tournament</Link>}>
    <section className="tournament-panel tournament-panel-strong mx-auto mt-12 max-w-2xl p-7 text-center sm:p-10">
      <p className="tournament-kicker">Championship ceremony</p>
      <h1 className="tournament-result-word mt-5 text-(--color-gold-bright)">{tournament.placement === 1 ? "Champion" : "Tournament Complete"}</h1>
      <p className="mt-4 font-display text-2xl text-(--color-parchment)">{chicken.name}</p>
      <p className="mt-2 text-sm text-(--color-text-muted)">Placement {tournament.placement ?? "—"} · {tournament.tokensAwarded} tournament tokens</p>
      <div className="mt-7 text-left"><p className="tournament-kicker mb-3">Tournament record</p>{tournament.history.map((round, index) => { const match = round.find(item => item.isPlayerMatch); if (!match) return null; const won = match.result.winnerId === chicken.id; return <p key={index} className={`mb-2 flex justify-between rounded px-3 py-2 text-sm ${won ? "bg-emerald-900/20 text-emerald-300" : "bg-red-900/20 text-red-300"}`}><span>Round {index + 1}</span><b>{won ? "WIN" : match.result.isDraw ? "DRAW" : "LOSS"} · {match.result.outcomeReason}</b></p>; })}</div>
    </section>
  </TournamentShell>;

  const opponent = tournament ? currentOpponent(tournament) : null;
  if (!tournament || !opponent) return <main className="min-h-screen bg-(--color-ink) p-8 text-center text-(--color-text-muted)">Tournament complete.</main>;
  if (phase === "hub") return <TournamentShell context={`${getTournamentDefinition(tournament.definitionId)?.name ?? "Tournament"} · Round ${tournament.currentRound + 1}`} footer={<><Link href="/coop" className="tournament-action">Return to coop</Link><TournamentAction className="tournament-action-primary" onClick={() => setPhase("matchup")}>Prepare for match</TournamentAction></>}>
    <section className="mt-8"><p className="tournament-kicker">Round hub</p><h1 className="mt-2 font-display text-4xl text-(--color-parchment)">Round {tournament.currentRound + 1} of {tournament.totalRounds}</h1><p className="mt-2 text-(--color-text-muted)">Next opponent: {opponent.chicken.name}</p></section>
    <TournamentBracket size={tournament.size} totalRounds={tournament.totalRounds} currentRound={tournament.currentRound} entrants={tournament.entrants} history={tournament.history} player={chicken} />
  </TournamentShell>;
  return <main className="min-h-screen bg-(--color-ink)"><MatchupScreen chicken={chicken} opponent={opponent.chicken} fighting={false} onFight={() => void enterArena()} eyebrow={`Round ${tournament.currentRound + 1} of ${tournament.totalRounds}`} title={getTournamentDefinition(tournament.definitionId)?.name ?? "Tournament Match"} subtitle="One authoritative fight decides this bracket match." matchInfo={`${tournament.size}-fighter ${tournament.tier} bracket`} combatConfig={combatConfig} onCombatConfigChange={setCombatConfig} /></main>;
}
