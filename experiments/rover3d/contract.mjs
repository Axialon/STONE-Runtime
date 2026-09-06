/** Experimental data contract only. No physics, network or executable package loading. */
export const PROFILE = 'stone.rover.control/0.1';
export const ENGINE = Object.freeze({ package: '@dimforge/rapier3d-compat', version: '0.20.0' });
const REPLAY_VERSION = 'stone.rover.replay/0.1.0';
const COURSE_VERSION = 'stone.rover.course/0.1.0';
export function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const vector = (x, y, z) => ({ x, y, z });
const identity = () => ({ x: 0, y: 0, z: 0, w: 1 });
export const MACHINE = freeze({
  version: 'stone.rover.machine/0.1.0', dt: 1 / 60, maxSteps: 3600,
  upAxis: 1, forwardAxis: 2, gravity: vector(0, -9.81, 0),
  massKg: 40, chassisHalfExtents: vector(0.45, 0.15, 0.7),
  maxEngineForcePerWheelN: 40, maxSteeringRadians: 0.5, maxBrakeImpulsePerWheelNs: 6,
  wheelRadius: 0.22, suspensionRestLength: 0.25, suspensionStiffness: 40,
  suspensionCompression: 4.4, suspensionRelaxation: 2.3, maxSuspensionForce: 1000,
  frictionSlip: 1.5, sideFrictionStiffness: 1,
  wheels: [vector(-0.46, -0.1, 0.53), vector(0.46, -0.1, 0.53),
    vector(-0.46, -0.1, -0.53), vector(0.46, -0.1, -0.53)],
  goalRadius: 0.8, goalSpeed: 0.4, minHeight: -5, maxHeight: 20, maxHorizontalDistance: 30
});

// Own enumerable JSON data only; executable objects and Proxies are outside this API.
function record(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  const d = Object.getOwnPropertyDescriptors(value), k = Reflect.ownKeys(d);
  return k.length === keys.length && keys.every(key => Object.hasOwn(d, key)) &&
    k.every(key => typeof key === 'string' && keys.includes(key) &&
      Object.hasOwn(d[key], 'value') && d[key].enumerable);
}
function dense(value, max) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) return false;
  const d = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(d).length === value.length + 1 &&
    Array.from({ length: value.length }, (_, i) => d[i]).every(x => x &&
      Object.hasOwn(x, 'value') && x.enumerable);
}
function vec(value) {
  return record(value, ['x', 'y', 'z']) && [value.x, value.y, value.z].every(Number.isFinite);
}
function quat(value) {
  return record(value, ['x', 'y', 'z', 'w']) && [value.x, value.y, value.z, value.w].every(Number.isFinite) &&
    Math.abs(Math.hypot(value.x, value.y, value.z, value.w) - 1) <= 1e-5;
}
export function readAction(value) {
  if (!record(value, ['throttle', 'steering', 'brake']) ||
      ![value.throttle, value.steering, value.brake].every(Number.isFinite) ||
      Math.abs(value.throttle) > 1 || Math.abs(value.steering) > 1 || value.brake < 0 || value.brake > 1)
    throw new TypeError('Invalid rover action.');
  return Object.freeze({ throttle: value.throttle || 0, steering: value.steering || 0, brake: value.brake || 0 });
}
export function validObservation(o) {
  return record(o, ['profile', 'tick', 'position', 'rotation', 'linearVelocity', 'angularVelocity', 'wheelContacts', 'goal']) &&
    o.profile === PROFILE && Number.isInteger(o.tick) && o.tick >= 0 && o.tick <= MACHINE.maxSteps &&
    vec(o.position) && quat(o.rotation) && vec(o.linearVelocity) && vec(o.angularVelocity) && vec(o.goal) &&
    dense(o.wheelContacts, 4) && o.wheelContacts.length === 4 && o.wheelContacts.every(x => typeof x === 'boolean');
}
export function wheelCommands(value) {
  const a = readAction(value);
  return freeze(MACHINE.wheels.map((_, i) => ({
    engineForce: a.brake > 0 ? 0 : a.throttle * MACHINE.maxEngineForcePerWheelN,
    steeringAngle: i < 2 ? a.steering * MACHINE.maxSteeringRadians : 0,
    brakeImpulse: a.brake * MACHINE.maxBrakeImpulsePerWheelNs
  })));
}

