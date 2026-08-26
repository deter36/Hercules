# Hercules & the 12 Labors — Engine Execution Specification
Version: 0.13-draft
Status: Provisional implementation specification after first complete Human-difficulty playtest. All 12 Labor content sets and Mood cards are verified; owner-approved runtime rulings are active pending later designer confirmation. The Hind loss condition remains provisional.

## 1. Purpose

This document defines the deterministic game procedure used by the Hercules digital rules engine.

Static card text belongs in structured content data, not here.

The engine operates as:

pre-state + player/system input → deterministic transitions → post-state + pending decision

The engine must never make a meaningful optional tactical decision unless explicitly delegated by the player.

## 2. Authority

Mechanics use this authority order:

1. Official final rulebook / errata
2. Official card/component text
3. Verified Gameplay Reference / owner-verified structured content
4. This Engine Execution Specification
5. Other verified references

Physical facts such as color, icon placement, layout, and track topology may use verified component photography over descriptive rulebook wording.

Unknown or conflicting information must remain marked unresolved rather than guessed.

## 2.1 Canonical Reward Variant Naming

Reward variants use letter identifiers only.

- Assign `A`, `B`, `C`, `D` in physical left-to-right order.
- Two-card Reward sets use `A/B`.
- Three-card Reward sets use `A/B/C`.
- Four-card Reward sets use `A/B/C/D`.
- Single-card Rewards do not require a variant suffix.
- `Left`, `Right`, and `Middle` may describe Labor tracks or physical layout when needed, but they are not valid Reward identifiers.
- Canonical IDs, runtime displays, regression tests, save data, and implementation code must use the lettered Reward names.

Examples: `Regret A`, `Regret B`, `Blood of the Amazons A`, `Helios' Golden Cup C`.

## 2.2 Implementation Contract Alignment

This execution specification defines sequencing, timing, and canonical state-transition behavior.

For Codex implementation:

- The engine is headless and owns all rules/state transitions.
- The GUI renders canonical state, legal options, pending decisions, and transition records; it does not calculate legality or outcomes.
- Player/system interaction is submitted through typed commands.
- Meaningful optional choices are represented as typed pending decisions with stable legal-option IDs.
- Each accepted command emits ordered structured transition records suitable for replay, diagnostics, and later animation.
- Random commands use the RNG transaction model defined by HERC-RNG-v3.
- `GAME_RULES_SPEC.md` is the Codex-facing software/state-machine contract derived from this specification; it does not override this document or higher-authority sources.
- `GAME_DATA_v1.json` is structured implementation data derived from the verified Gameplay Reference; it is not a rules authority.

The conceptual engine operation is:

`pre-state + command + committed RNG events (if required) -> ordered transitions -> post-state + pending decision`

Do not duplicate static card content in this specification.

## 3. Canonical State

Canonical state is authoritative. UI/chat displays are projections of it.

### Game
- difficulty
- current Labor
- completed Labors
- phase
- victory/defeat
- pending decisions
- pending mandatory triggers

### Player
- Spirit position/value
- Divinity position/value
- owned Rewards
- active Reward abilities
- temporary Labor effects
- broken Hercules dice

### Current Labor
- Labor ID
- active card side/state
- Labor dice
- each Labor die value
- each Labor die track-node position
- each Labor die status, including `active` or `defeated_inactive`
- round-start restrictions such as `cannot_block_this_round`
- active attack requirement(s)
- current impacts
- active Mood

### Hercules Dice
Each physical die has:
- stable die ID
- current face
- rollable state
- `blue_used`
- `spent`
- `locked`
- `allocated`
- `broken`
- placement
- current manipulation/reroll history
- temporary Labor pool availability / source of inclusion or exclusion

`blue_used` is not equivalent to spent: a die manipulated on a blue square may still proceed to a legal gold placement or attack.

Generic effective-dice effects do not create another physical die. A verified content-specific exception may create a temporary derived contribution entity. For Blood of the Amazons A, create one temporary derived entity linked to the source die, independently allocatable for the current roll and expired at cleanup.

### Random State
- RNG algorithm ID (`SHA256_COUNTER_V1`)
- game seed
- next logical event index
- ordered hidden sources
- committed random-event ledger

## 4. Difficulty Setup

