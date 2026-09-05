"use client";

import { useEffect, useRef, useState } from "react";
import type { Chicken, CombatLogEntry } from "@/lib/types";
import { maxHealth } from "@/lib/combat";
import { AudioEngine } from "@/lib/audioEngine";
import { BattleStage3D } from "@/components/chicken3d/BattleStage3D";
import type { CameraCue } from "@/components/chicken3d/BattleStage3D";
import type { FighterAnim } from "@/components/chicken3d/ChickenModel";

interface BattleCanvasProps {
  chickenA: Chicken;
  chickenB: Chicken;
  log: CombatLogEntry[];
  audioEnabled: boolean;
  onReplayEnd: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rot: number;
  vrot: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  alpha: number;
  life: number;
  maxLife: number;
}

/** Display-only fighter state, derived by replaying the server-computed log one entry at a time. */
interface FighterVisual {
  id: string;
  name: string;
  colorScheme: Chicken["colorScheme"];
  hp: number;
  maxHp: number;
  fatigued: boolean;
}

const HIT_ZONE_LABELS: Record<string, string> = {
  head: "HEAD",
  neck: "NECK",
  body: "BODY",
  left_wing: "L WING",
  right_wing: "R WING",
  left_leg: "L LEG",
  right_leg: "R LEG",
};

/**
 * Replays a pre-computed `CombatLogEntry[]` (from `simulateFight`, run server-side)
 * one turn at a time on a canvas. Ported from the legacy `BattleArena` — the
 * animation/particle/audio machinery is unchanged, only the data it replays
 * comes from a fixed log instead of driving a live `BattleEngine`.
 */
