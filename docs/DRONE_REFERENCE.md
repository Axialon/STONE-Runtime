# Drone reference v0.1

This component now supports a headless simulated quadrotor, alongside the preserved rover and anchored-arm references. It does not add a live drone browser interface or physical aircraft support.

## Model and task boundary
Rapier 0.20.0 advances one dynamic rigid body with gravity, ground contact, linear/angular damping, four offset thrust forces and a simplified alternating yaw moment. The machine is fixed at 1.4 simulated kg, four 9 N maximum rotor forces, 0.23 m arm offsets and a 120 Hz timestep. No controller can replace those parameters through its action input. There is no aerodynamic calibration, motor lag, battery model, wind model, obstacle avoidance, radio, hardware driver or flight certification.

CINEMA, SURVEY and AGILE are deterministic reference rules with different commanded speed/acceleration targets. They are not trained policies. The tasks are a fixed hover target and a fixed four-waypoint inspection sequence. Completion requires position error below 0.18 simulated metres and speed below 0.24 m/s for 36 ticks per target. All three use identical task and vehicle parameters. A run terminates after 7,200 steps or on invalid actions/out-of-bounds state. Stop freezes this simulator; it is not a real emergency-stop system.

## Commands
After the existing locked Rapier dependency is installed, from the runtime root:

```sh
node scripts/lab.mjs benchmark drone hover
node scripts/lab.mjs benchmark drone inspection
node scripts/lab.mjs digital digital.brief drone inspection
node scripts/lab.mjs digital digital.hybrid drone hover --local-fallback
```

The CLI emits engine, machine and task versions. BENCH and BRIEF run local simulation tools and produce deterministic summaries with `model: null`. Explicit HYBRID fallback reports `actualExecution: local-only`. The cloud adapter accepts a bounded fixed drone-benchmark summary, but is unconfigured by default and has only fixture coverage. No live cloud inference occurred.

Recordings returned by the benchmark API are sampled engine states, not a completed live-session API. Source action replay is tested by re-executing the same rotor commands in a new world. Drone/humanoid cross-host installation is rejected by their controller contracts. Metadata compatibility alone is not certification.

See `evidence/DRONE_REFERENCE_V0_1.md` for accepted verification scope. The unfinished shared live-session and Field Lab UI work is not part of this increment. The standalone rover browser remains unchanged. ClawSpan, trained models and live-provider activation are separate work.
