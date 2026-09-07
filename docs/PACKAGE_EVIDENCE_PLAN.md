# Package and evidence interchange implementation plan
Goal: make reference Stones export the original core manifest shape across host profiles and make saved runs independently inspectable in the local Field Lab.
Architecture: reuse the pure v0.1 contract checker with an explicit v0.2 task/profile extension. A factory describes built-in local rules and tools; unconfigured cloud packages do not invent model references. AUDIT is a local Digital Stone that accepts bounded JSON, checks manifests against trusted offline host declarations, or reexecutes versioned drone/arm commands. Uploaded content never defines executable imports, network endpoints or host permissions.
Scope: existing Node22, Rapier0.20.0, Three.js and browser workers; no added dependencies, provider calls, paid resources or physical control. Keep private coordination and legacy planar code separate. State validity/compatibility, availability, execution and authenticity are different claims.
- [x] Port reviewed pure metadata validation and demonstrate preserved v0.1 semantics.
- [x] Test v0.2 task/profile pairs, local manifest factory, cross-host/resource/permission rejection and unconfigured cloud refusal.
- [x] Implement bounded JSON inspection, original-text SHA-256, manifest compatibility and deterministic fixed-engine recording verification. Reject false success and malformed/oversize data.
- [x] Add AUDIT file input, local verification, cancellation and report/manifest export to Field Lab. Imported data must not overwrite live sessions or install code.
- [x] Run complete Node, Field Lab normal/fault and original rover browser tests. Check styles at narrow widths and normal HTTP security policy.
- [ ] Review exact source/lock integrity, update draft PR with verified evidence, accept through the standard review/merge path, update private component pin and milestone records.
Deferred: signatures/publisher trust, third-party executable plugins, real cloud endpoints, learned weights, physical hardware and marketplace integration.
