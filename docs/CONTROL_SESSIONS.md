# Recorded control sessions v0.2

A shared session implementation now wraps the reviewed drone and anchored humanoid hosts. Their physics, controllers and task thresholds are unchanged. The session API supports read, select, advance, export, stop and dispose. Batches contain 1 through 24 actual physics ticks; changing the selected Stone changes neither pose, momentum nor time.

Use createDroneSession/replayDroneSession from packages/lab/drone-session.mjs, or createHumanoidSession/replayHumanoidSession from packages/lab/humanoid-session.mjs. Both use packages/lab/control-session.mjs. These are built-in adapters, not arbitrary package loading.

## Recording semantics
The host-specific format version is 0.2. Recordings contain engine, machine and task versions, initial and final selected Stone, the action tape, per-action attribution and finalStatus. Explicit Stop is a lifecycle event: replay reconstructs all actions then applies the recorded Stop without adding a physics tick. A forged natural success is rejected if the engine does not reach it. Stopped state and complete natural-success state both survive save and replay.

The returned replay frames describe which Stone produced each action. A selection after the last action does not repaint that attribution; replay.state separately records the final selected Stone. Exports are immutable detached data. JSON size, action count, action ranges, task identities and host compatibility are checked before replay. Recordings extending beyond a natural terminal condition are rejected.

This is reproducibility of supplied commands, not authentication of who produced them. No model performance or hardware safety is certified. Stop freezes simulated progression; worker termination is a separate UI responsibility. Exact replay was tested on Linux x64, Node 22.20.0 and Rapier 0.20.0; no cross-platform guarantee is implied.

## Evidence and integration boundary
The pre-existing session regression reproduced 12 failures: eleven missing drone-session cases plus the explicit humanoid Stop/export mismatch. After implementing the shared lifecycle, all 23 existing candidate-session tests pass. Ten further edge cases cover zero-action Stop, final selection, false success, incompatible identities, bounded recordings and full completion. This is 33 new passing Node tests over the accepted 227-test component.

The integrated browser candidate is separate from this accepted API change. Its first 17 interaction checks and seven fault checks passed in real sandboxed Chrome. A subsequently added presentation check fails because the drone tab still uses a reach-specific comparison label and its module cards are not yet visually distinct. The attempted polish operation returned an indeterminate platform safety-status error twice (one unchanged retry); it did not execute. The failing browser test is retained, not removed to obtain a green result. Do not count the candidate as accepted or the current browser suite as fully passing.

The main rover remains unchanged. No new dependency, cloud activation, physical-machine connection, public deployment, hosted workflow or separate coding agent is introduced. Review is self-review. The owner-requested ClawSpan integration remains deferred.
