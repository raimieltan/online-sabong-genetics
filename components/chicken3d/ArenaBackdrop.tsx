/**
 * Painted arena background image behind the transparent 3D fighter layer.
 */
export function ArenaBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/background/arena-background.png)" }}
      />

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 18vw 4vw rgba(0,0,0,0.55)" }}
      />
    </div>
  );
}
