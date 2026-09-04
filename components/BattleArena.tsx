"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleLogEntry, BattleResult, Rooster } from "@/lib/types";
import BattleEngine from "@/lib/battleEngine";
import { AudioEngine } from "@/lib/audioEngine";

interface BattleArenaProps {
  r1: Rooster;
  r2: Rooster;
  audioEnabled: boolean;
  onBattleEnd: (result: BattleResult) => void;
  onLogEntry: (entry: BattleLogEntry) => void;
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

interface FighterAnim {
  offsetX: number;
  offsetY: number;
  rot: number;
  scaleX: number;
  scaleY: number;
  flash: number; // 0..1 flash white on hit
  wingPhase: number;
  legPhase: number;
}

export default function BattleArena({
  r1,
  r2,
  audioEnabled,
  onBattleEnd,
  onLogEntry,
}: BattleArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);

  useEffect(() => {
    const engine = new BattleEngine(r1, r2);
    engineRef.current = engine;
    const audio = new AudioEngine(audioEnabled);
    audioRef.current = audio;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTurnTime = Date.now();
    const TURN_INTERVAL = 550;

    // Animation state
    const particles: Particle[] = [];
    const floatingTexts: FloatingText[] = [];

    const animR1: FighterAnim = {
      offsetX: 0,
      offsetY: 0,
      rot: 0,
      scaleX: 1,
      scaleY: 1,
      flash: 0,
      wingPhase: 0,
      legPhase: 0,
    };
    const animR2: FighterAnim = {
      offsetX: 0,
      offsetY: 0,
      rot: 0,
      scaleX: 1,
      scaleY: 1,
      flash: 0,
      wingPhase: 0,
      legPhase: 0,
    };

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
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color,
          size: 4 + Math.random() * 5,
          alpha: 1,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
        });
      }
    };

    const spawnText = (x: number, y: number, text: string, color: string, fontSize = 20) => {
      floatingTexts.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        text,
        color,
        fontSize,
        alpha: 1,
        life: 0,
        maxLife: 45,
      });
    };

    const animate = () => {
      const now = Date.now();
      const currentEngine = engineRef.current;
      const currentAudio = audioRef.current;
      if (!currentEngine || !currentAudio) return;

      const width = canvas.width;
      const height = canvas.height;
      const r1BaseX = width * 0.3;
      const r2BaseX = width * 0.7;
      const roosterBaseY = height - 140;

      // Turn Execution Loop
      if (now - lastTurnTime >= TURN_INTERVAL && currentEngine.isActive) {
        const entry = currentEngine.executeNextTurn();
        if (entry) {
          setCurrentTurn(entry.turn);
          onLogEntry(entry);

          const isR1Attacking = entry.attackerId.startsWith("red") || entry.attacker === r1.name;
          activeAttack = {
            attacker: isR1Attacking ? "r1" : "r2",
            startTime: now,
            duration: 350,
            isCrit: entry.isCrit,
            isMiss: entry.isMiss,
          };

          // Audio triggers
          if (entry.isMiss) {
            currentAudio.playMiss();
            const targetX = isR1Attacking ? r2BaseX : r1BaseX;
            spawnText(targetX, roosterBaseY - 60, "MISS!", "#eab308", 22);
          } else {
            if (entry.isCrit) {
              currentAudio.playCrit();
              const targetX = isR1Attacking ? r2BaseX : r1BaseX;
              const targetColor = isR1Attacking ? r2.colorScheme.body : r1.colorScheme.body;
              spawnFeathers(targetX, roosterBaseY - 20, targetColor, 20);
              spawnFeathers(targetX, roosterBaseY - 20, "#fbbf24", 15);
              spawnText(targetX, roosterBaseY - 70, `CRIT! -${Math.floor(entry.damage)}`, "#f97316", 26);
            } else {
              currentAudio.playHit();
              const targetX = isR1Attacking ? r2BaseX : r1BaseX;
              const targetColor = isR1Attacking ? r2.colorScheme.body : r1.colorScheme.body;
              spawnFeathers(targetX, roosterBaseY - 20, targetColor, 10);
              spawnText(targetX, roosterBaseY - 50, `-${Math.floor(entry.damage)}`, "#ef4444", 20);
            }

            // Flash defender
            if (isR1Attacking) {
              animR2.flash = 1;
            } else {
              animR1.flash = 1;
            }
          }

          if (entry.isFatigueTriggered) {
            currentAudio.playFatigue();
            const targetX = isR1Attacking ? r1BaseX : r2BaseX;
            spawnText(targetX, roosterBaseY - 90, "FATIGUED!", "#a855f7", 18);
          }

          // Check End
          if (!currentEngine.isActive) {
            const result = currentEngine.getResult();
            if (result) {
              currentAudio.playVictory();
              setTimeout(() => {
                onBattleEnd(result);
              }, 1000);
            }
          }
        }
        lastTurnTime = now;
      }

      // Update Idle Bobbing & Breathing
      const t = now / 250;
      const bobR1 = Math.sin(t) * 4;
      const bobR2 = Math.cos(t * 0.9) * 4;

      animR1.offsetY = bobR1;
      animR2.offsetY = bobR2;
      animR1.rot = Math.sin(t * 0.5) * 0.04;
      animR2.rot = -Math.cos(t * 0.5) * 0.04;
      animR1.scaleX = 1 + Math.sin(t) * 0.02;
      animR1.scaleY = 1 - Math.sin(t) * 0.02;
      animR2.scaleX = 1 + Math.cos(t) * 0.02;
      animR2.scaleY = 1 - Math.cos(t) * 0.02;

      // Limb Animation
      animR1.wingPhase = Math.sin(t * 3);
      animR2.wingPhase = Math.cos(t * 3);
      animR1.legPhase = Math.sin(t * 5);
      animR2.legPhase = Math.cos(t * 5);

      // Handle Attack Lunge Animation
      if (activeAttack) {
        const elapsed = now - activeAttack.startTime;
        const progress = Math.min(1, elapsed / activeAttack.duration);

        if (progress < 1) {
          // Lunge forward curve: jump forward & peck down then return
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

      // Decay Flashes
      animR1.flash = Math.max(0, animR1.flash - 0.08);
      animR2.flash = Math.max(0, animR2.flash - 0.08);

      // Render Everything
      ctx.clearRect(0, 0, width, height);

      // Arena Ring Background
      drawArenaGround(ctx, width, height);

      const { r1: stateR1, r2: stateR2 } = currentEngine.getRoosters();

      // Render Rooster 1 (Red Corner, Facing Right)
      drawRooster(
        ctx,
        r1BaseX + animR1.offsetX,
        roosterBaseY + animR1.offsetY,
        stateR1,
        "right",
        animR1
      );
      drawHealthBar(
        ctx,
        r1BaseX - 60,
        roosterBaseY - 95,
        stateR1.hp,
        stateR1.maxHp,
        stateR1.name,
        "#ef4444",
        stateR1.fatigued
      );

      // Render Rooster 2 (Blue Corner, Facing Left)
      drawRooster(
        ctx,
        r2BaseX + animR2.offsetX,
        roosterBaseY + animR2.offsetY,
        stateR2,
        "left",
        animR2
      );
      drawHealthBar(
        ctx,
        r2BaseX - 60,
        roosterBaseY - 95,
        stateR2.hp,
        stateR2.maxHp,
        stateR2.name,
        "#3b82f6",
        stateR2.fatigued
      );

      // Update and Render Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
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

      // Update and Render Floating Combat Text
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life++;
        ft.y -= 1.2; // drift up
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

      if (currentEngine.isActive || particles.length > 0 || floatingTexts.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [r1, r2, audioEnabled, onBattleEnd, onLogEntry]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.setEnabled(audioEnabled);
    }
  }, [audioEnabled]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full border-2 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-950 via-gray-900 to-slate-950 shadow-2xl"
      />
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 px-5 py-2 rounded-xl border border-slate-700 shadow-lg backdrop-blur">
        <span className="text-yellow-400 font-black text-sm uppercase tracking-widest">
          Turn {currentTurn}
        </span>
      </div>
    </div>
  );
}

