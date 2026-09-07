# Field Lab development candidate

## Usable local preview, not accepted release
The new browser workbench starts actual Rapier drone and anchored-arm simulations through same-origin workers. It has host/package selection, run/pause/step/Stop, state-preserving swaps, command replay verified against acknowledged frames, comparisons, camera/Plan fallback, keyboard operation, passports and data downloads. BENCH/BRIEF run local reference tools for drone, arm and rover tasks. Cloud remains unavailable in this browser; HYBRID requires explicit local-only fallback. The original rover is a separate linked local application, not silently replaced.

Run node apps/field-lab/server.mjs from this branch after installing the unchanged pinned dependencies. It serves only loopback assets on port 4174. The server is GET/HEAD-only with an allowlist and CSP; cloud adapter source, credentials, private files and arbitrary endpoints are not served. A local preview is not public deployment.

## Current verification
The candidate's 269 distinct Node tests pass: the accepted 260 including 33 new shared-session cases, plus nine static-server checks. All 22 existing rover browser regressions pass for the accepted session tree. The initial complete Field Lab interaction suite passed 17 cases through normal HTTP, module workers, WebAssembly and WebGL in sandboxed Chrome. Seven additional fault tests pass: real stalled-worker Stop/recovery, missing worker, malformed batch, actual WebGL context loss, digital cancellation, invalid operation/cross-host selection and automatic deadline.

After that success, a new presentation regression was added and fails. The drone tab's comparison button still says Compare reach styles, and the cards use one colour/shape rather than differentiated identities. The current normal browser suite stops at this new check after eight passing cases. The remaining earlier functionality checks passed in the preceding full run, not in the latest stopped run. Do not call the entire candidate suite green or merge this branch as accepted.

The attempted combined label/card/camera polish operation did not execute: the tool returned an indeterminate safety-status error, including on one identical retry. No alternative tool or encoded route was used for that change. The failing check is retained. Camera framing also remains a design-polish item. No change to machine limits, simulated goals or test tolerances was made to pass the existing functional checks.

## Limits
The three drone policies are simplified rule references, not flight-ready controllers; the humanoid is anchored two-joint reaching, not locomotion, balance or grasping. The body silhouette other than the active arm is illustrative. Digital reports use deterministic tools, not trained model weights. No cloud provider, external inference, spending, new dependency, physical actuator, public hosting or ClawSpan integration was used. Review was self-review. Native mobile, other browsers and a complete accessibility audit remain open.

Accepted session semantics are documented in CONTROL_SESSIONS.md. Keep its API merge separate from this candidate's presentation acceptance. Complete the narrowly identified interface polish through permitted execution, then rerun the full normal and fault browser suites before merging and advancing the private component pin.
