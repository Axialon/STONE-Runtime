# Executable drone reference verification

## Accepted result
CINEMA, SURVEY and AGILE now run on an original, simplified Rapier quadrotor reference. Four bounded force fractions drive offset thrust and alternating yaw moments on a dynamic rigid body. Gravity and the resulting translations/rotations are computed by Rapier, not a position animation. Both fixed tasks complete under the same vehicle, goal tolerances and hold duration for every style. The catalogue now labels these particular local rules available rather than planned.

The benchmark API and existing CLI accept drone tasks and include engine, machine and task identities. Digital BENCH/BRIEF use those actual reference runs; cloud/hybrid reporting accepts the fixed drone-summary contract but remains unconfigured and fixture-tested only.

## Test-first evidence
The initial drone scaffold failed all 19 cases before implementation. All then passed, including gravity, equal supporting thrust, asymmetric rotor torque, bounded inputs, six style/task completions, command replay and Stop/disposal. Two additional admission regressions failed before engine identity and extreme-state checks were added; current drone suite: 21 passes.

Six integration cases failed before catalogue/benchmark/cloud-summary integration and passed afterwards. A CLI identity regression failed before its output included machine, task and engine versions. Current integration suite: eight passes, including one synthetic cloud response and two subprocess CLI checks. Historical tests asserting that drones were planned were updated to assert the newly verified availability; no physics success tolerance was relaxed.

## Fresh verification
A clean archive of the explicitly staged source tree was extracted into a separate verification directory. It excluded unfinished Field Lab, generic session and other untracked candidates. Both unchanged lockfiles installed successfully from the existing offline cache with lifecycle scripts disabled. `npm run verify:all` passed with zero failures/skips: 127 root tests, 59 contract/startup tests, ten original rover-engine tests and 31 rover policy/session tests, totalling 227 distinct tests. The command repeats the 59 prerequisites; they are counted once here. This is the prior accepted 198 plus 29 new drone/integration cases.

All 22 existing rover browser cases passed again through normal loopback HTTP, CSP, WebAssembly, module workers and WebGL in sandboxed Chrome. These are rover regressions, not evidence of a new drone browser application. Environment: Linux x64, Node 22.20.0, Chrome 148.0.7778.215. Review was self-review, not independent approval.

## Preserved and unfinished scope
Original rover source, humanoid physics and the dependency graph remain unchanged. The private project's legacy planar suite was not rerun. No learned weights, live cloud provider, paid inference, public application deployment, physical-machine connection, additional coding model or ClawSpan integration is included.

The separate Field Lab UI and shared live-session work remain unfinished. A stop/export replay mismatch was found in the unmerged humanoid-session candidate; that candidate and its failing regression are not shipped or counted as passes. Several other development operations returned a platform safety-status error despite the connector's expanded permissions; they were not rerouted. The drone rendering-proof attempt did not produce an accepted image. Only the independently completed drone reference and integration are accepted here.

The model omits aerodynamic calibration, motor dynamics, battery, wind, obstacle avoidance and actuator certification. Replay agreement is for this tested environment, not a universal cross-platform guarantee. Cloud coverage uses synthetic transports and request limits are not financial or account-wide budgets. Source API reference: https://rapier.rs/docs/user_guides/javascript/rigid_body_forces_and_impulses/ .
