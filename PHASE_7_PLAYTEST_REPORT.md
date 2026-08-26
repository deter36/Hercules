# Phase 7 — Minimal Playtest Shell Report

## Result

The React + Vite playtest shell is complete. It uses `HerculesEngine` as its only game boundary. The browser UI receives a display-and-command projection from the engine and submits those commands back unchanged; it contains no rule evaluation, randomization, hidden Mood-deck access, or branch-resolution logic.

## Delivered

- New-game controls: difficulty and seed.
- Engine-provided roll, blue ability/reroll, placement, attack, resolve, decision, and deterministic undo controls.
- Active Labor, Mood, player resources, Hercules dice state, Labor die health/node state, Rewards, pending decision, and recent transitions.
- Debug visibility for canonical state, invariants, provenance/content identifiers, RNG ledger/state, hidden Mood order, node IDs, and transition history.
- Downloadable diagnostics bundle.
- A browser-compatible synchronous SHA-256 implementation, preserving the certified HERC-RNG-v3 behavior without a Node runtime dependency.

## Verification

`pnpm test` completed successfully: 75 tests passed, 0 failed. This includes the full Phase 1–6 regression suite, normative RNG vectors, Golden Run 0001, deterministic Human simulations, a production Vite build, and public playtest-view coverage.

## Exit gate

The owner can start and play an engine run through the shell without developer intervention. UI controls are engine-authored command descriptors; the UI does not calculate game legality or content.
