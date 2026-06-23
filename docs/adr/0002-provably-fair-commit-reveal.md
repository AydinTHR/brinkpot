# 2. Provably-fair rounds via client-side commit-reveal

- Status: accepted
- Date: 2026-06-22

## Context

Brinkpot is a jackpot game, a genre where trust is the central problem: a player has no
reason to believe the outcome was not rigged. The usual answer is a "provably fair"
scheme, but those normally assume a server the player is auditing. Brinkpot has no server
(see ADR 0003), so the scheme has to be honest and verifiable entirely on the client.

The randomness in a round (which rivals spawn, and when each one acts) must therefore be
both reproducible and bound to a value the player saw before the round, so that no outcome
can be chosen after the fact.

## Decision

Every round uses a commit-reveal flow built on the Web Crypto API:

1. **Commit.** Generate a 32-byte random `serverSeed` and show the player
   `SHA-256(serverSeed)` before the round starts.
2. **Derive.** The per-round PRNG seed is `SHA-256(serverSeed + ":" + clientSeed + ":" +
nonce)`, folded to 32 bits. The `clientSeed` is player-editable, so the player
   contributes entropy and the scheme stays meaningful even though it is client-side.
3. **Play.** A small, portable seeded PRNG (mulberry32) drives every random decision in a
   fixed, documented draw order. The engine is otherwise pure and deterministic.
4. **Reveal and verify.** At the end the `serverSeed` is shown. The in-app verifier
   confirms `SHA-256(serverSeed)` equals the committed hash, then replays the round from
   the seed and the player's recorded actions and confirms the winner and pot match.

Only the human's free choices are recorded; bot behaviour is re-derived from the seed,
which is the whole point.

## Consequences

- Outcomes cannot be altered after the commit without breaking the hash check, and cannot
  diverge from what the player saw without breaking the replay check.
- Determinism becomes load-bearing: the fixed-timestep loop and the PRNG draw order must
  stay stable, so a replay-equivalence test guards against accidental nondeterminism.
- The scheme requires a secure context (https or localhost) for `crypto.subtle`; the UI
  surfaces a clear message when that is unavailable rather than failing silently.
- A curious player can reimplement mulberry32 and SHA-256 in any language and independently
  reproduce a round from the revealed values.
