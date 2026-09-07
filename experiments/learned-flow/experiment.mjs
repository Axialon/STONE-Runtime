import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {freeze, validObservation, readAction, MACHINE} from '../rover3d/contract.mjs';
import {createRoverWorld} from '../rover3d/world.mjs';
import {decide} from '../rover3d/stones.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const protocolSha256 = 'ee6f721ca0cd79788efb0023f89a322913181703b5ddb56ab33bbe56bbe978e1';
const protocolBytes = readFileSync(new URL('./protocol.json', import.meta.url));
if (sha256(protocolBytes) !== protocolSha256) throw new Error('Frozen protocol digest mismatch.');
export const PROTOCOL = freeze(JSON.parse(protocolBytes.toString('utf8')));
const P = PROTOCOL;
const require = createRequire(import.meta.url);
export const LIBRARY_ENTRY = require.resolve('ml-cart');
function libraryRoot(entry) {
  let directory = dirname(entry);
  for (let depth = 0; depth < 4; depth++) {
    let metadata;
    try { metadata = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (metadata) {
      if (metadata.name !== 'ml-cart' || metadata.version !== '2.1.1')
        throw new Error('Installed CART library differs from the protocol.');
      return directory;
    }
    directory = dirname(directory);
  }
  throw new Error('Cannot verify CART package metadata.');
}
export const LIBRARY_ROOT = libraryRoot(LIBRARY_ENTRY);
const {DecisionTreeRegression} = require('ml-cart');
if (typeof DecisionTreeRegression !== 'function' || typeof DecisionTreeRegression.load !== 'function')
  throw new Error('Expected scalar regression API is unavailable.');

const LIMIT = 1048576;
const MAX_ROWS = 20000;
const OPTIONS = Object.freeze({...P.modelOptions, kind: 'regression'});
const ownedModels = new WeakMap();
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const fail = message => { throw new TypeError(message); };
function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  return actual.length === keys.length && keys.every(key => Object.hasOwn(descriptors, key)) &&
    actual.every(key => typeof key === 'string' && keys.includes(key) &&
      Object.hasOwn(descriptors[key], 'value') && descriptors[key].enumerable);
}
function checkSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) fail('Seed must be uint32.');
}
function inDomain(features) {
  return Array.isArray(features) && features.length === 4 &&
    Array.from(features).every((x, i) => Number.isFinite(x) &&
      x >= P.featureDomain[i][0] && x <= P.featureDomain[i][1]);
}
function checkIdentity(partition, seed, course, collectRows) {
  checkSeed(seed);
  if (!P.courses.includes(course)) fail('Unknown protocol course.');
  if (partition === 'reference') {
    if (seed !== 0 || collectRows) fail('References use seed zero and never supply data.');
  } else if (!Object.hasOwn(P.seeds, partition) || !P.seeds[partition].includes(seed)) {
    fail('Seed does not belong to the declared partition.');
  }
}

export function buildWarmup(seed) {
  checkSeed(seed);
  if (seed === 0) return [];
  let state = seed >>> 0;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const w = P.warmup;
  const blocks = w.minBlocks + Math.floor(random() * (w.maxBlocks - w.minBlocks + 1));
  const tape = [];
  // One block-count draw, then brake, throttle and steering draws per block.
  // Always consume all three block draws, including when braking.
  for (let block = 0; block < blocks; block++) {
    const braking = random() < w.brakeProbability;
    const throttle = random() * w.maxThrottle;
    const steering = (2 * random() - 1) * w.maxSteering;
    for (let step = 0; step < w.blockSteps; step++) {
      tape.push(readAction({throttle: braking ? 0 : throttle, steering, brake: braking ? w.brake : 0}));
    }
  }
  return tape;
}

export function extractFeatures(o) {
  if (!validObservation(o)) fail('Invalid rover observation.');
  const q = o.rotation, v = o.linearVelocity;
  const dx = o.goal.x - o.position.x, dz = o.goal.z - o.position.z;
  const fx = 2 * (q.x * q.z + q.w * q.y);
  const fz = 1 - 2 * (q.x * q.x + q.y * q.y);
  const fy = 2 * (q.y * q.z - q.w * q.x);
  const angle = Math.atan2(dx, dz) - Math.atan2(fx, fz);
  const features = [Math.hypot(dx, dz), Math.atan2(Math.sin(angle), Math.cos(angle)),
    v.x * fx + v.y * fy + v.z * fz, fy];
  if (!features.every(Number.isFinite)) fail('Nonfinite derived observation features.');
  return features;
}
function guardFor(o, features) {
  if (o.wheelContacts.filter(Boolean).length < 2) return 'airborne';
  if (features[0] < 0.55) return 'goal';
  return inDomain(features) ? null : 'out-of-domain';
}
export function guardKind(o) { return guardFor(o, extractFeatures(o)); }
export function harnessAction(demand, o) {
  const features = extractFeatures(o), guard = guardFor(o, features);
  if (guard === 'airborne') return readAction({throttle: 0, steering: 0, brake: 0.4});
  if (guard === 'goal') return readAction({throttle: 0, steering: 0, brake: 1});
  if (guard === 'out-of-domain') return readAction(P.outOfDomainAction);
  if (!Number.isFinite(demand)) fail('Regressor demand must be finite.');
  return readAction({throttle: clamp(demand, 0, 0.48),
    steering: clamp(features[1] * 1.6 - o.angularVelocity.y * 0.35, -1, 1),
    brake: clamp(-demand, 0, 1)});
}
export function predictAction(model, o) {
  const features = extractFeatures(o);
  if (guardFor(o, features)) return harnessAction(null, o);
  if (!model || typeof model.predict !== 'function') fail('Missing scalar regressor.');
  const prediction = model.predict([features]);
  if (!Array.isArray(prediction) || prediction.length !== 1 || !Number.isFinite(prediction[0]))
    fail('Invalid scalar model prediction.');
  return harnessAction(prediction[0], o);
}