// Original fixed test geometry. Parameters are prototype choices, not a calibrated vehicle.
const box = (id, position, halfExtents, rotation = identity()) => ({id, position, halfExtents, rotation, friction: 0.8});
const base = [
  box('floor', vector(0, -0.1, 0), vector(5, 0.1, 12)),
  box('left-wall', vector(-5, 0.5, 0), vector(0.1, 0.5, 12)),
  box('right-wall', vector(5, 0.5, 0), vector(0.1, 0.5, 12)),
  box('end-wall', vector(0, 0.5, 11.5), vector(5, 0.5, 0.1))
];
const spawn = {position: vector(0, 0.8, -8), rotation: identity()};
const courses = new Map([
  ['flat-lane', freeze({id: 'flat-lane', version: COURSE_VERSION, spawn, goal: vector(0, 0.5, 8), colliders: base})],
  ['ramp-lane', freeze({id: 'ramp-lane', version: COURSE_VERSION, spawn, goal: vector(0, 0.5, 8), colliders: [...base,
    box('ramp-up', vector(0, 0.3, -2), vector(1.2, 0.08, 2), {x: -0.07492970727274234, y: 0, z: 0, w: 0.9971888181122075}),
    box('platform', vector(0, 0.6, 0.7), vector(1.2, 0.08, 0.7)),
    box('ramp-down', vector(0, 0.3, 3.4), vector(1.2, 0.08, 2), {x: 0.07492970727274234, y: 0, z: 0, w: 0.9971888181122075})
  ]})]
]);
export function getCourse(id = 'flat-lane') {
  if (typeof id !== 'string' || !courses.has(id)) throw new TypeError('Unknown rover course.');
  return courses.get(id);
}
export function checkRoverCompatibility(value) {
  const ok = record(value, ['profile', 'machineVersion', 'execution', 'actions']) && value.profile === PROFILE &&
    value.machineVersion === MACHINE.version && value.execution === 'local' && dense(value.actions, 3) &&
    value.actions.length === 3 && ['throttle', 'steering', 'brake'].every((x, i) => value.actions[i] === x);
  return freeze({compatible: ok, errors: ok ? [] : ['incompatible-rover-profile']});
}
export function makeReplay(courseId, actions) {
  const c = getCourse(courseId);
  if (!dense(actions, MACHINE.maxSteps)) throw new TypeError('Invalid or oversized rover action tape.');
  return freeze({schemaVersion: REPLAY_VERSION, profile: PROFILE, machineVersion: MACHINE.version,
    courseId: c.id, courseVersion: c.version, engine: {...ENGINE}, actions: actions.map(readAction)});
}
export function parseReplay(text) {
  if (typeof text !== 'string' || text.length > 1048576 || new TextEncoder().encode(text).length > 1048576)
    throw new TypeError('Invalid or oversized rover replay.');
  let value;
  try { value = JSON.parse(text); } catch { throw new TypeError('Invalid rover replay JSON.'); }
  if (!record(value, ['schemaVersion', 'profile', 'machineVersion', 'courseId', 'courseVersion', 'engine', 'actions']) ||
      value.schemaVersion !== REPLAY_VERSION || value.profile !== PROFILE || value.machineVersion !== MACHINE.version ||
      value.courseVersion !== COURSE_VERSION || !record(value.engine, ['package', 'version']) ||
      value.engine.package !== ENGINE.package || value.engine.version !== ENGINE.version)
    throw new TypeError('Incompatible rover replay.');
  return makeReplay(value.courseId, value.actions);
}
