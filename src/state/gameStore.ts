import { create } from "zustand";
import { DEFAULT_CONFIG, START_WALLET_CENTS } from "../engine/config";
import type { EngineConfig, GameEvent, RoundState } from "../engine/types";
import { createCommitment, deriveRoundSeed } from "../fair/commit";
import { isCryptoAvailable } from "../fair/hash";
import { verifyRound } from "../fair/verify";
import type { VerifyReport } from "../fair/verify";
import { HUMAN_ID, setupSimulation, stepSimulation } from "../sim/runRound";
import type { HumanActionLog, Simulation } from "../sim/runRound";
import { FEED_LIMIT, HISTORY_LIMIT, SCHEMA_VERSION } from "../lib/constants";
import { loadPersisted, savePersisted } from "./persistence";
import type { HistoryEntry, PersistedState, Stats } from "./persistence";

export type AppPhase = "loading" | "unsupported" | "idle" | "active" | "resolved";

export interface FairnessView {
  serverSeedHash: string | null;
  /** Revealed only once the round resolves. */
  serverSeed: string | null;
  clientSeed: string;
  nonce: number;
  roundSeed: number | null;
}

interface GameState {
  appPhase: AppPhase;
  config: EngineConfig;
  round: RoundState | null;
  feed: GameEvent[]; // newest first, capped
  fairness: FairnessView;
  wallet: number;
  stats: Stats;
  history: HistoryEntry[];
  verifyReport: VerifyReport | null;
  verifying: boolean;
  /** Hides the result overlay so the resolved round can be reviewed and verified. */
  resultDismissed: boolean;

  // Non-reactive working state (not selected by components).
  sim: Simulation | null;
  secretSeed: string | null;
  humanActions: HumanActionLog[];
  roundStartWallet: number;
  buyQueued: boolean;
  nextNonce: number;

  // Actions.
  init: () => Promise<void>;
  prepareRound: () => Promise<void>;
  startRound: () => void;
  tick: () => void;
  queueBuyIn: () => void;
  nextRound: () => Promise<void>;
  verifyCurrent: () => Promise<void>;
  setClientSeed: (seed: string) => void;
  resetBankroll: () => void;
  dismissResult: () => void;
  humanCanAfford: () => boolean;
}

