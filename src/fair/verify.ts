/**
 * Player-facing round verification.
 *
 * Two independent checks:
 *  1. Commit integrity: SHA-256(serverSeed) equals the hash shown before the round.
 *  2. Outcome integrity: replaying the round from the derived seed and the human's
 *     recorded actions reproduces the winner, pot, and end reason the player saw.
 *
 * Because the engine is pure and bot buy-ins are a deterministic function of the
 * seed, only the human's free choices need to be recorded; everything else is
 * recomputed. Tampering with either the seed or the action log breaks a check.
 */
import type { EngineConfig, RoundResult } from "../engine/types";
import { runRoundDeterministic } from "../sim/runRound";
import type { HumanActionLog } from "../sim/runRound";
import { deriveRoundSeed } from "./commit";
import { sha256Hex } from "./hash";

export interface RoundReplayInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  config: EngineConfig;
  humanName: string;
  humanBalanceCents: number;
  humanActions: HumanActionLog[];
}

export interface VerifyReport {
  hashMatches: boolean;
  outcomeMatches: boolean;
  recomputedHash: string;
  recomputedWinnerId: string | null;
  recomputedPotCents: number;
  recomputedDraws: number;
}

export async function verifyRound(
  committedHash: string,
  recordedResult: RoundResult,
  input: RoundReplayInput,
): Promise<VerifyReport> {
  const recomputedHash = await sha256Hex(input.serverSeed);
  const hashMatches = recomputedHash === committedHash;

  const roundSeed = await deriveRoundSeed(input.serverSeed, input.clientSeed, input.nonce);
  const { finalState, draws } = runRoundDeterministic(
    {
      roundSeed,
      config: input.config,
      humanName: input.humanName,
      humanBalanceCents: input.humanBalanceCents,
    },
    input.humanActions,
  );

  const r = finalState.result;
  const outcomeMatches =
    r !== null &&
    r.winnerId === recordedResult.winnerId &&
    r.potCents === recordedResult.potCents &&
    r.endReason === recordedResult.endReason;

  return {
    hashMatches,
    outcomeMatches,
    recomputedHash,
    recomputedWinnerId: r?.winnerId ?? null,
    recomputedPotCents: r?.potCents ?? 0,
    recomputedDraws: draws,
  };
}
