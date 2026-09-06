# Rover Workbench delivery plan

Goal: a usable local 3D STONE experience on the fixed Rapier machine, without another coding model or hosted execution.
Approved scope: compatible handling Stones, independent worker, Three.js presentation, repeatable comparison and browser verification. Retain the planar application unchanged. No public app deployment or paid resources.

Architecture: shared engine-free host construction with separate Node/browser loaders. Rule controllers consume only the versioned observation. A worker owns the world and processes bounded requests; Stop terminates it. The renderer consumes detached body/wheel/course state. UI: install/swap, pause, step, stop, replay, comparison, passport and data export.

- [x] Tests first: three policies, same limits, both courses and goal braking.
- [x] Shared host constructor, detached wheel display data, repeatable bounded sessions.
- [x] Pinned Three.js 0.184.0 and Playwright-core 1.58.2, reviewed locks and notices. No runtime CDN or package scripts.
- [x] Worker lifecycle and localhost server with explicit asset allowlist, CSP and Host/Origin checks.
- [x] Instrument-style 3D workbench, plan/data fallback, keyboard and reduced-motion controls.
- [x] Actual HTTP/browser/WASM/worker/WebGL tests in a sandboxed browser, adverse-path checks and images.
- [x] Review, reconcile source, merge verified increments and update evidence.

Rule controllers are not learned models. Rendering uses actual engine state. No calibration, collision avoidance or cross-platform guarantees.
