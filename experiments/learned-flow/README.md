# FLOW / Learned — offline reference experiment

This is STONE's first fitted policy artifact: one ml-cart 2.1.1 scalar regression tree learns FLOW throttle-minus-brake demand. It is not a neural network, downloaded pretrained model, general navigator or hardware controller. The existing live Stone registry remains unchanged.

## Use and reproduce
From the repository root, with the existing Rapier installation:

```sh
npm --prefix experiments/learned-flow ci --ignore-scripts --no-audit --no-fund
npm run verify:learned
node experiments/learned-flow/run.mjs --out experiments/learned-flow/artifacts/reproduction-01
```

The result directory must be new or empty. The runner will not overwrite an earlier experiment. It generates all raw episodes, split datasets, model, full paired evaluation and dependency/source provenance. Initial installation needs npm access; training and inference thereafter are local CPU operations. The trained model and compact evidence are already in `model/`; no retraining is required to run saved-model tests.

Load with `loadArtifact(text, expectedSha256)` and execute with `predictAction(model, observation)`. Inputs must satisfy the existing rover observation contract. The caller pins the expected digest; reading a sidecar alone does not authenticate the producer.

## Model versus harness
The four inputs are horizontal goal distance, wrapped heading error, signed forward speed and the forward axis's vertical component. The learned scalar is decoded into either throttle (0..0.48) or brake (0..1), never both. Steering, the existing airborne/close-goal guards and the explicitly frozen out-of-domain brake guard are deterministic. No hidden FLOW longitudinal fallback is used during model inference. No measurement establishes the model's causal advantage over that harness.

`protocol.json` was frozen before fitting. Twenty-four training seeds on both unchanged lanes produce48 training episodes and4021 sampled rows. Eight validation seeds produce16 episodes; twelve untouched test seeds produce24. Seed0 references are reported separately. Validation is diagnostic only; there is one fixed configuration, no selection, reseeding or test-outcome tuning. The original protocol hash remains unchanged. A second complete run reproduced the same model/data bytes and paired action tapes without changing the model specification.

## Scope and limitations
All16 validation,24 test and two separate reference episodes succeeded for the model-plus-harness and baseline on the recorded environment. Every learned episode invoked the regressor; none used the out-of-domain fallback. All42 learned action tapes reexecuted exactly to their recorded final engine state. Save/load prediction and complete-action parity passed on7326 sampled teacher rows. That does not claim fitted/loaded parity on every possible observation.

The test mean total time is8.841 simulated seconds versus9.004 for FLOW; mean final goal distance is0.562m versus0.540m. Different stopping positions and the small fixed-task sample prevent a superiority claim. There are only two unchanged lanes and small warm-up perturbations, not unseen environments, wind, sensors, real vehicles or safety certification. No exact cross-partition state/label or feature/target overlap was found; near-duplicate states and shared course geometry remain possible.

`core-manifest.json` describes the learned artifact in the existing v0.2 format. It can be inspected in Field Lab AUDIT, but metadata compatibility does not install the model. Browser inference, live swapping, model attribution in session recordings and rollout controls remain a separately tested integration task. The accepted Field Lab still contains its rule references.

Original model/data/source remain UNLICENSED; external libraries retain upstream licences. See MODEL_CARD.md and ../../evidence/LEARNED_FLOW_V0_1.md (repository evidence path) for exact checks. No paid API, hosted Actions, physical operation or ClawSpan integration is involved.
