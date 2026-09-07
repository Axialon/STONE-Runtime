# Field Lab execution plan
Goal: complete the approved simulated drone and live humanoid/digital experience while preserving the rover.
Architecture: the existing Rapier hosts and versioned control sessions run in same-origin workers. Three.js consumes actual poses. Core manifest v0.2 extends the original metadata shape. AUDIT accepts bounded JSON, not executable plugins. Cloud remains unconfigured; no live paid endpoint is activated.
- [x] Drone host: gravity, hover, torque, invalid actions, two tasks/three policies, replay, disposal.
- [x] Shared drone/humanoid sessions: compatibility, state-preserving swaps, bounded batches, Stop and replay.
- [x] Field Lab: host/Stone/task selection, run/pause/step/stop, camera Focus/Home, replay, passports, local reports and explicit cloud configuration status.
- [x] Preserve the presentation regression; fix host labels, colour/silhouette identities, obsolete claims and accessibility labels.
- [x] Core v0.2 metadata export/admission and AUDIT native-file evidence inspection, without code loading or provider calls.
- [x] Actual normal HTTP/CSP/WASM/worker/WebGL browser cases, faults, narrow layouts, imports/exports and rover regression.
- [ ] Complete exact-source integrity review, accepted merge, private pin, Drive handoff and restart the local preview.
No new dependency graph, other coding agent, automatic Actions, public deployment or spending. Simplified simulation, not physical-machine control. Arm remains anchored two-joint reaching. Rules and deterministic reports are not trained models.
