import { START_WALLET_CENTS } from "../engine/config";
import type { EngineConfig, RoundResult } from "../engine/types";
import { randomHex } from "../fair/hash";
import { verifyRound } from "../fair/verify";
import type { VerifyReport } from "../fair/verify";
import { HISTORY_LIMIT, HUMAN_NAME, SCHEMA_VERSION, STORAGE_KEY } from "../lib/constants";
import type { HumanActionLog } from "../sim/runRound";

export interface Stats {
  roundsPlayed: number;
  wins: number;
  bestWinCents: number;
  /** Lifetime play-money profit or loss across rounds. */
  netCents: number;
}

export interface HistoryEntry {
  endedAt: number; // wall-clock, display only (excluded from verification)
  potCents: number;
  won: boolean;
  winnerName: string;
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  // The rest of the replay input, so the round can be verified at any time later.
  config: EngineConfig;
  startWalletCents: number;
  humanActions: HumanActionLog[];
  result: RoundResult;
}

export interface PersistedState {
  schemaVersion: number;
  wallet: number;
  stats: Stats;
  history: HistoryEntry[];
  clientSeed: string;
  /** The next nonce to use; increments every round prepared. */
  nextNonce: number;
  /** Set while the player has buy-ins in a live round, which a reload forfeits. */
  roundInProgress: { startWalletCents: number } | null;
}

export function defaultPersisted(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    wallet: START_WALLET_CENTS,
    stats: { roundsPlayed: 0, wins: 0, bestWinCents: 0, netCents: 0 },
    history: [],
    clientSeed: randomHex(4),
    nextNonce: 0,
    roundInProgress: null,
  };
}

/** Saved before history stored replay inputs; such a round cannot be re-verified. */
function isReplayable(entry: Partial<HistoryEntry>): entry is HistoryEntry {
  return (
    typeof entry.serverSeedHash === "string" &&
    typeof entry.serverSeed === "string" &&
    typeof entry.clientSeed === "string" &&
    typeof entry.nonce === "number" &&
    typeof entry.config === "object" &&
    entry.config !== null &&
    typeof entry.startWalletCents === "number" &&
    Array.isArray(entry.humanActions) &&
    typeof entry.result === "object" &&
    entry.result !== null
  );
}

/** Load persisted state, falling back to defaults on absence, parse error, or
 * a schema-version mismatch (a simple, safe migration: start fresh). */
export function loadPersisted(): PersistedState {
  const fallback = defaultPersisted();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return fallback;
    const wallet = typeof parsed.wallet === "number" ? parsed.wallet : fallback.wallet;
    const stats = { ...fallback.stats, ...(parsed.stats ?? {}) };
    const pending = parsed.roundInProgress;
    if (pending && typeof pending.startWalletCents === "number") {
      // The page closed with buy-ins in a live round. A round cannot be resumed,
      // so it counts as lost; refunding it would make reloading a free undo.
      stats.roundsPlayed += 1;
      stats.netCents += wallet - pending.startWalletCents;
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      wallet,
      stats,
      history: Array.isArray(parsed.history)
        ? parsed.history.filter(isReplayable).slice(0, HISTORY_LIMIT)
        : [],
      clientSeed:
        typeof parsed.clientSeed === "string" && parsed.clientSeed.length > 0
          ? parsed.clientSeed
          : fallback.clientSeed,
      nextNonce: typeof parsed.nextNonce === "number" ? parsed.nextNonce : 0,
      roundInProgress: null,
    };
  } catch {
    return fallback;
  }
}

export function savePersisted(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable or over quota: a play-money game can safely skip saving.
  }
}

/** Re-verify a past round from its stored commitment, seeds, and replay inputs. */
export function verifyHistoryEntry(entry: HistoryEntry): Promise<VerifyReport> {
  return verifyRound(entry.serverSeedHash, entry.result, {
    serverSeed: entry.serverSeed,
    clientSeed: entry.clientSeed,
    nonce: entry.nonce,
    config: entry.config,
    humanName: HUMAN_NAME,
    humanBalanceCents: entry.startWalletCents,
    humanActions: entry.humanActions,
  });
}
