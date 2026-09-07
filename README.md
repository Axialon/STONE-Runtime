# STONE-Runtime

**Interchangeable expertise for machines and digital systems.**

## Field Lab
One local workbench now runs the real Rapier drone and anchored-arm references with distinct Stone identities, task selection, state-preserving swaps, run/pause/step/Stop, verified command replay, comparisons, camera Home/Focus, Plan fallback, capability passports and core manifest exports. The original rover remains a separately linked workbench, with its physics and rules preserved.

Digital BENCH and BRIEF run fixed reference benchmarks for all three machine families. New AUDIT accepts a user-selected core manifest or saved drone/arm recording and returns local validation, compatibility, source-byte SHA-256 and, for supported recordings, actual engine reexecution. Imports do not install code or enable services.

ANALYST and HYBRID are labelled configuration-required. No cloud provider is configured or called by this workbench. HYBRID needs explicit consent to return a local-only result. These current implementations are deterministic rules/tools, not trained-model intelligence. There are fourteen Lab passports, including twelve executable local references.

## Start locally
Use Node.js 22 or later. From the repository root:

```sh
npm --prefix experiments/rover3d ci --ignore-scripts --no-audit --no-fund
npm --prefix apps/rover ci --ignore-scripts --no-audit --no-fund
npm run field
```

Open the loopback address printed by the server, normally `http://127.0.0.1:4174/`. To run the original rover as well, use `npm run rover` in a second terminal; its normal address is `http://127.0.0.1:4173/`. Stop each server with Ctrl+C. No public hosting or API account is required. Initial dependency acquisition needs network access; the installed workbenches use local assets only.

Space runs/pauses, 1–3 select a Stone, and Escape stops when focus is outside a native form control. Camera controls never command the machine. Reduced-motion handling, numerical readings and Plan fallback remain available.

## Inspect saved evidence
Choose Digital > AUDIT and select a UTF-8 JSON file. Core manifests use schema 0.1.0 or 0.2.0; supported recording formats are stone.drone.session/0.2 and stone.humanoid.session/0.2. File size is bounded to 2 MiB; manifests retain the stricter 64 KiB parser bound. Inspection separates valid from compatible and from authenticated/installed. SHA-256 identifies bytes, not trust. See `docs/EVIDENCE_INSPECTION.md`.

Export core manifest is available for reviewed local Stones. It uses the original contract shape, explicitly versioned to v0.2 for multiple hosts and exact machine/engine identities. Unconfigured cloud cards do not fabricate model references. `docs/CORE_MANIFEST.md` describes admission rules and what is still not implemented.

## Verify and use the CLI
```sh
npm run verify:all
npm run verify:field
npm run verify:browser
npm run lab -- benchmark drone inspection
npm run lab -- digital digital.brief humanoid reach
npm run lab -- digital digital.hybrid drone hover --local-fallback
```

`verify:field` includes normal controls, failure handling and file inspection. `verify:browser` preserves the separate rover regression. Tests use an installed sandbox-capable Chrome; `CHROME_PATH` can override the normal/Field Lab executable, while the historical rover fault suite targets `/usr/bin/google-chrome`. No sandbox/security-policy weakening is required. AUDIT is exposed through the browser and module API, not the fixed-benchmark CLI.

## Scope and evidence
Rapier 0.20.0 advances all simulation dynamics; Three.js r184 displays their state. Drone motion uses a simplified rigid-body quadrotor, not calibrated aerodynamics or a real aircraft interface. Humanoid means anchored two-joint reaching, not walking, balance or grasping. Fixed targets and benchmark successes are not general robotics competence or physical-safety certification.

Current milestone evidence is `evidence/FIELD_LAB_V0_1.md`. Earlier evidence files are historical snapshots. Replay agreement is established on the recorded environment, not every platform. Resource declarations are provisional admission requests, not measured performance or enforced memory/timing quotas. Publisher trust, executable third-party loading, trained weights, live cloud acceptance and marketplace integration remain separate work.

This public component contains reviewed runtime source, not private project history, Drive records or credentials. The private project pins an exact accepted revision. Hosted Actions remain manual-only while unavailable; no schedules, paid inference or automatic/public application deployment are enabled. Original STONE code remains `UNLICENSED` pending an explicit licence choice. Preserve existing upstream terms in `THIRD_PARTY.md`; no font files or copied demo artwork are bundled.

## First fitted policy: FLOW / Learned

The optional `experiments/learned-flow` component includes a genuinely fitted local CART policy, frozen training/evaluation protocol, saved model and compact evidence. It learns FLOW longitudinal commands; steering and guards remain deterministic. It completed16 validation and24 held-out test episodes on the preserved lanes; this does not establish general navigation or superiority. See its README and MODEL_CARD.md.

Install its separately locked dependency graph with lifecycle scripts disabled, then run `npm run verify:learned`. Reproduction is an explicit CLI operation. Browser registries remain unchanged: AUDIT can inspect its core manifest, but live inference/swapping remains a separate integration gate.

## Interactive Route Studio

Run `npm start` to open both local workbenches, then enter Field Lab at `http://127.0.0.1:4174/#drone`. Navigation to Rover, Drone, Humanoid and Digital is present in both apps. Open Route Studio to click/drag nodes, edit coordinates, reorder checkpoints or import/export a bounded local route file. Apply explicitly resets the run; drafting never teleports the active machine. Custom comparisons retain their exact route and are labelled separately from fixed benchmarks. Digital AUDIT reexecutes the new versioned custom-route recordings. See docs/CUSTOM_ROUTES.md for bounds, supported formats and limitations.

Verify the new browser flows with `npm run verify:routes`. Existing fixed benchmark and learned-model regression commands remain available. No trained policy is silently certified for user routes.

## Live learned-mode Rover and model-aware AUDIT

The saved FLOW model now runs locally in the browser. Prepare the optional pinned model/build dependencies and run `npm run build:models`, then `npm start`. In Rover, enable **Explore a learned Stone**; this resets into a four-package fixed-lane session with state-preserving subsequent rule/model swaps. The actual model identity, inference counts and deterministic guards are visible. Model-aware recordings are verified through both policy recomputation and engine replay, including in Digital AUDIT. Default rules, Route Studio and navigation stay available. Custom-route application and learned mode are deliberately separate; the fitted policy was not trained or evaluated for arbitrary routes.

See docs/LIVE_MODEL_STONES.md for commands, formats, setup and limitations. The model artifact/protocol is unchanged and is never retrained by browser startup. Old offline experiment documents/evidence describe their historical evaluation; current UI availability is recorded here and in the live-model guide. No live provider or paid inference is activated.
