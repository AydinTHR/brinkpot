# 3. Client-only, no backend

- Status: accepted
- Date: 2026-06-22

## Context

A jackpot game suggests a server: a shared pot, real opponents, authoritative state. But
Brinkpot is a portfolio piece and a play-money game, not a wagering product. The goals are
a polished, original, verifiable game that anyone can open and play instantly, and a
codebase that shows engineering judgement rather than operational scope.

## Decision

Brinkpot ships as a static, client-only single-page app. There is no backend, no database,
and no real-money handling. Rivals are simulated bots with distinct personalities, the
wallet is play money persisted in `localStorage`, and fairness is established with a
client-side commit-reveal scheme (ADR 0002) rather than by auditing a server.

The app builds to static files and deploys to GitHub Pages.

## Consequences

- Zero infrastructure to run, secure, or pay for; the game loads instantly and works
  offline once cached.
- No multiplayer: opponents are deterministic bots. This is a deliberate trade for
  simplicity and is what makes a round fully reproducible and verifiable.
- The provably-fair story has no adversarial server, so the player-editable client seed is
  what keeps it honest.
- If real multiplayer is ever wanted, the pure engine and the shared `stepSimulation`
  orchestrator could move server-side with the same code, since they already avoid React,
  the DOM, and the wall clock. That is explicitly out of scope here.
