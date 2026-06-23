import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "../engine/config";
import { runRoundDeterministic } from "../sim/runRound";
import type { HumanActionLog, SetupParams } from "../sim/runRound";
import { createCommitment, deriveRoundSeed } from "./commit";
import { sha256Hex } from "./hash";
import { verifyRound } from "./verify";

const CLIENT_SEED = "player-one";
const NONCE = 0;
const HUMAN_BALANCE = 10_000;

async function playRound(actions: HumanActionLog[]) {
  const { serverSeed, serverSeedHash } = await createCommitment();
  const roundSeed = await deriveRoundSeed(serverSeed, CLIENT_SEED, NONCE);
  const setup: SetupParams = {
    roundSeed,
    config: DEFAULT_CONFIG,
    humanName: "You",
    humanBalanceCents: HUMAN_BALANCE,
  };
  const run = runRoundDeterministic(setup, actions);
  return { serverSeed, serverSeedHash, run, roundSeed };
}

describe("verifyRound", () => {
  it("confirms a faithfully recorded round (hash and outcome both match)", async () => {
    const actions: HumanActionLog[] = [{ atElapsedMs: 0 }, { atElapsedMs: 3_000 }];
    const { serverSeed, serverSeedHash, run } = await playRound(actions);
    const result = run.finalState.result!;
    expect(result).not.toBeNull();

    const report = await verifyRound(serverSeedHash, result, {
      serverSeed,
      clientSeed: CLIENT_SEED,
      nonce: NONCE,
      config: DEFAULT_CONFIG,
      humanName: "You",
      humanBalanceCents: HUMAN_BALANCE,
      humanActions: actions,
    });

    expect(report.hashMatches).toBe(true);
    expect(report.outcomeMatches).toBe(true);
    expect(report.recomputedDraws).toBe(run.draws);
  });

  it("replays to a byte-identical result twice (no hidden nondeterminism)", async () => {
    const actions: HumanActionLog[] = [{ atElapsedMs: 1_000 }];
    const a = await playRound(actions);
    const b = runRoundDeterministic(
      {
        roundSeed: a.roundSeed,
        config: DEFAULT_CONFIG,
        humanName: "You",
        humanBalanceCents: HUMAN_BALANCE,
      },
      actions,
    );
    expect(b.finalState.result).toEqual(a.run.finalState.result);
    expect(b.draws).toBe(a.run.draws);
  });

  it("rejects a tampered commit hash", async () => {
    const { serverSeed, run } = await playRound([{ atElapsedMs: 0 }]);
    const report = await verifyRound(await sha256Hex("not-the-seed"), run.finalState.result!, {
      serverSeed,
      clientSeed: CLIENT_SEED,
      nonce: NONCE,
      config: DEFAULT_CONFIG,
      humanName: "You",
      humanBalanceCents: HUMAN_BALANCE,
      humanActions: [{ atElapsedMs: 0 }],
    });
    expect(report.hashMatches).toBe(false);
  });

  it("rejects a tampered outcome", async () => {
    const actions: HumanActionLog[] = [{ atElapsedMs: 0 }];
    const { serverSeed, serverSeedHash, run } = await playRound(actions);
    const tampered = { ...run.finalState.result!, potCents: run.finalState.result!.potCents + 1 };
    const report = await verifyRound(serverSeedHash, tampered, {
      serverSeed,
      clientSeed: CLIENT_SEED,
      nonce: NONCE,
      config: DEFAULT_CONFIG,
      humanName: "You",
      humanBalanceCents: HUMAN_BALANCE,
      humanActions: actions,
    });
    expect(report.hashMatches).toBe(true);
    expect(report.outcomeMatches).toBe(false);
  });

  it("the outcome genuinely depends on the human action log", () => {
    // Fixed seed so the assertion is deterministic. With this seed, buying in
    // late changes who is left standing (the pot is path-independent: it is the
    // sum of the first N buy-in costs regardless of who paid them).
    const setup: SetupParams = {
      roundSeed: 4242,
      config: DEFAULT_CONFIG,
      humanName: "You",
      humanBalanceCents: HUMAN_BALANCE,
    };
    const passive = runRoundDeterministic(setup, []);
    const aggressive = runRoundDeterministic(setup, [
      { atElapsedMs: 1_000 },
      { atElapsedMs: 3_000 },
      { atElapsedMs: 5_000 },
      { atElapsedMs: 7_000 },
    ]);
    expect(aggressive.finalState.result).not.toEqual(passive.finalState.result);
    expect(aggressive.finalState.result!.winnerId).not.toBe(passive.finalState.result!.winnerId);
  });
});