Human: 5 starting Hercules dice.
Hero: 4 starting Hercules dice.
God: 3 starting Hercules dice and remove Battered from the Mood deck.

Current primary testing baseline: Human.

## 5. Game Setup

1. Initialize Spirit and Divinity at their verified starting spaces.
2. Create the player's persistent Hercules dice pool based on difficulty.
3. Initialize normal Mood deck contents for the chosen difficulty.
4. Enter `RNG_INITIALIZE`: establish `SHA256_COUNTER_V1`, game seed, `next_event=0`, empty committed ledger, and ordered hidden-source containers.
5. Shuffle the hidden Mood deck with HERC-RNG-v3 Fisher-Yates, committing every swap event and the resulting full ordered deck.
6. Set current Labor to Labor I unless another verified start procedure is being used.
7. Clear all temporary effects, broken dice, and pending choices.
8. Enter `LABOR_SETUP`.

No shuffle, draw, roll, reroll, or other random operation is legal before step 4 completes.

## 6. Labor Setup

When beginning a Labor:

1. Restore Hercules dice broken during the previous Labor.
2. Remove expired prior-Labor temporary effects.
3. Apply persistent Reward state.
4. Initialize Labor die/dice at verified starting value(s) and starting track node(s).
5. Set active attack requirement(s).
6. Draw and resolve one Mood card before the Labor begins.
7. Apply temporary Mood dice-pool changes using the deterministic physical-die identity convention below.
8. Enter `READY_TO_ROLL` unless Mood resolution creates a player decision.

### Temporary Hercules die-pool identity mapping

Stable Hercules die IDs exist for engine state/replay, but the physical Hercules dice are otherwise interchangeable.

When an effect changes the **count** of dice available for the whole Labor and does not explicitly instruct the player to choose a specific physical die:

- temporary loss/removal: remove highest-numbered currently eligible Hercules die IDs first
- temporary gain/addition: add lowest-numbered currently unused Hercules die IDs first
- perform this mapping during Labor setup before any Labor roll
- temporarily removed dice are marked unavailable for the Labor, not broken/spent
- temporary added dice are marked available for the Labor only
- restore the persistent base pool at the next Labor setup before applying the next Labor's temporary pool effects

This mapping is deterministic bookkeeping, not a player decision.

It applies to:
- Resolute `+1 Hercules die`
- Battered `-1 Hercules die`
- Weight of Atlas `-2 Hercules dice`
- Ghost of Abderus if the player chooses the `lose 1 Hercules die` option; the player chooses the option, while the specific removed die ID follows the deterministic count-only mapping

If a rule/effect explicitly requires selecting a particular physical die during play, that remains a player decision.

Normal Mood cards are active only for the current Labor and return according to the game rules after Labor completion.

Verified special Mood handling:
- Weight of Atlas: lose 2 Hercules dice for the Labor.
- Ghost of Abderus: stop for player choice: lose 1 Hercules die for the Labor OR lose 5 Spirit.
- Ghost of Hippolyta: every rolled 1, including rerolls, is immediately set aside for that roll.
- Ghost of Pholus: stop for player choice of which owned Reward is covered/disabled for the Labor; restore it and reshuffle Pholus at Labor end.

Zeus' Disregard redraw:
- after the Mood is revealed but before its effect resolves, stop for the player's redraw decision if the Reward is available
- if redraw is used, set the revealed Mood aside and draw the next card from the existing ordered Mood deck
- do not reshuffle for the redraw
- the redraw itself consumes no RNG
- after drawing the replacement Mood, place the rejected Mood on the bottom of the ordered Mood deck

Deterministic Labor-transition shuffle input convention:
- returning only the active Mood: append it to the bottom of the ordered deck, then shuffle deterministically
- adding a new Mood and returning the active Mood: append the new Mood first, append the returning active Mood second, then shuffle deterministically

## 7. Phase Model

Primary phase sequence:

LABOR_SETUP
→ MOOD_RESOLUTION
→ READY_TO_ROLL
→ ROLL_COMMITTED
→ POST_ROLL_TRIGGERS
→ BLUE_ABILITY_WINDOW
→ GOLD_AND_ATTACK_PLACEMENT
→ DAMAGE_RESOLUTION
→ LABOR_DEFEAT_CHECK
→ LABOR_ADVANCE
→ IMPACT_RESOLUTION
→ FAILURE_CHECK
→ ROUND_CLEANUP
→ READY_TO_ROLL

