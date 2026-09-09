# Package signature implementation receipt

Source base: `b242907`, branch `dev/trust001-package-signatures`. Native implementation and self-review only; no commit, integration, product-release acceptance, or independent review is claimed.

Scope:

- `packages/contract/package-signature.mjs`: detached Ed25519 envelope and public verification report; existing package/admission modules unchanged.
- `apps/shared/signature-panel.mjs`, `signature-session.mjs`, `signature-worker.mjs`: explicit local UI and owned worker lifecycle.
- `apps/field-lab/app.mjs`, `index.html`, `server.mjs`, `style.css`: Digital mount, allowlisted assets, host disposal, scoped responsive styles.
- `scripts/stone-signature.mjs`: bounded stdin-only author signing and public verification CLI.
- `tests/stone-signature.test.mjs`, `stone-signature-session.test.mjs`, `stone-signature-cli.test.mjs`: direct tests.
- `scripts/stone-signature-cli.test.mjs`, `apps/shared/signature.browser.mjs`: supervisor subprocess/browser tests.
- `package.json`: additive verification commands and full-suite integration.
- `docs/PACKAGE_SIGNATURES.md` and this receipt: public contract and verification limits.

Initial native direct results on Node 22.20.0 (before the correction below):

| Command | Individual tests passed | Failed / skipped |
| --- | ---: | ---: |
| `node tests/stone-signature.test.mjs` | 32 | 0 / 0 |
| `node tests/stone-signature-session.test.mjs` | 7 | 0 / 0 |
| `node tests/stone-signature-cli.test.mjs` | 4 | 0 / 0 |
| `node tests/stone-package.test.mjs` | 28 | 0 / 0 |

Tests were written before their implementations; initial runs failed on missing modules. The CLI test initially had a syntax typo, fixed before observing its missing-module failure. Self-review added a changing-file-size regression: 6 passed / 1 failed before the fix, 7 passed afterward. `node --test` produced file-level summaries in this sandbox; those summaries were not counted as individual acceptance. Direct execution supplied the counts above. Syntax checks and `git diff --check` passed.

Self-review inspected the actual crypto boundary, shared CLI path, exact-byte copying, strict encodings, public-only outputs, server module allowlist, generation guards, worker termination and host hooks. No additional agents or independent reviewers were used.

Not run here (supervisor owns these):

- `npm run verify:signatures:cli` — real subprocess/stdin/exit-code checks.
- `npm run verify:signatures:browser` — actual browser crypto, native cancel events, stalled worker termination, stale exports, keyboard and 320/390px checks. OS file-dialog interaction is not automated.
- `npm run verify:full` — all existing 700 Node / 195 browser baseline requirements plus additions remain required; their success on this source is not claimed. Existing build prerequisites and independent source review still apply.

No browser, engine, compiler, hosted, provider, deployment or real-key operation was attempted. The standard public RFC vector and fresh in-memory test keys are the only cryptographic test inputs. No trust store, authentication, permissions, provider admission, snapshot, dependency, or Actions pin was changed. These native results alone do not verify browser/platform or CLI subprocess behavior; see the later supervisor evidence and correction below.

All five lockfiles were reviewed as actual bytes: dependency entries had SHA-512 integrity declarations and no install hooks. This checks declarations, not downloaded archive integrity or installed dependency contents. No install ran. SHA-256 of each unchanged lockfile:

| Lockfile | SHA-256 |
| --- | --- |
| `apps/rover/package-lock.json` | `54ded0fec75f42029f24eb1cfd0f82487f65fd12acf4ca75e70e86922be51013` |
| `experiments/learned-flow/package-lock.json` | `cab0e24fe6eb4e38effdd803647bb63359c8c9258dff400dcf6d96495319d0d3` |
| `experiments/rover3d/package-lock.json` | `90c7ef7ded826ec622981fb8d2e1dac788c50944faab81a3e1c1a761c08bcce0` |
| `packages/data-quality/package-lock.json` | `b42fd99517d389aa88c7fc8c2153b7d18858fc0aeb9f3f5374a691c0837b3076` |
| `tools/model-bundle/package-lock.json` | `f74bb93890a4221bae626305ed490ae6b52764bec0801358600e98face1e1327` |

## Bounded review correction

Supervisor-reported prior candidate evidence: all Node groups passed, including both original CLI subprocess cases; all 195 existing browser cases and the first 13 signature browser cases passed. The signature suite then failed because `#signature-verify` was not visible in its cancellation loop. The observed failure and same-fragment navigation/toggle code path motivated the fixture correction. A separate navigation diagnostic was blocked before execution; it supplied no diagnostic evidence and was not retried here.

Changed only `apps/shared/signature.browser.mjs`, `scripts/stone-signature.mjs`, `tests/stone-signature-cli.test.mjs`, `scripts/stone-signature-cli.test.mjs`, `package.json`, and the two signature documents. Each independent cancellation case now explicitly reloads Digital, checks readiness, empty inputs/report, disabled actions, zero worker counts and collapsed details, then opens the panel. A fresh document also follows simulated pagehide before the remaining layout checks. Application behavior and all cases/assertions are preserved.

The CLI now awaits output callbacks and handles error events through one retained guard per output stream. Callback failure followed by an error event cannot leave that event unhandled. Diagnostic failure returns exit 2 without recursive writes. Errors are sanitized; no atomic pipe output or complete memory erasure is promised. Four standard Writable regressions observed **4 passed / 4 failed** before implementation, then **8 passed / 0 failed / 0 skipped** with `node tests/stone-signature-cli.test.mjs`. These are direct affected tests; previous unaffected groups were not rerun. The additional valid-verification `/dev/full` subprocess case is authored but unrun here (three subprocess cases now total).

Only the redundant `npm run verify:signatures` invocation was removed from `verify:full`. Its exact original 43 tests already ran through `npm test`; the standalone command, subprocess gate and browser gate remain. Counts deduplicate those original repetitions rather than claiming removed coverage. The four new direct regressions bring unique signature direct cases to 47.

Correction verification: syntax and source whitespace/difference review performed without Git commands. No native browser, `/dev/full`, subprocess, broad full suite, separate diagnostic retry, settings, installs, provider or real-key operation ran. Supervisor must rerun `npm run verify:signatures:cli`, `npm run verify:signatures:browser`, and fresh clean builds/full acceptance (`npm run verify:full`) on this corrected source, followed by independent review. Prior candidate passes do not accept this correction.
