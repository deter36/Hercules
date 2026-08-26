# Hercules & the 12 Labors — Headless Game Rules Contract

## Status

Implementation contract derived from:

- official rulebook
- Verified Gameplay Reference v12
- Engine Execution Specification v0.13
- HERC-RNG-v3

This is a state-machine contract, not a replacement rules source.

## Core engine equation

Every command must conceptually resolve as:

```text
pre-state
+ player/system command
+ committed RNG events when required
-> ordered transitions
-> post-state
-> next pending decision
```

The engine may not make an optional tactical decision for the player.

## Top-level phases

```ts
type GamePhase =
  | "LABOR_SETUP"
  | "MOOD_RESOLUTION"
  | "READY_TO_ROLL"
  | "ROLL_COMMITTED"
  | "POST_ROLL_TRIGGERS"
  | "BLUE_ABILITY_WINDOW"
  | "GOLD_AND_ATTACK_PLACEMENT"
  | "DAMAGE_RESOLUTION"
  | "LABOR_DEFEAT_CHECK"
  | "LABOR_ADVANCE"
  | "IMPACT_RESOLUTION"
  | "FAILURE_CHECK"
  | "ROUND_CLEANUP"
  | "REWARD_SELECTION"
  | "LABOR_TRANSITION"
  | "VICTORY"
  | "DEFEAT";
```

No phase advances through unresolved mandatory work or a pending player decision.

## Canonical state

```ts
interface GameState {
  schemaVersion: string;
  dataRevision: string;

  game: {
    difficulty: "human" | "hero" | "god";
    currentLaborId: string | null;
    completedLaborIds: string[];
    phase: GamePhase;
    result: null | "victory" | "defeat";
  };

  player: {
    spirit: number | "X" | "SKULL";
    divinity: number | "X" | "TOP";
    ownedRewardIds: string[];
    removedRewardOrComponentIds: string[];
    temporaryEffects: ActiveEffect[];
  };

  herculesDice: Record<string, HerculesDieState>;
  currentLabor: CurrentLaborState | null;
  mood: MoodRuntimeState;
  rng: RngState;
  pendingDecision: PendingDecision | null;
  pendingTriggers: PendingTrigger[];
  transitionIndex: number;
}
```

### Hercules die state

```ts
interface HerculesDieState {
  id: string;
  face: number | null;
  rollable: boolean;
  blueUsed: boolean;
  spent: boolean;
  locked: boolean;
  allocated: boolean;
  broken: boolean;
  placement: PlacementRef | null;
  history: DieHistoryEvent[];
}
```

`blueUsed` is independent of `spent`, `locked`, `allocated`, and `broken`.

### Labor die state

```ts
interface LaborDieState {
  id: string;
  health: number;
  startingHealth: number;
  trackId: string;
  nodeId: string;
  status: "active" | "defeated_inactive" | "active_failure_terminal";
}
```

Health and node position are independent.

A Labor die at health 0 becomes `defeated_inactive` immediately and is excluded from later advancement, healing, impacts, skull processing, and "advance all other" effects unless content explicitly overrides it.

## Player-decision API

```ts
interface PendingDecision<T = unknown> {
  id: string;
  type: PendingDecisionType;
  prompt: string;
  legalOptions: LegalOption<T>[];
  source: SourceRef;
  context: Record<string, unknown>;
  allowSkip: boolean;
  randomnessOnResolve: boolean;
  revealsHiddenInformation: boolean;
  undoBarrierOnResolve: boolean;
}
```

Initial decision types must include:

- `CHOOSE_GHOST_ABDERUS_COST`
- `CHOOSE_PHOLUS_REWARD`
- `CHOOSE_BLUE_ABILITY`
- `CHOOSE_REROLL_TARGET`
- `FINISH_BLUE_PHASE`
- `CHOOSE_GOLD_PLACEMENT`
- `CHOOSE_ATTACK_ALLOCATION`
- `CHOOSE_DAMAGE_DISTRIBUTION`
- `RESOLVE_ASSIGNMENTS`
- `CONFIRM_RESOLVE_WITH_UNUSED_MEANINGFUL_PLACEMENT`
- `CHOOSE_TRACK_BRANCH`
- `CHOOSE_DIE_TO_BREAK`
- `CHOOSE_REWARD`
- `CHOOSE_REWARD_TO_REMOVE`
- `CHOOSE_ZEUS_REDRAW`

