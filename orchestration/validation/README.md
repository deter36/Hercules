# Validation work area

Rules/Spec writes readiness and constructed scenario inputs here only as assigned.
Validation writes run-specific checkpoints, RNG ledgers, results and execution
logs. Preserve full state as JSON, not narrative reconstruction.

Golden input sources remain under `src/data/raw/golden/`; reference them without
copying them. Preserve the 112 normalized inputs and their 100 historical tactical
inputs. The 12 explicit Resolve Assignments insertions are already documented
historical normalization. Do not introduce more normalization silently.

Golden starting boundary is before setup RNG event 0, Human difficulty, seed
`HERC-GOLDEN-RUN-0001`, algorithm `SHA256_COUNTER_V1`, policy `HERC-RNG-v3`.
The approved pre-shuffle order is the first replay input and the golden record's
`initial_mood_input_order_approved_for_run`. Check both agree. Retain permanent
orphaned events 18-25; never reuse them. The stopping rule is the script's recorded
Labor VI terminal state or first unsafe divergence. Existing expected checkpoints
are comparison evidence, not proof that a new run passed.

For each run, record input hashes, complete initial state and hidden ordering,
all player choices consumed, event index progression, checkpoint states, terminal
state, divergence and every finding. Stop at unsupported semantics or illegal
scripted choices. If continuing provisionally, cite the PM's recorded authorization
and retain the failing checkpoint. Do not invent seed values or RNG results.
