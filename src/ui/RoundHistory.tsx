import { useState } from "react";
import type { VerifyReport } from "../fair/verify";
import { formatCents } from "../lib/format";
import { useGameStore } from "../state/gameStore";
import { verifyHistoryEntry } from "../state/persistence";
import type { HistoryEntry } from "../state/persistence";

function Verdict({ report }: { report: VerifyReport }) {
  const ok = report.hashMatches && report.outcomeMatches;
  return (
    <span
      data-testid="history-verdict"
      className={`text-xs font-semibold ${ok ? "text-calm" : "text-brink"}`}
      title={`Hash ${report.hashMatches ? "matches" : "differs"}, outcome ${
        report.outcomeMatches ? "reproduced" : "differs"
      }`}
    >
      {ok ? "✓ Verified" : "✗ Mismatch"}
    </span>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [report, setReport] = useState<VerifyReport | null>(null);
  const [verifying, setVerifying] = useState(false);

  const verify = async () => {
    setVerifying(true);
    setReport(await verifyHistoryEntry(entry));
    setVerifying(false);
  };

  return (
    <li data-testid="history-row" className="flex items-center justify-between gap-3 py-1.5">
      <span className="font-mono text-xs text-muted">#{entry.nonce}</span>
      <span className="flex-1 truncate text-xs text-ink">
        {entry.won ? "You won" : `${entry.winnerName} won`} {formatCents(entry.potCents)}
      </span>
      {report ? (
        <Verdict report={report} />
      ) : (
        <button
          type="button"
          data-testid="history-verify"
          onClick={() => void verify()}
          disabled={verifying}
          className="text-xs text-gold underline-offset-2 hover:underline disabled:opacity-60"
        >
          {verifying ? "Verifying..." : "Verify"}
        </button>
      )}
    </li>
  );
}

export function RoundHistory() {
  const history = useGameStore((s) => s.history);
  if (history.length === 0) return null;

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Past rounds</h2>
      <p className="mt-1 mb-2 text-xs text-muted">
        Each round keeps its seeds and your moves, so you can replay and check it any time.
      </p>
      <ul className="max-h-48 divide-y divide-line overflow-y-auto">
        {history.map((entry) => (
          <HistoryRow key={entry.nonce} entry={entry} />
        ))}
      </ul>
    </section>
  );
}
