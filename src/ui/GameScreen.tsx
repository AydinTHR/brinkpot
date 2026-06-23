import { formatCents } from "../lib/format";
import { useGameStore } from "../state/gameStore";
import { ActivityFeed } from "./ActivityFeed";
import { BuyInButton } from "./BuyInButton";
import { CountdownRing } from "./CountdownRing";
import { FairnessPanel } from "./FairnessPanel";
import { KingBanner } from "./KingBanner";
import { PotDisplay } from "./PotDisplay";
import { ResultModal } from "./ResultModal";
import { RivalsStrip } from "./RivalsStrip";
import { Wallet } from "./Wallet";

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-sm font-semibold tabular-nums text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

function StatsBar() {
  const stats = useGameStore((s) => s.stats);
  const net = stats.netCents;
  return (
    <div className="grid grid-cols-4 gap-2 rounded-lg border border-line bg-surface px-3 py-2">
      <StatItem label="Rounds" value={String(stats.roundsPlayed)} />
      <StatItem label="Wins" value={String(stats.wins)} />
      <StatItem label="Best win" value={formatCents(stats.bestWinCents)} />
      <StatItem label="Net" value={`${net >= 0 ? "+" : ""}${formatCents(net)}`} />
    </div>
  );
}

export function GameScreen() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Brink<span className="text-gold">pot</span>
          </h1>
          <p className="text-xs text-muted">Hold the pot to the brink. Last one standing wins.</p>
        </div>
        <Wallet />
      </header>

      <StatsBar />

      <main className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-gradient-to-b from-surface to-void p-6">
        <PotDisplay />
        <CountdownRing />
        <KingBanner />
        <div className="w-full max-w-xs">
          <BuyInButton />
        </div>
      </main>

      <RivalsStrip />

      <div className="grid gap-4 md:grid-cols-2">
        <ActivityFeed />
        <FairnessPanel />
      </div>

      <footer className="pb-4 text-center text-xs text-muted">
        Play money only. No real wagering. Built as a portfolio project.
      </footer>

      <ResultModal />
    </div>
  );
}
