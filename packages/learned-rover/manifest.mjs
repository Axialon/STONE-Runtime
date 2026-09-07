import {freeze} from '../../experiments/rover3d/contract.mjs';
export const learnedManifest=freeze({
  "schemaVersion": "0.2.0",
  "id": "rover.flow-learned",
  "name": "FLOW / Learned",
  "version": "0.1.0",
  "publisher": "Axialon",
  "license": "UNLICENSED",
  "task": "rover-navigation",
  "style": "Frozen CART longitudinal FLOW imitation; deterministic steering and guards.",
  "form": "digital",
  "implementation": {
    "kind": "learned-policy",
    "modelRef": "stone.flow-imitation@sha256:d9a1ef32fa555b5f9d8fdd326a90b59f8c03228b3854564d99bed708d0a210c2"
  },
  "compatibility": {
    "profile": "stone.rover.control/0.1",
    "machineVersion": "stone.rover.machine/0.1.0",
    "engineVersion": "rapier3d-compat/0.20.0",
    "inputs": [
      "position",
      "rotation",
      "linearVelocity",
      "angularVelocity",
      "wheelContacts",
      "goal"
    ],
    "outputs": [
      "throttle",
      "steering",
      "brake"
    ]
  },
  "resources": {
    "memoryMiB": 64,
    "decisionBudgetMs": 20
  },
  "execution": {
    "mode": "local",
    "offlineBehavior": "full",
    "offlineDetails": "After the pinned runtime is installed, this reference needs no network. Budgets are requested prototype admission limits, not measured or enforced resource use.",
    "localCapabilities": [
      "rover-navigation"
    ],
    "remoteCapabilities": [],
    "dataEgress": []
  },
  "permissions": {
    "networkOrigins": [],
    "tools": [
      "observe-rover",
      "command-rover"
    ],
    "storage": "session"
  },
  "cost": {
    "kind": "none",
    "payer": "none",
    "details": "No inference service charge for this built-in local reference; local hardware costs are not evaluated."
  },
  "lifecycle": {
    "state": "ephemeral",
    "updates": "pinned"
  },
  "evidence": {
    "status": "evaluated",
    "summary": "Saved local CART drive/brake model plus deterministic steering/guards. Browser/Node parity and identified-policy replay on two fixed lanes; custom routes, general navigation and hardware readiness are not claimed.",
    "references": [
      "docs/LIVE_MODEL_STONES.md",
      "evidence/LIVE_MODEL_STONES_V0_1.md",
      "experiments/learned-flow/model/evaluation-summary.json"
    ]
  }
});
