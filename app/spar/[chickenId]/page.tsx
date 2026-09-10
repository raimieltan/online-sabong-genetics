"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import BattleCanvas from "@/components/BattleCanvas";
import { commandFollowedTag, commentaryForImpact, commentaryForResult } from "@/lib/liveCommentary";
import type { PlayerCommand } from "@/lib/combat/command";
import type { CombatLogEntry, CombatResult, Chicken } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";

type Phase = "loading" | "ready" | "fighting" | "result" | "error";

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
  turn: number;
  entries: CombatLogEntry[];
  fightOver: boolean;
  durationMs: number;
  snapshotA: Snapshot;
  snapshotB: Snapshot;
  result?: CombatResult;
};

/** First step has no server-reported exchange duration yet to pace off. */
const INITIAL_STEP_DELAY_MS = 900;
/** Sanity bounds so a pathological duration can't stall the feed or flash by unreadably. */
const MIN_STEP_DELAY_MS = 400;
const MAX_STEP_DELAY_MS = 2600;

function clampStepDelay(durationMs: number): number {
  return Math.min(MAX_STEP_DELAY_MS, Math.max(MIN_STEP_DELAY_MS, durationMs));
}

const COMMAND_LABEL: Record<Exclude<PlayerCommand, "FORCE_ENGAGEMENT">, { label: string; emoji: string }> = {
  PRESS: { label: "Press", emoji: "⚡" },
  WAIT: { label: "Wait", emoji: "🛡️" },
  RECOVER: { label: "Recover", emoji: "💨" },
};

/**
 * A sandbox to actually feel a rooster's strategy-fighter behavior (identity,
 * tells, momentum, mental state) instead of just watching a pre-baked replay:
 * every turn is a real, separate step against a live `BattleSession` — you
 * coach side A (PRESS/WAIT/RECOVER) while the opponent runs on Auto-Coach.
 * Doesn't touch the roster (no health/condition/XP persisted) — purely for
 * trying a fighter out.
 */
