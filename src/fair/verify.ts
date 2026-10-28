/**
 * Player-facing round verification.
 *
 * Two independent checks:
 *  1. Commit integrity: SHA-256(serverSeed) equals the hash shown before the round.
 *  2. Outcome integrity: replaying the round from the derived seed and the human's
 *     recorded actions reproduces the winner, pot, end reason, and end time the player saw.
 *
 * Because the engine is pure and bot buy-ins are a deterministic function of the
 * seed, only the human's free choices need to be recorded; everything else is
 * recomputed. Swapping the seed breaks the first check; an edited action log breaks
 * the second whenever it changes the winner, pot, end reason, or end time.
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
  // Every field, the end time included: an edited action log can still reach the
  // same winner and pot (pot size depends only on how many buy-ins happened), but
  // it shifts when the round ends.
  const outcomeMatches =
    r !== null &&
    r.winnerId === recordedResult.winnerId &&
    r.potCents === recordedResult.potCents &&
    r.endReason === recordedResult.endReason &&
    r.resolvedAtElapsedMs === recordedResult.resolvedAtElapsedMs;

  return {
    hashMatches,
    outcomeMatches,
    recomputedHash,
    recomputedWinnerId: r?.winnerId ?? null,
    recomputedPotCents: r?.potCents ?? 0,
    recomputedDraws: draws,
  };
}
