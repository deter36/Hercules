# Operating protocol

## Scope and durable context

The [experiment contract](experiment_contract.md) defines the three roles. This
file adapts it to this repository. Read `project_state.json`, `current_manifest.md`,
your task and its exact input artifacts on every run. Conversation history is not
an input. Do not generate/finalize an implementation-ready specification before
recorded human approval. Historical implementation documents are source material,
not authorization to resume their broader implementation plan.

Keep coordination here: `tasks/`, `issues/`, `handoffs/`, `validation/`. Keep canon
at its existing `src/data/raw/` paths. `src/data/generated/` is derived content.
Only PM edits policy, the current manifest, project gates or human-checkpoint state.
Rules/Spec owns assigned canonical edits. Validation owns execution evidence and
findings, and never silently repairs the inputs it is testing.

## Authority

The manifest identifies current versions; it cannot make a lower source outrank
a higher one. Use official rules/components/errata for mechanics, recorded
designer/owner rulings for their stated scope, the verified gameplay reference
for recorded component facts, execution specifications for timing/state semantics,
and structured data/schema for representation. A verified reading may clarify
ambiguous source text; a conflict between authoritative claims requires an issue
and investigation or a human ruling, not a convenient interpretation.

Statuses are `verified`, `owner_designer_verified`, `provisional_owner_approved`,
`source_conflicted`, `unresolved`. Preserve a source path, version and section/page
for each consequential decision. An inherited document's self-description is
provenance, not evidence of a fresh verification by this experiment. Record new
human rulings with their exact scope and durable evidence in the owning issue,
then propagate the ruling into affected canon before downstream use.

Golden records, historic PASS reports, tests and engine code are behavioral
evidence. They never overrule authoritative rules. Historical reconciliations
already present in the selected package remain explicit inputs. Later fixes,
current `main`, local Downloads, other tasks and PM research are outside worker
context. Do not search them for solutions. This is a procedural blinding rule,
not an access-control boundary; log accidental exposure as an experiment failure.

The bundled rulebook and the historically referenced v12 gameplay reference and
RNG v3 specification were recovered byte-for-byte from local project exports.
Their exact Git blob IDs and hashes are in the manifest. Exact historical export
dates are not established by filesystem timestamps. Later reference/spec versions
were not imported. Where provenance is insufficient for a scenario, block it.

## One branch, one eligible worker task

All roles synchronize `origin/codex/hercules-orchestration-e1`. Each worker needs
its own clean checkout/worktree; never run two roles against the same working
directory. Do not fetch/merge `main`. A worker may claim only its role's lowest-ID
`ready` task when no other task is `in_progress`. PM makes at most one worker task
ready at a time. Separate working directories prevent filesystem races; Git's
normal non-fast-forward rejection prevents competing remote claims.

1. Require a clean checkout on the experiment branch. Fetch only that branch,
   then fast-forward to it. If dirty work belongs to another run, leave it intact
   and report the recovery evidence; do not reset, stash or clean it away.
2. Read the latest manifest and eligible task. Verify artifact pins before work.
3. Set `in_progress`; fill `claim` with role, unique run ID, UTC claim time,
   UTC expiry (two hours), and the remote commit read. Commit and push this claim.
4. Begin substantive work only after the claim push succeeds. A rejected claim
   must be reconciled against fresh remote state; if another claim won, stop.
   Never force-push. Do not let a losing local claim overwrite the winner.
5. Before submitting, fetch again and ensure the task is still owned by this run
   and its manifest revision/input pins are unchanged. Stop on an expired or
   revoked claim. Commit deliverables, issues, handoff and task status atomically.
6. Push normally. A failed result push is not a delivered handoff. Preserve work
   locally, record/report the failure once, and re-evaluate fresh remote state.
   Reapply only still-valid changes; stop on semantic conflict. Do not cherry-pick
   other roles' work or silently resolve a disputed canonical value.

