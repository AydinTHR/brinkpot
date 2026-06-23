import { formatCents } from "../lib/format";
import { HUMAN_ID } from "../sim/runRound";
import { useGameStore } from "../state/gameStore";

export function RivalsStrip() {
  const order = useGameStore((s) => s.round?.order ?? []);
  const kingId = useGameStore((s) => s.round?.kingId ?? null);
  const participants = useGameStore((s) => s.round?.participants ?? null);
  const bots = useGameStore((s) => s.sim?.bots ?? []);

  if (!participants) return null;
  const labelById = new Map(bots.map((b) => [b.ref.id, b.personality.label]));
  const rivals = order.filter((id) => id !== HUMAN_ID);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {rivals.map((id) => {
        const p = participants[id];
        if (!p) return null;
        const isKing = kingId === id;
        const broke = p.balanceCents < 100;
        return (
          <div
            key={id}
            data-testid={`rival-${id}`}
            className={`rounded-lg border p-2 text-left transition-colors ${
              isKing ? "border-king bg-king/10" : "border-line bg-surface"
            } ${broke ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-sm font-semibold text-ink">{p.ref.name}</span>
              {isKing && <span aria-hidden>{"\u{1F451}"}</span>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted">
                {labelById.get(id) ?? "Rival"}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {formatCents(p.balanceCents)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