export function fitRegressor(rows) {
  if (!Array.isArray(rows) || rows.length < P.modelOptions.minNumSamples || rows.length > MAX_ROWS)
    fail('Training requires 8 through 20000 rows.');
  const features = [], targets = [];
  for (const row of rows) {
    if (!row || row.partition !== 'train') fail('Only train rows may be fitted.');
    checkIdentity(row.partition, row.seed, row.course, true);
    if (!inDomain(row.features) || !Number.isFinite(row.demand) || row.demand < -1 || row.demand > 0.48)
      fail('Invalid training features or target.');
    features.push([...row.features]);
    targets.push(row.demand);
  }
  const model = new DecisionTreeRegression({...P.modelOptions});
  model.train(features, targets);
  ownedModels.set(model, rows.length);
  validateTree(exportTree(model));
  return model;
}

function validateMetadata(meta) {
  if (!exactKeys(meta, ['trainingDataSha256', 'trainingRows']) ||
      !/^[a-f0-9]{64}$/.test(meta.trainingDataSha256) ||
      !Number.isInteger(meta.trainingRows) || meta.trainingRows < P.modelOptions.minNumSamples ||
      meta.trainingRows > MAX_ROWS) fail('Invalid model metadata.');
}
function validateOptions(options) {
  if (!exactKeys(options, Object.keys(OPTIONS)) ||
      Object.keys(OPTIONS).some(key => options[key] !== OPTIONS[key])) fail('Unsupported tree options.');
}
function exportTree(model) {
  const raw = model.toJSON();
  if (raw.name !== 'DTRegression') fail('Expected a regression tree.');
  validateOptions(raw.options);
  let count = 0;
  function copy(node, depth) {
    if (!node || typeof node !== 'object' || depth > P.modelOptions.maxDepth || ++count > 511)
      fail('Invalid fitted tree structure.');
    if (node.left || node.right) {
      if (!node.left || !node.right || node.distribution !== undefined) fail('Ambiguous fitted tree node.');
      return {splitColumn: node.splitColumn, splitValue: node.splitValue, gain: node.gain,
        left: copy(node.left, depth + 1), right: copy(node.right, depth + 1)};
    }
    return {distribution: node.distribution};
  }
  // Preserve the library's loadable scalar parameters. Omit training diagnostics:
  // constant leaves may contain an unused Infinity gain in the original object.
  return {name: raw.name, options: {...OPTIONS}, root: copy(raw.root, 0)};
}
function validateTree(tree) {
  if (!exactKeys(tree, ['name', 'options', 'root']) || tree.name !== 'DTRegression')
    fail('Unsupported tree format.');
  validateOptions(tree.options);
  let count = 0;
  function visit(node, depth) {
    if (depth > P.modelOptions.maxDepth || ++count > 511) fail('Oversized regression tree.');
    if (exactKeys(node, ['distribution'])) {
      // The arithmetic mean can round slightly beyond a training target endpoint.
      if (!Number.isFinite(node.distribution) || node.distribution < -1 - 1e-12 ||
          node.distribution > 0.48 + 1e-12) fail('Invalid scalar leaf.');
      return;
    }
    if (!exactKeys(node, ['splitColumn', 'splitValue', 'gain', 'left', 'right']) ||
        depth >= P.modelOptions.maxDepth || !Number.isInteger(node.splitColumn) ||
        node.splitColumn < 0 || node.splitColumn >= 4) fail('Invalid branch shape or feature.');
    const [lo, hi] = P.featureDomain[node.splitColumn];
    if (!Number.isFinite(node.splitValue) || node.splitValue < lo || node.splitValue > hi ||
        !Number.isFinite(node.gain) || node.gain <= 0 || node.gain > MAX_ROWS * 1.48 ** 2)
      fail('Invalid branch parameters.');
    visit(node.left, depth + 1);
    visit(node.right, depth + 1);
  }
  visit(tree.root, 0);
}
export function saveArtifact(model, meta) {
  validateMetadata(meta);
  if (!ownedModels.has(model) || ownedModels.get(model) !== meta.trainingRows)
    fail('Save requires an owned fitted or validated loaded model and matching row count.');
  const tree = exportTree(model);
  validateTree(tree);
  const artifact = {format: 'stone.learned-flow/0.1', protocolSha256, library: P.library,
    harnessVersion: P.harnessVersion, engine: P.engine, teacher: P.teacher,
    meta: {trainingDataSha256: meta.trainingDataSha256, trainingRows: meta.trainingRows}, tree};
  const text = JSON.stringify(artifact, null, 2) + '\n';
  if (Buffer.byteLength(text, 'utf8') > LIMIT) fail('Oversized model artifact.');
  return {text, sha256: sha256(text)};
}
export function loadArtifact(text, expectedSha) {
  if (typeof text !== 'string' || text.length > LIMIT || Buffer.byteLength(text, 'utf8') > LIMIT ||
      typeof expectedSha !== 'string' || !/^[a-f0-9]{64}$/.test(expectedSha) || sha256(text) !== expectedSha)
    fail('Artifact size or source-byte digest mismatch.');
  const value = JSON.parse(text);
  if (!exactKeys(value, ['format', 'protocolSha256', 'library', 'harnessVersion', 'engine', 'teacher', 'meta', 'tree']) ||
      value.format !== 'stone.learned-flow/0.1' || value.protocolSha256 !== protocolSha256 ||
      value.library !== P.library || value.harnessVersion !== P.harnessVersion ||
      value.engine !== P.engine || value.teacher !== P.teacher) fail('Incompatible artifact identity.');
  validateMetadata(value.meta);
  validateTree(value.tree);
  // expectedSha is supplied by the caller; identity fields are compatibility checks,
  // not signatures or evidence of authorship. JSON cannot select an executable import.
  const model = DecisionTreeRegression.load(value.tree);
  ownedModels.set(model, value.meta.trainingRows);
  return model;
}

