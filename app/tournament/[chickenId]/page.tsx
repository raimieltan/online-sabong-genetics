"use client";

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import type { BattleReport } from "@/lib/combat/battleReport";
import {
  getTournamentDefinition,
  roundLabel,
  TIER_LABELS,
} from "@/lib/tournament";
import type {
  BracketEntrant,
  TournamentSize,
  TournamentTier,
} from "@/lib/tournament";
import type { Chicken, CombatResult } from "@/lib/types";

import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { BattleReportPanel } from "@/components/BattleReportPanel";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";
import ContinuousBattle from "@/components/combat-v2/ContinuousBattle";
import { TournamentBracket } from "@/components/tournament/TournamentBracket";
import {
  TournamentAction,
  TournamentShell,
} from "@/components/tournament/TournamentShell";

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
  history: {
    round: number;
    slotA: number;
    slotB: number;
    winnerSlot: number;
    isPlayerMatch: boolean;
    result: CombatResult;
  }[][];
  placement: 1 | 2 | 3 | null;
  tokensAwarded: number;
  definitionId: string;
};

type TournamentFightStepResponse = {
  fightOver?: boolean;
  tournament?: TournamentView;
  chicken?: Chicken;
  result?: CombatResult;
  battleReport?: BattleReport;
  error?: string;
};

const ROUND_BANNER_DELAY_MS = 1500;
const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";

/**
 * Safety limit only.
 *
 * The tournament backend still exposes the old start/step API.
 * We resolve those steps immediately before showing the continuous
 * presentation instead of using the old 900ms UI timer.
 */
const MAX_SERVER_FIGHT_STEPS = 1000;

const PLACEMENT_LABEL: Record<string, string> = {
  "1": "🏆 Champion",
  "2": "🥈 Runner-up",
  "3": "🥉 3rd Place",
  null: "Eliminated",
};

function FighterReadout({
  label,
  fighter,
  highlight = false,
}: {
  label: string;
  fighter: Chicken;
  highlight?: boolean;
}) {
  return (
    <section
      className={`tournament-fighter p-4 ${
        highlight ? "tournament-fighter-selected" : ""
      }`}
    >
      <p className="tournament-kicker">{label}</p>

      <div className="mt-3 flex items-center gap-3">
        <ChickenThumbnail
          chicken={fighter}
          className="h-16 w-16"
        />

        <div className="min-w-0">
          <h2 className="truncate font-display text-xl text-(--color-parchment)">
            {fighter.name}
          </h2>

          <p className="text-[10px] uppercase tracking-[.13em] text-(--color-text-muted)">
            {fighter.fightingStyle} · {fighter.record.wins}W–
            {fighter.record.losses}L
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="tournament-stat">
          <label>Condition</label>
          <strong>{fighter.condition ?? 100}%</strong>
        </div>

        <div className="tournament-stat">
          <label>Health</label>
          <strong>{fighter.health}%</strong>
        </div>
      </div>
    </section>
  );
}

