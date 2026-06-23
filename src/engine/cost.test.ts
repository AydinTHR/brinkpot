import { describe, it, expect } from "vitest";
import { nextBuyInCost } from "./cost";
import { DEFAULT_CONFIG } from "./config";

describe("nextBuyInCost", () => {
  it("matches the expected escalation table for the defaults", () => {
    expect(nextBuyInCost(0, DEFAULT_CONFIG)).toBe(100);
    expect(nextBuyInCost(10, DEFAULT_CONFIG)).toBe(197);
    expect(nextBuyInCost(25, DEFAULT_CONFIG)).toBe(543);
  });

  it("never decreases as the buy-in count grows", () => {
    let prev = 0;
    for (let n = 0; n < 60; n += 1) {
      const c = nextBuyInCost(n, DEFAULT_CONFIG);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });

  it("floors at the base cost and caps at the configured ceiling", () => {
    expect(nextBuyInCost(0, DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.baseCostCents);
    expect(nextBuyInCost(500, DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.costCapCents);
  });

  it("always returns a whole number of cents", () => {
    for (let n = 0; n < 40; n += 1) {
      expect(Number.isInteger(nextBuyInCost(n, DEFAULT_CONFIG))).toBe(true);
    }
  });
});
