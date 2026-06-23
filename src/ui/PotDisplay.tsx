import { useCountUp } from "../hooks/useCountUp";
import { formatCents } from "../lib/format";
import { useGameStore } from "../state/gameStore";

export function PotDisplay() {
  const pot = useGameStore((s) => s.round?.potCents ?? 0);
  const shown = useCountUp(pot, 450);
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-[0.3em] text-muted">The Pot</div>
      <div
        data-testid="pot"
        className="font-mono text-6xl font-bold tabular-nums text-gold drop-shadow-[0_0_24px_rgba(245,197,66,0.25)] sm:text-7xl"
      >
        {formatCents(shown)}
      </div>
    </div>
  );
}
