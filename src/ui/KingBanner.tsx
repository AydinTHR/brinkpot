import { HUMAN_ID } from "../sim/runRound";
import { useGameStore } from "../state/gameStore";

export function KingBanner() {
  const kingId = useGameStore((s) => s.round?.kingId ?? null);
  const name = useGameStore((s) => {
    const r = s.round;
    if (!r || r.kingId === null) return null;
    return r.participants[r.kingId]?.ref.name ?? null;
  });
  const isYou = kingId === HUMAN_ID;

  return (
    <div
      data-testid="king-banner"
      className="flex min-h-7 items-center justify-center gap-2 text-lg"
    >
      {kingId === null ? (
        <span className="text-muted">No King yet. Be the first to buy in.</span>
      ) : isYou ? (
        <span className="font-semibold text-king">
          <span aria-hidden>{"\u{1F451}"} </span>You hold the crown
        </span>
      ) : (
        <span className="text-ink">
          <span aria-hidden>{"\u{1F451}"} </span>
          <span className="text-muted">King is</span> {name}
        </span>
      )}
    </div>
  );
}
