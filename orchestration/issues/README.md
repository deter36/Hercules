# Finding record

No game-validation findings have been produced by the workers yet. PM setup
found `ISS-PM-SETUP-001`, a historical package checksum mismatch assigned to
Rules/Spec. Setup checks do not count as an independent validation pass. Store
each finding as JSON using this shape; replace example nulls with evidence before
submission.

```json
{
  "id": "ISS-VAL-VAL-001-001",
  "task_id": "VAL-001",
  "run_id": null,
  "category": "missing_ambiguous_rule",
  "origin": "canonical_artifact",
  "severity": "S1",
  "blocking": true,
  "status": "open",
  "owner": null,
  "manifest_revision": null,
  "input_versions": [],
  "affected_artifacts": [],
  "evidence": {"expected": null, "observed": null, "source_refs": [], "result_path": null, "checkpoint": null},
  "canonical_update_required": true,
  "regression_required": true,
  "human_authority_required": false,
  "disposition": null,
  "resolution_artifacts": [],
  "verification_task_id": null,
  "closure": null
}
```

`no_change` requires an evidence-backed reason. `accepted_deferral` needs an owner,
scope, impact and revisit condition; an execution-critical deferral cannot make
a validation gate pass. Preserve earlier dispositions through Git history.
