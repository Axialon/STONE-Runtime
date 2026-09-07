import protocol from './protocol.json' with {type:'json'};
import {freeze,validObservation,readAction} from '../rover3d/contract.mjs';
export const PROTOCOL=freeze(protocol),protocolSha256='ee6f721ca0cd79788efb0023f89a322913181703b5ddb56ab33bbe56bbe978e1';
const P=PROTOCOL;
export const LIMIT=1048576,MAX_ROWS=20000,OPTIONS=Object.freeze({...P.modelOptions,kind:'regression'});
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const fail=message=>{throw new TypeError(message);};
function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  return actual.length === keys.length && keys.every(key => Object.hasOwn(descriptors, key)) &&
    actual.every(key => typeof key === 'string' && keys.includes(key) &&
      Object.hasOwn(descriptors[key], 'value') && descriptors[key].enumerable);
}
export function inDomain(features) {
  return Array.isArray(features) && features.length === 4 &&
    Array.from(features).every((x, i) => Number.isFinite(x) &&
      x >= P.featureDomain[i][0] && x <= P.featureDomain[i][1]);
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

export function validateMetadata(meta) {
  if (!exactKeys(meta, ['trainingDataSha256', 'trainingRows']) ||
      !/^[a-f0-9]{64}$/.test(meta.trainingDataSha256) ||
      !Number.isInteger(meta.trainingRows) || meta.trainingRows < P.modelOptions.minNumSamples ||
      meta.trainingRows > MAX_ROWS) fail('Invalid model metadata.');
}
export function validateOptions(options) {
  if (!exactKeys(options, Object.keys(OPTIONS)) ||
      Object.keys(OPTIONS).some(key => options[key] !== OPTIONS[key])) fail('Unsupported tree options.');
}
export function validateTree(tree) {
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

/** Pure data validation; hashing and executable loading are caller responsibilities. */
export function decodeArtifact(text){
 if(typeof text!=='string'||text.length>LIMIT||new TextEncoder().encode(text).length>LIMIT)fail('Invalid artifact size.');
 const value=JSON.parse(text);
 if(!exactKeys(value,['format','protocolSha256','library','harnessVersion','engine','teacher','meta','tree'])||
 value.format!=='stone.learned-flow/0.1'||value.protocolSha256!==protocolSha256||value.library!==P.library||
 value.harnessVersion!==P.harnessVersion||value.engine!==P.engine||value.teacher!==P.teacher)fail('Incompatible artifact identity.');
 validateMetadata(value.meta);validateTree(value.tree);return value;
}