export default function TournamentPage({
  params,
}: {
  params: Promise<{ chickenId: string }>;
}) {
  const { chickenId } = use(params);
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [tournament, setTournament] =
    useState<TournamentView | null>(null);

  const [lastMatch, setLastMatch] = useState<{
    result: CombatResult;
    opponent: Chicken;
  } | null>(null);

  const [battleReport, setBattleReport] =
    useState<BattleReport | null>(null);

  const [tokensThisRound, setTokensThisRound] = useState(0);

  /**
   * The opponent actually being shown inside ContinuousBattle.
   *
   * Keep this separate from currentOpponentEntrant(tournament), because the
   * server may already advance the tournament while we're still visually
   * presenting the fight.
   */
  const [liveOpponent, setLiveOpponent] =
    useState<Chicken | null>(null);

  /**
   * True while the existing server-side tournament fight is being resolved.
   *
   * The matchup screen remains visible during this short period and its
   * Enter Arena button becomes disabled.
   */
  const [preparingFight, setPreparingFight] = useState(false);

  /**
   * Same arena audio behaviour as the normal PvE BattlePage.
   */
  const [audioEnabled, setAudioEnabled] = useState(
    () =>
      typeof window === "undefined"
        ? true
        : window.localStorage.getItem(AUDIO_STORAGE_KEY) !==
          "false",
  );

  /**
   * IMPORTANT:
   *
   * The backend tournament state gets resolved BEFORE ContinuousBattle is
   * shown, exactly like the normal PvE page resolves /fight before showing
   * ContinuousBattle.
   *
   * We keep the resolved values pending until ContinuousBattle calls
   * onComplete().
   *
   * That prevents:
   * - bracket advancement appearing early
   * - updated W/L record appearing before the fight ends
   * - next-round opponent appearing while the player is still watching
   */
  const pendingTournament =
    useRef<TournamentView | null>(null);

  const pendingChicken = useRef<Chicken | null>(null);

  const pendingResult = useRef<CombatResult | null>(null);

  const pendingBattleReport =
    useRef<BattleReport | null>(null);

  const pendingTokens = useRef(0);

  /**
   * Prevent duplicate completion handling if React/effects somehow cause
   * onComplete to fire more than once.
   */
  const presentationCompleted = useRef(false);

  const selectedEvent = getTournamentDefinition(
    searchParams.get("event") ?? "",
  );

  function toggleAudio() {
    setAudioEnabled((previous) => {
      const next = !previous;

      window.localStorage.setItem(
        AUDIO_STORAGE_KEY,
        String(next),
      );

      return next;
    });
  }

  /**
   * ---------------------------------------------------------------------
   * LOAD / RESUME TOURNAMENT
   * ---------------------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
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

        const loadedChicken: Chicken =
          await chickenRes.json();

        const activeBody = await activeRes.json();

        if (cancelled) return;

        setChicken(loadedChicken);

        if (activeBody.tournament) {
          setTournament(activeBody.tournament);

          setPhase(
            activeBody.tournament.status === "complete"
              ? "final"
              : "roster",
          );
        } else {
          setPhase("picker");
        }
      } catch (reason) {
        console.error(reason);

        if (!cancelled) {
          setError("Could not load tournament");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chickenId]);

  /**
   * ---------------------------------------------------------------------
   * RESULT BANNER -> SCORECARD
   * ---------------------------------------------------------------------
   */
  useEffect(() => {
    if (phase !== "round-banner") return;

    const timer = window.setTimeout(() => {
      setPhase("report");
    }, ROUND_BANNER_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase]);

  /**
   * ---------------------------------------------------------------------
   * BRACKET HELPERS
   * ---------------------------------------------------------------------
   */
  function currentOpponentEntrant(
    t: TournamentView,
  ): BracketEntrant | null {
    const alive = t.entrants
      .filter(
        (entrant) =>
          entrant.eliminatedRound === null,
      )
      .sort((a, b) => a.slot - b.slot);

    const playerIndex = alive.findIndex(
      (entrant) => entrant.isPlayer,
    );

    if (playerIndex === -1) {
      return null;
    }

    const pairIndex =
      playerIndex % 2 === 0
        ? playerIndex + 1
        : playerIndex - 1;

    return alive[pairIndex] ?? null;
  }

  /**
   * ---------------------------------------------------------------------
   * START TOURNAMENT
   * ---------------------------------------------------------------------
   */
  async function handleStart() {
    setPhase("starting");
    setError(null);

    try {
      const res = await fetch(
        `/api/chickens/${chickenId}/tournament`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: selectedEvent?.id,
          }),
        },
      );

      const body = await res.json();

      if (!res.ok) {
        setError(
          body.error ?? "Could not start the tournament",
        );

        setPhase("error");
        return;
      }

      setTournament(body.tournament);
      setPhase("roster");
    } catch (reason) {
      console.error(reason);

      setError("Could not start the tournament");
      setPhase("error");
    }
  }

  /**
   * ---------------------------------------------------------------------
   * RESOLVE EXISTING TOURNAMENT SERVER FIGHT
   * ---------------------------------------------------------------------
   *
   * Your tournament backend currently uses:
   *
   * POST /fight/start
   * POST /fight/:sessionId/step
   *
   * Previously the browser called /step once every 900ms and used those
   * snapshots as the visible battle.
   *
   * THAT is the obsolete part.
   *
   * We still use the endpoints here because they contain your tournament
   * progression / persistence logic, but they are now treated purely as
   * server resolution.
   *
   * The visible fight is exclusively ContinuousBattle.
   */
  async function resolveTournamentFight(
    tournamentId: string,
  ): Promise<TournamentFightStepResponse> {
    const startRes = await fetch(
      `/api/tournaments/${tournamentId}/fight/start`,
      {
        method: "POST",
      },
    );

    const startBody = await startRes.json();

    if (!startRes.ok) {
      throw new Error(
        startBody.error ??
          "The tournament fight could not be started",
      );
    }

    const sessionId = startBody.sessionId as
      | string
      | undefined;

    if (!sessionId) {
      throw new Error(
        "Tournament server did not return a fight session",
      );
    }

    /**
     * Resolve the old server session immediately.
     *
     * No setTimeout.
     * No 900ms interval.
     * No UI snapshots.
     * No legacy battle presentation.
     */
    for (
      let stepIndex = 0;
      stepIndex < MAX_SERVER_FIGHT_STEPS;
      stepIndex += 1
    ) {
      const stepRes = await fetch(
        `/api/tournaments/${tournamentId}/fight/${sessionId}/step`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          /**
           * Tournament commands belonged to the old stepped presentation.
           * ContinuousBattle now owns player tactical commands itself.
           */
          body: JSON.stringify({
            command: null,
          }),
        },
      );

      const body =
        (await stepRes.json()) as TournamentFightStepResponse;

      if (!stepRes.ok) {
        throw new Error(
          body.error ??
            "The tournament fight connection was lost",
        );
      }

      if (body.fightOver) {
        if (
          !body.tournament ||
          !body.chicken ||
          !body.result
        ) {
          throw new Error(
            "Tournament fight finished without a complete result",
          );
        }

        return body;
      }
    }

    throw new Error(
      "Tournament fight exceeded the server step limit",
    );
  }

  /**
   * ---------------------------------------------------------------------
   * ENTER ARENA
   * ---------------------------------------------------------------------
   *
   * Same high-level flow as BattlePage:
   *
   * 1. Resolve authoritative backend fight.
   * 2. Save result.
   * 3. Enter fighting/live phase.
   * 4. ContinuousBattle plays the presentation.
   * 5. Its onComplete reveals the official result.
   */
  async function handleFight() {
    if (
      !tournament ||
      !chicken ||
      preparingFight
    ) {
      return;
    }

    const opponentEntrant =
      currentOpponentEntrant(tournament);

    if (!opponentEntrant) {
      setError(
        "Tournament opponent could not be found",
      );

      setPhase("error");
      return;
    }

    setPreparingFight(true);
    setError(null);

    /**
     * Freeze exactly which opponent this presentation belongs to.
     */
    setLiveOpponent(opponentEntrant.chicken);

    /**
     * Clear stale round data.
     */
    setLastMatch(null);
    setBattleReport(null);
    setTokensThisRound(0);

    pendingTournament.current = null;
    pendingChicken.current = null;
    pendingResult.current = null;
    pendingBattleReport.current = null;
    pendingTokens.current = 0;

    presentationCompleted.current = false;

    try {
      const previousTokens =
        tournament.tokensAwarded;

      const resolved =
        await resolveTournamentFight(tournament.id);

      if (
        !resolved.tournament ||
        !resolved.chicken ||
        !resolved.result
      ) {
        throw new Error(
          "Tournament fight returned incomplete data",
        );
      }

      /**
       * DO NOT apply these to visible tournament state yet.
       *
       * The player still needs to watch ContinuousBattle.
       */
      pendingTournament.current =
        resolved.tournament;

      pendingChicken.current = resolved.chicken;

      pendingResult.current = resolved.result;

      pendingBattleReport.current =
        resolved.battleReport ?? null;

      pendingTokens.current = Math.max(
        0,
        resolved.tournament.tokensAwarded -
          previousTokens,
      );

      /**
       * Now start the actual visible continuous arena.
       */
      setPhase("live");
    } catch (reason) {
      console.error(reason);

      setLiveOpponent(null);

      setError(
        reason instanceof Error
          ? reason.message
          : "The tournament fight could not be started",
      );

      setPhase("error");
    } finally {
      setPreparingFight(false);
    }
  }

  /**
   * ---------------------------------------------------------------------
   * CONTINUOUS BATTLE PRESENTATION COMPLETE
   * ---------------------------------------------------------------------
   *
   * ContinuousBattle's onComplete gives us its local MatchResult.
   *
   * Just like your existing PvE BattlePage, we don't use that local result
   * as persistence here. The authoritative tournament result has already
   * been produced by the backend.
   *
   * onComplete means:
   *
   * "The player has finished WATCHING the continuous fight."
   */
  const completePresentation = useCallback(() => {
    if (presentationCompleted.current) {
      return;
    }

    presentationCompleted.current = true;

    const resolvedTournament =
      pendingTournament.current;

    const resolvedChicken =
      pendingChicken.current;

    const resolvedResult =
      pendingResult.current;

    const opponent = liveOpponent;

    if (
      !resolvedTournament ||
      !resolvedChicken ||
      !resolvedResult ||
      !opponent
    ) {
      setError(
        "The arena finished, but the tournament result is missing",
      );

      setPhase("error");
      return;
    }

    /**
     * NOW reveal the persisted server changes.
     */
    setTournament(resolvedTournament);
    setChicken(resolvedChicken);

    setLastMatch({
      result: resolvedResult,
      opponent,
    });

    setBattleReport(
      pendingBattleReport.current,
    );

    setTokensThisRound(
      pendingTokens.current,
    );

    setLiveOpponent(null);

    /**
     * Clear refs after committing.
     */
    pendingTournament.current = null;
    pendingChicken.current = null;
    pendingResult.current = null;
    pendingBattleReport.current = null;
    pendingTokens.current = 0;

    /**
     * Tournament-specific post-fight flow.
     */
    setPhase("round-banner");
  }, [liveOpponent]);

  /**
   * ---------------------------------------------------------------------
   * CONTINUE AFTER SCORECARD
   * ---------------------------------------------------------------------
   */
  function handleContinue() {
    if (tournament?.status === "complete") {
      setPhase("final");
      return;
    }

    setPhase("roster");
  }

  /**
   * =====================================================================
   * RENDER
   * =====================================================================
   */

  /**
   * ---------------------------------------------------------------------
   * LOADING / ERROR
   * ---------------------------------------------------------------------
   */
  if (phase === "loading" || phase === "error") {
    return (
      <main className="min-h-screen bg-(--color-ink) p-6">
        {phase === "error" ? (
          <>
            <p className="text-sm text-red-400">
              {error}
            </p>

            <button
              type="button"
              className="mt-4 block text-sm underline"
              onClick={() => {
                setError(null);

                if (tournament) {
                  setPhase(
                    tournament.status === "complete"
                      ? "final"
                      : "roster",
                  );
                } else {
                  setPhase("picker");
                }
              }}
            >
              Return to tournament
            </button>
          </>
        ) : (
          <p className="text-sm opacity-70">
            Loading...
          </p>
        )}

        <Link
          href="/coop"
          className="mt-3 inline-block text-sm underline"
        >
          ← Back to Coop
        </Link>
      </main>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * ENTRY
   * ---------------------------------------------------------------------
   */
  if (phase === "picker" && chicken) {
    if (!selectedEvent) {
      return (
        <TournamentShell context="Tournament entry">
          <section className="tournament-panel mx-auto mt-16 max-w-xl p-8 text-center">
            <p className="tournament-kicker">
              Entry required
            </p>

            <h1 className="mt-3 font-display text-3xl">
              Choose a championship event
            </h1>

            <p className="tournament-copy mt-3">
              Return to the circuit to select the
              tournament your fighter will enter.
            </p>

            <Link
              href="/tournament"
              className="tournament-action mt-6 inline-block"
            >
              Championship circuit
            </Link>
          </section>
        </TournamentShell>
      );
    }

    return (
      <TournamentShell
        context={`${selectedEvent.name} · Entry confirmation`}
        footer={
          <>
            <Link
              href="/tournament"
              className="tournament-action"
            >
              Back to circuit
            </Link>

            <TournamentAction
              className="tournament-action-primary"
              onClick={handleStart}
            >
              Confirm entry
            </TournamentAction>
          </>
        }
      >
        <section className="tournament-panel tournament-panel-strong mx-auto mt-14 max-w-2xl p-7 text-center sm:p-10">
          <p className="tournament-kicker">
            The bracket awaits
          </p>

          <h1 className="mt-3 font-display text-3xl text-(--color-parchment)">
            {selectedEvent.name}
          </h1>

          <p className="mt-2 text-xs uppercase tracking-[.16em] text-(--color-gold-bright)">
            {selectedEvent.bracketSize}-bird ·{" "}
            {TIER_LABELS[selectedEvent.tier]} ·
            single elimination
          </p>

          <div className="mx-auto mt-7 max-w-xs">
            <FighterReadout
              label="Registered fighter"
              fighter={chicken}
              highlight
            />
          </div>

          <p className="tournament-copy mx-auto mt-6 max-w-lg">
            Condition carries into every round.
            Injuries persist. Once the draw is made,
            this fighter cannot be replaced.
          </p>
        </section>
      </TournamentShell>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * STARTING TOURNAMENT
   * ---------------------------------------------------------------------
   */
  if (phase === "starting") {
    return (
      <TournamentShell context="Tournament draw">
        <section className="tournament-panel mx-auto mt-24 max-w-lg p-10 text-center">
          <p className="tournament-kicker">
            Championship draw
          </p>

          <p className="mt-4 font-display text-2xl text-(--color-parchment)">
            Building the bracket…
          </p>
        </section>
      </TournamentShell>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * ROUND HUB
   * ---------------------------------------------------------------------
   */
  if (
    phase === "roster" &&
    tournament &&
    chicken
  ) {
    const event = getTournamentDefinition(
      tournament.definitionId,
    );

    const alive = tournament.entrants
      .filter(
        (entrant) =>
          entrant.eliminatedRound === null,
      )
      .sort((a, b) => a.slot - b.slot);

    const opponent =
      currentOpponentEntrant(tournament);

    return (
      <TournamentShell
        context={`${
          event?.name ?? "Championship"
        } · ${roundLabel(
          tournament.totalRounds,
          tournament.currentRound,
        )}`}
        footer={
          <>
            <Link
              href="/coop"
              className="tournament-action"
            >
              Return to coop
            </Link>

            {opponent && (
              <TournamentAction
                className="tournament-action-primary"
                onClick={() =>
                  setPhase("matchup")
                }
              >
                Prepare for match
              </TournamentAction>
            )}
          </>
        }
      >
        <section className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="tournament-kicker">
              Round hub
            </p>

            <h1 className="mt-2 font-display text-3xl text-(--color-parchment) sm:text-4xl">
              {roundLabel(
                tournament.totalRounds,
                tournament.currentRound,
              )}
            </h1>

            <p className="tournament-copy mt-2">
              {alive.length} fighters remain in{" "}
              {event?.name ??
                "the championship"}
              .
            </p>
          </div>

          <div className="tournament-progress">
            <span>Draw</span>

            {Array.from(
              {
                length: tournament.totalRounds,
              },
              (_, index) => (
                <i
                  key={index}
                  className={
                    index <=
                    tournament.currentRound
                      ? "active"
                      : ""
                  }
                />
              ),
            )}

            <span>Final</span>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <FighterReadout
            label="Your fighter"
            fighter={chicken}
            highlight
          />

          {opponent && (
            <FighterReadout
              label="Next opponent"
              fighter={opponent.chicken}
            />
          )}
        </section>

        <TournamentBracket
          size={tournament.size}
          totalRounds={tournament.totalRounds}
          currentRound={tournament.currentRound}
          entrants={tournament.entrants}
          history={tournament.history}
          player={chicken}
        />
      </TournamentShell>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * MATCHUP
   * ---------------------------------------------------------------------
   */
  if (
    phase === "matchup" &&
    tournament &&
    chicken
  ) {
    const opponentEntrant =
      currentOpponentEntrant(tournament);

    if (!opponentEntrant) {
      return (
        <TournamentShell context="Tournament">
          <section className="tournament-panel mx-auto mt-24 max-w-xl p-8 text-center">
            <p className="text-red-300">
              No opponent was found for this round.
            </p>
          </section>
        </TournamentShell>
      );
    }

    return (
      <main className="min-h-screen bg-(--color-ink)">
        <MatchupScreen
          chicken={chicken}
          opponent={opponentEntrant.chicken}
          fighting={preparingFight}
          onFight={handleFight}
          eyebrow={
            getTournamentDefinition(
              tournament.definitionId,
            )?.name ?? "Championship"
          }
          title={roundLabel(
            tournament.totalRounds,
            tournament.currentRound,
          )}
          subtitle={
            tournament.currentRound ===
            tournament.totalRounds - 1
              ? "The winner is crowned champion."
              : `Winner advances to the ${roundLabel(
                  tournament.totalRounds,
                  tournament.currentRound + 1,
                )}.`
          }
          matchInfo={`Round ${
            tournament.currentRound + 1
          } of ${tournament.totalRounds}`}
        />
      </main>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * CONTINUOUS BATTLE
   * ---------------------------------------------------------------------
   *
   * This now matches your normal BattlePage pattern.
   *
   * ContinuousBattle contains:
   *
   * - CombatSession
   * - 60 Hz continuous update
   * - tactical commands
   * - engagement phases
   * - circling / stalking
   * - clash movement
   * - animation intent
   * - camera director
   * - VFX
   * - audio
   *
   * TournamentPage does NOT reproduce any of those systems.
   */
  if (
    phase === "live" &&
    chicken &&
    liveOpponent
  ) {
    return (
      <main className="min-h-screen bg-(--color-ink)">
        <div className="relative">
          <ContinuousBattle
            chickenA={chicken}
            chickenB={liveOpponent}
            autoStart
            audioEnabled={audioEnabled}
            onToggleAudio={toggleAudio}
            onComplete={completePresentation}
          />
        </div>
      </main>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * OFFICIAL RESULT
   * ---------------------------------------------------------------------
   */
  if (
    phase === "round-banner" &&
    lastMatch &&
    chicken
  ) {
    const won =
      lastMatch.result.winnerId === chicken.id;

    return (
      <main className="min-h-screen bg-(--color-ink)">
        <TournamentShell context="Official result">
          <section className="tournament-panel tournament-panel-strong mx-auto mt-24 max-w-3xl p-8 text-center sm:p-14">
            <p className="tournament-kicker">
              {lastMatch.result.outcomeReason}
            </p>

            <p
              className={`tournament-result-word mt-5 ${
                won
                  ? "text-(--color-gold-bright)"
                  : "text-red-300"
              }`}
            >
              {won ? "Victory" : "Defeated"}
            </p>

            <p className="mt-5 font-display text-xl text-(--color-parchment)">
              {chicken.name}{" "}
              {won ? "defeats" : "falls to"}{" "}
              {lastMatch.opponent.name}
            </p>
          </section>
        </TournamentShell>
      </main>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * SCORECARD
   * ---------------------------------------------------------------------
   */
  if (
    phase === "report" &&
    tournament &&
    chicken
  ) {
    return (
      <TournamentShell
        context={`${
          getTournamentDefinition(
            tournament.definitionId,
          )?.name ?? "Championship"
        } · Round result`}
        footer={
          <TournamentAction
            className="tournament-action-primary"
            onClick={handleContinue}
          >
            {tournament.status === "complete"
              ? "See tournament summary"
              : "Return to round hub"}
          </TournamentAction>
        }
      >
        <section className="tournament-panel mx-auto mt-8 max-w-2xl p-3 sm:p-5">
          <div className="mb-5 px-2">
            <p className="tournament-kicker">
              Official scorecard
            </p>

            <h1 className="mt-2 font-display text-2xl text-(--color-parchment)">
              {roundLabel(
                tournament.totalRounds,
                Math.max(
                  0,
                  tournament.currentRound - 1,
                ),
              )}{" "}
              complete
            </h1>
          </div>

          {battleReport ? (
            <BattleReportPanel
              report={battleReport}
            />
          ) : (
            <div className="rounded-lg border border-white/10 p-6 text-center text-sm text-(--color-text-muted)">
              The round has been recorded.
            </div>
          )}
        </section>

        {tokensThisRound > 0 && (
          <p className="mt-4 text-center text-sm text-(--color-gold-bright)">
            +{tokensThisRound} Tournament Tokens
          </p>
        )}
      </TournamentShell>
    );
  }

  /**
   * ---------------------------------------------------------------------
   * TOURNAMENT SUMMARY
   * ---------------------------------------------------------------------
   */
  if (
    phase === "final" &&
    tournament &&
    chicken
  ) {
    return (
      <TournamentShell
        context={`${
          getTournamentDefinition(
            tournament.definitionId,
          )?.name ?? "Championship"
        } · Tournament summary`}
        footer={
          <Link
            href="/coop"
            className="tournament-action tournament-action-primary"
          >
            Return to coop
          </Link>
        }
      >
        <section className="tournament-panel tournament-panel-strong mx-auto mt-12 max-w-2xl p-7 sm:p-10">
          <div className="mb-7 text-center">
            <p className="tournament-kicker">
              Championship ceremony
            </p>

            <p className="tournament-result-word mt-5 text-(--color-gold-bright)">
              {tournament.placement === 1
                ? "Champion"
                : "Complete"}
            </p>

            <p className="mt-4 font-display text-2xl text-(--color-parchment)">
              {chicken.name}
            </p>

            <p className="mt-1 text-sm text-(--color-text-muted)">
              {
                PLACEMENT_LABEL[
                  String(tournament.placement)
                ]
              }
            </p>

            {tournament.tokensAwarded > 0 && (
              <p className="mt-3 text-sm text-(--color-gold-bright)">
                +{tournament.tokensAwarded}{" "}
                Tournament Tokens total
              </p>
            )}
          </div>

          <p className="tournament-kicker mb-3">
            Tournament record
          </p>

          <ul className="flex flex-col gap-2">
            {tournament.history.map(
              (roundMatches, index) => {
                const match =
                  roundMatches.find(
                    (item) =>
                      item.isPlayerMatch,
                  );

                if (!match) {
                  return null;
                }

                const won =
                  match.result.winnerId ===
                  chicken.id;

                return (
                  <li
                    key={index}
                    className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                      won
                        ? "bg-emerald-900/20 text-emerald-300"
                        : "bg-red-900/20 text-red-300"
                    }`}
                  >
                    <span>
                      {roundLabel(
                        tournament.totalRounds,
                        index,
                      )}
                    </span>

                    <span className="font-semibold uppercase tracking-wide">
                      {won ? "Win" : "Loss"} ·{" "}
                      {
                        match.result
                          .outcomeReason
                      }
                    </span>
                  </li>
                );
              },
            )}
          </ul>
        </section>
      </TournamentShell>
    );
  }

  return null;
}
