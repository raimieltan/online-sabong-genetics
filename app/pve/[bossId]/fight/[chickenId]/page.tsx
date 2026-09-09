"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { commentaryForImpact, commentaryForResult } from "@/lib/liveCommentary";
import type { PlayerCommand } from "@/lib/combat/command";
import type { Chicken, CombatLogEntry } from "@/lib/types";
import type { BossListEntry } from "@/lib/pve/types";
import type { BossFightResult } from "@/lib/pve/service";
import CombatResultsScreen from "@/components/CombatResultsScreen";

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
  chicken: Chicken;
  bossFighter: Chicken;
  snapshotA: Snapshot;
  snapshotB: Snapshot;
};

type StepResponse = {
  turn: number;
  entries: CombatLogEntry[];
  fightOver: boolean;
  snapshotA: Snapshot;
  snapshotB: Snapshot;
  outcome?: BossFightResult;
};

const TURN_INTERVAL_MS = 1100;

const COMMAND_LABEL: Record<Exclude<PlayerCommand, "FORCE_ENGAGEMENT">, { label: string; emoji: string }> = {
  PRESS: { label: "Press", emoji: "⚡" },
  WAIT: { label: "Wait", emoji: "🛡️" },
  RECOVER: { label: "Recover", emoji: "💨" },
};

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

/**
 * Live, coached boss fight — same turn-by-turn PRESS/WAIT/RECOVER command
 * loop as `/spar`, except this one is real: it persists rewards, roster
 * updates and boss progress the moment the fight ends (see
 * `finishBossFight`). The player coaches side A; the boss always runs
 * Auto-Coached.
 */
