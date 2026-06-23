import type { GameEvent } from "../engine/types";
import { formatCents } from "../lib/format";
import { HUMAN_ID } from "../sim/runRound";
import { useGameStore } from "../state/gameStore";

function lineFor(
  event: GameEvent,
  nameOf: (id: string) => string,
): { text: string; tone: string } | null {
  switch (event.type) {
    case "BUY_IN":
      return {
        text: `${nameOf(event.playerId)} bought in for ${formatCents(
          event.costCents,
        )}. Pot ${formatCents(event.potCents)}.`,
        tone: event.playerId === HUMAN_ID ? "text-gold" : "text-ink",
      };
    case "RESOLVED": {
      const w = event.result.winnerId;
      return {
        text:
          w === null
            ? "Timer hit zero. No contest."
            : `Timer hit zero. ${nameOf(w)} takes ${formatCents(event.result.potCents)}.`,
        tone: "text-king",
      };
    }
    default:
      return null;
  }
}

export function ActivityFeed() {
  const feed = useGameStore((s) => s.feed);
  const participants = useGameStore((s) => s.round?.participants ?? null);
  const nameOf = (id: string) => (id === HUMAN_ID ? "You" : (participants?.[id]?.ref.name ?? id));

  const lines = feed
    .map((e, i) => ({ line: lineFor(e, nameOf), key: i }))
    .filter((x): x is { line: { text: string; tone: string }; key: number } => Boolean(x.line));

  return (
    <div
      data-testid="feed"
      className="h-44 overflow-y-auto rounded-lg border border-line bg-surface p-3 text-sm"
    >
      {lines.length === 0 ? (
        <div className="text-muted">The table is quiet. Make a move.</div>
      ) : (
        <ul className="space-y-1">
          {lines.map(({ line, key }) => (
            <li key={key} className={line.tone}>
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
