import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ENGINE} from './contract.mjs';

// A fixed local child, no shell, caller-selected program, download or installation.
// This bounds the verification command, not a live vehicle or hostile-code sandbox.
const args = process.argv.slice(2);
const timeoutArg = args.length === 1 && /^--timeout-ms=\d{2,5}$/.test(args[0]);
const timeoutMs = args.length === 0 ? 15000 : timeoutArg ? Number(args[0].split('=')[1]) : NaN;
const blocked = code => ({status:'blocked', code, engine:ENGINE,
  note:'Physics is not verified. No substitute engine or download was used.'});
const acceptedCodes = new Set(['ENGINE_UNAVAILABLE','ENGINE_METADATA_INVALID','ENGINE_VERSION_MISMATCH',
  'ENGINE_API_MISMATCH','ENGINE_INITIALISATION_FAILED']);
let result;
if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 30000) {
  result = blocked('INVALID_PREFLIGHT_ARGUMENT');
} else {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL('./engine-check.mjs',import.meta.url))], {
    encoding:'utf8', timeout:timeoutMs, killSignal:'SIGKILL', maxBuffer:65536, windowsHide:true
  });
  if (child.error?.code === 'ETIMEDOUT') result = blocked('ENGINE_STARTUP_TIMEOUT');
  else if (child.error?.code === 'ENOBUFS') result = blocked('ENGINE_PROBE_OUTPUT_LIMIT');
  else if (child.error || child.signal || ![0,2].includes(child.status)) result = blocked('ENGINE_PROBE_FAILED');
  else {
    let data;
    try { data = JSON.parse(child.status === 0 ? child.stdout : child.stderr); } catch { /* Fail closed below. */ }
    const identity = data?.engine?.package === ENGINE.package && data?.engine?.version === ENGINE.version;
    if (identity && child.status === 0 && data.status === 'engine-initialised') {
      result = {status:'engine-initialised',engine:ENGINE,
        note:'Initialisation only. Run the real-engine tests before claiming rover functionality.'};
    } else if (identity && child.status === 2 && data.status === 'blocked' && acceptedCodes.has(data.code)) {
      result = blocked(data.code);
    } else result = blocked('ENGINE_PROBE_INVALID');
  }
}
// Never echo child diagnostics, arbitrary error codes, paths or package-supplied notes.
const success = result.status === 'engine-initialised';
console[success ? 'log' : 'error'](JSON.stringify(result,null,2));
process.exitCode = success ? 0 : 2;
