import { formatCents } from "../lib/format";
import { useGameStore } from "../state/gameStore";
import { Button } from "./primitives/Button";

export function BuyInButton() {
  const appPhase = useGameStore((s) => s.appPhase);
  const cost = useGameStore((s) => s.round?.nextCostCents ?? 0);
  const canAfford = useGameStore((s) => s.humanCanAfford());
  const startRound = useGameStore((s) => s.startRound);
  const queueBuyIn = useGameStore((s) => s.queueBuyIn);
  const nextRound = useGameStore((s) => s.nextRound);

  if (appPhase === "idle") {
    return (
      <Button data-testid="start" onClick={startRound} className="w-full text-lg">
        Start round
      </Button>
    );
  }

  if (appPhase === "resolved") {
    return (
      <Button data-testid="next-round" onClick={() => void nextRound()} className="w-full text-lg">
        Play again
      </Button>
    );
  }

  const disabled = appPhase !== "active" || !canAfford;
  return (
    <Button data-testid="buyin" onClick={queueBuyIn} disabled={disabled} className="w-full text-lg">
      {canAfford ? `Buy in for ${formatCents(cost)}` : "Out of funds"}
    </Button>
  );
}
