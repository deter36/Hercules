# Handoffs

Write `<task-id>-<run-id>.json`, with an optional same-stem Markdown rationale.
Use unique run IDs containing role and UTC time. All fields below are mandatory;
use explicit nulls/empty lists for absence and explain unresolved required values.

Common: `task_id`, `run_id`, `role`, `status`, `manifest_revision`,
`inputs` (path plus commit/blob/tree/hash), `changed_artifacts` (before/after IDs),
`issue_ids`, `issue_dispositions`, `decisions`, `authority_refs`, `assumptions`,
`unresolved_items`, `deliverable_paths`, `validation_required`,
`regression_implications`, `recommended_next_action`.

Validation also includes: `validation_mode`, `scenario_id`, `start_state_path`,
`rng` (algorithm, policy, seed, start/end index, orphaned ranges),
`player_choice_source`, `checkpoints_reached`, `terminal_state_path`, `pass_fail`,
`divergence_point`, `reproducibility_status`, `rerun_required`, `execution_command`
or a precise executable procedure, and `tool_output_path`.

A result/handoff records the commit it tested. Its own delivery commit is the
containing Git commit; it need not contain its own circular hash. PM checks the
containing commit and never accepts a merely promised upload. Use `BLOCKED` for
unmet preconditions, `FAIL` for an observed discrepancy, `PASS` only for the
declared assertions actually executed. A ledger-only check is not a tactical replay.
