> Accepted component evidence: the independent clean build and full suite passed700 distinct Node cases and195 sandboxed Chrome cases. Source-only reviewer findings on export-size/round-trip and setup cancellation were corrected and rechecked. See ../evidence/DATA_STONES_V0_1.md for exact scope. Native implementation receipts remain historical, not current acceptance.

# Data Stones / local Data Lab

Open Field Lab at `#digital`. Data Lab is a separate instrument above the existing BENCH/BRIEF/AUDIT panel; four-host navigation, routes, FLOW and existing portable files retain their paths. Select an explicit CSV/JSON format, choose a file or the synthetic example, choose LENS/TIDY, then press Run. Selecting an input never executes a policy. Source bytes stay in the current tab; reload does not restore them.

LENS (`digital.data-lens`) inspects a table. TIDY (`digital.data-tidy`) additionally proposes trimming string value edges and omitting entirely empty data rows. They share one runtime adapter and preserve IDs, scalar types, header names and duplicate rows.

Export is explicit. The normalized download is the **compact actual `stone.data-grid/0.1` JSON**, ready to reimport with JSON selected; it contains no receipt. The worker serializes it once and counts those exact UTF-8 bytes; the UI downloads that string without pretty-printing or an added newline. If it exceeds 1 MiB, normalized export is disabled with the exact size and reason. Input, complete report/counts and proposal evidence remain available; nothing is truncated and limits are unchanged. A valid CSV can expand beyond the JSON byte limit.

A separately labelled proposal-evidence download contains receipt, changes, complete undo records and export-limit metadata, without the grid. The quality report is also separately downloadable. To restore a parsed grid, insert omitted rows in ascending original row order, then restore trimmed cells at original row/column coordinates. Undo does not restore byte encoding. There is no overwrite, CSV export or CSV formula-safety claim.

## Input and report contract

Inputs are explicit UTF-8, nonempty and at most 1 MiB. File size is checked before and after reading; decoding is fatal on malformed UTF-8. Original exact bytes are SHA-256 hashed, including a BOM or original line endings. CSV uses the installed Papa Parse **5.5.3**, `header:false`, `dynamicTyping:false`, comma delimiter and no comment interpretation. The first row supplies headers; quoted commas/newlines, leading zeros and duplicate headers survive. A terminal record separator is not an additional data row. Internal tables are arrays, not objects keyed by possibly duplicate headers.

JSON accepts an array of flat records (union of keys in encounter order; absent cells represented as null), scalar rows (`[[1,"001"],[2,"002"]]`), a scalar list (one `value` column), or exactly:

```json
{"format":"stone.data-grid/0.1","headers":["id","name"],"rows":[["001"," Ada "]]}
```

Mixed row kinds, nested values, nonfinite numbers and unsafe integer values are rejected. JSON numeric spelling and duplicate object keys are not preserved by `JSON.parse`. Empty record arrays use a `value` column. Empty records with no columns are rejected. Normalized grid downloads reimport directly. Proposal evidence is not a dataset. See `examples/data/normalized-grid.json`.

Limits are inclusive: 5000 data rows, 64 columns, 8192 characters per cell/header. Ragged CSV/grid rows are retained, not silently padded or truncated. `columns` is the maximum header/data width; missing counts include absent cells across that width, nulls and empty strings. Whitespace-only strings are reported separately and count as empty for TIDY omission. Header duplicates and duplicate rows use exact equality. Duplicate detection uses a set of serialized rows, with no pairwise scan. Mixed findings compare conservative value syntax/types, not semantic truth or validated dates. Formula-like prefixes `= + - @` after whitespace are observations, never evaluated. All display uses inert text nodes.

Counts always cover the full table. Policy `checks` selects finding details; basic counts remain complete. At most 100 findings and 100 change examples are displayed, with explicit total/shown counts. Preview is capped at 20 rows and 8 columns; displayed cell text is abbreviated at 160 characters. Available normalized grid downloads and separate undo evidence are complete; oversized grids are explicitly withheld.

## Interchangeable packages and admission

Both built-ins are created as `stone.package/0.1` files with v0.2 manifests and checksum-bound JSON config artifacts. Imports use the same parser, admission and adapter. Import only inspects; the separate Activate button is required. A policy change or cancelled/replaced file clears previous results and disables result exports immediately.

The sole runtime is `stone.data-quality/0.1`, harness `stone.data-quality/0.1.0`, artifact `config`. Its profile is `stone.digital.data-quality/0.1`, task `digital-data-quality`, table machine `stone.data-table/0.1.0`, parser engine `papaparse/5.5.3` (not Rapier). Config is exactly `{version:"0.1.0",checks:[...],trimStrings:boolean,omitEmptyRows:boolean}`. Allowed checks: `missing`, `ragged`, `headers`, `whitespace`, `duplicates`, `mixed`, `formula`. Checks are unique and nonempty. Omission requires trimming. A third variant can choose a subset and set `omitEmptyRows:false` without UI changes. Unknown fields, transforms, runtime/harness, models and privileges are blocked. Config cannot contain code, regex or URLs.

Human identity, publisher, licence, style and evidence remain unverified declarations. Operating metadata must match the preinstalled adapter; declared resource budgets cannot exceed 64 MiB/10000 ms and are metadata, not sandbox certification. Actual controls are input/message bounds and a 10-second page-side worker deadline. Stop terminates even an unresponsive worker. Retry is explicit. Late file/worker replies cannot restore invalidated results.

