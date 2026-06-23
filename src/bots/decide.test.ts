import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "../engine/config";
import type { ParticipantState, RoundState } from "../engine/types";
import { createRng } from "../fair/prng";
import { setupSimulation } from "../sim/runRound";
import { decideBot } from "./decide";
import type { Bot } from "./spawn";

const sim = setupSimulation({
  roundSeed: 999,
  config: DEFAULT_CONFIG,
  humanName: "You",
  humanBalanceCents: 10_000,
});

function botByKey(key: string): Bot {
  const seat = sim.bots.find((b) => b.personality.key === key);
  if (!seat) throw new Error(`no bot ${key}`);
  return { ref: seat.ref, personality: seat.personality };
}

function withState(
  bot: Bot,
  patch: Partial<RoundState>,
  participantPatch: Partial<ParticipantState> = {},
): RoundState {
  const base = sim.state;
  const p = base.participants[bot.ref.id]!;
  return {
    ...base,
    ...patch,
    participants: {
      ...base.participants,
      [bot.ref.id]: { ...p, ...participantPatch },
    },
  };
}

function fireCount(bot: Bot, state: RoundState, trials: number): number {
  let count = 0;
  for (let s = 0; s < trials; s += 1) {
    const rng = createRng((s * 2654435761) >>> 0);
    if (decideBot(bot, state, rng)) count += 1;
  }
  return count;
}

describe("decideBot", () => {
  it("spawns one bot per archetype with distinct ids", () => {
    expect(sim.bots).toHaveLength(4);
    expect(new Set(sim.bots.map((b) => b.ref.id)).size).toBe(4);
    expect(sim.bots.map((b) => b.personality.key).sort()).toEqual([
      "calculated",
      "early-bird",
      "sniper",
      "whale",
    ]);
  });

  it("the sniper stays quiet early and pounces near zero", () => {
    const sniper = botByKey("sniper");
    const early = fireCount(
      sniper,
      withState(sniper, { timerMs: DEFAULT_CONFIG.roundDurationMs }),
      400,
    );
    const late = fireCount(sniper, withState(sniper, { timerMs: 150 }), 400);
    // Per-window probability is intentionally compressed (it compounds over the
    // ~25 windows of the snipe zone), so assert a strong relative gap rather than
    // near-certainty in a single window.
    expect(early).toBeLessThan(40);
    expect(late).toBeGreaterThan(80);
    expect(late).toBeGreaterThan(early * 5);
  });

  it("never buys when it cannot afford the next cost", () => {
    const bot = botByKey("calculated");
    const state = withState(bot, { nextCostCents: 100 }, { balanceCents: 50 });
    expect(fireCount(bot, state, 200)).toBe(0);
  });

  it("respects the reaction cooldown after its own buy-in", () => {
    const bot = botByKey("whale");
    const state = withState(
      bot,
      { elapsedMs: 5_000, timerMs: 100 },
      { lastBuyInAtMs: 4_950 }, // 50ms ago, inside the cooldown
    );
    expect(fireCount(bot, state, 200)).toBe(0);
  });

  it("does not outbid itself while already King", () => {
    const bot = botByKey("sniper");
    const state = withState(bot, { kingId: bot.ref.id, timerMs: 100 });
    expect(fireCount(bot, state, 200)).toBe(0);
  });

  it("returns false for a bot that is not seated in the round", () => {
    const ghost: Bot = {
      ref: { id: "bot-ghost", name: "Ghost", isHuman: false },
      personality: botByKey("sniper").personality,
    };
    expect(decideBot(ghost, withState(botByKey("sniper"), {}), createRng(1))).toBe(false);
  });

  it("is deterministic for the same bot, state, and seed", () => {
    const bot = botByKey("early-bird");
    const state = withState(bot, { timerMs: 4_000 });
    const a = decideBot(bot, state, createRng(7));
    const b = decideBot(bot, state, createRng(7));
    expect(a).toBe(b);
  });
});
