# Hercules & the 12 Labors — Game Data Contract

## Purpose

This file defines the implementation-facing content contract. Runtime rules must consume validated structured data; they must not parse scans, card images, PDFs, or prose at runtime.

## Authority boundary

- Official rules / FAQ / errata: mechanics authority.
- Verified Gameplay Reference: implementation-facing content truth.
- Engine Execution Specification: sequencing and timing.
- This schema: representation contract only.

The schema must not invent mechanics.

## Stable ID policy

Names are never primary keys. Every persistent or replay-relevant object receives a stable ID.

Canonical ID families:

- `labor.L01` … `labor.L12`
- `labor.L06.C14`
- `track.L11`
- `reward.L04.A`
- `ability.reward.L04.A.gold`
- `mood.ghost_pholus`
- physical Hercules dice: `H1` … `H11`

Reward variants are A/B/C/D in physical left-to-right order.

Duplicate physical components must be represented as distinct instances even when display text is identical.

## Provenance contract

Every source-derived record must support:

```ts
type VerificationStatus =
  | "verified"
  | "owner_verified"
  | "source_conflicted"
  | "provisional_owner_approved"
  | "unresolved";

interface Provenance {
  source: string;
  pointer?: string;
  status: VerificationStatus;
  note?: string;
}
```

Generated runtime data may additionally carry `derived_from` hashes/IDs.

## Core data interfaces

```ts
interface GameData {
  schema_version: string;
  difficulty: Record<DifficultyId, DifficultyDefinition>;
  components: ComponentDefinitions;
  moods: MoodDefinition[];
  labors: LaborDefinition[];
}

interface DifficultyDefinition {
  starting_hercules_dice: number;
  remove_moods: MoodId[];
}

interface MoodDefinition {
  id: MoodId;
  name: string;
  class: "normal" | "special";
  effect: EffectDefinition;
  provenance: string;
  status: VerificationStatus;
}

interface LaborDefinition {
  id: LaborId;
  number: number;
  name: string;
  labor_dice?: LaborDieDefinition[];
  labor_entity?: object;
  attack?: AttackDefinition;
  attacks?: Record<string, AttackDefinition>;
  tracks: Record<TrackId, TrackDefinition>;
  rewards: RewardDefinition[];
  failure_rule?: object;
  status: VerificationStatus | string;
  provenance: string;
}

interface LaborDieDefinition {
  id: string;
  start_health: number;
  track_id?: TrackId;
  attack_id?: string;
  attack_group?: string;
  entry?: NodeId;
}

type TrackDefinition =
  | LinearTrackDefinition
  | CircularTrackDefinition
  | BranchingGraphDefinition
  | SharedDirectedGraphDefinition;

interface GraphNode {
  id?: NodeId;
  effect: EffectDefinition | null;
  next?: NodeId[];
}
```

## Attack requirement vocabulary

The first implementation must support at least:

```ts
type Requirement =
  | { type: "exact_die"; value: number }
  | { type: "die_in"; values: number[] }
  | { type: "matching_pair" }
  | { type: "matching_triple" }
  | { type: "matching_exact_pair"; value: number }
  | { type: "exact_sum"; sum: number; min_dice?: number }
  | { type: "fixed_straight"; values: number[] }
  | { type: "variable_straight"; length: number }
  | { type: "sum_equals_third"; dice_count: 3 }
  | { type: "three_plus_x_lte_y"; dice_count: 3 }
  | { type: "multiplication_equals_sum_of_others" }
  | { type: "one_even_one_odd" }
  | { type: "exact_values"; values: number[] }
  | { type: "any_die" };
```

Do not implement these as free-form strings.

## Effect vocabulary

Use typed effects, including:

- Spirit gain/loss
- Divinity gain/loss
- Labor healing
- break Hercules die
- advance other active Labor dice
- Cannot Block state
- failure/skull
- temporary Hercules-die pool change
- Mood add/remove
- Reward remove
- block Spirit loss
- blue die manipulation
- reroll
- temporary derived contribution

Effects that require a player choice return a pending decision; they are not silently resolved by data parsing.

## Track topology

Labor tracks are graphs.

Never reduce them to a counter. Each Labor die stores both:

- current health/value
- current node ID

These dimensions are independent.

Linear tracks may be stored as ordered nodes and compiled to single outgoing edges. Branching/circular/shared tracks must preserve explicit adjacency.

## Data ingestion pipeline

Recommended pipeline:

```text
authoritative source
  -> verified source record
  -> canonical GAME_DATA source
  -> schema validation
  -> semantic validation
  -> generated TypeScript constants/runtime JSON
  -> content hash
  -> tests
```

The application must not depend on Word, Excel, PDFs, or image parsing at runtime.

## Semantic validators

At minimum:

1. Every ID is globally unique within its namespace.
2. Every referenced ID exists.
3. Every graph edge targets a valid node.
4. Every nonterminal linear node has exactly one outgoing edge after compilation.
5. Skull/terminal nodes have no outgoing edge unless explicitly verified.
6. Reward variant IDs follow the letter convention.
7. No physical die ID is duplicated.
8. Healing values are positive.
9. Starting Labor health is positive.
10. Every attack target references a valid attack definition.
11. All provenance/status fields are present for source-derived content.
12. No `unresolved` content may silently enter a certified build.

## Source correction protocol

