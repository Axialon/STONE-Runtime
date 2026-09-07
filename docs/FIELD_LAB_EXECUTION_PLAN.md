# Field Lab execution plan
Goal: complete the approved simulated drone and live humanoid/digital experience. Keep the original rover intact.
Architecture: four bounded rotor thrust inputs drive a Rapier quadrotor. Reuse the anchored arm. Shared recorded sessions and same-origin workers own actual physics state; Three.js renders detached poses. Local digital reports run existing tools. Cloud is absent by default and only its readiness is exposed; no live paid endpoint is activated.
- [ ] Drone tests: gravity, hover, torque, invalid actions, two tasks/three policies, replay, disposal.
- [ ] Shared drone/humanoid sessions: compatibility, same-state swaps, bounded batches, comparison and replay.
- [ ] Field Lab UI: select host/Stone, run/pause/step/stop, camera, replay, passports, local reports and explicit cloud status.
- [ ] Actual HTTP/CSP/WASM/worker/WebGL tests, faults, narrow layouts, exports, full rover regression.
- [ ] Review, integrity, public merge, private component pin, Drive handoff and local preview.
No new dependency graph, second coding agent, automatic Actions, deployment or spending. Simplified simulation, not calibrated physical-machine control. Humanoid remains anchored two-joint reaching. Rules and summaries are not trained models. User approved these execution attempts; tool security approvals remain external and policies are not altered.
