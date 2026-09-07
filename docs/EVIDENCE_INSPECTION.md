# AUDIT: local package and recording inspection

AUDIT is a Digital Stone for user-selected data, rather than another fixed benchmark preset. In the Field Lab choose Digital > AUDIT, select a UTF-8 JSON file, choose an offline host policy or auto-match, and Inspect & verify file. Export result downloads the structured inspection; it does not upload the source. The entire browser workflow is local and has no provider call or credential form.

## Supported inputs
- Core manifests with schemaVersion 0.1.0 or 0.2.0. The canonical metadata parser still enforces its 65,536-byte limit.
- Drone recordings with format stone.drone.session/0.2.
- Anchored-arm recordings with format stone.humanoid.session/0.2.

Native files are capped at 2 MiB before their bytes are read. Strict UTF-8 decoding rejects invalid byte sequences. A BOM is retained rather than silently removed; strict JSON parsing then rejects it. SHA-256 identifies the exact accepted UTF-8 source bytes, including whitespace. It is not a canonical content hash, digital signature or publisher authentication. Legacy narrow passports, raw benchmark reports, rover recordings and future formats are not silently coerced into supported formats.

## Two kinds of result
A manifest result states validity separately from compatibility with a trusted offline reference policy. Invalid metadata yields bounded errors without echoing the source. A valid remote declaration may be incompatible with offline execution. No import changes permissions or installs code. The report explicitly records installation: not-performed, verification: metadata-only and authenticity: not-verified.

A recording is checked for exact host/machine/task/engine versions, bounded admitted actions and attribution, then reexecuted in a fresh instance of the existing reviewed engine. Explicit Stop is restored as a lifecycle event without an extra physics tick. Falsely claiming successful completion is rejected if the engine does not reach it. The compact report includes actual elapsed time, steps, terminal status, profile and source hash. It reports engine-reexecution, not proof that the original run happened or that its claimed Stone produced those actions. Physics replay does not authenticate the publisher, original controller attribution or trained weights.

Imported commands never select a module path or a network endpoint. Only two built-in replay adapters exist. A separate local simulation is disposed after inspection and cannot overwrite an existing live host. The main interface displays report strings as text, not executable markup. Cancelling terminates the execution worker; an actual deliberately stalled inspection worker is covered by the browser fault suite. Bounds and cancellation are safeguards, not a hostile-code sandbox or guaranteed resource quota.

## API and limitations
Programmatic APIs are inspectStoneData(R, text, target) in packages/lab/inspection.mjs and readStoneFile(file) for browser File input. Core manifest inspection itself does not require a physics world; recording inspection requires the pinned Rapier module. The browser worker initializes its ordinary engine as usual. The existing lab benchmark CLI does not dispatch AUDIT; use the browser or this API. BENCH/BRIEF remain the fixed benchmark tools.

All output declares actualExecution: local and model: null. No generative analysis, cloud inference, signature verification or hardware-safety certification is implied. The local HTTP server is still read-only and allowlisted; imported files are not posted to it. Browser/native mobile platforms beyond the recorded test environment still need validation. ClawSpan is not involved.
