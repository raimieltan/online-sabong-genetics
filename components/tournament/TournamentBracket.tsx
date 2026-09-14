import type { BracketEntrant, RoundMatch, TournamentSize } from "@/lib/tournament";
import type { Chicken } from "@/lib/types";
import { roundLabel } from "@/lib/tournament";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

function FighterChip({ entrant, winnerSlot, player }: { entrant?: BracketEntrant; winnerSlot?: number; player: Chicken }) {
  if (!entrant) return <div className="bracket-chip bracket-chip-empty"><span>???</span><small>Awaiting winner</small></div>;
  const won = winnerSlot === entrant.slot;
  const lost = winnerSlot !== undefined && !won;
  const chicken = entrant.isPlayer ? player : entrant.chicken;
  return (
    <div className={`bracket-chip ${entrant.isPlayer ? "bracket-chip-player" : ""} ${lost ? "bracket-chip-lost" : ""}`}>
      <ChickenThumbnail chicken={chicken} className="h-7 w-7 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{chicken.name}</span>
      {won && <b>{"W"}</b>}
    </div>
  );
}

export function TournamentBracket({
  size,
  totalRounds,
  currentRound,
  entrants,
  history,
  player,
}: {
  size: TournamentSize;
  totalRounds: number;
  currentRound: number;
  entrants: BracketEntrant[];
  history: RoundMatch[][];
  player: Chicken;
}) {
  return (
    <section className="tournament-panel tournament-bracket">
      <div className="tournament-section-heading"><div><p>Championship draw</p><h2>Bracket</h2></div><span>{size} fighters</span></div>
      <div className="bracket-scroll"><div className="bracket-grid">
        {Array.from({ length: totalRounds }, (_, round) => {
          const matches = history[round] ?? [];
          const count = size / 2 ** (round + 1);
          return <div className="bracket-column" key={round}>
            <p className={`bracket-round ${round === currentRound ? "bracket-round-active" : ""}`}>{roundLabel(totalRounds, round)}</p>
            <div className="bracket-matches">
              {Array.from({ length: count }, (_, index) => {
                const match = matches[index];
                const initialA = entrants[index * 2];
                const initialB = entrants[index * 2 + 1];
                const a = match ? entrants.find((item) => item.slot === match.slotA) : round === 0 ? initialA : undefined;
                const b = match ? entrants.find((item) => item.slot === match.slotB) : round === 0 ? initialB : undefined;
                const isPlayerMatch = Boolean(a?.isPlayer || b?.isPlayer) && (Boolean(match) || round === currentRound);
                return <div className={`bracket-match ${isPlayerMatch ? "bracket-match-player" : ""}`} key={index}>
                  <FighterChip entrant={a} winnerSlot={match?.winnerSlot} player={player} />
                  <FighterChip entrant={b} winnerSlot={match?.winnerSlot} player={player} />
                  {match && <small className="bracket-result">{match.result.outcomeReason}</small>}
                </div>;
              })}
            </div>
          </div>;
        })}
      </div></div>
    </section>
  );
}