Stage only the task's allowed files; never blanket-stage another run's files or
build output. Install the historical locked dependencies only when the assigned
execution method needs them (`pnpm install --frozen-lockfile`). Record runtime and
tool versions in validation evidence. Inspect the existing package scripts before
running them, since builds can regenerate derived data; an unexpected change is
evidence to investigate, not permission to update canon during validation.

The claim duration is a maximum work lease, not a promise that a run is alive.
A worker may extend it in a pushed progress commit before expiry. PM may recover
only an expired claim after checking the remote for a delivered result/extension;
record evidence, revoke the old run ID and return the task to ready. For an early
reported failure, PM records abandonment before requeuing. Old workers must check
ownership immediately before publication. Record stale claims/collisions in issues.
Do not add a lock service, custom scheduler or extra branch workflow.

## Task lifecycle

| Transition | Owner | Required evidence |
| --- | --- | --- |
| new -> blocked / ready | PM | Objective, input pins, outputs and acceptance criteria; dependency/gate reason if blocked |
| ready -> in_progress | Assigned role | Successfully pushed claim |
| in_progress -> submitted | Assigned role | Deliverables plus structured handoff, submitted as one commit |
| in_progress -> blocked | Assigned role | Issue and blocked handoff identifying missing preconditions/authority |
| submitted -> accepted | PM | Deliverables checked against every criterion and any required independent validation accepted |
| submitted -> ready / blocked | PM | Rejection rationale, issue routing, explicit rework scope and renewed pins |
| blocked -> ready | PM | Blocking evidence resolved, current inputs pinned, dependencies/gates satisfied |
| expired in_progress -> ready / blocked | PM | Recorded claim recovery and old run revoked |
| accepted -> ready / blocked | PM | New invalidation or regression evidence; prior acceptance retained in Git |

`submitted` is the worker's completion claim; `accepted` is PM's evidence-based
decision. A failed validation can be accepted as a completed investigation while
its gameplay outcome remains FAIL and downstream gates stay closed. Canonical
correction tasks stay submitted until independent regression verification arrives;
a dependent validation task may be readied after the PM verifies the correction
handoff and revalidation gate, without prematurely accepting that correction.

Task JSON requires ID, role, status, objective, dependencies, manifest revision,
input artifact IDs, allowed changes, deliverables, acceptance criteria, claim,
blocking issue IDs, handoff path and PM review. Unready scenario fields must be
null/explicitly unresolved. A placeholder must never be treated as satisfied.
Use run-specific handoffs/results so retries do not overwrite earlier evidence.

## Issues and dispositions

Use `ISS-<role>-<task>-<NNN>` for new issue IDs; find existing same-cause issues
before opening a duplicate. Classify as `source_data_defect`, `state_schema_gap`,
`execution_spec_defect`, `missing_ambiguous_rule`, `execution_agent_error`,
`rng_replay_problem`, `display_interaction_issue`, or `product_ux_issue`.
For engine implementation defects use `execution_agent_error` with
`origin=historical_engine`; distinguish these from validator execution mistakes.

Every meaningful finding needs ID, task/run, category, severity (S1 stops execution
or undermines integrity; S2 wrong localized behavior; S3 presentation/UX), blocking
flag, expected/observed evidence, exact input versions, affected artifacts, owner,
status, canonical-update and regression-required flags, human-authority flag,
disposition and evidence of closure. Use the record shape in `issues/README.md`.

Issue states: `open -> assigned -> resolution_submitted -> closed`, with
`human_review_required` available from any active state. Validation creates issues;
PM assigns/reclassifies and closes them; the assigned owner proposes a resolution.
Human escalations remain open until a ruling/disposition is recorded. PM may close
with `canonical_update`, `regression_update`, `no_change`, or `accepted_deferral`;
record the reason and proof. `human_escalation` is a disposition, not an automatic
closure. A report alone never closes a finding.

Rules/Spec owns canonical data/schema/spec fixes and regression expectations;
Validation owns reruns and corrections to its own execution/replay records. Route
historical-engine mismatches to Rules/Spec for diagnosis and canonical implications.
Engine-code changes require a separately explicit task; do not hide an engine bug
by changing correct canon or golden expectations. An out-of-scope implementation
gap remains blocking or is explicitly escalated at the checkpoint. PM records UX
deferrals; UI work is outside this experiment. Human authority is for source
conflicts, unavailable physical facts, provisional game rules and product/risk
decisions, not ordinary assignment/versioning questions.

