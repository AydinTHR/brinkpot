import { describe, it, expect } from "vitest";
import { createRng } from "./prng";

describe("mulberry32 PRNG", () => {
  it("is deterministic: same seed yields the same sequence", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 20 }, () => a.nextFloat());
    const seqB = Array.from({ length: 20 }, () => b.nextFloat());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.nextFloat()).not.toEqual(b.nextFloat());
  });

  it("returns floats in [0, 1)", () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i += 1) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt stays within [min, max) and handles empty ranges", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const v = rng.nextInt(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(9);
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(rng.nextInt(5, 5)).toBe(5);
  });

  it("chance(0) is never true and chance(1) is always true", () => {
    const rng = createRng(42);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });

  it("counts draws for each consumed float", () => {
    const rng = createRng(3);
    expect(rng.draws).toBe(0);
    rng.nextFloat();
    expect(rng.draws).toBe(1);
    rng.nextInt(0, 10); // consumes one float
    expect(rng.draws).toBe(2);
    rng.chance(0.5); // consumes one float (not a clamped edge)
    expect(rng.draws).toBe(3);
    rng.chance(0); // clamped edge, draws nothing
    expect(rng.draws).toBe(3);
  });

  it("pick returns an element of the array deterministically", () => {
    const arr = ["a", "b", "c", "d"] as const;
    const a = createRng(2024);
    const b = createRng(2024);
    const picks = Array.from({ length: 10 }, () => a.pick(arr));
    const picksB = Array.from({ length: 10 }, () => b.pick(arr));
    expect(picks).toEqual(picksB);
    for (const p of picks) expect(arr).toContain(p);
  });

  it("locks a regression vector so accidental nondeterminism is caught", () => {
    const rng = createRng(0);
    const v = [rng.nextFloat(), rng.nextFloat(), rng.nextFloat()].map((n) => Number(n.toFixed(10)));
    expect(v).toEqual([0.2664292087, 0.0003297457, 0.2232720274]);
  });
});