Labor defeat transitions to Reward/progression flow instead of Labor advancement.

No phase may advance while unresolved mandatory work or a required player choice exists.

## 8. Roll Procedure

At `READY_TO_ROLL`:

1. Snapshot round-start restrictions from active Labor-die positions, including `cannot_block_this_round`.
2. Collect all rollable, non-broken Hercules dice.
3. Roll them in stable die-ID order.
4. Commit RNG results before presentation.
5. Store raw rolled face on each die.
6. Apply roll-only effects such as Enraged/Melancholic after the raw result is committed.
7. Resolve mandatory post-roll triggers.
8. Enter `BLUE_ABILITY_WINDOW`.

Rerolled dice use new committed RNG draws.

Enraged/Melancholic affect normal rolls as defined by their cards/rulebook and do not modify rerolls.

## 9. Blue Ability Window

Blue abilities manipulate dice before gold abilities or attack placement.

Rules:
- Each blue square may be used once per roll.
- A die used on a blue square may not be used for another blue square unless the ability explicitly permits it.
- Ability costs are paid immediately.
- Manipulated die values become canonical state immediately.
- Rerolls consume new committed RNG results.
- Using a blue square sets `blue_used`; it does not automatically set `spent`.
- Generic “counts as 2 dice” effects use effective contribution semantics without duplicating the physical die.
- Blood of the Amazons A is a verified exception: create one temporary derived contribution (for example `H5-D1`) with the source die's value. Source and derived contribution may be allocated independently. The derived entity is not physical, does not persist, and expires during round cleanup.
- General `+1/-1` pip manipulation wraps `6↔1` unless an effect explicitly states a minimum/maximum; Wrath of Hera follows this rule.
- For 100 Immortal Cows A, the target die may already have used another blue ability during the same roll. The die assigned/spent to activate Cows A is the Cows A die, not the target die.
- For 100 Immortal Cows B, the source die assigned to the blue ability becomes `blue_used` but is not spent/locked merely by activating the reroll; it remains eligible for later gold/attack placement if otherwise legal.
- Player chooses all optional blue ability use.

When the player finishes blue abilities, enter `GOLD_AND_ATTACK_PLACEMENT`.

## 10. Gold Abilities and Attack Placement

The player may:
- place eligible dice on gold abilities
- allocate eligible dice to Labor attack requirements

Gold ability rules:
- each gold square may be used once per roll
- the placed die becomes locked for the roll
- that die cannot also deal Labor damage

Attack allocation:
- player chooses which eligible dice satisfy attacks
- a physical die may not satisfy two separate attack allocations unless an explicit effective-dice rule allows it
- if multiple Labor dice exist, player chooses damage distribution
- if multiple attack types apply, use the requirement valid for the relevant target/track state

### Placement actions do not finalize the phase

An individual placement action mutates canonical placement state only.

The following inputs do **not** by themselves end `GOLD_AND_ATTACK_PLACEMENT`:
- assign an attack
- assign one or more attack sets
- place dice on a gold ability
- allocate damage among eligible Labor dice

The normal player-controlled phase transition is the explicit action:

`RESOLVE_ASSIGNMENTS`

Only this input requests transition toward `DAMAGE_RESOLUTION`.

### Resolve Assignments validation

When `RESOLVE_ASSIGNMENTS` is submitted, perform the following deterministic check before advancing:

1. Find all Hercules dice that remain usable and unallocated:
   - not broken
   - not spent
   - not locked on a gold ability
   - not already allocated to an attack
   - otherwise legally eligible for placement

2. If no such dice remain:
   - proceed to `DAMAGE_RESOLUTION`
   - reason: `no_remaining_dice`

3. Otherwise enumerate every legal remaining placement involving those dice:
   - Labor attack requirements
   - gold-square abilities
   - any future mechanic explicitly defined as part of this phase

4. If no legal placements exist:
   - proceed to `DAMAGE_RESOLUTION`
   - reason: `no_legal_placements`

5. For each legal placement, evaluate whether resolving that placement can change a rules-relevant outcome during the **current assignment/resolution cycle**.

