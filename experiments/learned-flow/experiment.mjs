import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {freeze, validObservation, readAction, MACHINE} from '../rover3d/contract.mjs';
import {createRoverWorld} from '../rover3d/world.mjs';
import {decide} from '../rover3d/stones.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
import {PROTOCOL,protocolSha256,LIMIT,MAX_ROWS,OPTIONS,inDomain,extractFeatures,guardKind,harnessAction,predictAction,validateMetadata,validateOptions,validateTree,decodeArtifact} from './policy.mjs';
export {PROTOCOL,protocolSha256,extractFeatures,guardKind,harnessAction,predictAction};
const protocolBytes = readFileSync(new URL('./protocol.json', import.meta.url));
if (sha256(protocolBytes) !== protocolSha256) throw new Error('Frozen protocol digest mismatch.');
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

const ownedModels = new WeakMap();
const fail = message => { throw new TypeError(message); };
function checkSeed(seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) fail('Seed must be uint32.');
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
  const value = decodeArtifact(text);
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