When verified source content changes:

1. Modify the canonical source record.
2. Increment data revision when compatibility requires it.
3. Regenerate runtime JSON/TypeScript.
4. Recompute content hash.
5. Run schema + semantic validators.
6. Run impacted unit/regression fixtures.
7. Mark golden/replay fixtures invalid only if their source dependencies changed.
8. Never hand-edit generated output to bypass the pipeline.

## Current data artifact

`GAME_DATA_v4.json` is the initial structured implementation dataset derived from Gameplay Reference v12.

It should be treated as implementation input, not as a higher rules authority than its sources.


## Cretan Bull normalization

Labor VII uses one logical `LaborDieDefinition`, not a separate executable `labor_entity`.

Canonical representation:

```ts
{
  id: "labor.L07.d1",
  start_health: 12,
  track_id: "track.L07",
  entry: "L07.start",
  physical_representation: {
    kind: "stacked_gold_labor_dice",
    physical_die_count: 2,
    verified_start_faces: [6, 6],
    rules_semantics: "representation_only",
    independently_targetable: false,
    independent_health: false,
    independent_track_position: false,
    independent_defeat_check: false
  }
}
```

The engine tracks one logical Bull health state. The two stacked gold dice are verified physical representation only and must not create independent rules state.


## Temporary Hercules die-pool identity policy

Count-only Labor-wide die-pool effects must not leave physical ID selection ambiguous.

```ts
interface HerculesDiePoolIdentityPolicy {
  countOnlyTemporaryLoss: {
    selection: "highest_available_ids_first";
    playerChoice: false;
  };
  countOnlyTemporaryGain: {
    selection: "lowest_unused_ids_first";
    playerChoice: false;
  };
}
```

This is an implementation identity rule because Hercules dice are physically interchangeable and have no persistent per-die gameplay traits.

Examples:

- Base pool `H1..H6`, Battered `-1` -> current Labor pool `H1..H5`; `H6` is temporarily unavailable.
- Base pool `H1..H6`, Weight of Atlas `-2` -> current Labor pool `H1..H4`; `H5,H6` temporarily unavailable.
- Base pool `H1..H5`, Resolute `+1` -> current Labor pool `H1..H6`.

Ghost of Abderus:
- player decides between its two printed options
- if `lose 1 Hercules die` is selected, the engine removes the highest-numbered currently eligible die ID
- there is no second physical-die-selection checkpoint unless an authoritative rule later establishes one

Physical-die choices explicitly required by gameplay, such as choosing a die to break, remain player decisions.

## RS-002.1 scoped correction contract

This additive content revision retains `schema_version: hercules_game_data_v4` and
adds `content_revision: RS-002.1`. Consumers must pin the exact content hash; the
schema family alone does not identify corrected behavior. This is candidate canon
under RS-002 until PM promotes it and independent Validation verifies it.

For Labor VIII, the existing numeric `damage: 1` is per valid set. The legacy
`scope: target` is a compatibility representation of the damage recipient. The
explicit fields below are authoritative for the corrected record; reject
inconsistency between them instead of choosing one silently.

```ts
interface MaresAttackScope {
  scope: "target";
  requirement_scope: "shared_by_listed_targets";
  eligible_target_ids: ["labor.L08.A", "labor.L08.B"];
  damage_scope: "single_selected_target";
  target_selection: {
    owner: "player";
    count: 1;
    timing: "attack_allocation";
    allowed_statuses: ["active"];
  };
  correction_ref: "RS-002-L08-ATTACK";
}

interface LaborNodeHealing {
  heal: number; // positive integer, existing amount unchanged
  heal_scope: "source_labor_die";
  heal_cap: "source_start_health";
}
```

Requirement eligibility is the intersection of listed IDs and active dice in the
current Labor. The same `fixed_straight [1,2,3]` is checked for either eligible
target. Store the selected stable ID with that allocation; one set has exactly
one damage recipient. Another disjoint set is a separate player allocation.
Unlisted, inactive or absent targets and invalid/reused physical dice are rejected
before mutation. Never replace the chosen ID with an all-target sentinel.

Every numeric track-node healing effect carries both scope and cap fields. Its
execution context must identify the source Labor die and the entered node. Resolve
the node in that die's track and verify it is its current entered node. Missing,
unknown or mismatched source context is an execution-contract error: reject it
before mutation. This error behavior is an implementation invariant, not a new
gameplay rule or a player choice. A stale effect for a defeated/inactive source is
excluded without mutation. Do not use a node ID alone to infer a source on a
shared track. For a valid active source, new health is
`min(source.startingHealth, source.health + heal)`. All other Labor dice and all
node IDs remain unchanged by healing. Companion icons still resolve normally.

`source_corrections` records original representations, source paths/objects and
sections, review status, interpretation, and the recorded human authority. The
v12 source and historical checksums remain unchanged. `RS-002-HEALING` applies to
all annotated numeric track heals; amounts and topology were preserved. The
correction does not resolve attack-scope ambiguity in other Labors.

Required validation adds explicit L08 scope/ID checks, positive healing amounts,
scope/cap presence on every track heal, and runtime source-context checks. The
pinned generic validator does not yet enforce these new fields. The RS-002 audit
checks candidate content; a separately authorized engine/validator task must
implement runtime enforcement and run F046–F054 before certification.