A legal placement is `meaningful` / `consequential` only if it can change a rules-relevant result such as:
- Labor damage
- Spirit gained, lost, or prevented
- Divinity gained or lost
- Labor-die health/value
- Labor-die advancement or a resulting impact
- broken-die state
- a mandatory pending decision
- a temporary or persistent effect that actually takes effect during the current cycle

This is deterministic state evaluation, not strategic evaluation.

6. If all legal placements are effectless:
   - proceed to `DAMAGE_RESOLUTION`
   - reason: `only_effectless_placements`

7. If one or more legal-and-meaningful placements remain:
   - do **not** resolve damage or advance the Labor
   - return a pending player decision:
     `CONFIRM_RESOLVE_WITH_UNUSED_MEANINGFUL_PLACEMENT`
   - include the legal meaningful opportunities in stable-ID form
   - player may return to placement or explicitly choose `RESOLVE_ANYWAY`

8. `RESOLVE_ANYWAY`:
   - records the player's explicit decision to leave the meaningful opportunity unused
   - makes no placement automatically
   - advances to `DAMAGE_RESOLUTION`

The GUI must not implement this analysis. The deterministic rules engine receives canonical state + `RESOLVE_ASSIGNMENTS`, enumerates legal placements, evaluates current-cycle effect, and returns either deterministic continuation or a pending decision.

## 11. Requirement Evaluation

Attack requirements are evaluated from structured content.

Supported generic requirement classes include:
- exact die
- either of two die values
- exact sum
- matching pair
- matching triple
- fixed straight
- variable 3-die straight
- variable 4-die straight
- arithmetic equality/comparison relationships
- multiplicative relationships

Requirement evaluation must account for effective-dice effects without duplicating physical dice.

Only allocated dice contribute to the attack being resolved.

## 12. Damage Resolution

For each valid attack allocation:

1. Validate legality against current requirement.
2. Apply 1 Labor damage unless content specifies otherwise.
3. Reduce the target Labor die value accordingly.
4. If a Labor die reaches 0, keep its track position unchanged unless content specifies otherwise.
5. Resolve all player-selected attack allocations that were legally committed.

Then enter `LABOR_DEFEAT_CHECK`.

## 13. Labor Defeat Check

Whenever an individual Labor die reaches 0 health:
- set status to `defeated_inactive`
- retain stable ID, health 0, and final track node for audit/replay
- exclude it from future advancement
- exclude it from healing and impacts
- exclude it from skull resolution
- exclude it from effects that advance or reference active Labor dice unless an explicit rule overrides this

If all required Labor dice are `defeated_inactive`:
- the Labor is defeated
- do not advance Labor dice
- do not resolve the next Labor impact
- enter Reward/progression flow

Otherwise enter `LABOR_ADVANCE`.

## 14. Labor Track Advancement

Tracks are graphs, not counters.

Each Labor die stores:
- current value
- current track node

These are independent.

On advancement:
1. Follow the current node's outgoing edge.
2. If exactly one route exists, advance automatically.
3. If multiple routes exist, stop for a player branch choice.
4. Move to the selected next node.
5. Enter `IMPACT_RESOLUTION`.

Circular tracks may return to prior nodes.

Multi-card tracks use the same graph model.

Dense shared graphs (notably Apples of the Hesperides) require no special engine procedure. Canonical content stores each node's outgoing edge list. At runtime, the engine reads the current node; one outgoing edge advances automatically, while multiple outgoing edges create a player route-choice checkpoint. The UI may render the original graphical track while the rules engine needs only current node + legal next nodes.

## 15. Impact Resolution

Resolve every icon/effect on the entered node.

Generic impacts currently include:
- lose Spirit
- lose Divinity
- heal Labor die
- break Hercules die
- advance other Labor dice
- unblockable Spirit-loss state
- skull/failure

Healing:
- increases Labor die value
- never exceeds verified starting value
- does not move the die backward on the track

Blocking:
- prevents Spirit loss only as allowed by the active gold ability
- `cannot_block_this_round` is snapshotted from active Labor-die positions at round start
- entering a Cannot Block node during end-of-round advancement does not retroactively alter the round just resolved
- while `cannot_block_this_round` is true, blocking effects cannot prevent the applicable Spirit loss

If an impact breaks a Hercules die and a choice of physical die matters, stop for player selection.

After all impacts resolve, enter `FAILURE_CHECK`.

## 16. Failure Check

