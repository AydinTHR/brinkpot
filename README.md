# Brinkpot

[![CI](https://github.com/AydinTHR/brinkpot/actions/workflows/ci.yml/badge.svg)](https://github.com/AydinTHR/brinkpot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://www.conventionalcommits.org)

A provably-fair jackpot game built on a deliberately different mechanic. Not a slot
machine, not a lottery: a pot that grows on a knife edge, and the nerve to be the last
one holding it.

> Play money only. Brinkpot is a game, not a gambling product. No real wagering, no real
> currency, nothing to cash out.

## The idea

Every buy-in does three things: it adds to the pot, it resets a countdown timer, and it
crowns the buyer the temporary King. Each successive buy-in costs a little more than the
last. When the timer finally reaches zero with no new entry, the King, the last one
standing, takes the entire pot.

The tension is pure FOMO: everyone wants to be last, nobody wants to overpay, and the
sniper in the corner is waiting for you to relax. You play against simulated rivals with
distinct personalities (an early bird, a sniper, a calculated bettor, and a whale), so a
round feels alive without any backend or other players.

## Provably fair

The differentiator is that you never have to trust the game. Before a round starts,
Brinkpot commits to a secret seed by showing you its SHA-256 hash. Every random decision
in the round (which rivals spawn, when each one moves) is derived from that seed plus a
client seed you can edit. When the round ends, the seed is revealed. A built-in verifier
recomputes two things:

1. that `SHA-256(serverSeed)` equals the hash you were shown before play (the seed was
   not swapped), and
2. that replaying the round from that seed and your recorded actions reproduces the exact
   winner and pot you saw.

Because the engine is pure and deterministic, this is a guarantee, not an estimate. See
[docs/adr/0002-provably-fair-commit-reveal.md](./docs/adr/0002-provably-fair-commit-reveal.md).

## Quickstart

```bash
git clone https://github.com/AydinTHR/brinkpot.git
cd brinkpot
npm install
npm run dev          # open the printed localhost URL
```

Append `?fast=1` to the URL for short rounds (used by the end-to-end test).

## Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the Vite dev server                      |
| `npm run build`     | Type-check and build the static site to `dist` |
| `npm run test`      | Run the Vitest unit suite                      |
| `npm run coverage`  | Unit tests with the coverage gate              |
| `npm run e2e`       | Run the Playwright end-to-end round            |
| `npm run lint`      | ESLint                                         |
| `npm run typecheck` | `tsc` with no emit                             |
| `npm run format`    | Prettier write                                 |

## Architecture

Brinkpot splits cleanly into two worlds that never depend on each other backwards:

- **Pure logic** (`src/engine`, `src/fair`, `src/bots`, `src/sim`): no React, no DOM, no
  wall clock, no `Math.random`. Time enters only as integer-millisecond deltas; money is
  always integer cents; randomness comes only from a seeded PRNG. Given the same seed and
  the same inputs, a round reproduces byte for byte. That single property is what makes
  the game both unit-testable and provably fair.
- **React shell** (`src/state`, `src/hooks`, `src/ui`): a Zustand store, a fixed-timestep
  `requestAnimationFrame` loop, and the components. The loop steps the engine at a fixed
  50 ms so behaviour is identical regardless of device frame rate, and a backgrounded tab
  pauses rather than fast-forwarding to a loss.

The live game and the verifier advance a round through the exact same `stepSimulation`
function in `src/sim`, so verification is a real replay rather than a separate
re-implementation. See
[docs/adr/0003-client-only-no-backend.md](./docs/adr/0003-client-only-no-backend.md) for
why there is no server.

## Development

```bash
pre-commit install                 # enable the local checks
pre-commit install --hook-type commit-msg
```

- Branching: short-lived feature branches off `main`, merged via pull request.
- Commits: [Conventional Commits](https://www.conventionalcommits.org).
- Tests, lint, type-check, coverage, and an e2e round run in CI on every pull request and
  must pass before merge.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). By participating you agree to the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) (c) 2026 Aydin.
