# Route Studio and workbench navigation

## Open the complete workspace
From the runtime checkout, run `npm start`. It starts both loopback applications together. Open `http://127.0.0.1:4174/#drone` for Field Lab. Rover, Drone, Humanoid and Digital are visible in the same order on both apps. The standalone Rover at4173 now links back to every Field Lab section and its brand leads to the main workspace. Field Lab hash links retain the selected host on refresh and browser Back.

The launcher does not kill or replace an occupied port. If either startup fails, it closes only the server it just created and leaves existing services untouched. Ctrl+C closes both servers owned by that launcher. These are local previews, not public hosting or background development agents.

## Set a route
Open Route Studio, above the machine controls. Click its plan to add a node, drag a node to move it in that plane, or use the coordinate table. Reorder or remove checkpoints with their row controls. Drone altitude is Y and is edited separately from its X/Z plan; the arm editor uses its supported Z/Y plane. Fixed coordinates are visibly disabled.

A route contains one to eight ordered checkpoints. The editor validates the whole draft before Apply. Imported UTF-8 JSON is limited to8KiB and stays local; it cannot select source modules, endpoints or permissions. Exported route JSON can be re-imported as a draft on the same host. Each host retains its own draft while changing Field Lab tabs. Page reload/navigation to the separate application is not persistent storage; export important drafts.

Draft changes do not move the active simulated machine or rewrite its recording. **Apply route & reset run** commits the validated route and explicitly starts a fresh simulation. Start/step/swap/Stop/replay then operate on that route. Use fixed benchmark restores the original task; it never overwrites a benchmark definition. Editing is not direct physical or simulated actuator control.

## Bounds and actual completion
Rover uses the original flat-lane chassis with fixed target Y0.5m; X±3.5m and Z−7..9m. It slows at each checkpoint using the original0.8m goal radius and0.4m/s completion speed. No ramp geometry is silently combined with arbitrary route targets.

Drone checkpoints use X/Z±2.5m and Y0.6..4m. Each is reached through the existing four-rotor force controller and real rigid-body dynamics. The original target-distance, speed and hold criteria remain: distance<0.18m, speed<0.24m/s for36 simulation ticks.

The anchored arm retains the original two active joints. Targets stay in X0.32m, with Y0.95..1.85m and Z0.15..0.6m, further restricted by the unclamped inverse-kinematic reach/joint solution. Completion retains distance<0.04m and tip speed<0.12m/s for48 ticks. This is not humanoid locomotion, balance or grasping.

The input workspace bounds prevent unsupported target coordinates; they do not guarantee the reference controllers can complete every admitted route. Timeouts/out-of-bounds results remain visible. No controller/physical power limits are increased to make a custom route pass. The learned FLOW model retains its original two-lane evaluation and is not silently registered or certified for new routes.

## Evidence and replay
Custom comparisons are explicitly scoped `custom-route` and retain the full applied route definition. Each style is evaluated from identical initial conditions on that same route; results are not mixed with the fixed benchmark. The current UI rejects a mismatched route in a rover comparison reply.

`stone.route/0.1` is the route data format. Recordings use separate `stone.rover.route-session/0.1`, `stone.drone.route-session/0.1` and `stone.humanoid.route-session/0.1` formats. These bind the actual ordered route, host/machine/engine versions, initial/final selected Stone, action attribution, commands and terminal status. Replay executes those commands on that route in a fresh engine. Explicit Stop adds no physics step and final selection is not retroactively attributed to an earlier action.

Digital AUDIT now inspects these three custom-route recording formats, including Rover custom routes. It reports source-byte SHA256 and route-bound reexecution, not publisher authenticity, proof of an alleged original event or authentication of controller attribution. Legacy Rover session0.1 recordings and learned-model formats remain outside AUDIT's supported recording list; supported legacy drone/arm records continue unchanged.

The route editor permits no cloud transmission, arbitrary code installation or physical-machine connection. No additional runtime dependency was introduced; the existing Rapier and Three.js implementations remain responsible for physics and graphics.
