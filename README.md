# STONE-Runtime
Public Stone Repo

**Interchangeable expertise for machines and digital systems.**

## New reference SDK: humanoid and digital Stones
The component now includes an actual anchored two-joint arm benchmark, three rule-based reach styles, local digital BENCH/BRIEF packages, and a configured-provider cloud/hybrid report adapter. No live cloud provider has been called; drone entries remain planned. Run `npm run lab -- list` or read `docs/LAB_REFERENCE.md`. This is backend/CLI expansion, not a new combined browser release. The existing rover below is preserved.

## Rover proving ground
A local, working 3D STONE reference experience. Select FLOW, DART or ANCHOR Rover, run either fixed course, change the controller without replacing the machine, stop, inspect recorded frames and verify an engine replay. Compare measured trade-offs under identical hardware limits. Export the recording, comparison and capability passport as JSON.

The rover uses the actual Rapier 0.20.0 physics engine. Three.js r184 renders its body pose, suspension, steering and wheel rotation. The Plan view and numerical values remain available when graphics fail. Controls: Space run/pause, 1–3 select a Stone, Escape stop. Camera orbit/zoom and the Rover follow view never control the vehicle.

These three first-party Stones are **rule-based prototypes**, not trained models, universal obstacle-avoidance systems or hardware-calibrated controllers. The two fixed lanes are a reference task, not proof of broad robot competence. No cloud service, API key, public hosting or second AI agent is involved in the running application.

## Start locally
Use Node.js 22 or later. From the repository root:

```sh
npm --prefix experiments/rover3d ci --ignore-scripts --no-audit --no-fund
npm --prefix apps/rover ci --ignore-scripts --no-audit --no-fund
npm run rover
```

Open the loopback address printed by the server, normally `http://127.0.0.1:4173/`. Stop with Ctrl+C. The runtime requests only its own local assets; internet is needed for the initial dependency acquisition, not the experience. Use the committed locks. No install lifecycle scripts are needed.

## Verify and compare
```sh
npm run verify:all
npm run verify:browser
npm run compare
```

The browser suite uses an existing sandbox-capable Google Chrome installation. Set `CHROME_PATH` for the main browser suite when necessary; the fault suite currently targets `/usr/bin/google-chrome`. No browser security policy or sandbox is disabled by these tests. Evidence names the tested environment and limits.

See `evidence/ROVER_WORKBENCH_V0_1.md` for current results and `evidence/rover-comparison.json` for the measured reference runs. Missing dependencies fail verification; no substitute physics or skipped-pass result is used. Headless and browser comparison outputs agree exactly on the tested Linux/Node/Chrome environment. This is not a cross-platform determinism guarantee.

## Boundaries
This public repository contains reviewed runtime source and evidence, not internal coordination documents or private Git history. `snapshot.json` records selected source hashes. The planar Arena is a separate unchanged reference application. Hosted verification is manual-only and must not be retried while unavailable. No schedules, paid runners, deployment credentials, automatic publication or public application deployment are enabled.

Original STONE code remains `UNLICENSED` pending an explicit licence decision. Upstream libraries keep their own terms; see `THIRD_PARTY.md`. No font files, copied demo art or external models are bundled.
