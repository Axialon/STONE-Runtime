# STONE-Runtime
Public Stone Repo

**Interchangeable expertise for machines and digital systems.**

## Current reference capabilities
| Family | Working capability | Boundary |
| --- | --- | --- |
| Rover | Interactive Three.js/Rapier workbench, three rules, swaps, replay and comparisons | Two fixed lanes; not calibrated hardware |
| Drone | Real rigid-body simulation, CINEMA/SURVEY/AGILE rules, two tasks, benchmark and action-replay checks | Headless API/CLI; no live drone UI or aircraft interface |
| Humanoid | Anchored two-joint arm, three rules, two reach tasks and sampled pose benchmarking | No walking, full-body balance or grasping; no live arm UI yet |
| Digital | BENCH/BRIEF local reference tools; explicit HYBRID local-only fallback | Deterministic summaries, not trained inference |
| Cloud | Opt-in report adapter with bounded input/output and consent | Fixture-tested, unconfigured; no live provider validation |

The thirteen Lab passports distinguish execution, host and availability. They are a narrow reference contract, not the complete ecosystem manifest. A compatible description is not hardware certification. ClawSpan integration and trained-policy development remain separate work.

## Run locally
Use Node.js 22 or later. From the repository root:

```sh
npm --prefix experiments/rover3d ci --ignore-scripts --no-audit --no-fund
npm --prefix apps/rover ci --ignore-scripts --no-audit --no-fund
npm run rover
```

The existing rover opens at the loopback address printed by the server, normally `http://127.0.0.1:4173/`. Stop with Ctrl+C. After dependency acquisition it requests only local assets. Its rendered body, wheels, suspension and steering come from the same tested Rapier state. Space runs/pauses, 1–3 selects a Stone, Escape stops. Plan and numerical views remain available.
## Drone and Digital Stone commands
```sh
npm run lab -- list
npm run lab -- benchmark drone hover
npm run lab -- benchmark drone inspection
npm run lab -- digital digital.brief drone inspection
npm run lab -- digital digital.hybrid drone hover --local-fallback
npm run lab -- cloud-status
```
The drone is an original, simplified reference vehicle with four bounded rotor-force commands. No hardware connection or flight-ready controller is supplied. BENCH/BRIEF return real benchmark measurements and deterministic text with `model: null`. A HYBRID fallback is explicitly labelled local-only, not a cloud success. See `docs/DRONE_REFERENCE.md` and `docs/LAB_REFERENCE.md`.

## Verification
```sh
npm run verify:all
npm run verify:browser
```
The browser suite remains the existing rover regression and uses an installed sandbox-capable Google Chrome. It does not claim a new drone or humanoid browser UI. `CHROME_PATH` configures the normal suite; the fault suite targets `/usr/bin/google-chrome`. Browser security policies and sandboxing are not disabled.

Current evidence is in `evidence/DRONE_REFERENCE_V0_1.md`. Earlier rover and arm evidence records remain historical snapshots. Missing dependencies fail verification. Replay agreement is established on the recorded test environment, not guaranteed across every platform.

## Boundaries
This public component excludes private project history, coordination records and credentials. The private project consumes an exact accepted commit. The original planar Arena is separate and unchanged. Hosted verification remains manual-only while the account is blocked; no schedules, automatic deployment or paid services are enabled.

Cloud activation requires separate provider, credentials, data and funding approval. Per-process request counters are not monetary or account-wide caps. The unfinished Field Lab browser and shared live-session candidates are not part of this accepted runtime.

Original STONE source remains `UNLICENSED` pending an explicit licence decision. Existing upstream libraries retain their terms; see `THIRD_PARTY.md`. No font files or copied third-party demo artwork are bundled.
