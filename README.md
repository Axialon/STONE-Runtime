# STONE-Runtime
Public Stone Repo

**Interchangeable expertise for machines and digital systems.**

This repository starts with a deliberately small public verification snapshot: the experimental three-dimensional rover contract, Rapier adapter, and tests. It is not a mirror of the project's development archive. The browser Arena and other platform components are not included in this first snapshot.

## Status
The rover adapter is experimental. Passing data-contract tests is not evidence of working vehicle dynamics. See the **Rover verification** workflow for the exact tested public commit and real-engine outcome. No claim of calibrated vehicle handling, trained intelligence, browser readiness, or physical-machine safety is made.

## Local verification
Use Node.js 22 or later. From the repository root:

```sh
npm test
cd experiments/rover3d
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
cd ../..
node scripts/verify-lock.mjs
cd experiments/rover3d
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
```

The dependency-free checks run without Rapier. The engine stage requires the exact official `@dimforge/rapier3d-compat@0.20.0` package. Missing or mismatched engines fail; no replacement physics or skipped-pass result is used. After the first verified acquisition, the real generated lockfile should be checked in and subsequent installs use `npm ci`.

## Public verification boundary
The workflow uses a single standard Linux runner, read-only repository access and a ten-minute timeout. It has no schedules, cache, artifact uploads, deployment, private-source checkout or additional credentials. It runs on main changes in the selected code paths and can be started manually. Detailed results remain in Actions logs and the job summary. There is no publicly hosted application.

`snapshot.json` identifies the included original source by content hashes. Public testing changes are reviewed independently; matching source changes are reconciled with the development project before integration. Synthetic loader fixtures test diagnostics only, never vehicle physics.

## Licence status
STONE's original code retains its existing `UNLICENSED` status; publishing this snapshot does not select a new open-source licence. The external Rapier dependency identifies its licence as Apache-2.0 and retains its own upstream notices when installed. No dependency source or font files are bundled here.