All package checks and table processing run in dedicated same-origin module workers. The table bundle loads only on Run. Data-package AUDIT has an explicit metadata-dispatch boundary and does not initialize physics, parse datasets, load models or install anything. FLOW admission remains in its original path. Same-origin static module requests are required; there are no data uploads, provider calls or persistence APIs.

Receipts bind original byte length/hash and selected format, exact admitted package bytes/hash, config artifact bytes/hash, actual adapter/harness/parser, `model:null`, and `actualExecution:local`. Payloads contain no timestamp. The browser bundle includes a source-closure digest; generated metadata separately records bundle, source, notices and reviewed lock hashes. Direct unbundled Node tests honestly report `adapter.sourceSha256:null`; they are not browser build acceptance.

## Stable UI selectors

Root `#data-lab` is inside Digital and initially expanded. Controls: `#data-file`, `#data-format` (`csv`/`json`), `#data-policy` (`LENS`/`TIDY`/`imported`), `#data-sample`, `#data-run`, `#data-cancel`, `#data-status`, `#data-preview`, `#data-findings`, `#data-report-export`, `#data-proposal-export` (compact reimportable grid), `#data-evidence-export` (receipt/change/undo evidence). The nested portable-policy details contains `#data-package-file`, `#data-package-activate`, `#data-package-export`, and `#data-package-inspection`. Native input `cancel` and empty `change` both clear selection. Escape within Data Lab stops its worker. Labels, native keyboard controls, wrapped actions and a scrollable dark preview support 320/390px layouts; desktop and320/390px browser checks passed in the tested Chrome environment; other browsers/devices are unverified.

## Build and verification

Only the supplied Papa Parse dependency is used; no installation is part of this task. Original code remains UNLICENSED. Upstream MIT notice is in `packages/data-quality/PAPAPARSE_LICENSE.txt` and generated bundle notices. Lock review checks exact supplied lock hash/integrity, both installed parser entry hashes and the reviewed builder lock. The build honors upstream `browser:"papaparse.min.js"` with browser-first entry resolution; Node retains upstream `main:"papaparse.js"`. The five-file bundle closure includes the minified browser entry, while `reviewedSources` additionally records the Node entry for parity review. Lifecycle scripts remain disabled.

From the approved checkout, supervisor commands are:

```sh
npm run build:models
npm run build:data
npm run verify:data
npm run verify:data:browser
npm run verify:full
```

`build:data` uses existing esbuild-wasm 0.28.2, emits a separate local bundle under `packages/data-quality/dist/`, and records the complete fixed source closure. `node packages/data-quality/build.mjs --check` verifies generated files. `verify:full` retains all prior gates and appends data checks, generated bundle verification and browser cases after prerequisites. The supervisor owns builds, Chromium, full verification, commits and integration. Focused native tests and source self-review are implementation evidence, not product acceptance.

The supervisor previously observed a build failure resolving Node `stream`; review-only metadata success was not build acceptance. The browser-first correction passed the supervisor rebuild. Native tests compare the installed Node/browser parsers; Chromium cases compare Node execution with the actual built worker, reimport exact downloaded bytes and verify oversized-export withholding.

## Readable results and authoring

The primary result shows complete row/column/missing/duplicate/whitespace counts and the number of findings for the selected checks. `#data-metrics` contains `#data-metric-rows`, `-columns`, `-missing`, `-duplicates`, `-whitespace` and `-findings`. `#data-findings-table` labels data rows/columns from 1 (CSV headers are separate). `#data-changes-table` shows bounded before/after values with quotes exposing edge spaces. The original preview retains original edge spaces and IDs. Exact receipt, limits and the complete report JSON remain inside collapsed `#data-result-details` within `#data-findings`; export formats are unchanged.

The collapsed `#data-author` / `#data-author-form` creates a package using the same `createDataPackage` and admission path as imported variants. Stable fields are `#data-author-name`, `#data-author-id`, `#data-author-publisher`, seven `#data-author-check-{missing,ragged,headers,whitespace,duplicates,mixed,formula}` checkboxes, `#data-author-trim` and `#data-author-omit`. Omission requires trimming; at least one check is required. Name/ID/publisher are unauthenticated declarations validated by the existing manifest contract. There is no new runtime, DSL or privilege grant.

`#data-author-prepare` creates and inspects a draft in a dedicated worker. It does not run the dataset, replace the active package or alter an existing report. `#data-author-status` and `#data-author-inspection` identify draft inspection. `#data-author-export` downloads exactly the prepared draft; `#data-package-export` still downloads the active package. `#data-author-activate` explicitly activates the inspected draft and clears prior results; Run is still separate. Editing a form field invalidates the old draft. Export/reimport uses the same exact package/artifact hashes and admission boundary; no central name-specific card is added.

Preset setup and draft preparation each own a cancellable worker and generation guard. Stop, leaving Digital and disposal cancel and invalidate pending preparation. Accepted datasets/packages are not replaced by late replies. `#data-setup-status` reports setup state, separately from dataset status. If presets were not ready, `#data-prepare-retry` explicitly retries while on Digital. Initial entry prepares presets once; later host entry does not automatically restart interrupted setup. Draft preparation also requires an explicit retry. No preparation worker restarts while off-host.

`npm run verify:data:browser` now runs both the existing browser suite (with the supervisor's explicit locator readiness wait preserved) and `apps/data-lab/product.browser.mjs`. The latter adds 13 cases for readable output, authored-policy roundtrip, preserved active/results state, dangerous declarations, responsive layouts, and delayed/stalled setup cancellation on Stop/host leave/disposal with explicit recovery. These additions passed independent supervising browser execution.
