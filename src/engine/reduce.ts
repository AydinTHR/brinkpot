import type {
  Command,
  EngineConfig,
  GameEvent,
  ParticipantState,
  PlayerRef,
  ReduceOutput,
  RoundResult,
  RoundState,
} from "./types";
import { nextBuyInCost } from "./cost";

export interface Seat {
  ref: PlayerRef;
  balanceCents: number;
}

export interface CreateRoundParams {
  config: EngineConfig;
  human: Seat;
  bots: Seat[];
}

function seatToParticipant(seat: Seat): ParticipantState {
  return {
    ref: seat.ref,
    balanceCents: seat.balanceCents,
    spentCents: 0,
    buyIns: 0,
    lastBuyInAtMs: null,
  };
}

/** Build a fresh round in the active phase with a full timer and an empty pot. */
export function createRound(params: CreateRoundParams): RoundState {
  const { config, human, bots } = params;
  const seats = [human, ...bots];
  const participants: Record<string, ParticipantState> = {};
  const order: string[] = [];
  for (const seat of seats) {
    participants[seat.ref.id] = seatToParticipant(seat);
    order.push(seat.ref.id);
  }
  return {
    phase: "active",
    config,
    potCents: 0,
    buyInCount: 0,
    nextCostCents: nextBuyInCost(0, config),
    timerMs: config.roundDurationMs,
    elapsedMs: 0,
    kingId: null,
    participants,
    order,
    result: null,
  };
}

const NO_EVENTS: GameEvent[] = [];

function handleBuyIn(state: RoundState, playerId: string): ReduceOutput {
  if (state.phase !== "active") return { state, events: NO_EVENTS };
  const p = state.participants[playerId];
  const cost = state.nextCostCents;
  if (!p || p.balanceCents < cost) return { state, events: NO_EVENTS };

  const buyInCount = state.buyInCount + 1;
  const potCents = state.potCents + cost;
  const timerWasMs = state.timerMs;

  const updated: ParticipantState = {
    ...p,
    balanceCents: p.balanceCents - cost,
    spentCents: p.spentCents + cost,
    buyIns: p.buyIns + 1,
    lastBuyInAtMs: state.elapsedMs,
  };

  const events: GameEvent[] = [
    {
      type: "BUY_IN",
      playerId,
      costCents: cost,
      potCents,
      atMs: state.elapsedMs,
    },
    { type: "CROWNED", playerId, atMs: state.elapsedMs },
  ];
  if (timerWasMs <= state.config.snipeThresholdMs) {
    events.push({
      type: "SNIPE",
      playerId,
      timerWasMs,
      atMs: state.elapsedMs,
    });
  }

  return {
    state: {
      ...state,
      potCents,
      buyInCount,
      nextCostCents: nextBuyInCost(buyInCount, state.config),
      timerMs: state.config.roundDurationMs, // reset the countdown
      kingId: playerId, // crown the buyer
      participants: { ...state.participants, [playerId]: updated },
    },
    events,
  };
}

function resolveRound(state: RoundState): ReduceOutput {
  const winnerId = state.kingId;
  const result: RoundResult = {
    winnerId,
    potCents: state.potCents,
    endReason: winnerId === null ? "no_contest" : "timeout",
    resolvedAtElapsedMs: state.elapsedMs,
  };

  let participants = state.participants;
  if (winnerId !== null) {
    const winner = state.participants[winnerId];
    if (winner) {
      participants = {
        ...state.participants,
        [winnerId]: {
          ...winner,
          balanceCents: winner.balanceCents + state.potCents,
        },
      };
    }
  }

  return {
    state: { ...state, phase: "resolved", timerMs: 0, result, participants },
    events: [{ type: "RESOLVED", result, atMs: state.elapsedMs }],
  };
}

function handleTick(state: RoundState, dtMs: number): ReduceOutput {
  if (state.phase !== "active" || dtMs <= 0) return { state, events: NO_EVENTS };
  const timerMs = state.timerMs - dtMs;
  const elapsedMs = state.elapsedMs + dtMs;
  if (timerMs <= 0) {
    return resolveRound({ ...state, timerMs: 0, elapsedMs });
  }
  return { state: { ...state, timerMs, elapsedMs }, events: NO_EVENTS };
}

/** The single pure seam. Every input to a round goes through here. */
export function reduce(state: RoundState, cmd: Command): ReduceOutput {
  switch (cmd.type) {
    case "TICK":
      return handleTick(state, cmd.dtMs);
    case "BUY_IN":
      return handleBuyIn(state, cmd.playerId);
    default:
      return { state, events: NO_EVENTS };
  }
}
