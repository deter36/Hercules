# Hercules & the 12 Labors — Codex Implementation Brief

## Mission

Implement a deterministic, headless TypeScript game engine for the complete base game.

Do not build the polished mobile app yet.

The first implementation goal is high confidence in rules correctness, state integrity, and deterministic replay. Only after the engine passes its certification gates should a deliberately simple playtest UI be attached.

## Source/layer responsibilities

```text
Official rulebook / component text
  -> rules authority

Verified Gameplay Reference v12
  -> implementation-facing content truth

GAME_DATA_v4.json
  -> structured runtime content derived from verified reference

Engine Execution Specification v0.13
+ GAME_RULES_SPEC.md
  -> sequencing, timing, state transitions, validation

HERC-RNG-v3
  -> deterministic randomness authority

TEST_SCENARIOS.md
  -> certification fixtures

PRESENTATION_FLOW.md
  -> minimal test UI behavior

IMPLEMENTATION_BRIEF.md
  -> software architecture and delivery contract
```

If implementation documents conflict with higher rules authority, stop and report the conflict. Do not silently choose a convenient interpretation.

## Product scope

In scope:

- complete 12-Labor base game
- Human/Hero/God setup
- all verified Moods
- all verified Rewards
- graph-based Labor tracks
- deterministic RNG
- save/load
- replay
- diagnostics
- undo within defined boundary
- headless tests
- minimal playtest UI after certification

Out of scope for the first delivery:

- final mobile visual design
- production art treatment
- 3D dice/physics
- sound/haptics
- polished tutorial
- final animation timing
- app-store packaging
- multiplayer
- AI tactical recommendations

## Recommended repository layout

```text
src/
  data/
    raw/
    generated/
    schema/
  engine/
    state/
    commands/
    transitions/
    decisions/
    requirements/
    effects/
    tracks/
    rewards/
    moods/
    labor/
    resources/
    invariants/
  rng/
  replay/
  save/
  diagnostics/
  ui-test-shell/

test/
  data/
  unit/
  edge/
  labor/
  replay/
  golden/
```

Keep the UI dependency pointing inward toward the engine API only. Engine modules must not import UI code.

## Public engine API

Recommended shape:

```ts
interface HerculesEngine {
  createGame(config: NewGameConfig): EngineResult;
  submit(state: GameState, command: EngineCommand): EngineResult;
  getLegalCommands(state: GameState): LegalCommandDescriptor[];
  validateState(state: GameState): ValidationReport;
  serialize(state: GameState): SerializedGame;
  deserialize(save: SerializedGame): GameState;
}

interface EngineResult {
  state: GameState;
  transitions: TransitionRecord[];
  pendingDecision: PendingDecision | null;
  rngEvents: RngEventRecord[];
  validation: ValidationReport;
}
```

Do not expose helpers that allow the GUI to mutate state directly.

## Commands

Use typed commands, for example:

- `ROLL`
- `USE_BLUE_ABILITY`
- `REROLL_DIE`
- `FINISH_BLUE_PHASE`
- `PLACE_GOLD`
- `ALLOCATE_ATTACK`
- `RESOLVE_ASSIGNMENTS`
- `RESOLVE_ANYWAY`
- `CHOOSE_BRANCH`
- `CHOOSE_BROKEN_DIE`
- `CHOOSE_REWARD`
- `CHOOSE_REWARD_TO_REMOVE`
- `CHOOSE_MOOD_OPTION`
- `CHOOSE_ZEUS_REDRAW`
- `UNDO_DETERMINISTIC`

Each command must validate against canonical state and current pending decision.

## RNG subsystem

Implement HERC-RNG-v3 exactly.

Algorithm ID:
`SHA256_COUNTER_V1`

Requirements:

- exact byte encoding from the RNG spec
- SHA-256
- first 8 bytes unsigned big-endian
- rejection sampling
- one event index per accepted logical result
- Fisher-Yates deck shuffle
- stable physical die order
- purpose strings recorded
- append-only event ledger
- orphaned execution-error support
- `next_event` never decreases
- no event index reuse
- stage -> validate -> atomic commit -> display semantics

RNG is justified for this project because deterministic golden replay is a required feature.

### Required normative RNG test vectors

At minimum, Golden Run 0001 supplies known events:

- setup event 0 purpose `setup_mood_shuffle:swap_i=8`
  - expected `j=6`
- setup event 7 purpose `setup_mood_shuffle:swap_i=1`
  - expected `j=1`
- Labor I event 8 purpose `labor1:roll1:H1`
  - expected face 1
- Labor I event 10 purpose `labor1:roll1:H3`
  - expected face 6
- event 153 purpose `labor5:end_mood_shuffle:swap_i=1`
  - expected `j=0`
- event 173 purpose `labor6:cows_b:reroll2:H5`
  - expected face 5

Use the full golden ledger as the stronger integration vector.

## Save/replay contract

A save must include enough state to continue with identical future results:

- schema/data revision
- canonical GameState
- RNG algorithm
- seed
- `next_event`
- ordered hidden Mood deck
- committed event ledger or durable audit reference
- pending decision
- transition index
- build version

Replay fixture includes:

- initial config/seed
- ordered player commands/decisions
- expected RNG events
- expected checkpoints
- expected final state

Automated replay must require no human memory.

## Diagnostics contract

Provide downloadable JSON behind a debug flag containing:

