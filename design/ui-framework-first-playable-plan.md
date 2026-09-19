# Hercules UI Framework — First Playable Release

## Authority and scope

The source handoff is [`ui-ux-handoff/hercules_UI_UX_handoff.zip`](./ui-ux-handoff/hercules_UI_UX_handoff.zip). Its eight written specifications govern behavior; the linked Figma file governs hierarchy, proportions, tile anatomy, and layout reference. The detailed, source-linked implementation checklist is maintained in [UI Framework Requirements Traceability](./ui-framework-requirements-traceability.md).

The deterministic engine, saves, diagnostics, seed handling, and command model remain authoritative. Scanned Labor art, coordinate manifests, pan/zoom boards, and track animation are deferred until those assets arrive.

## Completed

- Read-only engine/UI projection layer: screen model, exact engine-certified legal targets, pure committed-placement forecast, CTA state, and editable placement targets.
- Core framework: Status Strip, Forecast Strip, Action Grid, persistent Menu, responsive desktop/mobile hierarchy, and bottom dice rail.
- Setup, Mood, Reward, defeat, and victory presentations; reward reveals include both immediate effects and persistent abilities.
- Drag-editable attack and Gold bundles, deterministic undo, resolve-anyway confirmation, and engine-certified move/return behavior.
- Default control model: tray taps assemble a multi-die bundle only; a drag performs a placement or move; a tap on a committed bundle returns it to the tray.
- Independent scrolling Action Grid during touch drag, with Status, Forecast, and dice rail fixed.

## Current phase — placement fidelity and interaction polish

Finish the default drag model before adding an alternate control mode.

Before further tile polish, complete the Action-card placement-slot model specified in the traceability checklist. In particular, one Reward must never duplicate because it has multiple legal command variants or multiple same-color abilities; all Blue/Gold slots and committed dice must remain visible on the one card.

- Show committed physical dice and derived contributions directly in Blue and Gold action tiles; remove their physical die from the tray while committed.
- Blue: the die parks in its used Blue tile until **Finish Blue**; reusable dice return to the tray only when the engine finishes the Blue phase.
- Gold: the committed dice stay visibly in the Gold tile and can be tapped to return or dragged to an engine-certified destination.
- Attack: show a compact committed bundle on the Labor pane; tap returns it to the tray and drag moves it to a highlighted legal destination.
- During a loose-die drag or tray selection, suppress misleading highlights on occupied tiles while retaining engine validation for any legal drop.
- Provide drag feedback and snapback: the dragged die/bundle should visually travel with the pointer; invalid drops return it to its origin.
- Validate dense states, multi-die bundles, derived contributions, Blue parking/return, Gold movement, and 11-die tray density.

## Next phase — alternate controls and responsive Action Grid

After default drag has been tested successfully:

- Add a persistent Menu preference for **Tap-select controls**.
- In that optional mode, selecting a die/bundle highlights legal destinations and the tray; the CTA changes to **Return to tray**.
- Refine Action Grid tile sizing and density for phone sizes, safe areas, and desktop. The current fixed-rail/scrollable-board shell is intentionally a temporary testing aid and may be refined here.
- Add richer forecast and Labor-track context, including upcoming node effects, without inventing game rules in React.

## Deferred follow-up — Full Labor Resolution canvas

- Scanned Labor art, coordinate manifests, pan/zoom, and path/track animation.
- The engine transition sequence stays unchanged; this is a presentation-only expansion using the existing UI-local presentation seam.

## Test requirements

- Keep full engine suite, golden replay, diagnostics validation, and save/load coverage green.
- Add focused coverage for projection purity, exact legal targets, Blue parking/return, Gold/attack relocation, derived copies, disabled Rewards, Pholus, Zeus redraw, Cannot Block, and resolve-anyway.
- Manually test Birds, Apples, Cattle, Cerberus, Ferocious-dense states, 11-die trays, editing, rewards, defeat, victory, diagnostics export, and touch drag on mobile.

## Locked interaction decisions

- Written specs govern behavior; Figma governs composition.
- Default mobile/desktop placement is drag-first.
- Tray tap is permitted solely to assemble or adjust a multi-die selection; it does not assign dice.
- A tap on an already committed attack or Gold bundle returns that bundle to the tray.
- Only the engine determines legal destinations and consequences.
- Tap-select/tap-target is an accessibility/precision alternative added only after drag-first behavior is stable.
