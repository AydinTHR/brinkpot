import { formatCents } from "../lib/format";
import { HUMAN_ID } from "../sim/runRound";
import { useGameStore } from "../state/gameStore";
import { Button } from "./primitives/Button";

export function ResultModal() {
  const appPhase = useGameStore((s) => s.appPhase);
  const result = useGameStore((s) => s.round?.result ?? null);
  const winnerName = useGameStore((s) => {
    const r = s.round;
    if (!r?.result || r.result.winnerId === null) return "Nobody";
    return r.participants[r.result.winnerId]?.ref.name ?? "Nobody";
  });
  const wallet = useGameStore((s) => s.wallet);
  const nextRound = useGameStore((s) => s.nextRound);
  const dismissResult = useGameStore((s) => s.dismissResult);
  const resultDismissed = useGameStore((s) => s.resultDismissed);

  if (appPhase !== "resolved" || !result || resultDismissed) return null;

  const won = result.winnerId === HUMAN_ID;
  const noContest = result.endReason === "no_contest";
  const heading = noContest ? "Round expired" : won ? "You win" : "You lost";

  return (
    <div
      data-testid="result-modal"
      className="fixed inset-0 z-30 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-2xl">
        <div className="text-xs uppercase tracking-[0.3em] text-muted">{heading}</div>
        <div className={`mt-2 text-4xl font-bold ${won ? "text-gold" : "text-ink"}`}>
          {noContest ? "No contest" : won ? formatCents(result.potCents) : `${winnerName} took it`}
        </div>
        <p className="mt-3 text-sm text-muted">
          {noContest
            ? "Nobody bought in before the timer died. Be the first next time."
            : won
              ? `You were the last one standing. The pot of ${formatCents(
                  result.potCents,
                )} is yours.`
              : `${winnerName} held the crown when the timer hit zero. The pot was ${formatCents(
                  result.potCents,
                )}.`}
        </p>
        <div className="mt-4 text-sm text-muted">
          Wallet: <span className="font-mono text-ink">{formatCents(wallet)}</span>
        </div>
        <div className="mt-5 flex gap-3">
          <Button data-testid="review" variant="ghost" onClick={dismissResult} className="flex-1">
            Review and verify
          </Button>
          <Button data-testid="play-again" onClick={() => void nextRound()} className="flex-1">
            Play again
          </Button>
        </div>
      </div>
    </div>
  );
}
