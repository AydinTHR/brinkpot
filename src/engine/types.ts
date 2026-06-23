/**
 * Core domain types for the Brinkpot round engine.
 *
 * The engine is pure: no React, no DOM, no wall clock, no randomness. Time enters
 * only as integer-millisecond `dtMs` deltas on TICK commands; money is always
 * integer cents. Given the same starting state and command sequence the engine
 * reproduces a round byte-for-byte, which is what both the tests and the
 * provably-fair verifier rely on.
 */

export type Phase = "active" | "resolved";

export interface PlayerRef {
  id: string;
  name: string;
  isHuman: boolean;
}

export interface ParticipantState {
  ref: PlayerRef;
  /** Remaining play money. */
  balanceCents: number;
  /** Total contributed to the current pot. */
  spentCents: number;
  buyIns: number;
  /** Elapsed-ms timestamp of this player's last buy-in, or null. */
  lastBuyInAtMs: number | null;
}

export interface EngineConfig {
  /** Timer value (ms) a buy-in resets the countdown to. */
  roundDurationMs: number;
  /** Cost of the first buy-in, in cents. */
  baseCostCents: number;
  /** Geometric growth factor applied per prior buy-in. */
  costGrowth: number;
  /** Upper clamp on a single buy-in cost, in cents. */
  costCapCents: number;
  /** A buy-in under this much time remaining counts as a "snipe". */
  snipeThresholdMs: number;
}

export type EndReason = "timeout" | "no_contest";

export interface RoundResult {
  /** The last player to buy in, or null if nobody ever did. */
  winnerId: string | null;
  potCents: number;
  endReason: EndReason;
  resolvedAtElapsedMs: number;
}

export interface RoundState {
  phase: Phase;
  config: EngineConfig;
  potCents: number;
  /** Number of buy-ins so far; drives the escalating cost. */
  buyInCount: number;
  /** Cost of the next buy-in, cached for cheap reads by UI and bots. */
  nextCostCents: number;
  /** Milliseconds remaining until resolution. */
  timerMs: number;
  /** Total elapsed round time in ms (also used for event timestamps). */
  elapsedMs: number;
  /** The current temporary King (last buy-in), or null. */
  kingId: string | null;
  participants: Record<string, ParticipantState>;
  /** Stable participant id order for deterministic iteration. */
  order: string[];
  result: RoundResult | null;
}

export type Command = { type: "TICK"; dtMs: number } | { type: "BUY_IN"; playerId: string };

export type GameEvent =
  | {
      type: "BUY_IN";
      playerId: string;
      costCents: number;
      potCents: number;
      atMs: number;
    }
  | { type: "CROWNED"; playerId: string; atMs: number }
  | { type: "SNIPE"; playerId: string; timerWasMs: number; atMs: number }
  | { type: "RESOLVED"; result: RoundResult; atMs: number };

export interface ReduceOutput {
  state: RoundState;
  events: GameEvent[];
}
