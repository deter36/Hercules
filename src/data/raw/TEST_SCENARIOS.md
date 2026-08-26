# Hercules & the 12 Labors — Deterministic Test Scenarios

## Test philosophy

Test layers:

1. data validation
2. state/invariant tests
3. generic mechanic unit tests
4. constructed edge cases
5. Labor-specific fixtures
6. full headless game
7. deterministic replay/golden validation
8. minimal GUI

Every fixture should assert expected **transition sequence** and post-state, not final state only.

## Fixture record

```ts
interface TestFixture {
  id: string;
  purpose: string;
  sourceRefs: string[];
  preState: Partial<GameState>;
  command: EngineCommand;
  expectedTransitions: ExpectedTransition[];
  expectedPostState: Partial<GameState>;
  expectedPendingDecision?: Partial<PendingDecision>;
  rngExpectation?: {
    consumesEvents: number;
    eventPurposes?: string[];
  };
}
```

## Mandatory focused scenarios

### F001 — 0-health Labor die becomes inactive

Pre-state:
- two active Labor dice
- target A has health 1

Input:
- legal attack deals 1 to A

Expected transitions:
1. `ATTACK_COMMITTED`
2. `LABOR_DAMAGE_APPLIED(A, 1->0)`
3. `LABOR_DIE_DEFEATED(A)`
4. `LABOR_DEFEAT_CHECK`

Expected:
- A health 0
- A `defeated_inactive`
- node retained
- B remains active

### F002 — Advance all other excludes defeated die

Pre-state:
- source active die lands on Advance All Others
- one other active die
- one defeated-inactive die

Expected:
- active other die advances
- defeated die does not move or resolve its node

### F003 — Defeated die does not heal

Expected:
- attempted generic healing path skips defeated-inactive die

### F004 — Cannot Block entered this round is non-retroactive

Pre-state:
- round starts with no die on Cannot Block
- gold block is committed
- advancement later enters Cannot Block
- simultaneous/current advancement causes Spirit loss

Expected:
- current round uses `cannot_block_this_round=false`
- entering node affects next round only

### F005 — Cannot Block present at round start

Expected:
- snapshot true
- blocking cannot prevent applicable Spirit loss in that round

### F006 — blueUsed die may attack

Pre-state:
- H1 manipulated by Bow, `blueUsed=true`
- H1 otherwise available
- H1 satisfies attack

Expected:
- attack allocation legal

### F007 — blueUsed die may use gold

Same as F006, but gold target.

### F008 — spent/locked die may not be reused

Expected legality failure.

### F009 — Blood of the Amazons A derived contribution

Input:
- activate ability with H5=6

Expected:
1. mark H5 blue-used
2. create `H5-D1` temporary nonphysical contribution value 6
3. allow H5 and H5-D1 to allocate independently
4. cleanup removes H5-D1 only

### F010 — Cows B source remains usable

Input:
- H4 activates Cows B reroll

Expected:
- H4 `blueUsed=true`
- H4 not spent/locked/allocated solely by activation
- H4 remains eligible for legal attack/gold

### F011 — Spirit simultaneous net before cap

Pre-state Spirit 15.
Effects +3 and -2 simultaneous.

Expected:
- net +1
- final 16
- never transiently cap to 16 then subtract to 14

### F012 — Divinity simultaneous net before cap

Pre-state Divinity 9/10.
Effects +2 and -1 simultaneous.

Expected final 10/10.

### F013 — Zeus redraw consumes no RNG

Deck:
`[Rejected, Replacement, Third]`

Input:
- choose redraw

Expected:
- active replacement = Replacement
- deck = `[Third, Rejected]`
- `next_event` unchanged

### F014 — Mood transition input ordering

When adding a special Mood and returning active Mood:
- append new Mood first
- append returning active Mood second
- then Fisher-Yates shuffle

Assert exact pre-shuffle ordered input.

### F015 — Undo within current RNG interval

Undo deterministic placements/manipulations after latest committed random event.

Expected:
- state restored
- RNG ledger unchanged
- `next_event` unchanged

### F016 — Undo cannot cross RNG boundary

After reroll commits a new RNG event, pre-reroll state is not a legal player undo target.

### F017 — post-commit RNG execution error

Expected:
- restore deterministic game state as needed
- committed bad indices become `orphaned_execution_error`
- `next_event` does not decrease
- indices never reused

### F018 — pre-commit invalid random request

Expected:
- staged candidate discarded
- event count unchanged

### F019 — explicit Resolve Assignments: no remaining dice

Expected direct transition to Damage Resolution.

### F020 — explicit Resolve Assignments: no legal placement

Unused dice exist but cannot satisfy any attack or gold requirement.

Expected no warning.

### F021 — legal but effectless block

Unused die can legally activate a Block ability.
No Spirit loss can occur in the current resolution cycle.

Expected:
- placement legal
- `meaningful=false`
- no warning
- resolve normally

### F022 — meaningful block

Same, but incoming Spirit loss exists.

Expected pending:
`CONFIRM_RESOLVE_WITH_UNUSED_MEANINGFUL_PLACEMENT`.

### F023 — meaningful unused attack

Unused dice can make another legal damage instance.

Expected warning.

### F024 — Divinity gain at cap

Legal gold placement but Divinity cannot change and no secondary effect.

Expected effectless / no warning.

