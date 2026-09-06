# Dependency and asset provenance

| Package | Exact version | Licence | Role |
| --- | --- | --- | --- |
| @dimforge/rapier3d-compat | 0.20.0 | Apache-2.0 | Actual 3D world, rigid body, collision and ray-cast vehicle |
| three | 0.184.0 | MIT | Rendering, scene geometry, cameras and OrbitControls |
| playwright-core | 1.58.2 | Apache-2.0 | Development-only automation of an existing Chrome browser |

Packages were acquired from the npm registry with lifecycle scripts disabled. The committed locks record actual archive integrity. The browser lock has only the two listed browser packages; the physics lock has only Rapier. There is no runtime CDN or automatic dependency update.

Upstream notices remain in the installed package distributions and their licence files. This repository does not redistribute library bundles. The local server explicitly exposes the necessary installed runtime modules only. OrbitControls and Three core/module files are from the same release.

Geometry, interface SVGs, course definitions and styling were authored for this project. The vehicle is illustrative geometry around the fixed simulated chassis, not a manufacturer's calibrated asset. Fonts use operating-system font stacks; no font files are distributed.

Primary documentation: https://threejs.org/manual/en/installation.html ; https://threejs.org/docs/#OrbitControls ; https://rapier.rs/docs/ ; https://playwright.dev/docs/api/class-browsertype . Package metadata and locks, not those pages, identify the bytes tested here.

Integrity matching is not an independent malware audit or signature-verification claim. STONE original source is not relicensed by adoption of these dependencies.
