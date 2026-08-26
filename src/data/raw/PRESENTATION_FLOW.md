# Hercules & the 12 Labors — Presentation Flow Contract

## Scope

This document defines the **minimal engine-test UI contract**, not the final mobile visual design.

The test shell exists to make engine behavior visible and testable. Final mobile layout, artwork, polished animation, haptics, audio, and 3D dice are out of scope until the headless certification gate passes.

## Principle

The UI:

- renders canonical engine state
- renders pending decisions
- submits legal commands/options
- renders ordered transition records

The UI does not:

- determine legality
- generate rules outcomes
- infer branches
- calculate attacks
- manipulate hidden deck order
- generate randomness

## Always-visible test information

During active Labor play:

- Labor number/name
- Spirit
- Divinity
- active Mood name + full mechanical effect
- current Labor-die health and node
- attack requirement(s)
- all Hercules dice with stable IDs and current faces
- broken/locked/allocated/blue-used states
- active Bow/Reward abilities
- current phase
- current pending decision

Debug toggle additionally exposes:

- canonical node IDs
- exact die flags
- ordered hidden Mood deck
- RNG algorithm/seed/next_event
- RNG event ledger
- transition history
- content IDs/provenance status
- canonical state JSON

## Information hierarchy

### Always visible

- Spirit / Divinity
- current Labor
- current Mood
- dice
- current action/decision

### Expandable

- full Labor track/network
- Reward ability text
- current-cycle effect preview
- previous transitions

### Debug-only

- RNG hashes/raw64
- hidden deck order
- state hashes
- provenance
- invariant results

### Transient

- roll result animation/text
- resource delta
- Labor damage
- track movement
- impact resolution
- warning/confirmation

## Phase presentation

### LABOR_SETUP / MOOD_RESOLUTION

Show:
- Labor title
- initialized health/track
- Mood reveal
- Mood effect

If player choice is required, present the pending-decision prompt and legal options before continuing.

Button labels should come from decision metadata when practical.

### READY_TO_ROLL

Primary action:
`Roll`

Show all currently rollable dice and broken/unavailable dice.

### ROLL_COMMITTED / POST_ROLL_TRIGGERS

Show committed faces before offering optional actions.

Mandatory triggers such as Ghost of Hippolyta should visibly update affected dice before the blue window appears.

Do not skip visually from pre-roll directly to a later placement state.

### BLUE_ABILITY_WINDOW

Show:
- every currently legal blue ability
- eligible die targets
- costs
- `blue_used` markers
- current faces

Primary completion action:
`Finish Blue Abilities`

No blue ability should be selected automatically.

### GOLD_AND_ATTACK_PLACEMENT

Show:
- legal gold targets
- legal attack targets/requirements
- existing allocations
- unused dice

Individual placement actions do not end the phase.

Primary completion action:
`Resolve Assignments`

If the engine returns unused meaningful opportunities, show them as a warning decision.

Suggested title:
`Unused meaningful placement`

Suggested helper:
`You still have a legal placement that can change this round's outcome.`

Actions:
- `Return to Assignments`
- `Resolve Anyway`

Do not warn for legal-but-effectless placements.

### DAMAGE_RESOLUTION

Render transition sequence in order:

1. committed attacks
2. Labor damage
3. Labor die reaching 0 / becoming inactive
4. defeat check

No player acknowledgement is required between atomic transitions in the minimal UI unless a pending decision is created.

### LABOR_ADVANCE / IMPACT_RESOLUTION

Visibly show:

- which Labor die moves
- from node -> to node
- entered impact
- resulting Spirit/Divinity/heal/break/etc.

If multiple routes exist, stop before movement and highlight only legal outgoing nodes.

If an impact requires selecting a physical die to break, board state remains visible while the pending choice is shown.

### REWARD_SELECTION

Show only verified Reward options using canonical A/B/C/D names.

Show:
- immediate bonuses
- blue/gold ability
- persistent side effects
- restart cost may be inspectable but is not central during normal progression

Do not choose for the player.

### DEFEAT / VICTORY

Show:
- result
- cause
- final Spirit/Divinity
- current Labor/node if defeated
- seed/run ID in debug builds
- action to export diagnostics

## Transition rendering

The engine emits ordered transitions. The UI may render them instantly or with lightweight visual delay.

The minimal test UI should support an "instant transitions" mode for fast testing.

Future polished UI may animate the same transition stream without changing engine behavior.

## Notification inventory

| Event | Title | Required acknowledgement? | Board stays visible? |
|---|---|---:|---:|
| Mood revealed | Mood name | No, unless choice | Yes |
| Ghost choice | Source Mood | Yes | Yes |
| Roll settled | none | No | Yes |
| Broken die choice | Choose a die to break | Yes | Yes |
| Branch choice | Choose route | Yes | Yes |
| Unused meaningful placement | Unused meaningful placement | Yes | Yes |
| Reward choice | Choose a Reward | Yes | Yes |
| Labor defeated | Labor defeated | No/brief | Yes |
| Game defeat | Journey ended | terminal | Yes |
| Victory | Hercules Ascends | terminal | Yes |

## Completed action definition

For replay/stats/tutorial:

A player command is "completed" when:

1. command is validated,
2. any required RNG has atomically committed,
3. all deterministic transitions caused directly by the command have resolved until
4. the engine reaches either:
   - the next stable phase awaiting input, or
   - a pending player decision.

This definition should be used consistently for logs and tutorial progression.

## Minimal test-shell non-goals

Do not spend time yet on:

- production mobile layout
- responsive visual polish
- final art placement
- 3D dice
- physics
- haptics
- sound
- animated card flips
- replay viewer polish
- onboarding/tutorial polish
- accessibility polish beyond basic semantic controls

Those belong after engine certification.
