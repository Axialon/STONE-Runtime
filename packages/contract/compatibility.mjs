import { PROFILE, validateManifest } from './manifest.mjs';

/** Reference admission policy, not a running host or a permissions sandbox. */
export const LOCAL_ARENA_HOST = Object.freeze({
  profile: PROFILE,
  inputs: Object.freeze(['position','velocity','goal']),
  outputs: Object.freeze(['acceleration']),
  forms: Object.freeze(['digital']),
  modes: Object.freeze(['local']),
  networkOrigins: Object.freeze([]),
  tools: Object.freeze([]),
  storage: Object.freeze(['none']),
  states: Object.freeze(['ephemeral']),
  costKinds: Object.freeze(['none']),
  maxMemoryMiB: 64,
  maxDecisionBudgetMs: 20
});

/** Pure capability comparison. Only a trusted host/operator may select this policy. */
export function checkCompatibility(manifest, host = LOCAL_ARENA_HOST) {
  const validation = validateManifest(manifest);
  if (!validation.valid) return {compatible:false, errors:validation.errors};
  const errors = [];
  const fail = (path, message) => errors.push({path,code:'incompatible',message});
  const arrays = ['inputs','outputs','forms','modes','networkOrigins','tools','storage','states','costKinds'];
  if (!host || typeof host !== 'object' || Array.isArray(host) ||
      typeof host.profile !== 'string' || !host.profile ||
      arrays.some(k => !Array.isArray(host[k]) || host[k].length > 32 || host[k].some(v => typeof v !== 'string' || !v)) ||
      !Number.isFinite(host.maxMemoryMiB) || host.maxMemoryMiB <= 0 ||
      !Number.isFinite(host.maxDecisionBudgetMs) || host.maxDecisionBudgetMs <= 0) {
    return {compatible:false, errors:[{path:'$host',code:'host',message:'Malformed trusted host capability declaration.'}]};
  }
  const m = manifest;
  if(m.schemaVersion==='0.2.0'){for(const key of ['machineVersion','engineVersion']){if(typeof host[key]!=='string'||!host[key])fail('$host.'+key,'Trusted host must declare an exact identity.');else if(m.compatibility[key]!==host[key])fail('$.compatibility.'+key,'Host identity does not match exactly.');}}
  if (m.compatibility.profile !== host.profile) fail('$.compatibility.profile', 'Host profile does not match exactly.');
  function supported(values, offered, path) {
    if (values.some(v => !offered.includes(v))) fail(path, 'Host does not offer every requested capability or permission.');
  }
  supported(m.compatibility.inputs, host.inputs, '$.compatibility.inputs');
  supported(m.compatibility.outputs, host.outputs, '$.compatibility.outputs');
  supported([m.form], host.forms, '$.form');
  supported([m.execution.mode], host.modes, '$.execution.mode');
  supported(m.permissions.networkOrigins, host.networkOrigins, '$.permissions.networkOrigins');
  supported(m.permissions.tools, host.tools, '$.permissions.tools');
  supported([m.permissions.storage], host.storage, '$.permissions.storage');
  supported([m.lifecycle.state], host.states, '$.lifecycle.state');
  supported([m.cost.kind], host.costKinds, '$.cost.kind');
  if (m.resources.memoryMiB > host.maxMemoryMiB) fail('$.resources.memoryMiB', 'Declared memory demand exceeds host allowance.');
  if (m.resources.decisionBudgetMs > host.maxDecisionBudgetMs) fail('$.resources.decisionBudgetMs', 'Requested decision budget exceeds host allowance.');
  return {compatible:errors.length === 0, errors};
}