## Version discipline

`project_state.json` is the machine-readable manifest and sole gate-state record.
`current_manifest.md` is navigation, not a second mutable inventory. Artifact
entries pin a full baseline commit and Git blob/tree ID, or an imported source's
exact blob ID and SHA-256. Existing filenames such as v4 do not establish identity.
Use `git rev-parse <commit>:<path>` for historical IDs, and
`git hash-object -- <path>` for clean current files (applies Git attributes).
SHA-256 values here refer to Git blob bytes, not platform-converted checkout text.
Directory pins are Git tree IDs; verify all covered files, including deletions and
new files. Never treat a matching manifest name as a successful version check.

When an accepted candidate correction changes canon, PM creates a new manifest
revision with the correction commit/content IDs, explicit supersession and affected
task/result invalidations. Pin generated content and its source together. Workers
report exact before/after IDs in handoffs; they cannot promote their own edits to
current canon. Golden expected states may change only through an authority-backed
issue, preserving original evidence. Old package checksum files are historical;
record mismatches rather than treating them as fresh certification.

## Progression gates

PM records each gate decision with task/result paths and tested input versions.

**Ready for validation (per scenario):** Rules/Spec readiness is accepted; all
canonical inputs match; complete start state, phase and hidden ordering exist;
RNG algorithm/version, seed, start index and recovery ledger are explicit; player
choices and their authority exist; stopping rule and unresolved/provisional issues
are declared; no unresolved execution-affecting field blocks that scenario.
Constructed tests must declare fixed state/dice and any zero-RNG boundary; they
must never masquerade as recorded human play. Historical PASS is not a gate pass.

**Ready for revalidation:** the relevant canonical correction is committed and
promoted into a new manifest revision; disposition and regression expectation are
recorded; corrected generated content is pinned where used; validation tasks name
new versions; replay preconditions still hold. Execution-only no-change cases need
PM rationale and a corrected execution/replay method instead of a fictitious canon
edit. No verification result from the old revision can verify the new one.

**Ready for human checkpoint:** assigned replay/targeted work ran as far as safely
possible with reproducible evidence; every finding has a disposition; critical
issues are independently verified or explicitly escalated; canonical corrections
have propagated; no accepted result relies on stale inputs. Unexecuted required
work blocks a success recommendation. An inability to finish may produce a failure
checkpoint only with explicit stopped-at evidence and escalations, never PASS.

Project phases: `prepared`, `active`, `blocked`, `human_review_required`, `complete`.
The checkpoint must distinguish `recommended`, `not_recommended`, or
`conditional_on_human_ruling`. Set implementation-spec permission only after an
explicit human decision is durably recorded. Preparing worker startup is a setup
milestone, not the final human checkpoint.

## Recurring PM pass

Synchronize the experiment branch; inspect tasks/issues and new handoffs; verify
required artifacts and exact versions; route every finding; evaluate gates; ready
the next eligible task; update state/manifest only when evidence changes; commit
and push coordination changes. Accept at most what the artifacts prove. Stop when
there is no action. No timestamp-only commits or repeated unchanged alerts.

Notify the human only for meaningful completion, failure, required authority or
an actionable change. Record duplicate claims, stale versions, invented semantics,
unpromoted fixes, divergent state and clerical human intervention as failures of
the experiment; do not quietly repair the evidence away. Coordination stays in
Git. Do not invoke, message or delegate to another agent directly.

The PM checks hourly. Worker startup prompts describe independent hourly passes.
The human instantiates the two worker tasks after setup, as specified by the
experiment contract. A worker's first pushed claim proves it exists; a schedule
must not be marked active without tool/UI confirmation. Keep the local machine
and app running for local scheduled work. See the
[official scheduled-task documentation](https://learn.chatgpt.com/docs/automations?surface=app).