export default function BattleCanvas({
  chickenA,
  chickenB,
  log,
  audioEnabled,
  onReplayEnd,
}: BattleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);

  // Live per-frame fighter state, read directly by the 3D models (BattleStage3D)
  // every frame — mutated by the RAF loop below, not by React state.
  const animR1Ref = useRef<FighterAnim>({
    offsetX: 0, offsetY: 0, rot: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0,
  });
  const animR2Ref = useRef<FighterAnim>({
    offsetX: 0, offsetY: 0, rot: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0,
  });

  // Latest attack cue for the 3D camera — same attacker/crit/miss/timing info that
  // drives the 2D lunge below, mirrored here so BattleStage3D's camera can react
  // without duplicating combat logic. `startTime` moving forward is what tells the
  // camera a new attack began; it holds the last cue (doesn't reset to null) so the
  // camera has something to ease back from between turns.
  const cameraCueRef = useRef<CameraCue | null>(null);

  useEffect(() => {
    const audio = new AudioEngine(audioEnabled);
    audioRef.current = audio;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTurnTime = Date.now();
    const TURN_INTERVAL = 550;
    let logIndex = 0;
    let replayEnded = false;

    const maxHpA = maxHealth(chickenA);
    const maxHpB = maxHealth(chickenB);
    const visualA: FighterVisual = {
      id: chickenA.id,
      name: chickenA.name,
      colorScheme: chickenA.colorScheme,
      hp: maxHpA,
      maxHp: maxHpA,
      fatigued: false,
    };
    const visualB: FighterVisual = {
      id: chickenB.id,
      name: chickenB.name,
      colorScheme: chickenB.colorScheme,
      hp: maxHpB,
      maxHp: maxHpB,
      fatigued: false,
    };

    const particles: Particle[] = [];
    const floatingTexts: FloatingText[] = [];

    const animR1 = animR1Ref.current;
    const animR2 = animR2Ref.current;
    Object.assign(animR1, { offsetX: 0, offsetY: 0, rot: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });
    Object.assign(animR2, { offsetX: 0, offsetY: 0, rot: 0, scaleX: 1, scaleY: 1, flash: 0, wingPhase: 0, legPhase: 0 });

    let activeAttack: {
      attacker: "r1" | "r2";
      startTime: number;
      duration: number;
      isCrit: boolean;
      isMiss: boolean;
    } | null = null;

    const spawnFeathers = (x: number, y: number, color: string, count = 12) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color,
          size: 4 + Math.random() * 5,
          alpha: 1, life: 0, maxLife: 30 + Math.random() * 20,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
        });
      }
    };

    const spawnText = (x: number, y: number, text: string, color: string, fontSize = 20) => {
      floatingTexts.push({
        x: x + (Math.random() - 0.5) * 20, y, text, color, fontSize,
        alpha: 1, life: 0, maxLife: 45,
      });
    };

    const animate = () => {
      const now = Date.now();
      const currentAudio = audioRef.current;
      if (!currentAudio) return;

      const width = canvas.width;
      const height = canvas.height;
      const r1BaseX = width * 0.3;
      const r2BaseX = width * 0.7;
      const roosterBaseY = height - 140;

      if (now - lastTurnTime >= TURN_INTERVAL && logIndex < log.length) {
        const entry = log[logIndex];
        logIndex += 1;
        setCurrentTurn(entry.turn);

        const isAAttacking = entry.attackerId === visualA.id;
        const defenderVisual = isAAttacking ? visualB : visualA;
        defenderVisual.hp = Math.max(0, entry.defenderHp);
        defenderVisual.fatigued = defenderVisual.hp < defenderVisual.maxHp * 0.3;

        activeAttack = {
          attacker: isAAttacking ? "r1" : "r2",
          startTime: now,
          duration: 350,
          isCrit: entry.isCrit,
          isMiss: entry.isMiss,
        };
        cameraCueRef.current = {
          attacker: activeAttack.attacker,
          startTime: activeAttack.startTime,
          isCrit: entry.isCrit || entry.isCritical,
          isMiss: entry.isMiss,
        };

        const targetX = isAAttacking ? r2BaseX : r1BaseX;
        const targetColor = isAAttacking ? visualB.colorScheme.body : visualA.colorScheme.body;

        if (entry.isMiss) {
          currentAudio.playMiss();
          spawnText(targetX, roosterBaseY - 60, "MISS!", "#eab308", 22);
        } else if (entry.isCritical) {
          currentAudio.playCrit();
          spawnFeathers(targetX, roosterBaseY - 20, targetColor, 26);
          spawnFeathers(targetX, roosterBaseY - 20, "#ff0000", 18);
          const zoneLabel = entry.hitZone ? HIT_ZONE_LABELS[entry.hitZone] : "";
          spawnText(targetX, roosterBaseY - 80, `CRITICAL — ${zoneLabel}`, "#ff0000", 24);
          spawnText(targetX, roosterBaseY - 50, `-${Math.floor(entry.damage)}`, "#ef4444", 20);
        } else if (entry.isCrit) {
          currentAudio.playCrit();
          spawnFeathers(targetX, roosterBaseY - 20, targetColor, 20);
          spawnFeathers(targetX, roosterBaseY - 20, "#fbbf24", 15);
          const zoneLabel = entry.hitZone ? HIT_ZONE_LABELS[entry.hitZone] : "";
          spawnText(targetX, roosterBaseY - 70, `CRIT! -${Math.floor(entry.damage)} ${zoneLabel}`, "#f97316", 24);
        } else {
          currentAudio.playHit();
          spawnFeathers(targetX, roosterBaseY - 20, targetColor, 10);
          const zoneLabel = entry.hitZone ? HIT_ZONE_LABELS[entry.hitZone] : "";
          spawnText(targetX, roosterBaseY - 50, `-${Math.floor(entry.damage)} ${zoneLabel}`, "#ef4444", 18);
        }

        if (!entry.isMiss) {
          if (isAAttacking) animR2.flash = 1;
          else animR1.flash = 1;
        }

        if (defenderVisual.fatigued) {
          currentAudio.playFatigue();
        }

        if (logIndex >= log.length && !replayEnded) {
          replayEnded = true;
          currentAudio.playVictory();
          setTimeout(() => onReplayEnd(), 1000);
        }

        lastTurnTime = now;
      }

      const t = now / 250;
      animR1.offsetY = Math.sin(t) * 4;
      animR2.offsetY = Math.cos(t * 0.9) * 4;
      animR1.rot = Math.sin(t * 0.5) * 0.04;
      animR2.rot = -Math.cos(t * 0.5) * 0.04;
      animR1.scaleX = 1 + Math.sin(t) * 0.02;
      animR1.scaleY = 1 - Math.sin(t) * 0.02;
      animR2.scaleX = 1 + Math.cos(t) * 0.02;
      animR2.scaleY = 1 - Math.cos(t) * 0.02;
      animR1.wingPhase = Math.sin(t * 3);
      animR2.wingPhase = Math.cos(t * 3);
      animR1.legPhase = Math.sin(t * 5);
      animR2.legPhase = Math.cos(t * 5);

      if (activeAttack) {
        const elapsed = now - activeAttack.startTime;
        const progress = Math.min(1, elapsed / activeAttack.duration);

        if (progress < 1) {
          const lungePhase = Math.sin(progress * Math.PI);
          const distance = (r2BaseX - r1BaseX) * 0.45;

          if (activeAttack.attacker === "r1") {
            animR1.offsetX = lungePhase * distance;
            animR1.offsetY -= lungePhase * 25;
            animR1.rot += lungePhase * 0.35;
            if (progress > 0.4 && !activeAttack.isMiss) {
              animR2.offsetX = lungePhase * 15;
              animR2.rot = -lungePhase * 0.2;
            }
          } else {
            animR2.offsetX = -lungePhase * distance;
            animR2.offsetY -= lungePhase * 25;
            animR2.rot -= lungePhase * 0.35;
            if (progress > 0.4 && !activeAttack.isMiss) {
              animR1.offsetX = -lungePhase * 15;
              animR1.rot = lungePhase * 0.2;
            }
          }
        } else {
          activeAttack = null;
        }
      }

      animR1.flash = Math.max(0, animR1.flash - 0.08);
      animR2.flash = Math.max(0, animR2.flash - 0.08);

      ctx.clearRect(0, 0, width, height);
      drawArenaGround(ctx, width, height);

      drawHealthBar(ctx, r1BaseX - 60, roosterBaseY - 95, visualA.hp, visualA.maxHp, visualA.name, "#ef4444", visualA.fatigued);
      drawHealthBar(ctx, r2BaseX - 60, roosterBaseY - 95, visualB.hp, visualB.maxHp, visualB.name, "#3b82f6", visualB.fatigued);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.rot += p.vrot;
        p.alpha = 1 - p.life / p.maxLife;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life++;
        ft.y -= 1.2;
        ft.alpha = 1 - ft.life / ft.maxLife;
        if (ft.life >= ft.maxLife) {
          floatingTexts.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = `900 ${ft.fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4;
        ctx.textAlign = "center";
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      if (logIndex < log.length || particles.length > 0 || floatingTexts.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [chickenA, chickenB, log, audioEnabled, onReplayEnd]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setEnabled(audioEnabled);
    }
  }, [audioEnabled]);

  return (
    <div className="panel-wood relative aspect-[2/1] w-full overflow-hidden rounded-2xl">
      <div className="absolute inset-0">
        <BattleStage3D
          fighterA={chickenA}
          fighterB={chickenB}
          animA={animR1Ref}
          animB={animR2Ref}
          cameraCue={cameraCueRef}
        />
      </div>
      <canvas ref={canvasRef} width={800} height={400} className="absolute inset-0 h-full w-full" />
      <div className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-(--color-gold)/30 bg-black/70 px-5 py-2 shadow-lg backdrop-blur">
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-(--color-gold-bright)">
          Round {currentTurn}
        </span>
      </div>
    </div>
  );
}

function drawArenaGround(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const groundY = height - 100;
  const grad = ctx.createLinearGradient(0, groundY, 0, height);
  grad.addColorStop(0, "#2d1810");
  grad.addColorStop(0.3, "#1c110b");
  grad.addColorStop(1, "#0a0705");
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, width, 100);

  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(254, 240, 138, 0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(width / 2, groundY + 40, width * 0.42, 35, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  name: string,
  color: string,
  fatigued: boolean
) {
  const barWidth = 120;
  const barHeight = 14;
  const hpPercent = Math.max(0, Math.min(1, hp / maxHp));

  ctx.save();
  ctx.font = "900 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.textAlign = "left";
  ctx.fillText(name, x, y - 8);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, barWidth, barHeight);

  const fillColor = hpPercent > 0.35 ? color : fatigued ? "#a855f7" : "#f59e0b";
  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 2, y + 2, (barWidth - 4) * hpPercent, barHeight - 4);

  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(
    `${Math.max(0, Math.floor(hp))} / ${Math.floor(maxHp)}`,
    x + barWidth / 2,
    y + barHeight - 3
  );
  ctx.restore();
}