General failures:
- Spirit reaches its failure state / 0
- a Labor die reaches a skull/failure node
- another explicit content-defined failure condition occurs

Do not infer defeat merely because progress appears impossible.

If no explicit defeat condition exists and no legal progress appears possible, mark the state unresolved/soft-locked unless a verified Labor-specific rule exists.

### Provisional Ceryneian Hind rule
The Hind has a fixed circular track and no skull. Its attack requirement is any 2 matching Hercules dice.

For current implementation/testing:
- if the Hind is still undefeated and the number of usable Hercules dice falls below 2, immediately lose the Labor

Reason:
- with fewer than 2 usable dice, the verified Hind attack requirement can no longer be satisfied
- no Reward available before completing Labor III creates an effective second die from a single usable physical die

Status: provisional owner-approved deterministic soft-lock ruling, not verified printed rules text. Later designer clarification may confirm or supersede it.

## 17. Round Cleanup

If the Labor continues:

1. Unlock dice used on gold abilities.
2. Return legally reusable allocated dice to the available pool.
3. Reset per-roll ability usage.
4. Preserve broken dice as broken.
5. Expire temporary derived dice/contributions.
6. Preserve Labor die value and track-node position for active Labor dice; retain defeated-inactive dice for audit.
7. Preserve Labor-level Mood and temporary effects.
8. Enter `READY_TO_ROLL`.

## 18. Labor Completion and Rewards

When a Labor is defeated:

1. Reveal its verified Reward choices.
2. Stop for player Reward choice where multiple Rewards exist.
3. Discard unchosen alternatives as required.
4. Add chosen Reward to persistent state.
5. Apply immediate Reward bonuses.
6. Resolve mandatory Reward side effects.
7. End the active Mood.
8. Restore dice broken during the completed Labor at the beginning of the next Labor.
9. Advance to the next Labor setup.

Reward abilities become available according to their printed timing.

## 19. Resource Handling

Spirit and Divinity follow their verified tracks.

For simultaneous Spirit gains/losses within one resolution window:
1. sum gains
2. sum losses
3. compute one net delta
4. apply the net delta once
5. apply track bounds afterward

Do not cap an intermediate Spirit gain before a simultaneous loss.

For simultaneous Divinity gains/losses, use the same net-before-bounds model as Spirit.

Non-simultaneous resource gains may not exceed legal track limits.

Resource losses are applied atomically.

If Spirit reaches the failure state during any resolution step, complete only effects that are explicitly simultaneous/mandatory, then resolve failure according to verified timing.

Exact Divinity ordinal labeling remains data-driven.

## 20. Deterministic RNG

Use RNG specification `HERC-RNG-v3 / SHA256_COUNTER_V1`.

Randomness is counter-based; there is no mutable PRNG stream state.

Mandatory setup ordering:

`SETUP -> RNG_INITIALIZE -> MOOD_SHUFFLE -> MOOD_DRAW`

No random operation is legal before RNG initialization.

Every random operation must be computed by an actual computation tool using `SHA256_COUNTER_V1`; never generate a random outcome conversationally.

Canonical RNG state contains:
- algorithm ID
- game seed
- next logical event index
- ordered hidden sources
- committed event ledger

Each logical random result consumes one event index. Rejection-sampling attempts remain inside that same event.

Commit result and increment `next_event` before presentation.

A tool/runtime reset is recoverable from canonical state because future results depend only on seed + event index + purpose.

If RNG canonical state is missing or contradictory, stop before any new random operation and reconcile. Never fabricate it.

## 21. Undo and RNG Error Recovery

### Player undo

Maintain deterministic state-history checkpoints between committed random events.

The player may undo deterministic actions only back to the state immediately after the **most recent committed random event**.

Once a new random event is committed, undo may not cross that boundary.

Undo changes game state only; it never decrements `next_event`, deletes committed RNG events, or reuses an event index.

### Random-operation transaction

Every random transition follows:

`stage -> validate -> atomic commit -> display`

A staged candidate that fails validation before commit consumes no event index.

### Engine execution error after commit

If an engine defect commits random events that should never have occurred:

1. stop further randomization;
2. restore canonical game state to the last valid deterministic checkpoint as needed;
3. retain the erroneous RNG events permanently in the ledger;
4. mark them `orphaned_execution_error`;
5. record the reconciliation reason/event range;
6. continue from the advanced `next_event`.

