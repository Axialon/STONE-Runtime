# Rover workbench: integrated 3D reference experience

## Scope
Built and tested on the owner-connected Linux x64 desktop using Node 22.20.0, npm 10.9.3 and sandboxed Google Chrome 148.0.7778.215. Baseline public revision: 40bb3c45db1caf069fa7d6176194c3a70d2c4664. Engineering remained in the conversation; the desktop executed explicit commands. No other coding model, hosted runner, paid API or public application deployment was used. Review was self-review, not independent approval.

## Delivered
- Three explicitly compatible Rover editions: FLOW, DART and ANCHOR, each with identity/version, rule-based implementation, local requirements and a capability passport.
- Shared, engine-free world construction consumed by the Node loader and same-origin browser module worker. Original mass, force limits, machine/course versions, geometry and ten original engine acceptance assertions are unchanged.
- Actual detached wheel suspension/rotation/steering data, 3D body pose, original scene geometry and camera controls using pinned Three.js and OrbitControls.
- Bounded sessions, state-preserving Stone selection, confirmed action recordings, post-termination replay and same-course comparison. Stop terminates the worker; Pause lets the current bounded batch finish. Only confirmed frames enter the recording.
- A local-only HTTP server with an explicit asset allowlist, exact Host/Origin checks, read-only methods, no-store/nosniff headers and restrictive CSP. WebAssembly compilation is allowed, not general JavaScript eval. No private metadata or arbitrary filesystem path is served.
- A responsive instrument-style interface with plan/data fallback, keyboard operation, reduced-motion setting, camera home/follow, comparison and JSON exports. No automatic camera motion before user selection.

## Test-first and failure evidence
New style tests initially reported 11 failures and four admission/trivial passes; all 15 pass after implementation. ANCHOR's initial low torque ceiling stalled on the ramp. Only its policy drive allowance increased; its low cruise target and the shared machine limit did not change. All six style/course goal-stop cases pass.

Two presentation-contract tests failed before extraction and pass afterwards. Session tests failed 12/12 before implementation and pass afterwards. A post-termination replay regression failed before the recording replay entry was added. Six worker-client tests failed before implementation, then passed. HTTP tests started against an unimplemented server. A forged-Host test initially used fetch, which replaces Host; it was corrected to send a real raw HTTP request, without relaxing the guard. A separate malformed-Origin regression failed before exact origin admission was fixed.

The real browser heading test failed against the unimplemented page. The first full browser pass reproduced Stop → replay → comparison failing because a replay-only worker had no live session; independent course-validated comparison fixed it. No false success or fabricated result was substituted.

## Fresh verification
- 139 distinct Node tests pass, zero failures or skips: 39 root checks, 59 contract/preflight checks, ten original physics acceptance checks and 31 new policy/session/presentation/replay checks. The verification command reruns some prerequisite tests; totals here are deduplicated.
- 17 normal-browser checks and five browser fault checks pass: 22 named cases. They navigate through the actual local HTTP server and original module graph, not in-memory source injection.
- Both courses' browser-worker comparison objects exactly equal the Node consumer's outputs on this machine, including trajectories and metrics.
- Actual deliberately infinite worker code in a test-only routed response is stopped without freezing the UI. Reset recovers after the fault route is removed. Missing/malformed workers and an invalid operation fail explicitly.
- Actual WebGL context loss falls back to Plan without changing engine time; Step still works. The test does not turn off browser sandboxing or alter managed policy.
- Runtime external requests are blocked by the test and none are attempted. The normal suite reports no JavaScript or console errors. Desktop and 390/320 px layouts were visually inspected and checked for horizontal document overflow.

## Measured reference outcomes
Both fixed lanes are completed by all three rules with zero chassis-contact starts. Flat-lane completion: FLOW 8.30 s, DART 5.60 s, ANCHOR 12.80 s. Ramp-lane: FLOW 8.85 s, DART 5.816667 s, ANCHOR 14.866667 s. All meet the unchanged goal radius and speed requirement.

The ramp drive-impulse totals are approximately 194.052, 211.457 and 225.136 N·s respectively. ANCHOR is slower but not the lowest-effort controller on the ramp. No universal best-controller or energy-saving claim follows. Peak speed includes vertical settling. Exact values and methodology are in rover-comparison.json and the shared session code.

## Limits
Rule-based control, not a learned policy. Two fixed lanes, not general navigation or collision avoidance. Approximate ray-cast wheels, not a calibrated physical vehicle. Live rendering is not hard-real-time control. Worker deadlines are responsiveness guards, not memory quotas or hostile-code isolation. No third-party executable package import is accepted.

The old planar Arena, other browsers, native mobile touch systems, screen readers and other operating systems were not tested by this increment. Sampling keyboard/reduced motion/layouts is not a full accessibility audit. This work closes the integrated new rover's local HTTP/WASM/worker/WebGL path; it does not silently close separate legacy or cross-platform acceptance items.

Next: a genuinely learned package with declared model/harness/tools, held-out evaluation and comparison against these preserved rules. Extend the task or catalogue only through explicit compatible profiles and useful tested packages.
