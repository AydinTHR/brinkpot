import { formatSeconds } from "../lib/format";
import { useGameStore } from "../state/gameStore";

const SIZE = 220;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function CountdownRing() {
  const timerMs = useGameStore((s) => s.round?.timerMs ?? 0);
  const total = useGameStore((s) => s.round?.config.roundDurationMs ?? 1);
  const snipeMs = useGameStore((s) => s.round?.config.snipeThresholdMs ?? 0);

  const pct = Math.max(0, Math.min(1, timerMs / total));
  const danger = timerMs <= snipeMs;
  const color = danger
    ? "var(--color-brink)"
    : pct > 0.5
      ? "var(--color-calm)"
      : "var(--color-amber)";

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className={danger ? "animate-pulse" : ""}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="var(--color-line)"
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct)}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: "stroke-dashoffset 80ms linear, stroke 200ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          data-testid="timer"
          className="font-mono text-5xl font-bold tabular-nums"
          style={{ color }}
        >
          {formatSeconds(timerMs)}
        </div>
        <div className="text-xs uppercase tracking-[0.3em] text-muted">seconds</div>
      </div>
    </div>
  );
}
