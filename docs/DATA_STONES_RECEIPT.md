# D001 implementation receipt

Status: D001 corrections implemented after supervisor build failure and source review; supervisor build, independent review, real browser/full regression and integration remain pending. No Git writes, installs, hosted runs, deployments or external service calls were performed. This is source self-review and narrow local verification, not product-release acceptance.

Implemented the mounted Digital Data Lab, LENS/TIDY packages and a tested third declarative variant, shared versioned Papa Parse adapter, bounded UTF-8 CSV/JSON grids, quality counts/findings, reversible normalization proposals, deterministic receipts and explicit downloads. Dedicated disposable workers enforce deadlines and cancellation; file/policy changes invalidate results. Data-package AUDIT uses metadata-only dispatch. Existing FLOW admission and simulation controllers were not edited.

Direct native verification, run with `node path/to/test.mjs`:

| Suite | Passed | Failed / skipped |
| --- | ---: | ---: |
| `packages/data-quality/tests/data.test.mjs` | 26 | 0 / 0 |
| `packages/data-quality/tests/session.test.mjs` | 8 | 0 / 0 |
| `packages/data-quality/tests/integration.test.mjs` | 5 | 0 / 0 |
| `tests/manifest-multihost.test.mjs` | 34 | 0 / 0 |
| `tests/stone-package.test.mjs` | 28 | 0 / 0 |
| `tests/manifest-legacy.test.mjs` | 90 | 0 / 0 |
| `packages/data-quality/tests/corrections.test.mjs` | 10 | 0 / 0 |
| `packages/data-quality/tests/product.test.mjs` | 14 | 0 / 0 |
| **Total** | **215** | **0 / 0** |

Observed initial missing-module failures before implementation for adapter and lifecycle tests. The integration suite initially caught a test fixture mutating the shared frozen runtime; the fixture was cloned and all five cases passed. Red/green local logs and reviewed integrity evidence are retained under `.stone-local/d001` for the supervisor; raw logs are not published here. Syntax checks passed for changed app/worker/server/build modules and the browser test module. Self-review inspected actual source and state transitions; no additional coding-model assistance or independent reviewer was used.

Dependency review confirmed Papa Parse 5.5.3, one MIT runtime entry, no lifecycle install hook, supplied SHA-512 integrity and actual installed parser source SHA-256 `10778b8bb3e20177c52febb99e18ec53fd97ce447f4716ca10e00bae18a98594`. The unchanged data lock SHA-256 is `b42fd99517d389aa88c7fc8c2153b7d18858fc0aeb9f3f5374a691c0837b3076`; unchanged builder lock SHA-256 is `f74bb93890a4221bae626305ed490ae6b52764bec0801358600e98face1e1327`. The lock integrity was inspected and recorded before data execution. The build review additionally verifies those exact locks and installed parser source before importing the compiler. No prior lockfile or generated snapshot was edited.

Unrun: bundle compilation/check, 23 real Chromium cases in `apps/data-lab/browser.test.mjs`, existing full Node/engine/browser gates, and other platforms. Native lifecycle tests use controlled worker handles; they establish request/deadline/state behavior, not real browser thread termination. The unrun browser cases exercise actual infinite-loop worker termination, recovery, import/activation, native cancel events, exports, data AUDIT, same-origin requests and 320/390px layout. Graphical OS file dialogs are not automated. Browser receipts carry the generated source-closure hash; direct unbundled tests have `sourceSha256:null` and are not bundle acceptance.

Supervisor prerequisites/commands: `npm run build:models`, `npm run build:data`, `npm run verify:data`, `npm run verify:data:browser`, then `npm run verify:full` from the exact reviewed checkout. Compilation is deliberately delegated to the supervisor, not attempted through native sandbox restrictions. `verify:full` retains its original gates and appends data verification after prerequisites. No workflow run or accepted integration commit is claimed.

Changed paths: `packages/data-quality/` (source, build support, focused tests, upstream notice and local dist ignore; supplied package/lock retained), `apps/data-lab/`, `apps/field-lab/{app.mjs,index.html,server.mjs}`, `packages/contract/{manifest.mjs,reference.mjs}`, `examples/data/`, `docs/DATA_STONES.md`, this receipt and root `package.json` scripts. Local verification records are under `.stone-local/d001` only.

