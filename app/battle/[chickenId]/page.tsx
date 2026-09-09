"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { Chicken, CombatLogEntry, CombatResult } from "@/lib/types";
import type { PveEncounterDefinition } from "@/lib/combat";
import type { PlayerCommand } from "@/lib/combat/command";
import type { BattleReport } from "@/lib/combat/battleReport";
import BattleCanvas from "@/components/BattleCanvas";
import CombatResultsScreen from "@/components/CombatResultsScreen";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { setPlayerCredits } from "@/lib/playerStore";

type Phase = "loading" | "ready" | "fighting" | "replaying" | "result" | "error";

type Snapshot = {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  momentum: number;
  mentalState: string;
  commandPoints: number;
  pendingCommand: PlayerCommand | null;
};

type StartResponse = {
  sessionId: string;
  chickenA: Chicken;
  chickenB: Chicken;
  snapshotA: Snapshot;
  snapshotB: Snapshot;
};

type StepResponse = {
  entries: CombatLogEntry[];
  fightOver: boolean;
  durationMs: number;
  snapshotA: Snapshot;
  snapshotB: Snapshot;
  result?: CombatResult;
  log?: CombatResult["log"];
  chicken?: Chicken;
  battleReport?: BattleReport;
  creditsEarned?: number;
  credits?: number;
};

const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";

/** First step has nothing queued yet for BattleCanvas to animate, so there's no catch-up signal to wait on. */
const INITIAL_STEP_DELAY_MS = 900;
/**
 * Safety net only: BattleCanvas's `onCaughtUp` is what actually paces
 * stepping (see `requestNextStep`) so the server never gets further ahead
 * of the animation than the turn it just resolved. This is just a backstop
 * for when that signal can't fire — e.g. the tab is backgrounded and
 * requestAnimationFrame is throttled — so the fight doesn't stall forever.
 */
const FALLBACK_STEP_DELAY_MS = 4000;

const COMMAND_LABEL: Record<Exclude<PlayerCommand, "FORCE_ENGAGEMENT">, { label: string; emoji: string }> = {
  PRESS: { label: "Press", emoji: "⚡" },
  WAIT: { label: "Wait", emoji: "🛡️" },
  RECOVER: { label: "Recover", emoji: "💨" },
};

