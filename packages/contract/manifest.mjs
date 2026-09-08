/** Core manifest v0.1/v0.2: metadata validation, never execution or authorisation. */
export const MAX_MANIFEST_BYTES = 65536;
export const PROFILE = 'stone.arena.control/0.1';
export const TASK_PROFILES=Object.freeze({'arena-navigation':PROFILE,'rover-navigation':'stone.rover.control/0.1','drone-waypoints':'stone.drone.rotors/0.1','humanoid-reaching':'stone.humanoid.reach/0.1','digital-benchmark':'stone.digital.benchmark/0.1','digital-evidence-audit':'stone.digital.evidence/0.1','digital-data-quality':'stone.digital.data-quality/0.1'});
const release = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const identityVersion = /^(?:[a-zA-Z][a-zA-Z0-9._-]*\/)*(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
const modelReference = /^[a-zA-Z0-9][a-zA-Z0-9._/-]*@(?:(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)|sha256:[a-f0-9]{64})$/;
const identifier = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const result = errors => ({ valid: errors.length === 0, errors });

/** @param {unknown} manifest JSON-compatible data, not executable JS objects. */
export function validateManifest(manifest) {
  const errors = [];
  const fail = (path, code, message) => errors.push({ path, code, message });
  function object(value, keys, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      fail(path, 'type', 'Expected a plain object.'); return false;
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string' || !keys.includes(key)) fail(path, 'unknown', 'Unexpected field.');
      if (!Object.hasOwn(descriptors[key], 'value')) {
        fail(path, 'type', 'Accessors are not JSON data.'); return false;
      }
    }
    for (const key of keys) if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, 'required', 'Field is required.');
    return true;
  }
  function text(value, path, pattern) {
    if (typeof value !== 'string' || !value.trim() || value.length > 2048 ||
        (pattern && !pattern.test(value))) fail(path, 'value', 'Expected a nonblank bounded string in the documented format.');
  }
  function choice(value, values, path) {
    if (!values.includes(value)) fail(path, 'enum', `Expected one of: ${values.join(', ')}.`);
  }
  function list(value, path, minimum = 0) {
    if (!Array.isArray(value) || value.length < minimum || value.length > 32) {
      fail(path, 'type', `Expected ${minimum} to 32 unique strings.`); return;
    }
    value.forEach((item, index) => text(item, `${path}[${index}]`));
    if (new Set(value).size !== value.length) fail(path, 'duplicate', 'Duplicate values are not permitted.');
  }
  function number(value, path) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1048576)
      fail(path, 'value', 'Expected a finite positive number no greater than 1048576.');
  }
  const keys = ['schemaVersion','id','name','version','publisher','license','task','style','form',
    'implementation','compatibility','resources','execution','permissions','cost','lifecycle','evidence'];
  if (!object(manifest, keys, '$')) return result(errors);
  const m = manifest;
  choice(m.schemaVersion, ['0.1.0','0.2.0'], '$.schemaVersion');
  text(m.id, '$.id', identifier);
  text(m.version, '$.version', release);
  for (const key of ['name','publisher','license','style']) text(m[key], `$.${key}`);
  choice(m.task, m.schemaVersion==='0.1.0'?['arena-navigation']:Object.keys(TASK_PROFILES), '$.task');
  choice(m.form, ['digital','hardware','combined'], '$.form');
  if (object(m.implementation, ['kind','modelRef'], '$.implementation')) {
    choice(m.implementation.kind, ['rule-based','learned-policy','model-harness','custom-silicon'], '$.implementation.kind');
    if (m.implementation.modelRef !== null) text(m.implementation.modelRef, '$.implementation.modelRef', modelReference);
  }
  if (object(m.compatibility, m.schemaVersion==='0.2.0'?['profile','inputs','outputs','machineVersion','engineVersion']:['profile','inputs','outputs'], '$.compatibility')) {
    choice(m.compatibility.profile, m.schemaVersion==='0.1.0'?[PROFILE]:[Object.hasOwn(TASK_PROFILES,m.task)?TASK_PROFILES[m.task]:null], '$.compatibility.profile');
    if(m.schemaVersion==='0.2.0'){text(m.compatibility.machineVersion,'$.compatibility.machineVersion',identityVersion);text(m.compatibility.engineVersion,'$.compatibility.engineVersion',identityVersion);}
    list(m.compatibility.inputs, '$.compatibility.inputs', 1);
    list(m.compatibility.outputs, '$.compatibility.outputs', 1);
  }
  if (object(m.resources, ['memoryMiB','decisionBudgetMs'], '$.resources')) {
    number(m.resources.memoryMiB, '$.resources.memoryMiB');
    number(m.resources.decisionBudgetMs, '$.resources.decisionBudgetMs');
  }
  if (object(m.execution, ['mode','offlineBehavior','offlineDetails','localCapabilities','remoteCapabilities','dataEgress'], '$.execution')) {
    choice(m.execution.mode, ['local','cloud','hybrid'], '$.execution.mode');
    choice(m.execution.offlineBehavior, ['full','limited','unavailable'], '$.execution.offlineBehavior');
    text(m.execution.offlineDetails, '$.execution.offlineDetails');
    for (const key of ['localCapabilities','remoteCapabilities','dataEgress']) list(m.execution[key], `$.execution.${key}`);
  }
  if (object(m.permissions, ['networkOrigins','tools','storage'], '$.permissions')) {
    list(m.permissions.networkOrigins, '$.permissions.networkOrigins');
    list(m.permissions.tools, '$.permissions.tools');
    choice(m.permissions.storage, ['none','session'], '$.permissions.storage');
  }
  if (object(m.cost, ['kind','payer','details'], '$.cost')) {
    choice(m.cost.kind, ['none','metered','subscription'], '$.cost.kind');
    choice(m.cost.payer, ['none','user','publisher'], '$.cost.payer');
    text(m.cost.details, '$.cost.details');
  }
  if (object(m.lifecycle, ['state','updates'], '$.lifecycle')) {
    choice(m.lifecycle.state, ['ephemeral','external'], '$.lifecycle.state');
    choice(m.lifecycle.updates, ['pinned'], '$.lifecycle.updates');
  }
  if (object(m.evidence, ['status','summary','references'], '$.evidence')) {
    choice(m.evidence.status, ['prototype','evaluated'], '$.evidence.status');
    text(m.evidence.summary, '$.evidence.summary');
    list(m.evidence.references, '$.evidence.references');
  }
  // Cross-field checks only run after all required structures are well-formed.
  if (errors.length) return result(errors);
  const e = m.execution;
  if (m.implementation.kind === 'rule-based' && m.implementation.modelRef !== null)
    fail('$.implementation.modelRef', 'inconsistent', 'A rule-based package must not claim a model.');
  if (m.implementation.kind !== 'rule-based' && m.implementation.modelRef === null)
    fail('$.implementation.modelRef', 'required', 'A model-based implementation requires an explicit model reference.');
  if (m.implementation.kind === 'custom-silicon' && m.form === 'digital')
    fail('$.form', 'inconsistent', 'Custom silicon requires hardware or combined form.');
  if ((m.cost.kind === 'none') !== (m.cost.payer === 'none'))
    fail('$.cost.payer', 'inconsistent', 'Service charges and their payer must agree.');
  if (m.evidence.status === 'evaluated' && !m.evidence.references.length)
    fail('$.evidence.references', 'required', 'An evaluation claim needs references; their truth is not verified here.');
  for (const origin of m.permissions.networkOrigins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password) throw new Error();
    } catch { fail('$.permissions.networkOrigins', 'origin', 'Use canonical HTTPS origins without credentials, path, query or fragment.'); }
  }
  if (e.mode === 'local') {
    if (!e.localCapabilities.length || e.remoteCapabilities.length || m.permissions.networkOrigins.length || e.dataEgress.length || e.offlineBehavior !== 'full')
      fail('$.execution', 'inconsistent', 'Local means declared capabilities run offline, with no remote work, network origins or data egress.');
  } else {
    if (!e.remoteCapabilities.length || !m.permissions.networkOrigins.length)
      fail('$.execution', 'required', 'Remote work and its permitted origins must be declared.');
    if (e.mode === 'cloud' && (e.localCapabilities.length || e.offlineBehavior !== 'unavailable'))
      fail('$.execution', 'inconsistent', 'Cloud-only capability is unavailable offline and declares no local capability.');
    if (e.mode === 'hybrid' && (!e.localCapabilities.length || e.offlineBehavior === 'full'))
      fail('$.execution', 'inconsistent', 'Hybrid declares both local and remote work and cannot claim every capability works offline.');
  }
  return result(errors);
}

/** Bounded text ingress. No fetch, imports, installation, permission grant or execution. */
export function parseManifest(text) {
  const invalid = (code, message) => ({valid:false, errors:[{path:'$',code,message}], manifest:null});
  if (typeof text !== 'string') return invalid('type', 'Expected JSON text.');
  if (text.length > MAX_MANIFEST_BYTES || new TextEncoder().encode(text).length > MAX_MANIFEST_BYTES)
    return invalid('size', 'Manifest exceeds the 65536-byte UTF-8 limit.');
  let manifest;
  try { manifest = JSON.parse(text); } catch { return invalid('json', 'Invalid JSON.'); }
  const validation = validateManifest(manifest);
  return {...validation, manifest: validation.valid ? manifest : null};
}
