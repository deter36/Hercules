# Current manifest

Read [project_state.json](project_state.json) for the authoritative current revision,
input content IDs, tasks, readiness gates, worker status and human checkpoint.
The PM alone maintains that record. Do not infer current versions from this prose,
historical package READMEs, filenames or conversation history.

Read [the operating protocol](README.md), [product principles](product_principles.md),
then your role's [onboarding](onboarding/) and assigned task.

Experiment scope: Golden Run 0001 through its recorded Labor VI stopping point,
plus a small constructed Labor VIII check prepared by Rules/Spec. The latter is
not part of the recorded human run and must have explicit inputs before release.
Neither validation gate is currently established by historical PASS reports.

The selected baseline is commit `70b33a0e81c63c5317550bb81da4b9799b02a91b`.
It retains structured canon and deterministic inputs with enough scope for a real
historical feedback cycle. The PM examined alternatives; later-correction details
are withheld from worker context. Existing game artifacts are not duplicated.

On 2026-09-13, the human authorized re-establishing corrected canon from the
pinned rulebook, v12 gameplay reference, and execution specification because the
historical `GAME_DATA_v4.json` checksum preimage could not be recovered. Historical
evidence must remain preserved, and no later-branch correction may be imported.

Manifest `e1-m0004` carries the RS-002 corrected canonical candidate from commit
`6bffa094431d84429ed93339d48f839bcc5a2302` for independent validation. Both
validation tasks are accepted fail-fast investigations. `VAL-001` reproduced the
historical Cannot Block snapshot mutation at Labor IV. `VAL-002` independently
verified the corrected Labor VIII shared requirement, selected damage, and
advancement, then reproduced incorrect cross-die healing. The experiment is at
the checkpoint recorded in `orchestration/human_checkpoint.md`. The human has now
authorized scoped engine/replay remediation followed by independent validation.
`IMP-001` supplied the four scoped correction candidates with 17/17 focused tests
passing. `IMP-002` corrected the sole stale Labor VIII display assertion and the
complete suite passes 90/90. Manifest `e1-m0005` pins the exact corrected engine,
replay and test trees plus both implementation handoffs and test reports.
`VAL-003` independently passed the complete Golden Run and Labor VIII scenarios,
including the corrected Cannot Block, source-local healing, terminal status and
all assigned checkpoints. Its replay negative controls found one remaining gap:
the reusable helper accepted a terminal Hercules-face evidence mismatch, and the
healing invalid-source guard also remains under-enforced. Manifest `e1-m0006` pins
that exact evidence. `IMP-003` is the sole ready task; `VAL-004` is blocked for
independent residual verification. Implementation-spec generation remains
unauthorized.
