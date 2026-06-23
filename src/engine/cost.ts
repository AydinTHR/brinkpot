import type { EngineConfig } from "./types";

/**
 * The escalating buy-in cost. Geometric growth means latecomers pay more without
 * the cost exploding: with the defaults, buy-in #0 is $1.00, #10 ~ $1.97, #25 ~ $5.43,
 * clamped at costCapCents. Always a whole number of cents.
 */
export function nextBuyInCost(buyInCount: number, config: EngineConfig): number {
  const raw = config.baseCostCents * Math.pow(config.costGrowth, buyInCount);
  const rounded = Math.round(raw);
  return Math.min(config.costCapCents, Math.max(config.baseCostCents, rounded));
}
