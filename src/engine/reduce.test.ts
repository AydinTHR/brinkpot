import { describe, it, expect } from "vitest";
import { createRound, reduce } from "./reduce";
import { DEFAULT_CONFIG } from "./config";
import type { Command, RoundState } from "./types";

const HUMAN = { id: "you", name: "You", isHuman: true } as const;
const BOT = { id: "bot-0", name: "Rival", isHuman: false } as const;

function freshRound(humanBalance = 10_000, botBalance = 10_000): RoundState {
  return createRound({
    config: DEFAULT_CONFIG,
    human: { ref: HUMAN, balanceCents: humanBalance },
    bots: [{ ref: BOT, balanceCents: botBalance }],
  });
}

function apply(state: RoundState, cmds: Command[]): RoundState {
  return cmds.reduce((s, c) => reduce(s, c).state, state);
}

function totalBalance(state: RoundState): number {
  return Object.values(state.participants).reduce((sum, p) => sum + p.balanceCents, 0);
}

describe("createRound", () => {
  it("starts active with a full timer, empty pot, and no king", () => {
    const s = freshRound();
    expect(s.phase).toBe("active");
    expect(s.timerMs).toBe(DEFAULT_CONFIG.roundDurationMs);
    expect(s.potCents).toBe(0);
    expect(s.kingId).toBeNull();
    expect(s.nextCostCents).toBe(100);
    expect(s.order).toEqual(["you", "bot-0"]);
  });
});

describe("buy-in", () => {
  it("adds to the pot, resets the timer, crowns the buyer, and escalates cost", () => {
    let s = freshRound();
    s = apply(s, [{ type: "TICK", dtMs: 4000 }]);
    expect(s.timerMs).toBe(DEFAULT_CONFIG.roundDurationMs - 4000);

    const { state, events } = reduce(s, { type: "BUY_IN", playerId: "you" });
    expect(state.potCents).toBe(100);
    expect(state.timerMs).toBe(DEFAULT_CONFIG.roundDurationMs); // reset
    expect(state.kingId).toBe("you");
    expect(state.buyInCount).toBe(1);
    expect(state.nextCostCents).toBe(nextCost(1));
    expect(state.participants["you"]!.balanceCents).toBe(9_900);
    expect(events.map((e) => e.type)).toEqual(["BUY_IN", "CROWNED"]);
  });

  it("is a no-op when the player cannot afford the next cost", () => {
    let s = freshRound(50); // less than the 100 base cost
    const before = s;
    s = reduce(s, { type: "BUY_IN", playerId: "you" }).state;
    expect(s).toBe(before); // unchanged reference, no buy-in applied
  });

  it("is a no-op once the round is resolved", () => {
    let s = freshRound();
    s = reduce(s, { type: "BUY_IN", playerId: "you" }).state;
    s = apply(s, [{ type: "TICK", dtMs: DEFAULT_CONFIG.roundDurationMs }]);
    expect(s.phase).toBe("resolved");
    const after = reduce(s, { type: "BUY_IN", playerId: "bot-0" }).state;
    expect(after).toBe(s);
  });

  it("emits a SNIPE event when buying in under the snipe threshold", () => {
    let s = freshRound();
    // Drain the timer to just inside the snipe window.
    s = apply(s, [{ type: "TICK", dtMs: DEFAULT_CONFIG.roundDurationMs - 1000 }]);
    const { events } = reduce(s, { type: "BUY_IN", playerId: "bot-0" });
    expect(events.map((e) => e.type)).toContain("SNIPE");
  });

  it("keeps the pot equal to the sum of all buy-in costs", () => {
    let s = freshRound();
    let expectedPot = 0;
    for (let i = 0; i < 5; i += 1) {
      const cost = s.nextCostCents;
      s = reduce(s, { type: "BUY_IN", playerId: i % 2 === 0 ? "you" : "bot-0" }).state;
      expectedPot += cost;
      s = apply(s, [{ type: "TICK", dtMs: 500 }]);
    }
    expect(s.potCents).toBe(expectedPot);
  });
});

describe("resolution and payout", () => {
  it("pays the entire pot to the last king when the timer runs out", () => {
    const startTotal = totalBalance(freshRound());
    let s = freshRound();
    s = reduce(s, { type: "BUY_IN", playerId: "you" }).state; // you crowned
    s = apply(s, [{ type: "TICK", dtMs: 200 }]);
    s = reduce(s, { type: "BUY_IN", playerId: "bot-0" }).state; // bot snipes the crown
    s = apply(s, [{ type: "TICK", dtMs: DEFAULT_CONFIG.roundDurationMs }]);

    expect(s.phase).toBe("resolved");
    expect(s.result?.winnerId).toBe("bot-0");
    expect(s.result?.endReason).toBe("timeout");
    // Bot won: it spent on its buy-in then received the whole pot back.
    const bot = s.participants["bot-0"]!;
    expect(bot.balanceCents).toBe(10_000 - bot.spentCents + s.potCents);
    // Money is conserved: no cents created or destroyed.
    expect(totalBalance(s)).toBe(startTotal);
  });

  it("resolves to no_contest with no payout when nobody buys in", () => {
    const startTotal = totalBalance(freshRound());
    let s = freshRound();
    s = apply(s, [{ type: "TICK", dtMs: DEFAULT_CONFIG.roundDurationMs }]);
    expect(s.phase).toBe("resolved");
    expect(s.result?.endReason).toBe("no_contest");
    expect(s.result?.winnerId).toBeNull();
    expect(s.potCents).toBe(0);
    expect(totalBalance(s)).toBe(startTotal);
  });

  it("ignores a zero or negative tick", () => {
    const s = freshRound();
    expect(reduce(s, { type: "TICK", dtMs: 0 }).state).toBe(s);
    expect(reduce(s, { type: "TICK", dtMs: -50 }).state).toBe(s);
  });
});

function nextCost(n: number): number {
  return Math.round(100 * Math.pow(1.07, n));
}