export default function BattlePage({
  params,
}: {
  params: Promise<{ chickenId: string }>;
}) {
  const { chickenId } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [opponent, setOpponent] = useState<Chicken | null>(null);
  const [encounter, setEncounter] = useState<PveEncounterDefinition | null>(null);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [updatedChicken, setUpdatedChicken] = useState<Chicken | null>(null);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [battleReport, setBattleReport] = useState<BattleReport | null>(null);
  const [snapshotA, setSnapshotA] = useState<Snapshot | null>(null);
  const [snapshotB, setSnapshotB] = useState<Snapshot | null>(null);
  const [queuedCommand, setQueuedCommand] = useState<PlayerCommand | null>(null);
  const [fightOver, setFightOver] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  // Fed to <BattleCanvas live logRef={logRef}> — pushed into in place, never
  // reassigned, so appending a resolved exchange doesn't reset the 3D
  // scene's audio/camera/roam state. Passed down as the ref object itself
  // (never dereferenced here during render) — BattleCanvas reads `.current`
  // inside its own effect, same as its other ref props.
  const logRef = useRef<CombatLogEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedCommandRef = useRef<PlayerCommand | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const generationRef = useRef(0);
  // Guards the step→catch-up→step cycle: cleared whenever a step is pending
  // so the fallback timer and BattleCanvas's onCaughtUp can't both fire the
  // next stepOnce for the same turn.
  const stepPendingRef = useRef(false);

  function toggleAudio() {
    setAudioEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(AUDIO_STORAGE_KEY, String(next));
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const chickenRes = await fetch(`/api/chickens/${chickenId}`);
      if (!chickenRes.ok) {
        if (!cancelled) {
          setError("Chicken not found");
          setPhase("error");
        }
        return;
      }
      const loadedChicken: Chicken = await chickenRes.json();

      const opponentRes = await fetch(`/api/chickens/${chickenId}/opponent`, { method: "POST" });
      if (!opponentRes.ok) {
        const body = await opponentRes.json().catch(() => ({}));
        if (!cancelled) {
          setError(body.error ?? "This chicken cannot battle right now");
          setPhase("error");
        }
        return;
      }
      const { opponent: loadedOpponent, encounter: loadedEncounter } = (await opponentRes.json()) as {
        opponent: Chicken;
        encounter: PveEncounterDefinition;
      };

      if (!cancelled) {
        setChicken(loadedChicken);
        setOpponent(loadedOpponent);
        setEncounter(loadedEncounter);
        setPhase("ready");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [chickenId]);

  const stepOnce = useCallback(
    async (generation: number) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;

      const command = queuedCommandRef.current;
      const res = await fetch(`/api/chickens/${chickenId}/fight/${sessionId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (generation !== generationRef.current) return; // a newer fight started (or page left) while this was in flight
      if (!res.ok) {
        setError("Lost the fight connection.");
        setPhase("error");
        return;
      }

      queuedCommandRef.current = null;
      setQueuedCommand(null);
      const body: StepResponse = await res.json();
      setSnapshotA(body.snapshotA);
      setSnapshotB(body.snapshotB);
      logRef.current.push(...body.entries);

      if (body.fightOver) {
        setFightOver(true);
        setResult(body.result ?? null);
        setUpdatedChicken(body.chicken ?? null);
        setCreditsEarned(body.creditsEarned ?? 0);
        if (typeof body.credits === "number") setPlayerCredits(body.credits);
        setBattleReport(body.battleReport ?? null);
        setPhase("replaying");
        return;
      }

      // The next step is normally requested by `handleCaughtUp`, fired once
      // BattleCanvas has actually finished animating everything just pushed
      // above — that's what keeps the HUD and the 3D fight in lockstep
      // instead of the server racing ahead turn after turn on a fixed timer.
      // This is only the backstop for when that signal never arrives.
      stepPendingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (stepPendingRef.current) return;
        stepPendingRef.current = true;
        stepOnce(generation);
      }, FALLBACK_STEP_DELAY_MS);
    },
    [chickenId]
  );

  const handleCaughtUp = useCallback(() => {
    if (stepPendingRef.current) return;
    stepPendingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    stepOnce(generationRef.current);
  }, [stepOnce]);

  async function handleFight() {
    if (!chicken || !opponent) return;
    const generation = ++generationRef.current;
    setPhase("fighting");
    setFightOver(false);
    setQueuedCommand(null);
    queuedCommandRef.current = null;
    logRef.current = [];

    const res = await fetch(`/api/chickens/${chickenId}/fight/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponent }),
    });

    if (generation !== generationRef.current) return;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "The fight could not be started");
      setPhase("error");
      return;
    }

    const body: StartResponse = await res.json();
    sessionIdRef.current = body.sessionId;
    setSnapshotA(body.snapshotA);
    setSnapshotB(body.snapshotB);
    // Nothing's queued for BattleCanvas to animate yet, so there's no
    // catch-up signal to wait on for this very first turn.
    stepPendingRef.current = true;
    timerRef.current = setTimeout(() => stepOnce(generation), INITIAL_STEP_DELAY_MS);
  }

  function issueCommand(command: PlayerCommand) {
    if (!snapshotA || snapshotA.commandPoints < 1) return;
    queuedCommandRef.current = command;
    setQueuedCommand(command);
  }

  useEffect(() => {
    return () => {
      generationRef.current += 1; // invalidate any in-flight step for this mount
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleFightAgain() {
    if (updatedChicken) {
      setChicken(updatedChicken);
      setUpdatedChicken(null);
    }
    sessionIdRef.current = null;
    setResult(null);
    setBattleReport(null);
    setPhase("loading");
    fetch(`/api/chickens/${chickenId}/opponent`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          setPhase("error");
          setError("This chicken cannot battle right now");
          return;
        }
        const { opponent: nextOpponent, encounter: nextEncounter } = (await res.json()) as {
          opponent: Chicken;
          encounter: PveEncounterDefinition;
        };
        setOpponent(nextOpponent);
        setEncounter(nextEncounter);
        setPhase("ready");
      });
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">⚔️ Loading battle...</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg border-t-2 border-red-800/60 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <Link href="/coop" className="mt-4 inline-block text-(--color-gold-bright) hover:underline">
            ← Back to Coop
          </Link>
        </div>
      </main>
    );
  }

  if (!chicken || !opponent) return null;

  return (
    <main className="min-h-screen bg-(--color-ink)">
      <div className={phase === "replaying" ? "mx-auto p-6 pb-0" : "mx-auto p-6"}>
        <div className="panel-wood mb-4 flex items-center justify-between w-full rounded-lg p-4">
          <Link href="/coop" className="text-sm text-(--color-gold-bright) hover:underline">
            ← Coop
          </Link>
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-(--foreground)">
            ⚔️ {chicken.name} <span className="text-(--color-text-muted)">vs</span> {opponent.name}
          </h1>
          <button
            type="button"
            onClick={toggleAudio}
            aria-label={audioEnabled ? "Mute audio" : "Unmute audio"}
            aria-pressed={audioEnabled}
            className="rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1.5 text-lg leading-none hover:bg-black/50"
          >
            {audioEnabled ? "🔊" : "🔇"}
          </button>
        </div>

        {phase === "ready" && (
          <MatchupScreen
            chicken={chicken}
            opponent={opponent}
            encounter={encounter}
            fighting={false}
            onFight={handleFight}
          />
        )}

        {phase === "fighting" && snapshotA && snapshotB && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FighterHud name={chicken.name} snapshot={snapshotA} highlight />
              <FighterHud name={opponent.name} snapshot={snapshotB} />
            </div>
            <div className="panel-wood rounded-lg p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-(--color-text-muted)">
                Your commands ({snapshotA.commandPoints.toFixed(1)}/3 CP)
                {queuedCommand && <span className="ml-2 text-(--color-gold-bright)">queued: {queuedCommand}</span>}
              </p>
              <div className="flex gap-2">
                {(Object.keys(COMMAND_LABEL) as Array<keyof typeof COMMAND_LABEL>).map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    disabled={snapshotA.commandPoints < 1}
                    onClick={() => issueCommand(cmd)}
                    className="flex-1 rounded bg-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {COMMAND_LABEL[cmd].emoji} {COMMAND_LABEL[cmd].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === "result" && result && (
          <CombatResultsScreen
            result={result}
            playerChicken={updatedChicken ?? chicken}
            opponent={opponent}
            creditsEarned={creditsEarned}
            battleReport={battleReport ?? undefined}
            onFightAgain={handleFightAgain}
          />
        )}
      </div>

      {(phase === "fighting" || phase === "replaying") && (
        <BattleCanvas
          chickenA={chicken}
          chickenB={opponent}
          logRef={logRef}
          audioEnabled={audioEnabled}
          live
          fightOver={fightOver}
          onReplayEnd={() => setPhase("result")}
          onCaughtUp={handleCaughtUp}
        />
      )}
    </main>
  );
}

function FighterHud({ name, snapshot, highlight }: { name: string; snapshot: Snapshot; highlight?: boolean }) {
  const hpPct = Math.max(0, Math.round((snapshot.hp / snapshot.maxHp) * 100));
  const stamPct = Math.max(0, Math.round((snapshot.stamina / snapshot.maxStamina) * 100));
  return (
    <div className={`panel-wood rounded-lg p-4 ${highlight ? "border-t-2 border-(--color-gold)/50" : ""}`}>
      <p className="mb-1 font-semibold text-(--foreground)">{name}</p>
      <p className="mb-1 text-xs uppercase tracking-wide text-(--color-text-muted)">{snapshot.mentalState}</p>
      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-black/30">
        <div className="h-full bg-red-500" style={{ width: `${hpPct}%` }} />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
        <div className="h-full bg-yellow-500" style={{ width: `${stamPct}%` }} />
      </div>
      {snapshot.pendingCommand && (
        <p className="mt-1 text-xs text-(--color-gold-bright)">Following: {snapshot.pendingCommand}</p>
      )}
    </div>
  );
}
