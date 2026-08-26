# Hercules — Phase 6 Headless Confidence Report

Status: certified for the Phase 6 headless gate.

## Evidence

- Full TypeScript build, data certification, and regression suite pass: 74 tests, 0 failures.
- Golden Run 0001 passes ledger verification, normalized-input replay, all five certified checkpoints, and terminal comparison.
  - terminal Spirit: 8
  - terminal Divinity: 3/10
  - terminal RNG event: 174
  - terminal canonical node: `L06C17.n3`
- HERC-RNG-v3 vectors, Fisher-Yates Mood shuffles, staged commit, save/load continuation, append-only orphaned events, and undo-RNG boundaries are covered by regression tests.
- Eight deterministic Human-difficulty simulations, each allowed up to 120 transitions, reached terminal states. Every transition was checked for canonical-state invariants, monotonic RNG event index, and periodic exact save/load round-trip equality.
- The public engine facade and typed command dispatcher validate state after every accepted command transition in test/debug operation.

## Coverage added during Phase 6

- Multiple queued attacks against the same target skip allocations remaining after that target is defeated.
- Spirit loss from content effects, Ghost of Abderus, and paid blue abilities reaches canonical `SKULL` rather than invalid numeric zero.
- A selected track branch resolves the entered impact through the public dispatcher path.

## Residual risks and boundaries

- The Ceryneian Hind rule remains `provisional_owner_approved`: immediate defeat while the Hind is undefeated and fewer than two usable Hercules dice remain. It is explicitly regression-tested.
- The Human simulation policy is a deterministic coverage harness, not a balance or strategy-quality claim.
- No UI work has begun; the next phase may consume only the public engine facade and typed commands.

## Gate decision

No known reproducible headless-engine failure remains in the certified suite. Phase 6 exit conditions are satisfied.