```ts
interface DiagnosticsBundle {
  engineVersion: string;
  dataRevision: string;
  uiVersion?: string;
  state: GameState;
  pendingDecision: PendingDecision | null;
  hiddenSources: object;
  rng: RngState;
  rngLedger: RngEventRecord[];
  transitions: TransitionRecord[];
  validation: ValidationReport;
}
```

This must be sufficient to diagnose "I think the game skipped/misresolved something" reports.

## Centralized hidden-source/random behavior

Mood deck operations belong in one subsystem.

Individual Reward/Mood mechanics may request operations such as:

- return active Mood
- add Mood
- draw next ordered Mood
- shuffle

They must not each implement custom deck mutation or RNG.

## Data generation

`GAME_DATA_v4.json` is initial implementation input.

Before runtime use:

1. validate JSON shape
2. validate semantic references
3. generate typed TypeScript constants or validated JSON bundle
4. compute content hash
5. fail build on unresolved structural errors

Do not parse Markdown/PDF/images at runtime.

## Exceptions

Implement exception behavior through explicit data/effect handlers where feasible.

Do not scatter one-off conditionals through UI components.

Maintain a source-to-test exceptions table based on `GAME_RULES_SPEC.md`.

## Phase plan and exit gates

### Phase 1 — Data certification

Deliver:
- schema validator
- semantic validator
- generated runtime content
- content hash

Exit gate:
- all current game data loads
- all IDs/references validate
- all graph topology validates
- no unresolved structural content error

### Phase 2 — Canonical state certification

Deliver:
- GameState types
- constructors
- serialization
- executable invariants

Exit gate:
- state invariant suite passes
- save/load round-trip produces canonical equality/hash equality

### Phase 3 — Generic engine certification

Deliver:
- command dispatcher
- pending decisions
- transition records
- dice lifecycle
- requirements
- resources
- effects
- phases
- track graph engine

Exit gate:
- generic unit/subroutine tests green

### Phase 4 — Content/mechanic certification

Deliver:
- all Moods
- all Rewards
- all 12 Labors
- special exceptions

Exit gate:
- constructed edge cases green
- Labor-specific tests green
- every exception has regression coverage

### Phase 5 — RNG/save/replay certification

Deliver:
- HERC-RNG-v3
- atomic RNG commit
- undo boundary
- orphan recovery
- replay runner
- diagnostics export

Exit gate:
- normative RNG vectors green
- total runtime reset continuity test green
- save/load deterministic continuation green
- Golden Run 0001 replay green with zero RNG/checkpoint mismatches

### Phase 6 — Headless confidence gate

Run:
- full regression suite
- randomized/constructed legal-state fuzz where practical
- one or more headless full-game simulations using scripted player choices
- invariant validation after every transition in test/debug mode

Exit gate:
- no known reproducible engine failure
- all required fixtures green
- Golden Run 0001 certified
- provisional Hind rule clearly flagged and tested: immediate defeat while Hind is undefeated if usable Hercules dice fall below 2
- Codex produces a confidence report listing residual risks

**Do not attach UI before this gate is accepted.**

### Phase 7 — Minimal playtest shell

Build a plain test UI according to `PRESENTATION_FLOW.md`.

It should allow the owner to:

- start Human/Hero/God games
- supply/display seed
- roll
- use blue abilities/rerolls
- finish blue phase
- place gold dice
- allocate attacks
- Resolve Assignments
- resolve-anyway
- choose branches
- choose broken dice
- choose Rewards/removals
- inspect canonical debug state
- export diagnostics

Exit gate:
- owner can play through the engine without developer intervention
- UI contains no game-rule calculations

## Source correction workflow

When source data/rules are corrected:

1. identify authority/source pointer
2. modify canonical source data/spec
3. regenerate derived data
4. update content hash
5. rerun validators
6. rerun impacted tests
7. rerun golden fixture if dependency changed
8. never silently patch only the GUI

## Error classification

Every defect should be labeled:

- source/data error
- state-schema gap
- execution-spec error
- missing rule
- engine execution error
- RNG implementation error
- display/interaction problem

This classification should appear in diagnostics/issues when practical.

## Acceptance criteria for initial Codex completion

The initial engine milestone is complete only when:

1. All 12 Labors are represented by structured validated data.
2. All Moods/Rewards used by the base game are represented.
3. Engine state is serializable and invariant-checked.
4. Player choices are represented as typed pending decisions/legal options.
5. Engine emits ordered structured transitions.
6. No UI rule ownership exists.
7. HERC-RNG-v3 passes vectors and replay tests.
8. Golden Run 0001 reproduces exactly under documented reconciliation.
9. Constructed edge-case/regression suite passes.
10. Diagnostics bundle can reconstruct a reported game.
11. Codex documents remaining provisional/unresolved items.
12. A confidence report is produced before UI work starts.

## Instruction to Codex

When a rule/content fact is absent, contradictory, or cannot be represented without inference:

**stop and report it.**

Do not invent card text, track edges, timing, defeat conditions, target eligibility, or player decisions to make the implementation convenient.


## Labor VII representation requirement
Implement Cretan Bull as one logical `LaborDieState` (`labor.L07.d1`) with health 12 and one track. The two stacked gold dice showing 6+6 are representation metadata only.


## Temporary die-pool identity requirement

Implement Labor-wide count modifiers with deterministic physical ID mapping:

- losses -> highest currently eligible H IDs first
- gains -> lowest currently unused H IDs first

Do not create player decisions for this bookkeeping unless the source explicitly requires choosing a specific physical die.
