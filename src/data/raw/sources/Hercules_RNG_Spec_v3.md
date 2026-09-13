# Hercules Deterministic RNG Specification — HERC-RNG-v3

**Algorithm ID:** `SHA256_COUNTER_V1`

**Policy version:** HERC-RNG-v3. The hash algorithm is unchanged from v2; v3 finalizes transaction, undo, and execution-error recovery semantics.

## Why v2 exists

HERC-RNG-v1 used a conventional mutable PRNG state. That is suitable for normal software but fragile when ChatGPT is acting as the runtime engine because a tool/kernel reset can destroy in-memory generator state.

HERC-RNG-v2 is counter-based. A random result is recoverable from canonical text state alone:

`algorithm + game_seed + event_index + purpose = result`

There is no hidden PRNG state to preserve.

## Hard execution rule

**No random result may ever be generated in prose.**

Every Mood shuffle, Mood redraw, Hercules die roll, reroll, or future random mechanic must be computed by an actual computation tool using this specification before the result is shown to the player.

If the computation step was not executed, the result is invalid and must not be described as seeded or deterministic.

## Transaction model

Random operations use:

`stage -> validate -> commit -> display`

1. Determine that randomness is legally required from the canonical pre-state.
2. Stage candidate random result(s) with the current `next_event`.
3. Validate the entire deterministic transition that would consume those results.
4. Atomically commit the random event(s), resulting canonical mutation, ledger entry/entries, and updated `next_event`.
5. Only after commit may the result be displayed or animated.

A staged result that fails validation is discarded before commitment and consumes no logical event index.

Once committed, an event is immutable.


## Canonical RNG state

The game state must contain:

- `algorithm = SHA256_COUNTER_V1`
- `game_seed`
- `next_event` — unsigned 64-bit logical event index
- ordered hidden sources, especially the Mood deck
- committed random-event ledger

No random operation is legal unless these fields are initialized.

## Mandatory setup phase

`SETUP -> RNG_INITIALIZE -> MOOD_SHUFFLE -> MOOD_DRAW`

Before `RNG_INITIALIZE` completes, the engine must refuse to roll, shuffle, draw randomly, or reroll.

For validation/golden runs, the player should supply the seed.

For ordinary playtests, the engine may generate a seed with an actual computation/randomness tool, immediately record it, and display it. It may never silently change the seed.

## Exact byte encoding

For logical event `(seed, event_index, purpose, attempt)`:

1. ASCII magic bytes: `HERC-RNG-V2` followed by one zero byte.
2. Seed: `uint32_be(byte_length)` followed by UTF-8 seed bytes.
3. Event index: unsigned `uint64_be`.
4. Purpose: `uint32_be(byte_length)` followed by UTF-8 purpose bytes.
5. Attempt: unsigned `uint32_be`.

Then:

`digest = SHA256(encoded_bytes)`

Use the first 8 bytes of the digest as an unsigned big-endian 64-bit integer.

This length-prefixed encoding prevents ambiguous concatenation.

## Bounded integer / rejection sampling

To produce an integer in `[0, n)`:

`limit = 2^64 - (2^64 mod n)`

For `attempt = 0,1,2...`:
- compute the event digest with that attempt
- read the first 8 bytes as `raw`
- if `raw < limit`, return `raw mod n`
- otherwise retry with the next attempt

A rejection attempt does **not** consume another logical event index.

A d6 is:

`bounded(6) + 1`

## Event indexing

`next_event` increments exactly once after each accepted logical random result.

Examples:
- each Fisher-Yates shuffle swap consumes one event
- each physical die result consumes one event
- each rerolled physical die consumes one event
- a random redraw/selection consumes the event(s) precisely defined by that operation

All currently rollable physical dice are processed in stable die-ID order: `H1, H2, ...`.

## Purpose strings

Purpose is part of the hash domain and must be stable, explicit, and human-auditable.

Recommended examples:

- `setup_mood_shuffle:swap_i=8`
- `labor1:roll1:H1`
- `labor1:roll1:H2`
- `labor3:reroll2:H4`
- `reward_zeus_disregard:mood_redraw:swap_i=...`

Purpose labels must describe the operation actually being committed. They are not decorative.

## Mood deck

Use Fisher-Yates.

For an array of length `N`, for `i=N-1` down to `1`:
- consume one bounded integer event in `[0, i]`
- swap positions `i` and `j`

After shuffling, the full ordered Mood deck is committed hidden canonical state.

When a Mood later returns and the rules require reshuffling, execute and ledger the required shuffle operation using new event indices. Never recreate or reorder the deck from memory.

## Commit protocol

For every random event:

1. Verify algorithm, seed, and `next_event`.
2. Compute result with an actual tool.
3. Record event index, purpose, attempt data/raw hash information sufficient for audit, and interpreted result.
4. Increment `next_event`.
5. Mutate any resulting hidden source order/state.
6. Only then display or animate the outcome.

Once committed, an event is immutable. A later rules/display correction must reuse the committed result.

## Recovery

RNG history is append-only.

Hard invariants:

- `next_event` never decreases.
- A committed event index is never reused.
- A committed result is never regenerated for a different purpose.
- Player undo never crosses a committed RNG boundary.

The minimal continuation state is:

- algorithm
- game seed
- next event index
- ordered hidden sources
- canonical game state
- committed event ledger sufficient for audit/reconciliation

### Normal deterministic undo

The player may undo deterministic actions only within the interval after the most recent committed random event.

Undo may restore game state, placements, resource changes, or choices made after that random event, but it does not modify the RNG ledger or `next_event`.

### Engine execution error after RNG commitment

If an engine defect commits random events that should not have occurred:

1. Stop further randomization.
2. Restore canonical **game state** to the last valid deterministic checkpoint as needed.
3. Do **not** rewind RNG history.
4. Retain the erroneous committed events in the ledger with status:
   `orphaned_execution_error`
5. Record the reason, affected event range, and reconciliation point.
6. Continue from the already-advanced `next_event`.

Example:

`150-157: orphaned_execution_error / erroneous Zeus reshuffle`

The next legitimate event is 158. Events 150-157 are never reused.

This preserves auditability and prevents a bug correction from becoming an accidental reroll.

### Pre-commit validation failure

If a candidate random operation is detected as invalid before atomic commitment, it is not an RNG event. Discard the staged candidate and leave `next_event` unchanged.

## Runtime reset invariant

A tool/kernel reset must not change future results.

Given the same:
- algorithm
- seed
- next event
- purpose
- canonical hidden source order

the next result must be identical even if all prior in-memory computation state has been destroyed.

## Production vs diagnostic exposure

The production engine must implement the RNG ledger, monotonic event index, atomic commit, undo boundary, and orphan-event recovery semantics.

Normal players do not need to see the full ledger. Developer/debug tooling may expose:
- seed
- `next_event`
- purpose strings
- hashes/raw values
- orphaned-event annotations
- replay/audit diagnostics

Diagnostic visibility must never change canonical game behavior.

## Versioning

Never silently change this algorithm or policy.

Saved runs record:
- `SHA256_COUNTER_V1`
- RNG policy version `HERC-RNG-v3`

A future algorithm or incompatible policy change requires a new version identifier and must not alter existing replay results.
