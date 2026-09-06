# Rover 3D: first real headless-engine verification

## Environment and scope
Verified 2026-09-06 on Linux x64, Node 22.20.0 and npm 10.9.3, using a genuine clone of this public repository at 54e21c439bb5d10159d8f0ff2782753e25419f50. Commands ran as an unprivileged OS identity, without inherited credentials or supplementary groups, with privilege escalation disabled. This reduces privileges; it is not a hostile-code sandbox. No GitHub Actions, secondary coding agent, paid API, deployment or physical actuator was used. Review was self-review.

## Acquisition and correction
The official @dimforge/rapier3d-compat 0.20.0 package downloaded from the npm registry with lifecycle scripts disabled. The generated version-3 lock was checked against registry metadata, then npm ci verified archive integrity. There are no transitive dependencies; the installed package declares Apache-2.0. Registry integrity matching is not a malware audit or independent provenance-signature verification.

The original loader assumed package.json was beside its resolved entry. The actual release resolves to dist/rapier.cjs while metadata is at the package root. Initial real verification failed at ENGINE_METADATA_INVALID. A nested-entry regression failed (17 pass, 1 fail) before implementation, then passed (18 pass) after bounded ancestry lookup. Lookup stops at the first package boundary and identity/version validation remains mandatory. No physics, course, machine parameter, controller or acceptance threshold was changed.

## Results
- Dependency-lock tests: 11 pass.
- Contract and loader/preflight tests: 59 pass.
- Supervised engine preflight: engine-initialised, exit 0.
- Original actual-engine acceptance tests: 10 pass, no skips or mocked physics.
- Total distinct Node tests: 80 pass, 0 fail, 0 skip.

The engine tests exercise gravity and wheel contact; forward propulsion and braking; steering; ramp elevation; barrier collision; identical action replay on this engine/environment; invalid-action admission; timeout/disposal; and simulation Stop.

## Measured diagnostic sequence
On flat-lane: 180 neutral steps, 120 steps at throttle 0.4, then 30 steps at full brake, all at the fixed 1/60-second timestep. Chassis height settled from 0.800000 to 0.515432 m with all four wheels contacting the ground. The drive phase moved 3.226665 m forward; speed changed from 3.200585 m/s before braking to 0.176554 m/s afterwards.

On ramp-lane: 90 neutral steps followed by up to 600 steps at throttle 0.35. Maximum observed chassis height was 1.202636 m at z=0.795606 m with all four wheel contacts true. Sampled positions show ascent, platform passage and descent before end-barrier contact. This open-loop sequence does not stop at the goal; completion or autonomous navigation is not claimed. These are simulated SI-unit parameters, not measurements from hardware.

## Limits and continuation
This establishes one environment's headless prototype behaviour, not cross-platform determinism, vehicle calibration, learned intelligence, browser/WebGL/CSP readiness or a connected 3D user interface. The ray-cast wheels are an approximate vehicle model. A separate optional goal-stop exploratory command was blocked by the tool and was not executed or counted; it was not retried through another route.

Keep the planar Arena unchanged. Next implement compatible 3D handling Stones, connect the tested host to worker controls and use a reviewed pinned Three.js build for presentation. Verify that complete path in an approved local browser. Keep hosted jobs manual-only while unavailable.
