# Public runtime working rules

This is a curated public verification snapshot, not the internal project archive.

- Never copy internal coordination documents, private service URLs, credentials, personal data, or private Git history into this repository.
- Keep engine versions, host profiles, machine/course definitions and recorded results explicit. Do not silently convert planar controllers into 3D controllers.
- Use the approved local development workspace for verification. Hosted verification is manual-only and must not be retried while unavailable. Any future hosted run stays on one standard Linux runner with a timeout, read-only permissions, no schedules, no dependency cache and no artifact upload. No deployment or paid resources are authorised.
- Retain the pinned dependency and reviewed Actions commit SHAs. Package lifecycle scripts stay disabled. Review and record actual lockfile integrity before running engine code.
- Test first for behaviour changes. Do not skip failing engine tests, mock physics, or weaken acceptance criteria to obtain a green workflow.
- Preserve unrelated work. Make scoped branches and reviewed pull requests. A public verification merge is not product-release acceptance.
- Original code remains UNLICENSED pending an explicit licence decision. Preserve upstream notices for external dependencies.
- Describe self-review and untested platforms honestly. Match claims to the exact workflow run and commit.

## Session efficiency and component ownership
The owner prefers substantial verified batches per conversation turn. Complete dependent increments in one active session where practical, with local test/review checkpoints; do not ask for routine approvals or imply work continues unattended. Keep reasoning and implementation in the conversation, not another coding model. This published rover component is maintained here with immutable integration references in private coordination; never automatically mirror private documents or history. Preserve the separate planar baseline.
