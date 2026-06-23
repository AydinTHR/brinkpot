/** The verifiable commitment that binds a round to a seed. */
export interface FairnessRecord {
  /** SHA-256 of the server seed, shown to the player BEFORE the round (the commit). */
  serverSeedHash: string;
  /** The server seed. Hidden during play, revealed at resolution. */
  serverSeed: string | null;
  /** Player-editable entropy, mixed into the round seed. */
  clientSeed: string;
  /** Increments per round under the same server seed. */
  nonce: number;
  /** Folded 32-bit PRNG seed for the round. Null until the round seed is derived. */
  roundSeed: number | null;
}
