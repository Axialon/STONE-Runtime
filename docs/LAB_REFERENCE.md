# STONE Lab reference packages

This increment is a Node API/CLI for an anchored humanoid arm and digital benchmark tools. The existing interactive rover remains unchanged. It is not the complete multi-host browser platform.

## Available commands
After installing the existing pinned rover dependencies, from the repository root:

```sh
node scripts/lab.mjs list
node scripts/lab.mjs benchmark humanoid reach
node scripts/lab.mjs benchmark humanoid high-reach
node scripts/lab.mjs digital digital.compare humanoid reach
node scripts/lab.mjs digital digital.brief rover flat-lane
node scripts/lab.mjs cloud-status
node scripts/lab.mjs digital digital.hybrid humanoid reach --local-fallback
```

The last command explicitly accepts a local-only result when no provider is configured. Its output declares `execution: hybrid`, `actualExecution: local-only`, `model: null` and `cloud.status: not-configured`. It is not evidence of a cloud call.

## Package contract and availability
`packages/lab/registry.mjs` describes thirteen experimental Lab passports. These are a narrow reference contract, not a substitute for the broader STONE manifest standard. Each declares host/profile, version, execution, implementation/model, harness, tools, offline behaviour and limits. `compatible` compares declared host/execution identity only; it does not assert installed implementation or availability.

Rover and humanoid rules, BENCH and BRIEF are available. ANALYST and HYBRID require cloud configuration for their remote stage. CINEMA/SURVEY/AGILE drone entries are planned: no drone engine or controller is installed, and benchmark execution rejects that host. Metadata is not a capability test.

## Humanoid scope
The simulated mechanism has an anchored shoulder, two dynamic arm segments and revolute joints. Three deterministic inverse-kinematics policies vary the target-angle slew rate, not machine limits. Force-based spring motors use identical parameters for every policy. Targets are in a fixed plane. Reach completion requires each of three tip targets to be within 0.04 simulated metres and below 0.12 m/s for 48 ticks at 120 Hz.

This is not locomotion, balance, grasping, collision avoidance, torque-budget certification or hardware calibration. The full humanoid silhouette in the proof image is illustrative fixed geometry; only the active arm pose is supplied by the tested physics. Stop freezes simulation progression and is not a physical emergency-stop system.

## Fixed digital tools
`benchmark(R, host, task)` runs only reviewed rover or humanoid reference tasks. It retains failed statuses instead of manufacturing successful scores. Humanoid results include sampled physical pose recordings, not a general replay/session protocol. `digitalBenchmark` packages the measurements and a deterministic text summary. BENCH and BRIEF have `model: null` and no trained weights.

## Cloud integration boundary
`createCloudClient` in `packages/lab/cloud.mjs` is a server-side/Node adapter for a compatible chat-completions endpoint. Nothing is configured or called on import. The CLI consults `STONE_CLOUD_CONFIG` only for explicit cloud operations/status. No browser form collects credentials and no HTTP gateway is included.

An operator-reviewed configuration must supply the exact HTTPS `endpoint`, requested `model`, private `token`, `approved: true`, and `maxRequests` in 1–20. Keep credentials outside tracked files, command history and published logs. Do not activate until the provider, data policy and funding limits are approved. The approval flag is a local configuration gate, not an externally enforced permission system. Request counters apply to one client instance/process and are NOT a financial or account-wide budget cap.

An actual remote run additionally requires `--consent`. Only a bounded summary of the fixed benchmark is sent; not source files, raw poses, Drive data or arbitrary user instructions. The adapter uses no tools, follows no redirects, caps output at 512 requested tokens and 64 KiB response bytes, and applies a deadline. It accepts only a small JSON report, redacts literal credential echoes and returns fixed errors rather than provider bodies. Returned text is untrusted analysis, never executable commands.

The configured endpoint is trusted operator input. The hostname checks are not network sandboxing or DNS-based SSRF protection. The returned `model` is the requested identifier, not independent verification of provider weights. Fixture tests establish adapter behaviour only; provider compatibility, inference quality, latency, billing and retention have not been validated live.

## Reproduce evidence
`npm run verify:all` includes the new Node tests and the unchanged rover checks. `npm run verify:browser` is the existing rover browser regression, not a humanoid-UI claim. `node scripts/render-lab-proof.mjs` uses existing sandboxed Chrome and Three.js to render one recorded humanoid pose; generated files stay in ignored `evidence/lab-proof/`.

No ClawSpan changes, paid inference, public app deployment or additional coding agent are part of this increment.
