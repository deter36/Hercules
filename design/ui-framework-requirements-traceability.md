# Hercules UI Framework — Handoff Traceability

## Purpose

This checklist restores the concrete requirements from the eight-document UI/UX handoff. It is the implementation companion to [the first-playable plan](./ui-framework-first-playable-plan.md).

Written source specifications remain authoritative for behavior. The Figma file named in the implementation handoff remains authoritative for visual hierarchy, tile anatomy, and proportions. This document does not change gameplay rules or the deterministic engine/UI boundary.

## Source index

All source documents are retained in [hercules_UI_UX_handoff.zip](./ui-ux-handoff/hercules_UI_UX_handoff.zip):

| Key | Source document |
| --- | --- |
| F | `hercules_gameplay_ui_framework_spec_v0_3.md` |
| I | `hercules_gameplay_ui_implementation_handoff_v0_1.md` |
| A | `hercules_attack_assignment_interaction_spec_v0_1.md` |
| M | `hercules_mood_reveal_setup_ux_spec_v0_1.md` |
| R | `hercules_labor_completion_reward_ux_spec_v0_2_recovered.md` |
| D | `hercules_game_defeat_ux_spec_v0_2_recovered.md` |
| V | `hercules_victory_ux_spec_v0_2_recovered.md` |
| L | `hercules_full_labor_resolution_ux_spec_v0_2.md` |

Status meanings: **Done** is materially implemented and tested; **Partial** has a framework but misses specified behavior; **Planned** is approved next work; **Deferred** awaits visual assets or the dedicated resolution phase.

## Requirements matrix

| Area | Source | Requirement | Status | Notes |
| --- | --- | --- | --- | --- |
| Persistent gameplay frame | F §§1–3, 9; I §§3, 14 | Fixed Status, Forecast, elastic Action Grid, and Undo / Tray / CTA rail | Partial | Framework exists. Device safe-area and reference-viewport validation remain. |
| Status semantics | F §§2, 22; I §20; M §3 | Mood/status is a persistent mechanical-effect indicator next to Menu | Partial | Current control has a title/label, not the specified effect-specific status treatment. |
| Forecast | F §3; A §15 | Engine-only committed-placement forecast; no loose-selection calculation | Done | Keep compact. Resolution Tally is a separate deferred Full Labor feature. |
| Action Grid layouts | F §4; I §§8–11, 13 | Reusable tiles plus deterministic Labor/density/Ferocious layout manifests | Partial | Current generic grid is a temporary layout, not the authored matrix/manifest system. |
| Compact Labor pane | F §5; I §§8–9 | One vertical pane per damageable Labor die, health, requirement iconography, next-node effect, retired defeated pane | Partial | Pane count/health are present; next-node effects and game iconography are not yet represented correctly. |
| Action card anatomy | F §6; I §12 | Card shell, Blue/Gold locations, physical-card art/icon seam, phase dimming | Partial | Current generic action tile is a placeholder and lacks stable slot anatomy. |
| Same-type ×2 abilities | I §12 | One card; multiple same-color slots; full-size available slot, compact occupied slot, all placed dice visible | **Planned — immediate** | Current duplicate-card/first-placement-only behavior violates this. Venomous Blood is the regression case. |
| Mixed Blue + Gold abilities | I §12 | Blue and Gold are separate visible placement locations on the same card | Partial | Current phase color switch is a placeholder; it does not model both printed locations simultaneously. |
| Copy-die abilities | I §12 | Source remains physical; derived copy is distinguishable, linked, and usable as an allowed die | Partial | Engine semantics are correct. The visual source/copy relationship and card slot treatment remain. |
| Blue parking | F §7; I §17 | Used die remains visibly parked, updates face, returns only if reusable after Finish Blue | Partial | Single-slot behavior works; multiple uses on one Reward need the action-slot model. |
| Gold / attack placement | F §§8, 14; I §18 | Visible committed dice, editable before resolution, explicit Resolve | Partial | Engine-backed placement/editing works. Card-slot rendering and destination movement polish remain. |
| Drag-first input | F §§11–14; A §§1–16; I §§15–16 | Selected dice drag as one sorted group; global engine legal highlighting; accepted placement, rejection/snapback, selection survives invalid drop | Partial | Functional baseline exists. Group drag presentation, actual pointer-follow feedback, and snapback fidelity still need validation/implementation. |
| Committed attack bundles | A §§11–14; I §16 | Separate horizontal, sorted bundles; compact individual dice; tap return, drag move, no merge | Partial | Separate bundles and return/move are present. Sorting and complete interaction visuals require a pass. |
| Dice tray | F §10; I §14; A §§2–3, 8–10 | One/two-row density, parked dice leave tray, selection only—not legality—shown, predictable snapback | Partial | Current physical tray and persisted manual ordering are useful extensions. It still needs source-specified density/interaction validation. |
| Pholus | M §8; I §12 | Mood card becomes draggable cover on a legal Reward; covered card visibly disabled for the Labor | Planned | Current generic decision UI does not meet the specified treatment. |
| Other Mood presentation | M §§1–13 | Physical reveal, Zeus redraw placement, effect-specific status, temporary dice/action effects, cleanup | Partial | Engine flows work. Presentation is a simplified overlay and needs the handoff-specific treatments. |
| Labor completion / Rewards | R §§1–11 | Full-Labor completion beat, visible Reward cards, confirmed multi-choice, immediate-bonus transition | Deferred | Current modal/overlay is a functional placeholder. Requires Full Labor/art work. |
| Full Labor resolution | F §§16–19; I §19; L | Scan-backed pan/zoom canvas, Tally, movement/branch animations, inspect/return flow | Deferred | Explicitly deferred until scans, coordinate manifests, and animation work are available. |
| Defeat | D | Cause cue, then restrained shared defeat presentation | Deferred | Current end screen is functional only. |
| Victory | V | Cerberus exception, Ascension art, final result before restrained Victory | Deferred | Current end screen is functional only. |
| Menu availability | F §22 | Menu is available nearly always and pauses only presentation/interaction | Partial | The end-state overlay currently blocks Menu; noted for its presentation-flow milestone. |
| Accessibility / testing | I §22; F open work; L §30 | Safe areas, dense states, touch drag, icon labels, animated-effect accessibility | Planned | Must accompany each relevant milestone, not be a final-only pass. |

