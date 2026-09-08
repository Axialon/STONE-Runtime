# Portable Stone files: implementation handoff

Status: implementation and focused local checks complete; independent full verification, browser acceptance, review, publication and integration remain pending. This is not a release or product-acceptance record. The checks below apply to the changes accompanying this note, not a hosted workflow run.

Self-review addressed these findings:

- The prior browser “bad checksum” fixture replaced the manifest model-reference hash, leaving artifact integrity intact. It now remains a separate valid-but-unadmitted case; actual artifact checksum corruption and malformed JSON retain rejection assertions.
- Native Rover reads validate size before reading and verify the returned byte count. New selections clear old draft status. Stale reads cannot restore admission; disposal clears busy state, disables controls and removes callbacks. Activation is serialized, and failed startup is reported to the picker.
- Export rechecks the active generation after asynchronous integrity inspection. Supplied bytes remain the source for reset, inference, comparison and replay; temporary worker operations and rejected starts preserve the active policy. No separate-weight fallback is allowed.
- Digital AUDIT clears old source, result and Completed status when a new selection starts or is cancelled. It reports declared evidence, licence and operating requirements as unauthenticated data without invoking inference.
- The public sample is generated exclusively from the approved model and manifest and tested for exact reproducibility. UI labels use text content; browser checks for inherited markup, failed activation and source receipts are prepared but unrun here.

Final direct Node checks, Node 22.20.0:

| Test file | Passed |
| --- | ---: |
| `tests/stone-package-audit-input.test.mjs` | 3 |
| `tests/stone-package.test.mjs` | 28 |
| `tests/stone-file-picker.test.mjs` | 12 |
| `tests/stone-package-app.test.mjs` | 2 |
| `tests/stone-file-input.test.mjs` | 6 |
| `experiments/learned-flow/tests/package-runtime.test.mjs` | 3 |
| `experiments/learned-flow/tests/package-worker.test.mjs` | 2 |

Total: **56 passed, zero failed, skipped or cancelled**. The AUDIT cancellation regression passes after clearing the old Completed status. Focused behavior regressions were observed failing before fixes. UI tests substitute DOM/transport plumbing; runtime and worker tests use actual pinned Rapier and CART. The Node worker harness adapts module URLs and transport, sets `self` to the worker global, and rejects/counts separate-weight fetch attempts. No physics implementation is substituted. Temporary engine diagnostics were restored exactly. Review was by the implementation writer, not an independent reviewer.

Earlier broad sandbox attempts did not produce a green gate: `verify:all`, `verify:learned` and `verify:engine` encountered loopback permission and child-process output failures; `build:models` stalled and was stopped; `verify:model-build` timed out. These remain failed/incomplete checks, not waived acceptance criteria. Browser tests and clean dependency installation were not run here. No hosted run was attempted, no sandbox was weakened, and no dependency was installed. Raw local logs are retained outside tracked public evidence.

All four lockfiles were reviewed before engine execution for their recorded SHA-512 integrity and absence of install hooks. Their unchanged SHA-256 identities are:

| Lockfile | SHA-256 |
| --- | --- |
| `experiments/rover3d/package-lock.json` | `90c7ef7ded826ec622981fb8d2e1dac788c50944faab81a3e1c1a761c08bcce0` |
| `apps/rover/package-lock.json` | `54ded0fec75f42029f24eb1cfd0f82487f65fd12acf4ca75e70e86922be51013` |
| `experiments/learned-flow/package-lock.json` | `cab0e24fe6eb4e38effdd803647bb63359c8c9258dff400dcf6d96495319d0d3` |
| `tools/model-bundle/package-lock.json` | `f74bb93890a4221bae626305ed490ae6b52764bec0801358600e98face1e1327` |

The frozen model, protocol, host/rules, controller limits, dependency locks and snapshot.json are unchanged by this finish. Original source/model remain UNLICENSED; upstream notices are preserved.

Changed files in this completion batch:

- `apps/field-lab/app.mjs`
- `apps/rover/app.mjs`
- `apps/rover/tests/stone-package-browser.mjs`
- `apps/shared/stone-file-picker.mjs`
- `apps/shared/stone-package-faults.browser.mjs`
- `packages/learned-rover/package-data.mjs`
- `tests/stone-package.test.mjs`
- `tests/stone-file-picker.test.mjs`
- `tests/stone-package-app.test.mjs`
- `tests/stone-package-audit-input.test.mjs`
- `experiments/learned-flow/tests/package-worker.test.mjs`
- `examples/FLOW-Learned.stone.json`
- `docs/STONE_FILES.md`
- `docs/STONE_PACKAGE_PLAN.md`
- `evidence/STONE_FILES_IMPLEMENTATION.md`

The implementation sandbox could not stage or commit this batch because Git metadata is read-only. The scoped changes are preserved uncommitted for the supervising verifier. No push or global configuration change was made.

Next independent gate, using the approved supervising environment: `npm run build:models && npm run verify:full`. Review the final source's browser behavior, route exclusion, package-only AUDIT inference isolation, source retention and stale/failure paths. Publication and integration follow independent review; committing this batch does not establish acceptance.

## Scoped review correction: native cancel events

The previous empty-FileList tests did not cover browsers emitting `cancel` while retaining a selection. Both native inputs now clear their value and use the existing empty-selection handler on `cancel`. This invalidates pending reads; AUDIT also terminates pending inspection and clears its result/source/status. Rover clears only its unapplied draft and preserves the active supplied model/source and machine state. Picker disposal removes the cancel handler and guards retained callbacks.

Direct Node red/green: the five added checks failed before the handlers existed. After the fix, `node tests/stone-file-picker.test.mjs` passes 15/15 and `node tests/stone-package-audit-input.test.mjs` passes 5/5, with no skipped or cancelled tests. Existing assertions remain intact. Browser regressions in `apps/rover/tests/stone-package-browser.mjs` and `apps/shared/stone-package-audit.browser.mjs` dispatch `cancel` on native inputs containing real previously loaded files, including delayed reads. These are event-handling checks, not graphical OS-dialog automation, and await the supervising runner. OS-specific dismissal and same-file reselection variants remain untested here.

This correction touches those four test files, `apps/shared/stone-file-picker.mjs`, `apps/field-lab/app.mjs`, `docs/STONE_FILES.md` and this note only. No commit, broad gate, dependency change or environment troubleshooting was attempted for this correction. Independent acceptance remains pending.