### F025 — Divinity gain below cap

Expected meaningful / warning.

### F026 — mixed effectless + meaningful opportunities

Expected warning because at least one meaningful opportunity exists.

### F027 — Resolve Anyway

Expected:
- explicit player decision logged
- no placement auto-created
- phase advances to damage

### F028 — attack placement does not finalize phase

Expected phase remains `GOLD_AND_ATTACK_PLACEMENT`.

### F029 — gold placement does not finalize phase

Same.

### F030 — Apples corrected edge direction

From `B3`, `B4` legal.
From `B4`, `B3` illegal.

### F031 — branch checkpoint

Any graph node with >1 outgoing edge must create a player decision before movement.

### F032 — Cerberus exact 18 with >3 dice

Four or more dice summing 18 are legal.

### F033 — multiple Cerberus exact-18 attacks in one roll

Two disjoint exact-18 sets both legal.

### F034 — final Cerberus die reaches 0

Expected:
- immediate defeated-inactive
- no track advancement
- no heal
- Labor completion check before impacts

### F035 — victory boundary

12 completed Labors + top Divinity -> victory.
12 completed Labors without top Divinity -> loss at end game.

## Empty-result behavior

Explicitly test:

- no rollable dice
- no legal blue target
- no legal gold placement
- no legal attack allocation
- no active Labor dice for Advance All Others
- capped resource gain
- healing already at starting health
- no eligible Reward to remove (must be ruled by content/source, never improvised)
- branch node with malformed empty outgoing list -> content validation error, not silent continuation

## Golden Run 0001 certification

Normative fixture:

- run ID: `HERC-GOLDEN-RUN-0001`
- difficulty: Human
- seed: `HERC-GOLDEN-RUN-0001`
- expected result: defeat at Stymphalian Birds
- final Spirit: 8
- final Divinity: 3/10
- final `next_event`: 174
- failed Labor die: `LABOR6_C17`
- failed node: `L6_C17_N3`
- orphaned RNG range: 18–25
- event 153 shuffle result: `j=0`
- five completed-Labor checkpoints must match
- RNG recomputation mismatches: 0

Historical replay migration:
- insert explicit Resolve Assignments controls where older transcript implicitly completed placement
- these insertions must not change tactical choices or RNG consumption

The committed normalized replay fixture should be kept under `test/fixtures/golden/HERC-GOLDEN-RUN-0001/`.

## Regression traceability

Every verified exception in `GAME_RULES_SPEC.md` must map to at least one fixture.

Every source correction that changes runtime behavior must add or update a regression fixture.

A build cannot be certified merely because the golden run passes.


### F036 — Hind soft-lock threshold

Pre-state:
- Labor III Ceryneian Hind is still undefeated
- exactly 2 usable Hercules dice remain

Input:
- an impact breaks one of those two dice

Expected transitions:
1. `HERCULES_DIE_BROKEN`
2. recompute usable Hercules dice count = 1
3. `GAME_DEFEATED` with cause `HIND_USABLE_DICE_BELOW_2`

Expected:
- defeat is immediate
- no additional roll is offered
- no inferred/random rescue is attempted
- RNG state is unchanged by the defeat check

Control case:
- Hind undefeated with 2 or more usable dice does not trigger this defeat rule.

Status:
- provisional owner-approved deterministic soft-lock ruling pending designer confirmation.


### F037 — Cretan Bull single logical health entity
- Start: `labor.L07.d1` health 12 at `L07.start`.
- One valid attack -> health 11.
- Exactly one logical Bull target exists.

### F038 — Cretan Bull advances once
- Surviving Bull advances exactly once per Labor advancement.
- The physical stack does not duplicate movement or impacts.

### F039 — Cretan Bull healing cap
- Health 11 + Heal 2 -> 12, not 13.

### F040 — Cretan Bull stack is non-targetable metadata
- Legal attack target enumeration contains only `labor.L07.d1`.
- Physical stack members are never legal rules targets.


### F041 — Battered deterministic die-ID removal

Pre-state:
- persistent Labor-entry pool: `H1..H6`
- active Mood: Battered

Expected:
- current Labor usable pool: `H1..H5`
- `H6` status: temporarily unavailable for this Labor
- no player decision
- first roll RNG purposes enumerate only `H1..H5`

### F042 — Weight of Atlas deterministic two-die removal

Pre-state:
- persistent pool: `H1..H8`

Expected after Atlas:
- usable pool: `H1..H6`
- `H7,H8` temporarily unavailable
- no player decision

### F043 — Resolute deterministic temporary die addition

Pre-state:
- persistent pool: `H1..H5`
- `H6..H11` unused

Expected:
- usable Labor pool: `H1..H6`
- H6 marked temporary Labor inclusion
- no player decision
- H6 leaves temporary pool at Labor end

### F044 — Ghost of Abderus lose-die branch

Pre-state:
- persistent/current pool: `H1..H7`
- pending decision offers printed options

Input:
- player selects `lose 1 Hercules die`

Expected:
- H7 temporarily unavailable for Labor
- no second decision asking which die
- RNG event count unchanged

### F045 — Next-Labor restoration after temporary pool Mood

Pre-state:
- prior Labor Battered temporarily excluded H6
- Labor ends

Expected next Labor setup:
1. restore persistent pool including H6
2. clear prior temporary availability markers
3. apply new Labor Mood pool effects