Remaining risks are unverified real browser layout/lifecycle behavior and unbuilt bundle integration. Resource budgets remain declarations; bounded input plus worker deadlines are not a memory-sandbox certification. JSON duplicate keys/number spelling are not preserved. Normalized downloads now contain compact reimportable grids only; receipt/change/undo evidence has a separately labelled download. Oversized grids are withheld based on exact exported UTF-8 bytes, retaining the original and complete report. Acceptance remains with the supervisor.

## Bounded correction follow-up

The supervisor’s independent clean build failed before tests because browser bundling selected upstream’s Node-capable `papaparse.js`, which requires `stream`. That failure is authoritative: earlier native metadata review did not establish build acceptance. The correction honors upstream `browser:"papaparse.min.js"`, uses browser-first resolution and hashes the exact browser file (`3553fb8bdf5b8004ce5531e6827e81c8b34e7b3992677967754544064e97b016`). The fixed bundle input closure now includes that browser entry; the unchanged Node entry remains separately reviewed for parity. No polyfill, parser replacement, source surgery, dependency or lock change was made.

Observed focused red: 5 failures / 4 passes before correction. Final correction suite has 10 passes, including installed upstream parser parity, stable built-in IDs (`digital.data-lens`, `digital.data-tidy`), exact normalized bytes/reimport, the reviewer’s 640127-byte CSV expanding past 1.29 MiB, and UTF-8 expansion beyond the byte limit despite fewer characters. Existing assertions are retained; the Node-source hash assertion now reads the explicit `reviewedSources` metadata, while the build closure stays exactly five inputs. Logs are in `.stone-local/d001/corrections`.

The worker now serializes a compact actual grid, counts its exact UTF-8 bytes and withholds oversized grid exports with an explanatory status. The UI downloads the same string; a separate evidence button exports receipt/changes/undo without a grid. Complete report/counts and original bytes remain available. Browser cases now test exact downloaded-file reimport, oversized UI withholding, and five Node-versus-built-worker parity fixtures. These 23 Chromium cases and the corrected compilation/check remain unrun natively; the supervisor must rebuild and verify. No Git writes, installs, policy changes, robotics/model source edits or broad environment debugging occurred in this follow-up.

## Final product completion pass

Supervisor supplied evidence for the preceding source: both bundles built, existing 637 Node / 159 browser and 49 data Node cases passed; after adding an explicit locator wait for dynamic mounting, all 23 data browser cases passed. This evidence applies to that preceding source, not the changes below. The supervisor's locator wait in `browser.test.mjs` is preserved; its diagnostic candidate was not edited.

The distinct setup-worker blocker is corrected with owned preparation state, termination and generation invalidation on Stop, Digital host leave and disposal. Reentry does not restart interrupted work; a stable Prepare/retry control recovers explicitly. Late setup and draft replies cannot replace accepted datasets, packages, results or receipt state. The Field Lab hook now reports Digital host entry/leave to this module.

Readable metrics, findings and before/after tables replace the primary raw JSON display; exact report JSON remains collapsed within the original findings selector. A small collapsed authoring form builds and inspects safe declarative packages in a separate worker; current active package/report remain intact until explicit activation. Draft export and active package export are distinct. User ID/publisher declarations still use existing manifest/admission checks. LENS/TIDY stable IDs and the shared adapter remain unchanged.

Direct red/green logs are retained in `.stone-local/d001/product`: the new preparation API initially failed import, then declaration tests exposed four failures before the creation API correction. Final focused execution passes 63 data cases (26 + 8 + 5 + 10 + 14) and 152 existing manifest/package cases (34 + 28 + 90): **215 passed, zero failures/skips**. The 14 new direct cases cover delayed preparation invalidation, host gating/retry, safe authoring/hash roundtrip, rejected declarations/options, visible-value derivation and metadata-only worker creation. Actual Chrome delayed/infinite-loop tests are written, not claimed from controlled native handles.

New `product.browser.mjs` contains 13 cases; both browser suites now contain 36 data cases. They, changed-source bundle rebuild/check, full regression and independent acceptance remain pending. Syntax and dependency review pass; locks retain their reviewed hashes. No native broad browser/full suite, Git write, install, setting, deployment or provider call was attempted. Model/protocol/physics and prior locks were not edited.

Supervisor commands: `npm run build:data`, `npm run verify:data`, `npm run verify:data:browser`, then `npm run verify:full` with its existing model-bundle prerequisite. Changed paths in this pass: Data Lab app/session/worker/style and new browser test; data package creation and new focused tests; one Field Lab host hook; root verification scripts; these Data Stone docs. Review remains source self-review plus direct checks, with final independent review/integration owned by the supervisor.
