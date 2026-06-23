/**
 * Commit-reveal flow.
 *
 * 1. createCommitment() generates a secret server seed and publishes its SHA-256
 *    hash (the commit) before the round starts.
 * 2. deriveRoundSeed() folds (serverSeed, clientSeed, nonce) into the PRNG seed
 *    that drives every random decision in the round.
 * 3. At round end the server seed is revealed; revealMatches() lets anyone confirm
 *    its hash equals the commit, proving it was not swapped mid-round.
 */
import { randomHex, sha256Hex, hexToSeed } from "./hash";

export interface Commitment {
  /** Secret until the round resolves. */
  serverSeed: string;
  /** Public commitment shown before the round. */
  serverSeedHash: string;
}

export async function createCommitment(): Promise<Commitment> {
  const serverSeed = randomHex(32);
  const serverSeedHash = await sha256Hex(serverSeed);
  return { serverSeed, serverSeedHash };
}

export async function deriveRoundSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): Promise<number> {
  const material = `${serverSeed}:${clientSeed}:${nonce}`;
  return hexToSeed(await sha256Hex(material));
}

export async function revealMatches(serverSeed: string, committedHash: string): Promise<boolean> {
  return (await sha256Hex(serverSeed)) === committedHash;
}
