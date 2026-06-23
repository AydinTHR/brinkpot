/**
 * The deterministic round orchestrator.
 *
 * This is the one place that ties the pure engine, the bots, and the seeded RNG
 * together. The live rAF loop and the provably-fair verifier both advance a round
 * exclusively through `stepSimulation`, so a replay from the same seed and the same
 * human-action log reproduces the round exactly. Keeping this logic in one shared,
 * framework-free module is what makes verification trustworthy rather than a
 * best-effort re-simulation.
 */
import { BOT_DECISION_WINDOW_MS, FIXED_STEP_MS } from "../engine/config";
import { createRound, reduce } from "../engine/reduce";
import type { EngineConfig, GameEvent, PlayerRef, RoundState } from "../engine/types";
import { createRng } from "../fair/prng";
import type { Rng } from "../fair/prng";
import { decideBot } from "../bots/decide";
import { spawnBots } from "../bots/spawn";
import type { BotSeat } from "../bots/spawn";

export const HUMAN_ID = "you";

export interface Simulation {
  state: RoundState;
  rng: Rng;
  bots: BotSeat[];
  botWindowAccMs: number;
  /** Append-only log of everything that happened, for the activity feed. */
  events: GameEvent[];
}

export interface SetupParams {
  roundSeed: number;
  config: EngineConfig;
  humanName: string;
  humanBalanceCents: number;
}

export function setupSimulation(params: SetupParams): Simulation {
  const rng = createRng(params.roundSeed);
  const bots = spawnBots(rng); // consumes the first RNG draws; fixes the cursor
  const human: PlayerRef = {
    id: HUMAN_ID,
    name: params.humanName,
    isHuman: true,
  };
  const state = createRound({
    config: params.config,
    human: { ref: human, balanceCents: params.humanBalanceCents },
    bots: bots.map((b) => ({ ref: b.ref, balanceCents: b.balanceCents })),
  });
  return { state, rng, bots, botWindowAccMs: 0, events: [] };
}

/**
 * Advance the round by exactly one fixed step. Order within a step is fixed:
 * (1) the human's buy-in if one is pending, (2) bot decision windows, (3) the tick.
 * Returns the events produced this step. Mutates `sim` in place.
 */
export function stepSimulation(sim: Simulation, humanBuyIn: boolean): GameEvent[] {
  if (sim.state.phase !== "active") return [];
  const out: GameEvent[] = [];

  if (humanBuyIn) {
    const r = reduce(sim.state, { type: "BUY_IN", playerId: HUMAN_ID });
    sim.state = r.state;
    out.push(...r.events);
  }

  sim.botWindowAccMs += FIXED_STEP_MS;
  while (sim.botWindowAccMs >= BOT_DECISION_WINDOW_MS && sim.state.phase === "active") {
    sim.botWindowAccMs -= BOT_DECISION_WINDOW_MS;
    for (const bot of sim.bots) {
      if (sim.state.phase !== "active") break;
      if (decideBot(bot, sim.state, sim.rng)) {
        const r = reduce(sim.state, { type: "BUY_IN", playerId: bot.ref.id });
        sim.state = r.state;
        out.push(...r.events);
      }
    }
  }

  const t = reduce(sim.state, { type: "TICK", dtMs: FIXED_STEP_MS });
  sim.state = t.state;
  out.push(...t.events);

  sim.events.push(...out);
  return out;
}

/** A human buy-in recorded at the elapsed-ms it was applied. */
export interface HumanActionLog {
  atElapsedMs: number;
}

export interface RunResult {
  finalState: RoundState;
  events: GameEvent[];
  draws: number;
  steps: number;
}

/**
 * Run a whole round headless to resolution. Used by the verifier and by tests.
 * Human actions are applied at the first step whose elapsed time reaches their
 * recorded timestamp, mirroring exactly how the live loop schedules them.
 */
export function runRoundDeterministic(
  setup: SetupParams,
  humanActions: HumanActionLog[],
  maxSteps = 100_000,
): RunResult {
  const sim = setupSimulation(setup);
  const pending = [...humanActions].sort((a, b) => a.atElapsedMs - b.atElapsedMs);
  let steps = 0;

  while (sim.state.phase === "active" && steps < maxSteps) {
    const elapsed = sim.state.elapsedMs;
    let humanBuyIn = false;
    while (pending.length > 0 && pending[0]!.atElapsedMs <= elapsed) {
      pending.shift();
      humanBuyIn = true;
    }
    stepSimulation(sim, humanBuyIn);
    steps += 1;
  }

  return {
    finalState: sim.state,
    events: sim.events,
    draws: sim.rng.draws,
    steps,
  };
}