## Decision contract fields

Every decision implementation must answer:

1. Why does this decision appear?
2. What exact stable IDs are legal?
3. May the player skip?
4. What transition follows selection?
5. Does the choice consume randomness?
6. Does it reveal hidden information?
7. Does it create an RNG undo boundary?

Do not generate legal choices in the GUI.

## Transition/event API

```ts
interface TransitionRecord {
  index: number;
  type: TransitionType;
  source: SourceRef;
  payload: Record<string, unknown>;
  beforeHash: string;
  afterHash: string;
}
```

Transition types should be granular enough for replay, diagnostics, and future animation, for example:

- `MOOD_DRAWN`
- `MOOD_RESOLVED`
- `DIE_ROLLED`
- `DIE_REROLLED`
- `DIE_FACE_CHANGED`
- `DIE_BLUE_USED`
- `DIE_LOCKED`
- `DIE_ALLOCATED`
- `RESOURCE_CHANGED`
- `ATTACK_COMMITTED`
- `LABOR_DAMAGE_APPLIED`
- `LABOR_DIE_DEFEATED`
- `LABOR_DIE_ADVANCED`
- `TRACK_IMPACT_RESOLVED`
- `PENDING_DECISION_CREATED`
- `PENDING_DECISION_RESOLVED`
- `REWARD_GAINED`
- `REWARD_REMOVED`
- `MOOD_DECK_SHUFFLED`
- `GAME_DEFEATED`
- `GAME_WON`

Presentation may animate transitions but must never mutate rules state.

## Round flow

### Roll

`ROLL` is legal only at `READY_TO_ROLL`.

Before rolling:

- snapshot round-start restrictions, especially `cannot_block_this_round`
- determine all rollable non-broken dice in stable H-ID order

The command requests RNG. RNG results are atomically committed before `DIE_ROLLED` transitions become visible.

Melancholic and Enraged apply only to initial rolls, not rerolls.

Ghost of Hippolyta processes every rolled 1, including rerolls.

### Blue window

Each blue square may be used once per roll.

One die may not use more than one blue square unless an explicit verified effect says otherwise.

Using a blue ability sets `blueUsed`; it does not inherently spend the physical die.

Special cases:

- Blood of the Amazons A creates one temporary nonphysical derived contribution with the source value; source and derived contribution may be independently allocated. Derived entity expires at cleanup.
- 100 Immortal Cows A spends/loses its source for the roll; its target may already be blue-used.
- 100 Immortal Cows B marks its source `blueUsed` only; the source remains eligible for later gold/attack placement.
- Zeus' Disregard B redraws the next ordered Mood with no RNG and moves the rejected Mood to the deck bottom.

### Placement

Individual gold/attack placement commands do not finalize the phase.

`RESOLVE_ASSIGNMENTS` is the explicit completion command.

Resolve Assignments:

1. collect usable unallocated dice
2. enumerate legal remaining placements
3. if none, proceed
4. classify legal placements as effectless vs meaningful for this current resolution cycle
5. if all effectless, proceed
6. if at least one meaningful opportunity exists, create `CONFIRM_RESOLVE_WITH_UNUSED_MEANINGFUL_PLACEMENT`
7. player either returns to placement or submits `RESOLVE_ANYWAY`

"Meaningful" means the placement can change a rules-relevant current-cycle outcome. It does not mean strategically good.

### Damage

Validate every committed attack allocation from structured requirements.

Each legal attack instance deals one damage unless content explicitly says otherwise.

If a Labor die reaches 0:

- set `defeated_inactive`
- keep stable ID, health 0, and node
- do not later advance/heal/impact/skull that die

If all required Labor dice are defeated, enter Reward flow without advancement.

### Advancement

Track movement reads outgoing graph edges from the canonical node.

- one outgoing edge: automatic
- multiple outgoing edges: pending branch decision
- no outgoing edge: terminal or content error; do not invent movement

### Impacts

Resolve effects on entered nodes.

`Cannot Block` is a round-start snapshot. Entering a Cannot Block node during end-of-round advancement does not retroactively invalidate blocking already available that round.

`Advance all other Labor dice` affects only other active Labor dice.