function snapshotPersisted(s: GameState): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    wallet: s.wallet,
    stats: s.stats,
    history: s.history,
    clientSeed: s.fairness.clientSeed,
    nextNonce: s.nextNonce,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  appPhase: "loading",
  config: DEFAULT_CONFIG,
  round: null,
  feed: [],
  fairness: {
    serverSeedHash: null,
    serverSeed: null,
    clientSeed: "",
    nonce: 0,
    roundSeed: null,
  },
  wallet: START_WALLET_CENTS,
  stats: { roundsPlayed: 0, wins: 0, bestWinCents: 0, netCents: 0 },
  history: [],
  verifyReport: null,
  verifying: false,
  resultDismissed: false,

  sim: null,
  secretSeed: null,
  humanActions: [],
  roundStartWallet: START_WALLET_CENTS,
  buyQueued: false,
  nextNonce: 0,

  init: async () => {
    if (!isCryptoAvailable()) {
      set({ appPhase: "unsupported" });
      return;
    }
    // Test/demo hook: ?fast=1 shrinks the round so e2e runs quickly and reliably.
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (params.get("fast") === "1") {
      set({
        config: {
          ...DEFAULT_CONFIG,
          roundDurationMs: 2_500,
          snipeThresholdMs: 800,
        },
      });
    }
    const p = loadPersisted();
    set({
      wallet: p.wallet,
      stats: p.stats,
      history: p.history,
      nextNonce: p.nextNonce,
      fairness: { ...get().fairness, clientSeed: p.clientSeed },
    });
    await get().prepareRound();
  },

  prepareRound: async () => {
    const { config, fairness, nextNonce, wallet } = get();
    const usedNonce = nextNonce;
    const { serverSeed, serverSeedHash } = await createCommitment();
    const roundSeed = await deriveRoundSeed(serverSeed, fairness.clientSeed, usedNonce);
    const sim = setupSimulation({
      roundSeed,
      config,
      humanName: "You",
      humanBalanceCents: wallet,
    });
    set({
      appPhase: "idle",
      sim,
      secretSeed: serverSeed,
      humanActions: [],
      buyQueued: false,
      round: sim.state,
      feed: [],
      verifyReport: null,
      resultDismissed: false,
      roundStartWallet: wallet,
      nextNonce: usedNonce + 1,
      fairness: {
        serverSeedHash,
        serverSeed: null,
        clientSeed: fairness.clientSeed,
        nonce: usedNonce,
        roundSeed,
      },
    });
    savePersisted(snapshotPersisted(get()));
  },

  startRound: () => {
    if (get().appPhase === "idle") set({ appPhase: "active" });
  },

  queueBuyIn: () => {
    if (get().appPhase === "active") set({ buyQueued: true });
  },

  humanCanAfford: () => {
    const s = get().round;
    if (!s) return false;
    const p = s.participants[HUMAN_ID];
    return !!p && p.balanceCents >= s.nextCostCents;
  },

  tick: () => {
    const st = get();
    const sim = st.sim;
    if (st.appPhase !== "active" || !sim) return;

    let humanBuy = false;
    let recordAt = 0;
    if (st.buyQueued && sim.state.phase === "active") {
      const p = sim.state.participants[HUMAN_ID];
      if (p && p.balanceCents >= sim.state.nextCostCents) {
        humanBuy = true;
        recordAt = sim.state.elapsedMs;
      }
    }

    const events = stepSimulation(sim, humanBuy);
    const humanActions = humanBuy
      ? [...st.humanActions, { atElapsedMs: recordAt }]
      : st.humanActions;

    let feed = st.feed;
    if (events.length > 0) {
      feed = [...events].reverse().concat(st.feed).slice(0, FEED_LIMIT);
    }

    if (sim.state.phase === "resolved") {
      const finalState = sim.state;
      const result = finalState.result!;
      const human = finalState.participants[HUMAN_ID]!;
      const won = result.winnerId === HUMAN_ID;
      const delta = human.balanceCents - st.roundStartWallet;
      const winnerName =
        result.winnerId !== null
          ? (finalState.participants[result.winnerId]?.ref.name ?? "Nobody")
          : "Nobody";

      const stats: Stats = {
        roundsPlayed: st.stats.roundsPlayed + 1,
        wins: st.stats.wins + (won ? 1 : 0),
        bestWinCents: Math.max(st.stats.bestWinCents, won ? result.potCents : 0),
        netCents: st.stats.netCents + delta,
      };
      const entry: HistoryEntry = {
        endedAt: Date.now(),
        potCents: result.potCents,
        won,
        winnerName,
        serverSeedHash: st.fairness.serverSeedHash ?? "",
        serverSeed: st.secretSeed ?? "",
        clientSeed: st.fairness.clientSeed,
        nonce: st.fairness.nonce,
      };
      const history = [entry, ...st.history].slice(0, HISTORY_LIMIT);

      set({
        appPhase: "resolved",
        resultDismissed: false,
        round: finalState,
        feed,
        humanActions,
        buyQueued: false,
        wallet: human.balanceCents,
        stats,
        history,
        fairness: { ...st.fairness, serverSeed: st.secretSeed },
      });
      savePersisted(snapshotPersisted(get()));
      return;
    }

    set({ round: sim.state, feed, humanActions, buyQueued: false });
  },

  nextRound: async () => {
    await get().prepareRound();
    get().startRound();
  },

  dismissResult: () => set({ resultDismissed: true }),

  verifyCurrent: async () => {
    const st = get();
    if (
      st.appPhase !== "resolved" ||
      !st.round?.result ||
      !st.secretSeed ||
      !st.fairness.serverSeedHash
    ) {
      return;
    }
    set({ verifying: true });
    const report = await verifyRound(st.fairness.serverSeedHash, st.round.result, {
      serverSeed: st.secretSeed,
      clientSeed: st.fairness.clientSeed,
      nonce: st.fairness.nonce,
      config: st.config,
      humanName: "You",
      humanBalanceCents: st.roundStartWallet,
      humanActions: st.humanActions,
    });
    set({ verifyReport: report, verifying: false });
  },

  setClientSeed: (seed) => {
    const clean = seed.trim().slice(0, 64) || get().fairness.clientSeed;
    set({ fairness: { ...get().fairness, clientSeed: clean } });
    savePersisted(snapshotPersisted(get()));
    if (get().appPhase === "idle") void get().prepareRound();
  },

  resetBankroll: () => {
    set({ wallet: START_WALLET_CENTS });
    savePersisted(snapshotPersisted(get()));
    if (get().appPhase === "idle") void get().prepareRound();
  },
}));