function drawArenaGround(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Dirt arena ground
  const groundY = height - 100;

  const grad = ctx.createLinearGradient(0, groundY, 0, height);
  grad.addColorStop(0, "#2d1810");
  grad.addColorStop(0.3, "#1c110b");
  grad.addColorStop(1, "#0a0705");

  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, width, 100);

  // Arena pit line / rope border
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  // Arena chalk circle
  ctx.strokeStyle = "rgba(254, 240, 138, 0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(width / 2, groundY + 40, width * 0.42, 35, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawRooster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rooster: Rooster,
  facing: "left" | "right",
  anim: FighterAnim
) {
  // Model geometry: negative X = head/beak, positive X = tail
  // Facing 'right' means head must point +X => flip = -1
  // Facing 'left' means head must point -X => flip = 1
  const flip = facing === "right" ? -1 : 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip * anim.scaleX, anim.scaleY);
  ctx.rotate(flip * anim.rot);

  // Shadow
  ctx.save();
  ctx.scale(1, 0.3);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 170, 38, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Hit flash override
  const bodyColor = anim.flash > 0.3 ? "#ffffff" : rooster.colorScheme.body;
  const headColor = anim.flash > 0.3 ? "#ffffff" : rooster.colorScheme.head;
  const combColor = anim.flash > 0.3 ? "#ffffff" : rooster.colorScheme.comb;
  const tailColor = anim.flash > 0.3 ? "#ffffff" : rooster.colorScheme.tail;

  // Tail feathers
  ctx.fillStyle = tailColor;
  ctx.beginPath();
  ctx.moveTo(20, -10);
  ctx.quadraticCurveTo(55, -35, 65, -55);
  ctx.quadraticCurveTo(50, -15, 25, 5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(22, -5);
  ctx.quadraticCurveTo(60, -15, 68, -35);
  ctx.quadraticCurveTo(45, 5, 22, 12);
  ctx.closePath();
  ctx.fill();

  // Legs & Spurs
  ctx.strokeStyle = rooster.colorScheme.feet;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  const legTwitch = anim.legPhase * 3;
  ctx.moveTo(-8 + legTwitch, 30);
  ctx.lineTo(-12 + legTwitch, 54);
  ctx.lineTo(-20 + legTwitch, 56); // back toe
  ctx.moveTo(8 + legTwitch, 30);
  ctx.lineTo(12 + legTwitch, 54);
  ctx.lineTo(4 + legTwitch, 56);
  ctx.stroke();

  // Spur blade (sabong slasher)
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 48);
  ctx.lineTo(-24, 45); // blade spike
  ctx.stroke();

  // Body Oval
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 5, 32, 40, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wing
  ctx.fillStyle = tailColor;
  ctx.beginPath();
  // Flapping wing
  const wingY = 6 + anim.wingPhase * 5;
  const wingScale = 1 + anim.wingPhase * 0.1;
  ctx.ellipse(8, wingY, 18 * wingScale, 26, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Neck & Head
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.moveTo(-10, -15);
  ctx.quadraticCurveTo(-28, -25, -24, -48);
  ctx.arc(-22, -48, 16, 0, Math.PI * 2);
  ctx.lineTo(-2, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Comb (Crown)
  ctx.fillStyle = combColor;
  ctx.beginPath();
  ctx.moveTo(-24, -64);
  ctx.lineTo(-30, -74);
  ctx.lineTo(-22, -70);
  ctx.lineTo(-15, -77);
  ctx.lineTo(-10, -68);
  ctx.lineTo(-3, -73);
  ctx.lineTo(-8, -60);
  ctx.closePath();
  ctx.fill();

  // Wattle
  ctx.fillStyle = combColor;
  ctx.beginPath();
  ctx.ellipse(-32, -38, 6, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.moveTo(-34, -52);
  ctx.lineTo(-52, -46);
  ctx.lineTo(-34, -42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#b45309";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eye
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(-28, -52, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(-29, -52, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Fatigue visual indicator
  if (rooster.fatigued) {
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.ellipse(0, -5, 52, 60, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
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

  // Name
  ctx.save();
  ctx.font = "900 13px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.textAlign = "left";
  ctx.fillText(name, x, y - 8);

  // Bar container
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, barWidth, barHeight);

  // HP fill gradient
  const fillColor = hpPercent > 0.35 ? color : fatigued ? "#a855f7" : "#f59e0b";
  ctx.fillStyle = fillColor;
  ctx.fillRect(x + 2, y + 2, (barWidth - 4) * hpPercent, barHeight - 4);

  // Border
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Text inside bar
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
