export function RoundHeader({ elapsedSeconds, phase, statusLabel }: { elapsedSeconds: number; phase: string; statusLabel: string }) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const timer = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  return (
    <div className="pointer-events-none flex flex-col items-center pt-1 text-center">
      <div className="flex items-center gap-2">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-[rgba(190,160,100,0.5)] sm:w-14" />
        <p className="text-[10px] uppercase tracking-[.3em] text-(--color-text-muted) sm:text-[12px]">Round 1</p>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-[rgba(190,160,100,0.5)] sm:w-14" />
      </div>
      <p className="font-display text-[26px] leading-none text-(--color-ivory,#e8e0d0) sm:text-[34px]">{timer}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[.22em] text-(--color-gold-bright)/70">{phase}</p>
      <p className="mt-0.5 rounded bg-black/50 px-2 py-0.5 text-[9px] text-white/60">{statusLabel}</p>
    </div>
  );
}
