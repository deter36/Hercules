# Hercules final implementation-ready Codex specification

## Execution directive

Continue Hercules from branch `codex/hercules-orchestration-e1` at or after commit
`a8b0f7f3da4096f5a9730596218ac9e83b30822d`. Treat manifest `e1-m0008` and its
exact pins in `orchestration/project_state.json` as the accepted engine, replay,
test, canonical-content, and validation foundation. Preserve its evidence. Do not
replace it with files or fixes from another branch.

Implement the remaining complete-base-game scope below. Work through the headless
confidence gate before presentation polish. If a rule or content fact is missing,
contradictory, or requires invention, stop the affected path and report exact
source references while continuing independent work.

## Objective and scope

Deliver a deterministic TypeScript implementation of *Hercules & the 12 Labors*
covering Human, Hero, and God setup; all 12 Labors; verified Moods and Rewards;
graph tracks; stable die identity; Spirit, Divinity, Bow, and persistent effects;
typed decisions; deterministic RNG; save/load; bounded undo; replay; diagnostics;
and a plain playtest interface. The engine owns every rule and state change. The
interface renders engine state and submits engine-provided legal choices.

Defer final art, animation, audio, haptics, 3D dice, tutorial polish, multiplayer,
AI advice, and packaging.

## Accepted foundation

Independent validation of the assigned experiment scope established:

- all 49 manifest inputs matched exactly;
- Golden Run 0001 passed 112 inputs, five checkpoints, 270 operations, 32 terminal
  assertions, exact failed-die identity/status, and RNG event 174;
- Labor VIII passed ten operation states and five checkpoints, ending with A=5,
  B=6, Spirit=7, Divinity=0, `READY_TO_ROLL`, and no RNG consumed;
- 4/4 replay terminal-evidence negative controls rejected at the first mismatch;
- 10/10 invalid or stale healing-source controls rejected with state and RNG
  unchanged;
- the implementation suite passed 95/95.

This evidence covers the assigned Golden and Labor VIII scenarios and controls.
It does not certify every possible full-game path or rule exception. Keep that
limit explicit in future confidence reports.

## Authority order

1. `src/data/raw/sources/Hercules_Rules_104x155.pdf` — official rules.
2. `src/data/raw/sources/Hercules_Verified_Gameplay_Reference_v12.md` — recorded
   owner-verified behavior.
3. `src/data/raw/sources/Hercules_RNG_Spec_v3.md` — randomness authority.
4. `src/data/raw/GAME_DATA_v4.json` — structured canonical content.
5. `src/data/raw/GAME_RULES_SPEC.md` and
   `src/data/raw/hercules_engine_execution_spec_v0_13.md` — execution semantics.
6. `src/data/raw/GAME_DATA_SCHEMA.md` — representation contract.
7. Test scenarios, fixtures, and golden artifacts — expectations subject to higher
   authority.
8. `src/data/raw/IMPLEMENTATION_BRIEF.md`,
   `src/data/raw/PRESENTATION_FLOW.md`, and `orchestration/product_principles.md` —
   architecture, interface, and product direction.

Use `orchestration/validation/VAL-004-validation-20260914T055055Z-b9a0bf-result.json`
and its handoff/evidence files as the final independent validation record.

The Hind condition remains `provisional_owner_approved`: Hercules is immediately
defeated while the Hind remains undefeated if usable Hercules dice fall below two.
Keep it explicit in code, tests, and reports until the owner changes its status.

## Normative corrected semantics

- Capture Cannot Block from each Labor die's node at the start of its turn.
  Entering such a node later that turn has no immediate effect.
- Healing applies only to the Labor die that entered and triggered the healing
  node. Reject absent, stale, inactive, mismatched, or invalid sources without
  mutating state or consuming RNG.
- Labor VIII has one shared 1-2-3 requirement. One satisfied requirement deals one
  damage to the selected eligible Labor die, then advances and resolves that die.
- Terminal replay evidence is required. Any asserted mismatch, including Hercules
  faces or hidden Mood order, fails at the first differing field.
- Labor VII is one logical `LaborDieState`, `labor.L07.d1`, with health 12 and one
  track. Two stacked gold dice are display metadata.
- Labor-wide losses remove the highest eligible physical Hercules IDs first;
  gains restore the lowest unused IDs first unless authority requires a choice.

