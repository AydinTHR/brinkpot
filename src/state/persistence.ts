import { START_WALLET_CENTS } from "../engine/config";
import { randomHex } from "../fair/hash";
import { HISTORY_LIMIT, SCHEMA_VERSION, STORAGE_KEY } from "../lib/constants";

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
}

export interface PersistedState {
  schemaVersion: number;
  wallet: number;
  stats: Stats;
  history: HistoryEntry[];
  clientSeed: string;
  /** The next nonce to use; increments every round prepared. */
  nextNonce: number;
}

export function defaultPersisted(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    wallet: START_WALLET_CENTS,
    stats: { roundsPlayed: 0, wins: 0, bestWinCents: 0, netCents: 0 },
    history: [],
    clientSeed: randomHex(4),
    nextNonce: 0,
  };
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
    return {
      schemaVersion: SCHEMA_VERSION,
      wallet: typeof parsed.wallet === "number" ? parsed.wallet : fallback.wallet,
      stats: { ...fallback.stats, ...(parsed.stats ?? {}) },
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : [],
      clientSeed:
        typeof parsed.clientSeed === "string" && parsed.clientSeed.length > 0
          ? parsed.clientSeed
          : fallback.clientSeed,
      nextNonce: typeof parsed.nextNonce === "number" ? parsed.nextNonce : 0,
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
