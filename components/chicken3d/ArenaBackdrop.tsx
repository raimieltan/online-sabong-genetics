/**
 * Illustrated colosseum backdrop for the battle stage — layered gradients/SVG
 * standing in for a painted arena background (sky, tiered stone stands,
 * banners, torches, sandy pit) behind the transparent 3D fighter layer.
 */
export function ArenaBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #2b3a5c 0%, #4d5f8a 28%, #8a7a6a 52%, #3a2a1e 68%, #1a1210 100%)",
        }}
      />

      {/* distant stadium tiers */}
      <svg
        className="absolute inset-x-0 bottom-[38%] h-[46%] w-full opacity-90"
        viewBox="0 0 1600 400"
        preserveAspectRatio="none"
      >
        <rect x="0" y="180" width="1600" height="220" fill="#241a14" />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={i * 180 - 20} y={90 + (i % 2) * 18} width="150" height="300" fill="#2e2119" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={i * 180 + 40} y={60 + (i % 2) * 18} width="14" height="140" fill="#241a14" />
        ))}
        {/* crowd texture */}
        {Array.from({ length: 60 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 137) % 1600}
            cy={210 + ((i * 53) % 60)}
            r="5"
            fill={i % 3 === 0 ? "#8a6a4a" : "#5a4638"}
            opacity="0.7"
          />
        ))}
        {/* banners */}
        {[160, 520, 900, 1260].map((x, i) => (
          <rect key={i} x={x} y="70" width="26" height="90" fill={i % 2 === 0 ? "#7a1f22" : "#1f3a5f"} opacity="0.9" />
        ))}
      </svg>

      {/* torch glow */}
      {[10, 90].map((leftPct, i) => (
        <div
          key={i}
          className="absolute bottom-[36%] h-24 w-24 -translate-x-1/2 rounded-full blur-2xl"
          style={{
            left: `${leftPct}%`,
            background: "radial-gradient(circle, rgba(255,170,60,0.55) 0%, rgba(255,120,20,0.15) 55%, transparent 75%)",
          }}
        />
      ))}

      {/* sandy pit floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40%]"
        style={{
          background: "linear-gradient(180deg, #6b4a2f 0%, #4a3320 40%, #241a10 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[40%] opacity-40"
        style={{
          background:
            "repeating-radial-gradient(ellipse at 50% 120%, rgba(255,220,170,0.12) 0 2px, transparent 2px 60px)",
        }}
      />

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 18vw 4vw rgba(0,0,0,0.55)" }}
      />
    </div>
  );
}
