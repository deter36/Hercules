# Hercules orchestration experiment 1 — human checkpoint

Status: **success checkpoint; final human authorization required**
Recommendation: **authorize final implementation-ready specification generation**

## Starting point

The experiment began from Hercules commit
`70b33a0e81c63c5317550bb81da4b9799b02a91b` on the isolated branch
`codex/hercules-orchestration-e1`. The historical package contained structured
canon, deterministic Golden Run inputs, a retained engine, and conflicting or
incomplete rules representations. The human authorized re-establishing corrected
canon from the pinned official rulebook, verified gameplay reference v12, and RNG
spec v3 after the historical checksum preimage could not be recovered.

## Work completed

- `RS-001` audited authority, prepared complete Golden and constructed Labor VIII
  starts, and classified four substantive defects.
- `RS-002` corrected and propagated canonical Labor VIII targeting and source-local
  healing semantics through raw data, schema, execution text, fixtures, and
  generated data. PM pinned the exact candidate in manifest `e1-m0004`.
- `VAL-001` matched every pinned input and replayed Golden Run 0001 through the
  first unsafe divergence at Labor IV input 54.
- `VAL-002` matched all 31 inputs and verified the corrected Labor VIII shared
  requirement, selected target, damage, and advancement before its first unsafe
  divergence.

## Verified corrections and failures

The Labor VIII canonical targeting correction is independently verified through
advancement: one shared 1-2-3 requirement produces one damage assigned to the
selected die. Full-round verification stopped because the historical engine's
healing dispatcher healed die A from 5 to 6 when die B was the effect source.

Golden replay independently reproduced a second engine defect: a false Cannot
Block snapshot changed to true after the die entered a Cannot Block node during
the round. The validator also demonstrated that the historical reusable Golden
helper omits intermediate assertions and silently skips or weakens some recorded
inputs. The guarded experiment runners detected both failures and stopped without
consuming later actions or RNG.

## Unresolved work

- Correct source-local healing in the historical engine and run the complete
  Labor VIII scenario plus wider healing regressions.
- Correct the round-start Cannot Block snapshot behavior and rerun Golden from its
  complete pinned start.
- Correct and harden the reusable replay helper before treating it as proof of a
  full deterministic replay.
- Correct or verify the terminal failed-die status. Golden did not reach input 112
  because its earlier stop rule applied.
- Revalidate the remaining Golden checkpoints, Labor VIII settlement/cleanup, and
  all affected regression cases after implementation changes are pinned.

No unresolved item requires a new game-design ruling. They require implementation
scope that the three-role experiment did not assign to either specialist worker.

## Orchestration assessment

The loop successfully isolated work, pinned exact inputs, preserved authority,
propagated canonical corrections, rejected stale or incomplete preconditions, and
stopped at reproducible implementation divergences. It did not produce runtime
PASS evidence because the experiment has no implementation worker authorized to
repair `src/engine` or `src/replay`. Proceeding directly to a final
implementation-ready spec would therefore present unexecuted required work as if
it had passed.

## Decision requested

Choose one:

1. **Authorize a scoped implementation-and-revalidation phase (recommended).**
   Add an implementation role limited to the four defects above, pin its changes,
   and rerun the two validation scenarios before returning to this checkpoint.
2. **Stop the proof of concept here.** Preserve this failure checkpoint as the
   result; no final implementation-ready spec will be generated.
3. **Authorize spec generation with known failures.** Generate a spec that marks
   the unresolved engine, replay, and terminal work as mandatory implementation
   requirements. This is not the PM recommendation because corrected runtime
   behavior has not been verified.

At this checkpoint, implementation-spec generation remained unauthorized until a
human decision was recorded in the repository.

## Recorded human decision

On 2026-09-13 the human selected option 1 and authorized revising the engine and
then validating it. After a temporary instruction to wait, the human explicitly
said to continue. The human also confirmed that Cannot Block is determined by the
die's position at turn start and that healing affects only the die entering the
healing node. That decision released `IMP-001`, followed by the controlled
implementation and revalidation sequence recorded below.

## Final revalidation result

The authorized remediation cycle is complete. `VAL-004` independently verified
all 49 exact manifest inputs and reported no divergence:

- Golden Run: all 112 inputs, five complete checkpoints, 270 trace operations,
  32 terminal assertions, exact failed-die identity/status, and RNG event 174 pass.
- Labor VIII: all ten operation states and five checkpoints pass through cleanup;
  A remains at 5, B heals to 6, Spirit is 7, and no RNG is consumed.
- Replay controls: 4/4 terminal evidence mismatches reject at the first differing
  field, including Hercules face and hidden Mood order.
- Healing source controls: 10/10 invalid or stale contexts reject with complete
  state and RNG unchanged.
- The implementation suite passes 95/95.

All tracked blocking defects are now closed for the assigned experiment scope.
The inherited Hind condition remains `provisional_owner_approved`, as it was at
the start, and does not block the accepted Golden scenario.

The orchestration loop now has reproducible evidence for corrected canon, engine,
replay, regression tests, complete scenarios, and negative controls. The PM
recommends proceeding to final implementation-ready Codex specification generation.
The human explicitly authorized generation by answering `Yes` in the PM task on
2026-09-14. The resulting handoff is
`orchestration/final_implementation_spec.md`. The experiment is complete and the
PM hourly check remains paused.