export function runEpisode(R, course, seed, policy, options = {}) {
  const {partition, collectRows = false, policyKind = 'custom'} = options;
  if (typeof collectRows !== 'boolean' || typeof policy !== 'function' ||
      !['teacher', 'learned', 'custom'].includes(policyKind)) fail('Invalid episode options.');
  checkIdentity(partition, seed, course, collectRows);
  const tape = buildWarmup(seed), actions = [], rows = [];
  const world = createRoverWorld(R, course);
  try {
    let state = world.snapshot(), warmupSteps = 0;
    const speed = o => Math.hypot(o.linearVelocity.x, o.linearVelocity.y, o.linearVelocity.z);
    const metrics = {pathMetres: 0, peakSpeed: speed(state.observation), goalDistance: 0,
      chassisContactStarts: 0, modelSteps: 0, policySteps: 0, modelCalls: 0, policyCalls: 0,
      guardCounts: {airborne: 0, goal: 0, 'out-of-domain': 0},
      domainFallbackSteps: 0, domainFallbackFrequency: 0};
    function apply(action) {
      const bounded = readAction(action), previous = state.observation.position, beforeTick = state.observation.tick;
      const next = world.step(bounded);
      if (!['running','succeeded','timed-out','out-of-bounds'].includes(next.status) || !validObservation(next.observation) || next.observation.tick !== beforeTick + 1)
        throw new Error('Engine failed to advance one valid physics step; evaluation is incomplete.');
      state = next; actions.push(bounded);
      const o = state.observation;
      metrics.pathMetres += Math.hypot(o.position.x - previous.x,
        o.position.y - previous.y, o.position.z - previous.z);
      metrics.peakSpeed = Math.max(metrics.peakSpeed, speed(o));
    }
    for (const action of tape) {
      if (state.status !== 'running') break;
      apply(action);
      warmupSteps++;
    }
    const switchState = state;
    while (state.status === 'running' && actions.length < MACHINE.maxSteps) {
      const o = state.observation, guard = guardKind(o);
      if (collectRows && !guard && o.tick % P.sampleEvery === 0) {
        const teacherAction = decide(P.teacher, o);
        rows.push({features: extractFeatures(o), demand: teacherAction.throttle - teacherAction.brake,
          partition, seed, course, observation: o, teacherAction});
      }
      metrics.policyCalls++;
      if (policyKind === 'learned' && !guard) metrics.modelCalls++;
      const action = policy(o);
      apply(action);
      metrics.policySteps++;
      if (guard) metrics.guardCounts[guard]++;
      if (policyKind === 'learned') {
        if (!guard) metrics.modelSteps++;
        if (guard === 'out-of-domain') metrics.domainFallbackSteps++;
      }
    }
    if (state.status === 'running') throw new Error('Engine did not enforce its existing step limit.');
    const o = state.observation;
    metrics.goalDistance = Math.hypot(o.position.x - o.goal.x, o.position.y - o.goal.y, o.position.z - o.goal.z);
    metrics.chassisContactStarts = state.chassisContactStarts;
    metrics.domainFallbackFrequency = metrics.policySteps ? metrics.domainFallbackSteps / metrics.policySteps : 0;
    return {switchState, final: state, warmupSteps, actions, rows, metrics};
  } finally {
    world.dispose();
  }
}
