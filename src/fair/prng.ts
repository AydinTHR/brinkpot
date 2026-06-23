/**
 * mulberry32: a tiny, fast, well-distributed 32-bit seeded PRNG.
 *
 * It is deliberately simple so a third party can reimplement it in any language
 * and reproduce a round byte-for-byte from the revealed seed. That reproducibility
 * is what makes the game both unit-testable and provably fair: same seed plus the
 * same sequence of draws always yields the same numbers.
 */

export interface Rng {
  /** Next float in [0, 1). */
  nextFloat(): number;
  /** Next integer in [minIncl, maxExcl). Returns minIncl when the range is empty. */
  nextInt(minIncl: number, maxExcl: number): number;
  /** True with probability p (clamped to [0, 1]). */
  chance(p: number): boolean;
  /** A deterministic element from a non-empty array. */
  pick<T>(arr: readonly T[]): T;
  /** How many floats have been drawn. Part of the verifiable trace. */
  readonly draws: number;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  let drawn = 0;

  const nextFloat = (): number => {
    drawn += 1;
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    nextFloat,
    nextInt(minIncl, maxExcl) {
      if (maxExcl <= minIncl) return minIncl;
      return minIncl + Math.floor(nextFloat() * (maxExcl - minIncl));
    },
    chance(p) {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return nextFloat() < p;
    },
    pick(arr) {
      return arr[Math.floor(nextFloat() * arr.length)] as (typeof arr)[number];
    },
    get draws() {
      return drawn;
    },
  };
}
