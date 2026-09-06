# STONE-Runtime
Public Stone Repo

**Interchangeable expertise for machines and digital systems.**

This repository starts with a deliberately small public verification snapshot: the experimental three-dimensional rover contract, Rapier adapter, and tests. It is not a mirror of the project's development archive. The browser Arena and other platform components are not included in this first snapshot.

## Status
Actual headless Rapier 0.20.0 execution is verified on Linux x64 / Node 22.20.0. All ten original physics acceptance tests pass after correcting package metadata lookup for the published dist/ layout. The real dependency lock is committed. See evidence/ROVER3D_HEADLESS_V0_1.md for measurements, test-first regression evidence and limitations.

This is still a prototype, not a calibrated vehicle, trained Stone, browser integration or physical-machine safety certification. The existing browser Arena is outside this public snapshot. Hosted Actions is not the verified execution route; automatic triggers are disabled to avoid retrying unavailable infrastructure.

## Local verification
Use Node.js 22 or later. From the repository root:

```sh
npm test
node scripts/verify-lock.mjs
cd experiments/rover3d
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
```

The dependency-free checks run without Rapier. The engine stage requires the exact official `@dimforge/rapier3d-compat@0.20.0` package. Missing or mismatched engines fail; no replacement physics or skipped-pass result is used. The committed package-lock.json pins the acquired archive integrity; subsequent installations use `npm ci`. Do not silently regenerate the lock during a test run.

## Public verification boundary
The workflow uses a single standard Linux runner, read-only repository access and a ten-minute timeout. It has no schedules, cache, artifact uploads, deployment, private-source checkout or additional credentials. It is manual-only; no push or schedule starts it. Do not dispatch it while hosted execution is unavailable. Current evidence comes from explicit local execution, not an Actions pass. There is no publicly hosted application.

`snapshot.json` identifies the included original source by content hashes. Public testing changes are reviewed independently; matching source changes are reconciled with the development project before integration. Synthetic loader fixtures test diagnostics only, never vehicle physics.

## Licence status
STONE's original code retains its existing `UNLICENSED` status; publishing this snapshot does not select a new open-source licence. The external Rapier dependency identifies its licence as Apache-2.0 and retains its own upstream notices when installed. No dependency source or font files are bundled here.
