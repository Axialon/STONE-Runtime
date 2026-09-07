# Learned FLOW imitation implementation plan

Goal: train and evaluate a real bounded longitudinal policy while preserving the accepted runtime.
Spec: experiments/learned-flow/protocol.json is frozen before fitting; change requires a new experiment, not test tuning.
Architecture: unchanged Rapier worlds plus deterministic warm-up tapes create episode partitions; one established ml-cart scalar regressor learns throttle-minus-brake. Deterministic steering and explicit airborne/goal/out-of-domain guards remain in the harness. No learned steering or improvement claim.

- [x] Review pinned dependency graph and freeze source/protocol identities.
- [x] Test first, then implement model, serialization and bounded episode/evaluation functions. Codex may propose source; reduced-privilege controller applies and tests it.
- [x] Fit only train episodes once; validation is diagnostic. Evaluate paired held-out runs against unchanged FLOW and record failures, overlaps and model hashes.
- [ ] Fresh code review, save/load and rerun checks, full baseline regression, durable draft/evidence and private status update. Browser/model registration is a separate gate.

Execution authorization: the owner explicitly permitted Codex on the paired machine in this session. The first filesystem review stopped after discovering its working directory was not honored. Subsequent Codex calls consume only supplied reviewed public source, with shell/plugins/subagents disabled. No credentials are copied or exposed. Actual changes and tests use UID/GID65534. No API billing, paid resources, Actions, public deployment, physical actuation or ClawSpan edits.

Ruling: use one signed longitudinal output rather than two independent regressors because the existing host gives any positive brake priority over drive. This deterministic decoding prevents simultaneous drive/brake and is declared before fitting.

Current evidence: real fitted artifact, 42 passing experiment tests, 422 baseline Node tests, 62 preserved browser cases and four learned-manifest browser checks. Reproduction and review details are in evidence/LEARNED_FLOW_V0_1.md; the accepted PR determines merge/pin state. Direct GitHub CLI publication may transfer only the reviewed public tree through the already authenticated account; project execution remains unprivileged and credentials are not copied into its environment.