export default function BossFightPage({
  params,
}: {
  params: Promise<{ bossId: string; chickenId: string }>;
}) {
  const { bossId, chickenId } = use(params);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<BossListEntry | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chickenA, setChickenA] = useState<Chicken | null>(null);
  const [chickenB, setChickenB] = useState<Chicken | null>(null);
  const [snapshotA, setSnapshotA] = useState<Snapshot | null>(null);
  const [snapshotB, setSnapshotB] = useState<Snapshot | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<BossFightResult | null>(null);
  const [queuedCommand, setQueuedCommand] = useState<PlayerCommand | null>(null);

  // Same stale-closure guard as /spar: the loop reads/clears these refs at
  // call time so a command clicked mid-flight is never lost, and a step that
  // queues nothing still reschedules the next one.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedCommandRef = useRef<PlayerCommand | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const bossesRes = await fetch("/api/pve/bosses");
      const { bosses } = (await bossesRes.json()) as { bosses: BossListEntry[] };
      const bossEntry = bosses.find((e) => e.boss.id === bossId) ?? null;
      if (!bossEntry || !bossEntry.progress.unlocked) {
        if (!cancelled) { setError("This boss is locked"); setPhase("error"); }
        return;
      }
      if (!cancelled) {
        setEntry(bossEntry);
        setPhase("ready");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [bossId, chickenId]);

  async function startFight() {
    const generation = ++generationRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("fighting");
    setError(null);
    setFeed([]);
    setOutcome(null);
    setQueuedCommand(null);
    queuedCommandRef.current = null;

    const res = await fetch(`/api/pve/bosses/${bossId}/fight/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chickenId }),
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
    setSessionId(body.sessionId);
    setChickenA(body.chicken);
    setChickenB(body.bossFighter);
    setSnapshotA(body.snapshotA);
    setSnapshotB(body.snapshotB);
    setFeed([`${body.chicken.name} squares off against ${body.bossFighter.name}.`]);
    timerRef.current = setTimeout(() => stepOnce(generation), TURN_INTERVAL_MS);
  }

  const stepOnce = useCallback(async (generation: number) => {
    const sid = sessionIdRef.current;
    if (!sid) return;

    const command = queuedCommandRef.current;
    const res = await fetch(`/api/pve/bosses/${bossId}/fight/${sid}/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    if (generation !== generationRef.current) return;
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

    setChickenA((prevA) => {
      setChickenB((prevB) => {
        if (prevA && prevB && body.entries.length) {
          const lines = body.entries.map((e) => {
            const attackerName = e.attackerId === prevA.id ? prevA.name : prevB.name;
            const defenderName = e.defenderId === prevA.id ? prevA.name : prevB.name;
            const { caption } = commentaryForImpact(e);
            const base = e.isMiss
              ? `${attackerName} swings and misses ${defenderName}.`
              : `${attackerName} lands ${(e.attackerAction ?? "an attack").toLowerCase().replace("_", " ")} on ${defenderName} for ${Math.round(e.damage)} dmg${e.isCrit ? " — critical!" : ""}.`;
            return caption ?? base;
          });
          setFeed((prev) => [...prev.slice(-30), ...lines]);
        }
        return prevB;
      });
      return prevA;
    });

    if (body.fightOver && body.outcome) {
      setOutcome(body.outcome);
      setChickenA((a) => {
        setChickenB((b) => {
          if (a && b) {
            const winnerName = body.outcome!.result.winnerId === a.id ? a.name : b.name;
            setFeed((prev) => [...prev, commentaryForResult(body.outcome!.result, winnerName)]);
          }
          return b;
        });
        return a;
      });
      setPhase("result");
      return;
    }

    timerRef.current = setTimeout(() => stepOnce(generation), TURN_INTERVAL_MS);
  }, [bossId]);

  useEffect(() => {
    return () => {
      generationRef.current += 1; // invalidate any in-flight step/start on unmount
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function issueCommand(command: PlayerCommand) {
    if (!snapshotA || snapshotA.commandPoints < 1) return;
    queuedCommandRef.current = command;
    setQueuedCommand(command);
  }

  if (phase === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">⚔️ Loading…</main>;
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg border-t-2 border-red-800/60 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <Link href="/pve" className="mt-4 inline-block text-(--color-gold-bright) hover:underline">← Back to PvE</Link>
        </div>
      </main>
    );
  }

  if (!entry) return null;
  const { boss } = entry;

  return (
    <main className="min-h-screen bg-(--color-ink)">
      <div className="mx-auto max-w-3xl p-6">
        <div className="panel-wood mb-4 flex items-center justify-between rounded-lg p-4">
          <Link href={`/pve/${bossId}`} className="text-sm text-(--color-gold-bright) hover:underline">← Boss</Link>
          <h1 className="font-display text-lg font-semibold text-(--foreground)">
            ⚔️ {chickenA?.name ?? "Your rooster"} <span className="text-(--color-text-muted)">vs</span> {boss.name}
          </h1>
          <span className="w-[70px]" />
        </div>

        {(phase === "ready" || (phase === "fighting" && !sessionId)) && (
          <div className="panel-wood rounded-lg p-6 text-center">
            <p className="text-(--color-gold-bright)">{stars(boss.difficulty)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-(--color-text-muted)">
              {boss.styleLabel} · {boss.behaviorLabel}
            </p>
            <p className="mt-4 font-display text-2xl font-semibold text-(--foreground)">{boss.name}</p>
            <p className="mt-2 text-sm text-(--color-text-muted)">{boss.description}</p>
            <button
              type="button"
              disabled={phase === "fighting"}
              onClick={startFight}
              className="mt-6 rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {phase === "fighting" ? "Starting…" : "Start Battle"}
            </button>
          </div>
        )}

        {phase === "fighting" && chickenA && chickenB && snapshotA && snapshotB && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FighterCard name={chickenA.name} snapshot={snapshotA} highlight />
              <FighterCard name={chickenB.name} snapshot={snapshotB} />
            </div>

            <div className="panel-wood mt-4 rounded-lg p-4">
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

            <div className="panel-wood mt-4 max-h-64 overflow-y-auto rounded-lg p-4">
              <ul className="flex flex-col gap-1 text-sm text-(--color-text-muted)">
                {feed.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {phase === "result" && outcome && (
          <CombatResultsScreen
            result={outcome.result}
            playerChicken={outcome.chicken as Chicken}
            opponent={outcome.bossFighter}
            creditsEarned={outcome.rewards.credits}
            battleReport={outcome.battleReport}
            onFightAgain={() => window.location.reload()}
          />
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