Committed RNG history is append-only. `next_event` never decreases and event indices are never reused.

## 22. Player Decision Checkpoints

Stop for all meaningful optional choices, including:
- blue ability use
- rerolls
- die manipulation
- gold ability use
- attack allocation
- multiple-Labor-die damage distribution
- branch selection
- broken-die selection
- Reward choice
- progression choices

Present legal options and current relevant state.

Implementation-facing pending decisions should expose:
- stable decision ID/type
- prompt
- legal option IDs
- source
- relevant context
- whether skip is allowed
- whether resolution consumes randomness, reveals hidden information, or creates an undo boundary

Do not recommend a choice unless asked.

Mechanically identical choices may auto-resolve only when they cannot affect later state or information.

## 23. Chat Playtest Display

Normal display should show:

- Labor name/number
- difficulty
- Spirit/Divinity
- active/broken dice
- Mood name + full mechanical effect
- Labor health
- attack requirement
- complete known Labor track
- current track position
- next impact
- current dice with stable IDs
- active Reward/Bow abilities with effects, using canonical lettered Reward variant names
- explicit `Resolve Assignments` control while in `GOLD_AND_ATTACK_PLACEMENT`
- current player decision

Linear tracks show full sequence.

Circular tracks show the loop.

Branching tracks show all known branches and stop at actual choice nodes.

Track markers and legal outgoing choices must be rendered directly from canonical node IDs/edges, never reconstructed from remembered prose.

Placement-completion logic distinguishes:
- `legal`
- `meaningful` / `consequential`
- `warning_relevant`

Individual placement commands never imply phase completion. `Resolve Assignments` invokes the deterministic procedure in Section 10. Warn only when at least one unused legal placement can still change a rules-relevant outcome during the current assignment/resolution cycle. Legal but effectless placements do not require confirmation.

Debug view may additionally show:
- node IDs
- exact die flags
- pending triggers
- RNG state/event IDs
- ordered transition records
- state/build/data revision information
- provenance/verification status

## 24. State Integrity

Enforce:
- each physical die occupies exactly one legal state/location
- broken/spent/locked dice cannot be reused illegally
- resources remain within legal bounds
- attack allocations satisfy requirements
- track nodes/edges are valid
- generic effective-dice effects never duplicate physical dice; verified temporary derived entities remain linked to exactly one source physical die
- defeated-inactive Labor dice cannot advance, heal, trigger impacts, or resolve skulls
- phases do not advance with unresolved decisions
- persistent progression survives transitions
- transition records are ordered, stable-ID-based, and consistent with canonical before/after state

On contradiction:
1. stop
2. reconcile from authoritative history if possible
3. document corrections
4. never fabricate hidden/random state

If exact recovery fails, mark the run non-reproducible.

## 25. Initial Verified Regression Set

### Nemean Lion
Track:
Start → Lose 1 Spirit → Lose 1 Spirit → Heal 1 → Lose 2 Spirit → Skull

Attack:
one 5 or 6

### Lernean Hydra
Track:
Start
→ Lose 1 Spirit + Heal 1
→ Lose 1 Spirit + Heal 1
→ Lose 1 Spirit + Heal 1
→ Heal 2
→ Lose 1 Spirit + Heal 1
→ Lose 1 Spirit + Heal 1
→ Lose 1 Spirit + Heal 1
→ Skull

Attack:
one 6

### Ceryneian Hind
Track:
Heal 1
→ Break 1 Hercules die
→ Heal 1
→ Lose 2 Spirit
→ repeat

Attack:
any 2 matching dice

No printed skull.

### Cretan Bull
The Cretan Bull is one logical Labor health entity/attack target with stable logical ID `labor.L07.d1`, starting health 12, one canonical track `track.L07`, and starting node `L07.start`.

The physical game represents this single 12-health value with two stacked gold Labor dice showing 6 + 6 at Start.

Those two physical dice are representation components only:
- not independently targetable
- no independent health
- no independent track position
- no independent healing
- no independent defeat check

Each valid Bull attack deals 1 damage to `labor.L07.d1`. Healing restores that same logical health value up to 12. Track movement occurs once for the single logical Bull entity.

The start and the later Lose-3-Spirit node are verified free player-choice branches; both routes and the merge path are owner-verified in the Gameplay Reference.

