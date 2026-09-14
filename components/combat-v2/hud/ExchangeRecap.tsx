import type { ExchangeResolvedPayload } from "@/lib/combat-v2/interpretation";
import { describeExchangeRecap, type ExchangeRecapAssistance } from "@/components/combat-v2/hud/uiAdapter";

export function ExchangeRecap({ eventId, payload, reducedMotion, highContrast = false, assistance = "onboarding" }: {
  eventId: string;
  payload: ExchangeResolvedPayload;
  reducedMotion: boolean;
  highContrast?: boolean;
  assistance?: ExchangeRecapAssistance;
}) {
  const copy = describeExchangeRecap(payload, assistance);
  return (
    <aside
      key={eventId}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={copy.ariaLabel}
      className={`pointer-events-none absolute left-1/2 top-[23%] z-30 w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 border-y px-4 py-3 text-center shadow-[0_14px_36px_rgba(0,0,0,.32)] backdrop-blur-md sm:top-[26%] sm:px-8 ${highContrast ? "border-[#ffd86a] bg-black text-white" : "border-[rgba(215,164,65,.42)] bg-[linear-gradient(90deg,transparent,rgba(12,9,6,.86)_12%,rgba(12,9,6,.86)_88%,transparent)]"} ${reducedMotion ? "" : "animate-tell-in"}`}
    >
      {copy.kicker && <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#e1b65c] sm:tracking-[.24em]">{copy.kicker}</p>}
      <p className="mt-1 font-display text-[17px] uppercase tracking-[.08em] text-[#f1e4c2]">
        {copy.action}
      </p>
      {copy.result && <p className={`mt-1 text-[10px] uppercase tracking-[.14em] ${copy.resultTone === "negative" ? "text-[#f49a91]" : copy.resultTone === "positive" ? "text-[#8ce5a5]" : "text-[#c8b998]"}`}>{copy.result}</p>}
      {copy.detail && <p className="mt-1 text-[11px] leading-snug text-[#e0d2b5]">{copy.detail}</p>}
    </aside>
  );
}
