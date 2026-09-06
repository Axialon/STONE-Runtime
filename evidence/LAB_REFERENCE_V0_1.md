# Humanoid and digital Lab reference verification

## Accepted scope
Built from public runtime a8471b1ba913a563fb5f2933097d7e426321886b in an isolated worktree. Test environment: Linux x64, Node 22.20.0, npm 10.9.3 and sandboxed Chrome 148.0.7778.215. Existing Rapier 0.20.0, Three.js 0.184.0 and Playwright-core 1.58.2 were reused without a new dependency graph. Commands used reduced privileges and a scoped environment. Self-review only; no second coding model or hosted execution.

Delivered: experimental availability-aware catalogue, anchored humanoid upper-limb physics, three rule policies, fixed benchmarking with sampled pose data, local digital BENCH/BRIEF, opt-in cloud report client, explicit HYBRID local-only fallback and CLI. A render-only proof consumes an actual recorded arm pose. It is not a new interactive humanoid UI.

## Test-first evidence
- Catalogue started at 6 failures/1 admission pass; current 9 tests pass, including an offline-availability regression that initially failed for planned drone entries.
- Humanoid started with 16 failed unimplemented behaviours. First engine implementation had six task-completion failures due to motor gravity response. A one-joint isolation test distinguished free-space and gravity loading. Selecting Rapier's ForceBased motor model corrected the prototype; no reaching thresholds were loosened. All six style/task combinations complete. A further out-of-plane/machine-identity regression failed before input admission was tightened. Current humanoid suite: 17 passes.
- Cloud client: 8 failures/5 configuration-rejection passes before implementation. Current 16 fixture tests pass, covering consent, bounded attempts, timeouts, response size/schema, rejected tool output, invalid configuration, secret-echo redaction and concurrent requests. These are synthetic transports, not live model/provider execution.
- Fixed benchmarking: 6 failures/2 rejection passes before implementation; all eight cases pass. They preserve measured failed states, original rover outcomes and honest hybrid fallback.
- CLI: 5 failures/4 rejection passes before implementation; all nine cases pass.

## Regression and rendering
198 distinct Node tests pass with zero failures/skips: the prior 139 plus 59 new cases. The full verification command repeats some prerequisites; repeated tests are not double-counted. All 22 existing rover browser cases pass through normal HTTP/CSP/module-workers/WASM/WebGL. These are rover regression tests, not a new multi-host UI acceptance claim.

The render-only proof performed 22 Three.js draw calls using actual arm sample tick 332 from the FLUID/high-reach benchmark. The rest of the humanoid silhouette is illustrative fixed geometry. Generated pose JSON and image live in ignored evidence/lab-proof. Browser automation did not disable sandboxing. This proof does not establish live humanoid swaps, replay controls or a new server gateway.

## Measured outcomes
Each task has three tip targets with unchanged 0.04 m positional tolerance, 0.12 m/s velocity tolerance and 48-tick hold at 120 Hz. All three policies share the arm geometry, masses, joints and motor parameters; only target-angle slew rates differ.

| Style | reach completion | high-reach completion |
| --- | ---: | ---: |
| FLUID | 3.191667 s | 4.291667 s |
| PRECISE | 4.375000 s | 6.425000 s |
| BRISK | 2.550000 s | 3.058333 s |

Exact observed values and path lengths are in humanoid-reference-results.json. These are fixed simulated task results, not measured hardware performance, a universal quality ranking or learned intelligence.

## Explicitly incomplete scope
Drone physics/policies remain unimplemented. Their passports are planned with offline capability not-implemented. A general uploaded-record audit, live humanoid session manager and combined Field Lab HTTP gateway are also not included. Their implementation operations were blocked before execution; stubs and red-test preparations were kept outside product scope. No denial was bypassed, no placeholder was substituted for physics, and those deferred tests are not counted as passes or shipped as accepted implementation.

Cloud/hybrid adapters have controlled fixture coverage only. No live provider, paid call, API credentials, hosted inference, financial cap guarantee or provider-weight verification is claimed. Endpoint configuration and consent still require review; per-instance request limits are not account-wide spending controls. The local digital packages use deterministic benchmark tools, not trained models.

The original rover implementation is unchanged. No full private-project test run, cross-platform/native-mobile/accessibility audit, walking/balance/grasping, calibrated actuator or physical safety claim. No marketplace integration, public application deployment, system account changes, private-history publication or new spending.