### Apples of the Hesperides
Two Start-6 Labor dice share one owner-verified directed branching network with nodes A1-F4 and one Skull terminal.
Regression coverage must test:
- both start entrances
- every node with multiple outgoing edges creates a player checkpoint
- branch selections move only to listed outgoing nodes
- merge/back-link edges such as B3 → B2 and E3 → E2
- corrected horizontal edge direction: B3 → B4 is legal; B4 → B3 is not
- F2 → Skull and F3 → F2/Skull terminal choices
- both Labor dice can occupy independent nodes in the same shared graph

## 26. Golden Run Validation — HERC-GOLDEN-RUN-0001

A fixed-seed Human-difficulty golden run using seed `HERC-GOLDEN-RUN-0001` was completed through Labor VI and ended in defeat at Stymphalian Birds.

Validated replay anchors:
- result: loss at Stymphalian Birds
- final Spirit: 8
- final Divinity: 3/10
- final `next_event`: 174
- failed Labor die: `LABOR6_C17`
- failed node: `L6_C17_N3` (Skull)
- five completed-Labor canonical checkpoints reproduced
- full RNG event ledger reproduced with zero SHA256 counter mismatches
- events 18-25 preserved as `orphaned_execution_error`
- event 153 uses the computed Fisher-Yates result `j=0`
- no committed event index was reused
- player undo did not cross a committed random boundary

The historical replay script contained placement sequences from before the explicit `Resolve Assignments` checkpoint was formalized. Replay normalization inserted 12 migration-derived `resolve_assignments` actions. These insertions changed no tactical decision, random result, placement, allocation, Reward choice, or resource decision.

Golden Run 0001 is therefore classified:

`validated_reproducible_with_documented_reconciliation`

Permanent discoveries from this run:
- individual attack/gold placement must not finalize `GOLD_AND_ATTACK_PLACEMENT`
- explicit `Resolve Assignments` is required
- unused-placement warning logic is deterministic current-cycle effect analysis, not tactical advice
- 100 Immortal Cows B confirms `blue_used != spent`
- Cannot Block uses the round-start snapshot; entering the node during end-round advancement is non-retroactive

## 27. Known Deferred/Unresolved Items

The Divinity simultaneity, pip-wraparound, Cows target-eligibility, and Zeus cleanup questions are treated as resolved owner-approved runtime rulings for implementation/testing; later designer feedback may confirm or supersede them.

- Final official confirmation of the Ceryneian Hind soft-lock defeat rule; current owner-approved implementation rule is immediate defeat when fewer than 2 usable Hercules dice remain while the Hind is undefeated.
- Exact semantic labeling of Divinity track positions may remain ordinal unless an authoritative numeric interpretation is found.
- Any new timing exception or ambiguity discovered during full-game playtests must be stopped and classified rather than inferred.

## 28. Production Runtime vs Developer Diagnostics

### Production runtime behavior

The shipped rules engine must include:
- deterministic SHA256 counter RNG
- atomic random-event commitment
- append-only event indexing
- deterministic undo boundary
- canonical save/replay state
- defeated-inactive Labor dice
- blue-used vs spent/locked/allocated/broken distinctions
- temporary derived contributions where verified
- round-start Cannot Block snapshot
- simultaneous Spirit netting
- Zeus redraw procedure
- canonical-node-based track movement
- explicit `Resolve Assignments` phase completion
- deterministic meaningful-placement evaluation and resolve-anyway checkpoint

These are engine behaviors, not test-only scaffolding.

### Developer/test layer

Developer builds may additionally expose:
- full RNG event ledger
- orphaned execution-error events
- hashes/raw RNG audit values
- canonical state dumps
- provenance/status fields
- replay traces
- regression fixtures
- golden-run comparison output
- state-history checkpoints and invariant diagnostics

These diagnostics may observe canonical state but must never mutate rules behavior.

## 29. Validation Policy

Before full implementation, test:
- source completeness
- state invariants
- individual mechanics
- constructed edge cases
- Labor-specific flows
- regression cases
- full-game runs
- deterministic replay / golden-run reproduction

Any discovery should be classified as:
- source/data error
- state-schema gap
- execution-spec error
- missing rule
- execution error
- display/interaction problem

This specification should be revised only from verified discoveries, not convenience assumptions.
