import { formatCents } from "../lib/format";
import { HUMAN_ID } from "../sim/runRound";
import { useGameStore } from "../state/gameStore";

export function Wallet() {
  // Live balance during a round (reflects buy-ins), persisted wallet otherwise.
  const balance = useGameStore((s) => s.round?.participants[HUMAN_ID]?.balanceCents ?? s.wallet);
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted">Wallet</div>
      <div data-testid="wallet" className="font-mono text-xl font-semibold tabular-nums text-ink">
        {formatCents(balance)}
      </div>
    </div>
  );
}
