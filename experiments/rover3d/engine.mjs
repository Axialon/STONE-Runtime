import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {ENGINE} from './contract.mjs';
const require = createRequire(import.meta.url);
let loaded;
function failure(code, message) { return Object.assign(new Error(message), {code}); }

/** Fixed official dependency only. Never downloads, installs, or loads a caller-provided path. */
export async function loadRapier() {
  if (!loaded) loaded = (async () => {
    let entry;
    try { entry = require.resolve(ENGINE.package); }
    catch { throw failure('ENGINE_UNAVAILABLE', `Install the reviewed ${ENGINE.package}@${ENGINE.version} package in this experiment before running engine tests.`); }
    let metadata;
    try { metadata = JSON.parse(await readFile(join(dirname(entry), 'package.json'), 'utf8')); }
    catch { throw failure('ENGINE_METADATA_INVALID', 'Cannot verify the installed engine package metadata.'); }
    if (metadata.name !== ENGINE.package || metadata.version !== ENGINE.version)
      throw failure('ENGINE_VERSION_MISMATCH', 'Installed engine identity does not match the pinned experiment.');
    const module = await import('@dimforge/rapier3d-compat');
    const R = module.default ?? module;
    await R.init();
    if (typeof R.World !== 'function' || typeof R.ColliderDesc?.cuboid !== 'function')
      throw failure('ENGINE_API_MISMATCH', 'Expected Rapier engine API is unavailable.');
    return R;
  })().catch(error => { loaded = undefined; throw error; });
  return loaded;
}
