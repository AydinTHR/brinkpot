import { useState } from "react";
import { shortHash } from "../lib/format";
import { useGameStore } from "../state/gameStore";
import { Button } from "./primitives/Button";

function Check({ ok, label, testId }: { ok: boolean; label: string; testId: string }) {
  return (
    <div data-testid={testId} className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
          ok ? "bg-calm text-void" : "bg-brink text-white"
        }`}
        aria-hidden
      >
        {ok ? "✓" : "✗"}
      </span>
      <span className={ok ? "text-ink" : "text-brink"}>{label}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <span className="font-mono text-xs text-ink">{children}</span>
    </div>
  );
}

export function FairnessPanel() {
  const fairness = useGameStore((s) => s.fairness);
  const appPhase = useGameStore((s) => s.appPhase);
  const verifying = useGameStore((s) => s.verifying);
  const report = useGameStore((s) => s.verifyReport);
  const verify = useGameStore((s) => s.verifyCurrent);
  const setClientSeed = useGameStore((s) => s.setClientSeed);

  const [draft, setDraft] = useState(fairness.clientSeed);
  const editable = appPhase === "idle";
  const resolved = appPhase === "resolved";

  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Provably fair</h2>
        <span className="text-[10px] uppercase tracking-wider text-calm">commit / reveal</span>
      </div>
      <p className="mt-1 mb-3 text-xs text-muted">
        The outcome is locked to a secret seed before the round. Its hash is shown now; the seed is
        revealed at the end so you can recompute the result.
      </p>

      <Row label="Commit hash">
        <span data-testid="commit-hash" title={fairness.serverSeedHash ?? ""}>
          {fairness.serverSeedHash ? shortHash(fairness.serverSeedHash) : "..."}
        </span>
      </Row>

      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-xs uppercase tracking-wider text-muted">Client seed</span>
        <input
          data-testid="client-seed"
          value={draft}
          disabled={!editable}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setClientSeed(draft)}
          className="w-40 rounded border border-line bg-surface-2 px-2 py-1 text-right font-mono text-xs text-ink disabled:opacity-60"
        />
      </div>

      <Row label="Nonce">{fairness.nonce}</Row>

      <Row label="Revealed seed">
        {resolved && fairness.serverSeed ? (
          <span data-testid="server-seed" title={fairness.serverSeed}>
            {shortHash(fairness.serverSeed)}
          </span>
        ) : (
          <span className="text-muted">revealed at round end</span>
        )}
      </Row>

      <div className="mt-3 flex items-center gap-3">
        <Button
          data-testid="verify"
          variant="ghost"
          onClick={() => void verify()}
          disabled={!resolved || verifying}
          className="px-4 py-2 text-sm"
        >
          {verifying ? "Verifying..." : "Verify this round"}
        </Button>
        {report && (
          <div className="space-y-1 text-sm">
            <Check ok={report.hashMatches} label="Hash matches commit" testId="verify-hash" />
            <Check ok={report.outcomeMatches} label="Outcome reproduced" testId="verify-outcome" />
          </div>
        )}
      </div>
    </section>
  );
}
