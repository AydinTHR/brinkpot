import { beforeEach, describe, expect, it } from "vitest";
import { START_WALLET_CENTS } from "../engine/config";
import { STORAGE_KEY } from "../lib/constants";
import { HUMAN_ID } from "../sim/runRound";
import { useGameStore } from "./gameStore";
import { verifyHistoryEntry } from "./persistence";

/** A fresh page load: in-memory state is gone, localStorage survives. */
async function reload() {
  useGameStore.setState(useGameStore.getInitialState(), true);
  await useGameStore.getState().init();
}

/** Start the prepared round, buy in on the first step, and play it to the end. */
function playRoundWithOneBuyIn() {
  const store = useGameStore.getState();
  store.startRound();
  store.queueBuyIn();
  for (let i = 0; i < 200_000 && useGameStore.getState().appPhase !== "resolved"; i += 1) {
    useGameStore.getState().tick();
  }
  expect(useGameStore.getState().appPhase).toBe("resolved");
}

beforeEach(async () => {
  localStorage.clear();
  await reload();
});

describe("reloading mid-round", () => {
  it("keeps the buy-in spent instead of refunding it", async () => {
    const store = useGameStore.getState();
    const cost = store.round!.nextCostCents;
    store.startRound();
    store.queueBuyIn();
    useGameStore.getState().tick();
    expect(useGameStore.getState().round!.participants[HUMAN_ID]!.balanceCents).toBe(
      START_WALLET_CENTS - cost,
    );

    await reload();

    const after = useGameStore.getState();
    expect(after.wallet).toBe(START_WALLET_CENTS - cost);
    // The abandoned round is settled as a loss, so stats agree with the wallet.
    expect(after.stats.roundsPlayed).toBe(1);
    expect(after.stats.netCents).toBe(-cost);
  });

  it("settles an abandoned round only once", async () => {
    const store = useGameStore.getState();
    const cost = store.round!.nextCostCents;
    store.startRound();
    store.queueBuyIn();
    useGameStore.getState().tick();

    await reload();
    await reload();

    expect(useGameStore.getState().stats.roundsPlayed).toBe(1);
    expect(useGameStore.getState().stats.netCents).toBe(-cost);
  });

  it("costs nothing when the player had not bought in yet", async () => {
    useGameStore.getState().startRound();
    useGameStore.getState().tick();

    await reload();

    expect(useGameStore.getState().wallet).toBe(START_WALLET_CENTS);
    expect(useGameStore.getState().stats.roundsPlayed).toBe(0);
  });
});

describe("round history", () => {
  it("keeps every past round verifiable, across a reload", async () => {
    playRoundWithOneBuyIn();
    await useGameStore.getState().nextRound();
    playRoundWithOneBuyIn();

    await reload();

    const history = useGameStore.getState().history;
    expect(history).toHaveLength(2);
    for (const entry of history) {
      const report = await verifyHistoryEntry(entry);
      expect(report.hashMatches).toBe(true);
      expect(report.outcomeMatches).toBe(true);
    }
  });

  it("catches a past round whose outcome or seed was altered", async () => {
    playRoundWithOneBuyIn();
    const entry = useGameStore.getState().history[0]!;

    const editedPot = await verifyHistoryEntry({
      ...entry,
      result: { ...entry.result, potCents: entry.result.potCents + 1 },
    });
    expect(editedPot.hashMatches).toBe(true);
    expect(editedPot.outcomeMatches).toBe(false);

    const swappedSeed = await verifyHistoryEntry({ ...entry, serverSeed: "0".repeat(64) });
    expect(swappedSeed.hashMatches).toBe(false);
  });

  it("drops saved rounds from before replay data was stored", async () => {
    playRoundWithOneBuyIn();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const legacy = { ...saved.history[0] };
    for (const key of ["config", "startWalletCents", "humanActions", "result"]) delete legacy[key];
    saved.history = [legacy, saved.history[0]];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    await reload();

    expect(useGameStore.getState().history).toHaveLength(1);
  });
});