## Immediate implementation contract — Action-card placement slots

This is the next implementation milestone. It resolves the current multi-die/multi-use tile defect and creates the stable seam for card art.

### UI-only slot model

Build a projection/UI model with these concepts:

```ts
type ActionCardView = {
  cardId: string;                 // Reward, Bow, or temporary effect identity
  title: string;
  phaseState: "active" | "dim" | "disabled";
  slots: ActionSlotView[];
};

type ActionSlotView = {
  slotId: string;                 // stable ability identity, never a legal-command ID
  color: "blue" | "gold";
  capacity: number;               // normally one; card can own multiple slots
  occupiedPieces: PlacedDieView[];
  legalForCurrentSelection: boolean;
  presentation: "available" | "occupied" | "compact-occupied" | "disabled";
};
```

Rules:

- One physical Reward/Bow/Mood card produces one action-card shell.
- Each certified ability gets a stable placement slot. Two same-color abilities become two slots on that one shell, never duplicate cards.
- Legal engine command variants are grouped behind their owning slot; React does not infer legality.
- All committed physical dice and derived contributions are rendered from their authoritative placement records.
- Slot capacity/occupancy controls presentation. A slot does not disappear merely because another slot on its card is occupied.
- Blue and Gold locations are both part of the same card model; phase determines active/dim state only.
- Art integration later supplies a card background plus slot anchors. Dice remain interactive rendered elements positioned over those anchors, not pixels baked into the art.

### Acceptance cases

- Venomous Blood displays once, with two Blue slots; use one and see one parked die plus one remaining available slot; use both and see both parked dice.
- A multi-die Gold requirement displays every committed physical die and derived contribution in its one slot.
- A mixed Blue/Gold Reward displays both locations on one card and activates only the phase-appropriate one.
- Removing/moving a committed Gold bundle updates the same slot without duplicating or losing dice.
- Derived-copy placement preserves a visible source/copy distinction without adding a second physical Hercules die.
- No canonical state fields, save format, diagnostics output, RNG behavior, or gameplay legality change.

## Milestone order after slot work

1. Implement and test action-card slot model and all placement renderings.
2. Finish drag-first fidelity: pointer-follow group, accepted placement, invalid snapback, ordered bundles, and mobile dense-state testing.
3. Add the optional Menu-persisted tap-select control mode only after drag-first is stable.
4. Replace generic grid rules with Labor/density/Ferocious layout manifests and add compact-Labor iconography/next-node context.
5. Implement Mood/Pholus/status treatments from the handoff.
6. Implement Full Labor, Reward completion, defeat, and victory flows when their scan/art/coordinate assets are ready.

## Guardrails

- The engine remains the only authority for state, legal targets, commands, forecast, movement, decisions, RNG, and outcomes.
- The UI never turns a card-art layout manifest into game-rule logic.
- New interaction or visual extensions must be appended here with source reference or explicitly marked as a user-approved product decision.
