# STONE core manifest v0.2

The Field Lab now exports a core manifest for each of its twelve local reference packages, not just a display passport. The original v0.1 validator and capability comparator were reused and extended explicitly. The private legacy application keeps its existing v0.1 copy; this component maintains the multi-host implementation. Ninety preserved metadata tests exercise the prior semantics with illustrative fixtures. Neither private coordination nor private Git history is included here.

## Versioned shape
The root shape retains schemaVersion, id, name, version, publisher, license, task, style, form, implementation, compatibility, resources, execution, permissions, cost, lifecycle and evidence. Objects reject unknown fields. Numeric X.Y.Z package versions cannot float to latest. modelRef is null for rule-based packages and an explicit version/digest reference for model-based declarations. The parser bounds JSON text to 65,536 UTF-8 bytes.

Schema 0.1.0 retains arena-navigation and stone.arena.control/0.1. Schema 0.2.0 additionally supports these exact task/profile pairs:

| Task | Host profile |
| --- | --- |
| rover-navigation | stone.rover.control/0.1 |
| drone-waypoints | stone.drone.rotors/0.1 |
| humanoid-reaching | stone.humanoid.reach/0.1 |
| digital-benchmark | stone.digital.benchmark/0.1 |
| digital-evidence-audit | stone.digital.evidence/0.1 |

v0.2 compatibility adds required machineVersion and engineVersion beside profile, inputs and outputs. Identities have an explicit numeric release suffix, for example stone.drone.machine/0.1.0 and rapier3d-compat/0.20.0. Task/profile pairs and machine/engine equality are checked rather than silently adapting one host into another. These metadata identities are labels, not binary attestation or signatures. The actual simulation loader separately verifies its installed engine version.

## Export and inspect
Use Export core manifest from a local Stone's passport in the Field Lab. Programmatic entry points are validateManifest/parseManifest, checkCompatibility, manifestFor and hostFor in packages/contract. The older narrow Lab passport remains available for display/export. It is not silently accepted as a core manifest. AUDIT can inspect core JSON without installing the package.

manifestFor only describes reviewed available local implementations. ANALYST and HYBRID remain unconfigured: their passport is visible, but exporting a complete core model/provider manifest is disabled. The factory does not invent a model reference or provider origin. Independently supplied valid cloud/hybrid declarations can still be inspected; they fail the offline reference admission policy. This is inclusion of remote forms in the contract, not activation of inference.

## Capabilities are not permissions granted
The offline host policies are selected from trusted source, not supplied by the file being inspected. They admit only digital, local, zero-service-charge, ephemeral references with the declared tools, channels, storage and exact identities. Hardware/combined/custom-silicon descriptions remain valid ecosystem metadata when internally consistent, but these software-only policies reject them.

The factory requests 64 MiB; reference hosts declare a 256 MiB admission ceiling. Physical rule references request 20 ms per decision; benchmark/AUDIT tools request 5,000 ms per operation. These are provisional requested/admission values, not measurements, memory quotas, scheduling guarantees or enforced per-package execution budgets. The existing worker watchdog is separate. Local hardware/setup costs are not evaluated.

Local execution must declare full offline task availability after installation, no remote capabilities, network origins or data egress. Cloud requires explicit remote capability/origins and unavailable offline status; hybrid requires local and remote capabilities with limited/unavailable offline behaviour. Canonical HTTPS origin declarations do not make requests or confer network authority. Cost fields disclose categories; they do not authorise charges or enforce an account budget.

## Remaining standardisation work
This is a maintained core reference, not a universal package installer or a complete ecosystem standard. Signatures, canonical signing format, publisher trust, dependency/artifact attestations, third-party executable loading, model weights and physical-device adapters remain future work. JSON duplicate keys follow native last-value semantics; do not use this parser as a signing format. Pass untrusted content through bounded text ingress, not arbitrary JavaScript objects or Proxies. A valid manifest may be incompatible; a compatible manifest is not installed, authenticated, benchmark-certified or safe for hardware.