export default function SparPage({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chickenA, setChickenA] = useState<Chicken | null>(null);
  const [chickenB, setChickenB] = useState<Chicken | null>(null);
  const [snapshotA, setSnapshotA] = useState<Snapshot | null>(null);
  const [snapshotB, setSnapshotB] = useState<Snapshot | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [queuedCommand, setQueuedCommand] = useState<PlayerCommand | null>(null);
  const [fightOver, setFightOver] = useState(false);

  // Fed to <BattleCanvas live logRef={logRef}> — pushed into in place, never
  // reassigned, so appending a resolved exchange doesn't reset the 3D
  // scene's audio/camera/roam state. Passed down as the ref object itself
  // (never dereferenced here during render) — BattleCanvas reads `.current`
  // inside its own effect, same as its other ref props.
  const logRef = useRef<CombatLogEntry[]>([]);

  // The turn loop reads/clears these refs at call time rather than closing
  // over state, so a command clicked mid-flight is never lost to a stale
  // closure, and — the actual bug this fixed — a step that queues nothing
  // (the common case) still reschedules the next one instead of stalling
  // (state staying `null` triggers no re-render, so a `useEffect([...,
  // stepOnce])`-driven timer never fires again once nothing is queued).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedCommandRef = useRef<PlayerCommand | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  async function startSpar() {
    const generation = ++generationRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("loading");
    setFeed([]);
    setResult(null);
    setQueuedCommand(null);
    setFightOver(false);
    queuedCommandRef.current = null;
    logRef.current = [];

    const res = await fetch("/api/spar/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chickenId }),
    });
    if (generation !== generationRef.current) return; // superseded by a newer spar/unmount
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not start a spar right now.");
      setPhase("error");
      return;
    }
    const body: StartResponse = await res.json();
    sessionIdRef.current = body.sessionId;
    setSessionId(body.sessionId);
    setChickenA(body.chickenA);
    setChickenB(body.chickenB);
    setSnapshotA(body.snapshotA);
    setSnapshotB(body.snapshotB);
    setFeed([`${body.chickenA.name} squares off against ${body.chickenB.name}.`]);
    setPhase("fighting");
    timerRef.current = setTimeout(() => stepOnce(generation), INITIAL_STEP_DELAY_MS);
  }

  const stepOnce = useCallback(async (generation: number) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    const command = queuedCommandRef.current;
    const res = await fetch(`/api/spar/${sessionId}/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    if (generation !== generationRef.current) return; // a newer spar started (or page left) while this was in flight
    if (!res.ok) {
      setError("Lost the spar connection.");
      setPhase("error");
      return;
    }
    queuedCommandRef.current = null;
    setQueuedCommand(null);
    const body: StepResponse = await res.json();
    setSnapshotA(body.snapshotA);
    setSnapshotB(body.snapshotB);
    logRef.current.push(...body.entries);

    setChickenA((prevA) => {
      setChickenB((prevB) => {
        if (prevA && prevB && body.entries.length) {
          const lines = body.entries.map((entry) => {
            const attackerName = entry.attackerId === prevA.id ? prevA.name : prevB.name;
            const defenderName = entry.defenderId === prevA.id ? prevA.name : prevB.name;
            const { caption } = commentaryForImpact(entry);
            const base = entry.isMiss
              ? `${attackerName} swings and misses ${defenderName}.`
              : `${attackerName} lands ${(entry.attackerAction ?? "an attack").toLowerCase().replace("_", " ")} on ${defenderName} for ${Math.round(entry.damage)} dmg${entry.isCrit ? " — critical!" : ""}.`;
            // Only side A is the player's own fighter here — a command "followed"
            // on side B (the sparring partner, on Auto-Coach) isn't the player's doing.
            const followedOwnCommand =
              (entry.attackerId === prevA.id && entry.attackerCommandFollowed) ||
              (entry.defenderId === prevA.id && entry.defenderCommandFollowed);
            const tag = followedOwnCommand ? commandFollowedTag(body.snapshotA.pendingCommand) : null;
            const line = caption ?? base;
            return tag ? `${line} ${tag}` : line;
          });
          setFeed((prev) => [...prev.slice(-30), ...lines]);
        }
        return prevB;
      });
      return prevA;
    });

    if (body.fightOver && body.result) {
      setFightOver(true);
      setResult(body.result);
      setChickenA((a) => {
        setChickenB((b) => {
          if (a && b) {
            const winnerName = body.result!.winnerId === a.id ? a.name : b.name;
            setFeed((prev) => [...prev, commentaryForResult(body.result!, winnerName)]);
          }
          return b;
        });
        return a;
      });
      setPhase("result");
      return;
    }

    timerRef.current = setTimeout(() => stepOnce(generation), clampStepDelay(body.durationMs));
  }, []);

  useEffect(() => {
    startSpar();
    return () => {
      generationRef.current += 1; // invalidate any in-flight step/start for this mount
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chickenId]);

  function issueCommand(command: PlayerCommand) {
    if (!snapshotA || snapshotA.commandPoints < 1) return;
    queuedCommandRef.current = command;
    setQueuedCommand(command);
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🎮 Setting up the spar...</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg border-t-2 border-red-800/60 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <Link href={`/chicken/${chickenId}`} className="mt-4 inline-block text-(--color-gold-bright) hover:underline">
            ← Back
          </Link>
        </div>
      </main>
    );
  }

  if (!chickenA || !chickenB || !snapshotA || !snapshotB) return null;

  return (
    <main className="min-h-screen bg-(--color-ink) p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PageHeader
          eyebrow="Sparring Yard"
          title={<>🎮 {chickenA.name} <span className="text-(--color-text-muted)">vs</span> {chickenB.name}</>}
          description={<Link href={`/chicken/${chickenId}`} className="hover:underline">← Back</Link>}
          right={<span className="text-xs uppercase tracking-wide text-(--color-text-muted)">Test only — no record kept</span>}
        />

        <div className="panel-wood overflow-hidden rounded-lg">
          <BattleCanvas
            chickenA={chickenA}
            chickenB={chickenB}
            logRef={logRef}
            audioEnabled
            live
            fightOver={fightOver}
            onReplayEnd={() => {}}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FighterCard name={chickenA.name} snapshot={snapshotA} highlight />
          <FighterCard name={chickenB.name} snapshot={snapshotB} />
        </div>

        {phase === "fighting" && (
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
        )}

        <div className="panel-wood max-h-64 overflow-y-auto rounded-lg p-4">
          <ul className="flex flex-col gap-1 text-sm text-(--color-text-muted)">
            {feed.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        {phase === "result" && result && (
          <div className="panel-wood flex flex-col items-center gap-2 rounded-lg p-5 text-center">
            <p className="font-comic text-2xl text-(--color-gold-bright)">
              {result.winnerId === chickenA.id ? chickenA.name : chickenB.name} wins!
            </p>
            <button
              type="button"
              onClick={startSpar}
              className="mt-2 rounded bg-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/20"
            >
              🔁 Spar again
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function FighterCard({ name, snapshot, highlight }: { name: string; snapshot: Snapshot; highlight?: boolean }) {
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
