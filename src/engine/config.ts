import type { EngineConfig } from "./types";

/** Default round tuning. All money in cents, all time in ms. */
export const DEFAULT_CONFIG: EngineConfig = {
  roundDurationMs: 12_000,
  baseCostCents: 100,
  costGrowth: 1.07,
  costCapCents: 5_000,
  snipeThresholdMs: 2_500,
};

/** Starting play-money wallet for a new player, in cents ($100.00). */
export const START_WALLET_CENTS = 10_000;

/**
 * Fixed simulation step. The engine only ever advances time in these increments,
 * so behaviour is identical regardless of device frame rate. The live rAF loop
 * and the deterministic verifier both step at exactly this size.
 */
export const FIXED_STEP_MS = 50;

/** How often bots get a chance to act. A multiple of FIXED_STEP_MS. */
export const BOT_DECISION_WINDOW_MS = 100;
