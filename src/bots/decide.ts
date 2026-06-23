import { BOT_DECISION_WINDOW_MS } from "../engine/config";
import type { RoundState } from "../engine/types";
import type { Rng } from "../fair/prng";
import type { Bot } from "./spawn";

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Decide whether a bot buys in during the current decision window. Pure given
 * (bot, state, rng): the only randomness is the final rng.chance draw, so the
 * whole rival population is a deterministic function of the round seed.
 *
 * The score blends four pulls, then a risk brake holds the bot back as it runs low:
 *  - baseAggression: constant temperament
 *  - potGreed:       a fat pot is tempting
 *  - snipeBias:      a cubic ramp that spikes in the final moments (the steal)
 *  - earlyBias:      acting while the timer is high and the buy-in is cheap
 */
export function decideBot(bot: Bot, state: RoundState, rng: Rng): boolean {
  const p = state.participants[bot.ref.id];
  if (!p) return false;

  const cost = state.nextCostCents;
  if (p.balanceCents < cost) return false; // cannot afford
  if (state.kingId === bot.ref.id) return false; // already King, do not outbid self

  const sinceLast = p.lastBuyInAtMs === null ? Infinity : state.elapsedMs - p.lastBuyInAtMs;
  if (sinceLast < bot.personality.reactionMs) return false; // cooldown

  const timeLeftPct = state.timerMs / state.config.roundDurationMs;
  const greed =
    clamp01(state.potCents / bot.personality.potReferenceCents) * bot.personality.potGreed;
  const snipe = Math.pow(1 - timeLeftPct, 3) * bot.personality.snipeBias;
  const early = timeLeftPct * bot.personality.earlyBias;

  const affordRatio = cost / Math.max(1, p.balanceCents);
  const riskBrake = clamp01((1 - affordRatio) * bot.personality.riskTolerance + 0.2);

  const score = clamp01(bot.personality.baseAggression + greed + snipe + early) * riskBrake;

  // Convert a per-second-ish score into a per-window probability so behaviour is
  // independent of how the window length is tuned.
  const pWindow = 1 - Math.pow(1 - score, BOT_DECISION_WINDOW_MS / 1000);
  return rng.chance(pWindow);
}
