# Hercules orchestration experiment 1

This branch is a controlled historical experiment in repository-based coordination.
Start at [the current manifest](orchestration/current_manifest.md), then read
[the operating protocol](orchestration/README.md) and your role's onboarding file.

The PM has prepared the experiment. Rules/Spec readiness review is the first
eligible worker task; validation has not run. The implementation-ready spec is
behind a human checkpoint.

Coordination uses files and ordinary Git commits on `codex/hercules-orchestration-e1`
in `deter36/Hercules`. All experiment coordination files live in `orchestration/`.
Existing game files remain in their original paths. The existing engine is a
historical subject for comparison, not a rules authority.

Worker startup instructions:

- [Rules / Spec](orchestration/onboarding/rules-spec.md)
- [Validation](orchestration/onboarding/validation.md)
- [Project Manager recurring pass](orchestration/onboarding/project-manager.md)

This branch starts at historical commit
`70b33a0e81c63c5317550bb81da4b9799b02a91b`. Do not merge later development history
into it or use later revisions as an answer key.