Any choice that matters, such as which Hercules die breaks, creates a pending decision.

### Resources

Simultaneous Spirit changes net before bounds.

Simultaneous Divinity changes use the same owner-approved rule.

### Failure

Defeat conditions are explicit.

Do not infer defeat from inability to see progress.

Ceryneian Hind uses the current provisional owner-approved deterministic soft-lock rule: if the Hind is still undefeated and fewer than 2 usable Hercules dice remain, immediately lose the Labor.

## Exceptions table

| Rule | Normal behavior | Verified/provisional exception | Test requirement |
|---|---|---|---|
| Blue-used die | May later gold/attack if legal | Cows A source is lost for roll | Separate A/B lifecycle tests |
| Effective duplicate | Never create second physical die | Blood Amazons A creates temporary nonphysical derived contribution | Allocation + cleanup |
| Cannot Block | Snapshot at round start | Entering node during advancement is non-retroactive | Both timing directions |
| Roll modifiers | Apply to initial roll | Melancholic/Enraged do not affect rerolls | Reroll fixtures |
| Mood redraw | Random only when mechanic actually specifies randomness | Zeus B takes next ordered card, no RNG | Counter unchanged |
| Defeated Labor die | No longer active | Preserve ID/node for audit | Advance-all exclusion |
| Hind failure | Explicit failure normally required | provisional immediate defeat while Hind is undefeated and usable Hercules dice < 2 | Threshold fixture + mark provisional |
| Reward names | display labels may duplicate | canonical variants must use A/B/C/D | schema validation |

## Randomness / undo barriers

Random commands must use HERC-RNG-v3.

Sequence:

`stage -> validate -> atomic commit -> display`

Pre-commit invalid operations consume no event.

Committed RNG event indices never rewind or reuse.

Player undo may reverse only deterministic actions since the most recent committed random event.

Engine execution errors after RNG commitment preserve the committed indices as `orphaned_execution_error`.

## Invariants

These must be executable assertions:

1. Every physical Hercules die has one coherent location/state.
2. A broken/spent/locked/allocated die cannot be illegally reused.
3. `blueUsed` alone never blocks legal gold/attack use.
4. No physical die is duplicated by an effective-dice effect.
5. Every temporary derived contribution has exactly one source physical die.
6. Derived contributions expire at cleanup.
7. Resources remain on valid track positions.
8. Labor node IDs exist in the active track graph.
9. Allocations satisfy the referenced requirement.
10. `defeated_inactive` Labor dice do not advance/heal/impact/skull.
11. No phase advances through unresolved mandatory work or decisions.
12. Ordered hidden Mood state remains exact.
13. `next_event` is monotonic.
14. Committed RNG event indices are unique.
15. Save/load preserves all future-determinism inputs.
16. Persistent Rewards/progression survive Labor transitions.

## Contradiction recovery

If state becomes contradictory:

1. stop
2. inspect authoritative transition history
3. restore from a verified deterministic checkpoint when possible
4. preserve committed RNG history
5. annotate corrections
6. if exact hidden/random state cannot be recovered, mark run non-reproducible

Never silently reconstruct hidden state from expected rules.


## Cretan Bull executable representation

Labor VII is one logical Labor target:

- ID `labor.L07.d1`
- health 12
- track `track.L07`
- start node `L07.start`
- each legal Bull attack deals 1 damage to this entity
- healing applies to this entity, capped at 12
- advancement occurs once for this entity

The physical 6+6 stack is presentation metadata only. It must not create two targets, health pools, node positions, movement operations, healing targets, or defeat checks.


## Count-only Hercules die-pool mapping

Stable physical die IDs must be deterministic whenever a Mood changes only the number of dice available for a Labor.

- Count-only temporary loss: highest-numbered eligible IDs become unavailable first.
- Count-only temporary gain: lowest-numbered unused IDs become available first.
- Mapping occurs before the Labor's first roll.
- This mapping is not a tactical decision and must not generate `PendingDecision`.

Applies to Resolute, Battered, Weight of Atlas, and the die-loss branch of Ghost of Abderus after the player chooses that branch.

Example:
`H1..H6 + Battered -> H1..H5 active, H6 temporarily unavailable`.

This identity convention must be used by RNG roll ordering, replay, diagnostics, and save/load.