## Architecture and behavior

Maintain an engine API equivalent to `createGame`, `submit`, `getLegalCommands`,
`validateState`, `serialize`, and `deserialize`. Each result returns canonical
state, ordered transitions, a pending decision or null, RNG events, and validation.
Every command validates against state, phase, and pending decision. A completed
command resolves deterministic consequences through the next stable input phase
or pending choice. Engine modules must not import interface modules.

Implement `SHA256_COUNTER_V1` exactly per HERC-RNG-v3: exact bytes, SHA-256,
unsigned big-endian first eight bytes, rejection sampling, Fisher-Yates shuffling,
stable physical die order, purpose strings, and one event index per accepted
logical result. Use stage, validate, atomic commit, then display. `next_event`
never decreases; indices are never reused; preserve orphaned execution errors.

A save preserves data revision, canonical state, RNG algorithm/seed/`next_event`,
hidden Mood order, committed ledger or audit reference, pending decision,
transition index, and build version. Loading and continuing the same commands must
produce identical state, transitions, and RNG events. Diagnostics include versions,
state, pending decision, hidden sources, RNG state/ledger, transitions, and
invariant results sufficient to reproduce a report.

Keep rule exceptions in engine/data handlers with source-linked regression tests.
Centralize Mood deck operations. Do not parse Markdown or PDFs at runtime. Validate
raw data and semantic references, generate typed runtime content, compute its hash,
and fail the build on unresolved structural errors.

## Work sequence

1. Reproduce the accepted baseline: verify pins, run data checks and the complete
   suite, and reproduce VAL-004 without changing accepted artifacts.
2. Build a source-to-handler-to-test matrix for every Labor, Mood, Reward,
   exception, pending decision, and difficulty rule. Record untested paths.
3. Close headless gaps in small source-linked changes. Preserve every `e1-m0008`
   result and add meaningful regression coverage for each exception or defect.
4. Prove canonical save/load equality, deterministic continuation, undo boundaries,
   RNG continuity/orphans, exact replay, and deliberate negative controls.
5. Validate invariants after every transition in test/debug runs. Exercise edge
   cases and scripted full-game paths for all difficulties where authoritative
   choices exist. Use practical legal-state fuzzing.
6. Publish a confidence report listing covered paths, exact commands/results,
   provisional rules, untested combinations, and source conflicts.
7. After the headless gate is accepted, build the shell in
   `src/data/raw/PRESENTATION_FLOW.md` through the engine API only.

The shell supports all difficulties, seed entry/display, rolling, blue abilities,
rerolls, gold placement, attack allocation, assignment resolution, resolve-anyway,
branches, broken-die choices, Reward choices/removals, debug inspection, and
diagnostics export. Keep Spirit, Divinity, Labor, Mood, dice, phase, and pending
decision visible. Render ordered transitions with an instant mode. Use a portrait
mobile-first layout that preserves tabletop identity and tactical clarity.

## Acceptance criteria

- Raw and generated data validate; the content hash is reproducible.
- All Labors, verified Moods, and verified Rewards map to typed engine behavior.
- Every legal player choice is a typed command or pending decision.
- Invariants pass; save/load preserves canonical equality and continuation.
- HERC-RNG-v3 vectors, ledger rules, reset continuity, and orphan handling pass.
- Golden Run 0001, Labor VIII, terminal replay controls, and healing-source controls
  remain exact.
- Every known exception has a source-linked regression test.
- Scripted complete games and practical fuzzing reveal no known reproducible engine
  failure, with evidence limits stated in the confidence report.
- The minimal shell permits an owner playthrough without developer intervention
  and contains no rule ownership.

At each milestone run `pnpm data:check`, `pnpm typecheck`, and `pnpm test`. Record
the exact commit, Node/pnpm versions, results, fixture IDs, RNG/checkpoint counts,
and divergences. Any canonical or generated input change requires affected
validators, regressions, and golden replay to run again.

## Stop and report rule

Do not invent card text, graph edges, timing, eligibility, defeat conditions,
target selection, or player decisions. Report conflicting authority passages,
affected IDs and paths, the smallest blocked scope, and the owner decision needed.
Preserve deterministic evidence and continue unblocked work.
