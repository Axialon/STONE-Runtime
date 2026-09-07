# Interactive routes and cross-host navigation

Owner request: interactive points/checkpoints/routes and clear access to every host from Rover. Work from accepted a2aeae7; preserve failing learned-browser draft PR9 separately. Owner delegates ordinary implementation and verified merges.

Design: one shared local route editor on each physical-host page. Users add up to8 ordered checkpoints via numerical fields or plan clicks/drags, reorder/remove, import/export bounded plain JSON, then explicitly Apply & reset. Draft edits never mutate an active machine or recording. Separate applied route and draft state prevent comparison/export labels from following unapplied edits. Benchmark mode remains the existing fixed task; custom route results are named and include the exact route.

Host scope: drone points inside a small bounded flight workspace with editable altitude; humanoid points constrained to the anchored arm's actual supported plane and joint-reachable region; rover route points on the existing flat lane, with a fixed body-height target. All use unchanged machines/forces/joints/decision rules and existing success-radius/speed thresholds. Custom route progression comes from physics, never pose teleportation. User routes are exploratory, not evaluated learned-model capabilities or obstacle avoidance.

Versioning: stone.route/0.1 input contract; custom route recordings use separate host route-session/0.1 formats including the full validated route. Existing session formats remain untouched. Stop/final selection and replay continue to reproduce actual engine state. Recorded commands are evidence data, not arbitrary code. Import limits/fields/UTF8 and host compatibility fail closed.

Navigation: reciprocal persistent Rover/Drone/Humanoid/Digital navigation on both apps; Field Lab URL hash follows selected host, handles refresh/back/forward, and rejects unknown hashes safely. The existing two local-only servers remain; a joint launcher starts both with named addresses and fails visibly on occupied ports. No iframe/proxy/public hosting needed.

Implementation checkpoints:
- [ ] Route contract and real-engine checkpoint support with unchanged legacy tests.
- [ ] Custom session recording/replay and same-route comparison, route identity in evidence.
- [ ] Shared editor, app integration, deep-linked navigation and a simple joint launcher.
- [ ] Node and real-browser editor/navigation/replay/failure cases, all existing464 Node/66 browser regressions, visual inspection, exact-source clean verification.
- [ ] Focused review, reviewed static public-tree upload, PR/private pin/Drive evidence and preview restart.

No new dependencies, paid inference, physical actuation, hosted Actions, ClawSpan or private-content publication. Existing learned artifact/protocol are immutable; browser-trained policy integration stays issue37, not silently expanded to user routes. No routine approval prompts for already-delegated work; scope and failures recorded at checkpoints.

Implemented and tested route contract, actual-engine sessions, shared editor/navigation, route AUDIT and atomic loopback launcher. Full evidence: evidence/ROUTES_AND_NAVIGATION_V0_1.md. Clean export/merge identities are recorded in the accepted PR; source branches do not themselves imply release acceptance. Learned-browser draft PR9 remains separate.
