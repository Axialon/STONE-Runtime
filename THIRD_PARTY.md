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

## Optional learned FLOW experiment

ml-cart 2.1.1 (MIT) supplies actual CART fitting and scalar-tree inference. Its isolated lock pins twelve installed package entries, including ml-matrix 6.15.0 and array utilities. Neither existing application lock changes. Lifecycle scripts stay disabled. Full installed-file inventories and actual loaded CommonJS coverage are recorded by the reproduction command; committed evidence retains aggregate digests. Tarball integrity, installed bytes and publisher authentication are different claims. Upstream documentation: https://mljs.github.io/decision-tree-cart/ . Library code is not vendored or relicensed. The saved model was fitted from STONE simulated reference data, not downloaded pretrained weights.

## Optional local model build

`esbuild-wasm`0.28.2 (MIT) is a separately locked development-only builder with one package entry and no lifecycle script. It bundles the existing ml-cart2.1.1 dependency graph and reviewed STONE model/session modules as local browser ESM. No new inference library is substituted and no CDN is used. Generated `tools/model-bundle/dist/THIRD_PARTY_NOTICES.txt` contains complete licence texts for every included upstream package; generated metadata identifies their versions, source hashes and both locks. These generated files are not committed and can be reproduced/checked with `npm run build:models` / `npm run verify:model-build`. The blanket no-redistribution note above applies to checked-in library sources; the local server can now serve this generated bundle with its notice file. The builder itself does not run in the browser. STONE source/model remain UNLICENSED, independent of upstream licences.

## Data-quality adapter

Papa Parse5.5.3 (MIT) supplies the actual CSV parser. The isolated packages/data-quality lock pins its sole runtime dependency. Browser builds honor upstream browser:"papaparse.min.js"; Node uses the upstream main entry. Both exact installed files and the unchanged builder lock are checked, and generated output includes upstream licence text. Native package scripts were not executed. No custom CSV engine or stream polyfill is used. Upstream documentation: https://www.papaparse.com/docs ; source: https://github.com/mholt/PapaParse . Licence text is retained at packages/data-quality/PAPAPARSE_LICENSE.txt. Integrity and source-file checks do not authenticate a publisher or certify the dependency's security.
