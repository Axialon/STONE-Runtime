import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE, MACHINE, ENGINE, readAction, validObservation, getCourse,
  checkRoverCompatibility, parseReplay, makeReplay, wheelCommands } from '../contract.mjs';
const profile = 'stone.rover.control/0.1';
const v = (x=0,y=0,z=0) => ({x,y,z});
const action = (throttle=0,steering=0,brake=0) => ({throttle,steering,brake});
const observation = () => ({profile, tick:0, position:v(0,0.8,-8),
  rotation:{x:0,y:0,z:0,w:1}, linearVelocity:v(), angularVelocity:v(),
  wheelContacts:[false,false,false,false], goal:v(0,0.5,8)});
const compatible = () => ({profile, machineVersion:'stone.rover.machine/0.1.0',
  execution:'local', actions:['throttle','steering','brake']});
function course(id='flat-lane') { const c=getCourse(id); assert.ok(c,'course must exist');return c; }

test('3D profile is explicit and cannot reuse planar acceleration channels',()=>{
  assert.equal(PROFILE,profile);
  assert.deepEqual(ENGINE,{package:'@dimforge/rapier3d-compat',version:'0.20.0'});
});
test('machine has fixed gravity, step, axes and four wheels',()=>{
  assert.ok(MACHINE,'machine must exist'); assert.equal(MACHINE.dt,1/60);
  assert.equal(MACHINE.maxSteps,3600); assert.equal(MACHINE.upAxis,1);assert.equal(MACHINE.forwardAxis,2);
  assert.deepEqual(MACHINE.gravity,v(0,-9.81,0));assert.equal(MACHINE.wheels.length,4);
  assert.ok(Object.isFrozen(MACHINE)&&Object.isFrozen(MACHINE.wheels[0]));
});
test('valid action is copied and deeply independent',()=>{
  const a=action(0.4,-0.3,0.2), b=readAction(a);assert.deepEqual(b,a);
  assert.notEqual(a,b);assert.ok(Object.isFrozen(b)); a.throttle=1;assert.equal(b.throttle,0.4);
});
for(const [name,a] of [
  ['empty',{}],['null',null],['array',[]],['NaN',action(NaN)],['infinity',action(Infinity)],
  ['string',action('1')],['high throttle',action(1.01)],['low throttle',action(-1.01)],
  ['steering',action(0,1.01)],['negative brake',action(0,0,-0.1)],['high brake',action(0,0,2)],
  ['extra authority',{...action(),mass:0}],['planar',{acceleration:{x:1,y:0}}]
]) test(`reject action: ${name}`,()=>assert.throws(()=>readAction(a),TypeError));
test('action accessors are rejected without invoking them',()=>{
  let calls=0; const a=action();Object.defineProperty(a,'throttle',{get(){calls++;return 1;}});
  assert.throws(()=>readAction(a),TypeError);assert.equal(calls,0);
});
test('valid three-dimensional observation is accepted',()=>assert.equal(validObservation(observation()),true));
for(const [name,change] of [
  ['old profile',o=>o.profile='stone.arena.control/0.1'],['missing altitude',o=>delete o.position.y],
  ['NaN velocity',o=>o.linearVelocity.x=NaN],['nonnormal quaternion',o=>o.rotation.w=2],
  ['zero quaternion',o=>o.rotation.w=0],['wrong wheel count',o=>o.wheelContacts.pop()],
  ['fake contact',o=>o.wheelContacts[0]=1],['fractional tick',o=>o.tick=0.5],
  ['past timeout',o=>o.tick=3601],['extra field',o=>o.secret='DO_NOT_ECHO']
]) test(`reject observation: ${name}`,()=>{const o=observation();change(o);assert.equal(validObservation(o),false);});
test('both signs of a unit quaternion are permitted',()=>{
  const o=observation();o.rotation.w=-1;assert.equal(validObservation(o),true);
});
test('negative zero in action values is canonicalised',()=>assert.deepEqual(readAction(action(-0,-0,-0)),action()));
test('actuator mapping uses one machine and brake overrides propulsion',()=>{
  const a=wheelCommands(action(1,1,0));assert.ok(a);assert.equal(a.length,4);
  assert.ok(a.every(w=>w.engineForce===40&&w.brakeImpulse===0));
  assert.deepEqual(a.map(w=>w.steeringAngle),[0.5,0.5,0,0]);
  const b=wheelCommands(action(1,-1,0.5));assert.ok(b.every(w=>w.engineForce===0&&w.brakeImpulse===3));
});
test('courses are fixed immutable data, not generated engine code',()=>{
  const a=course(),b=course('ramp-lane');assert.equal(a.id,'flat-lane');assert.equal(b.id,'ramp-lane');
  assert.equal(a.version,'stone.rover.course/0.1.0');assert.ok(Object.isFrozen(a.colliders));
  assert.deepEqual(a.spawn,b.spawn);assert.deepEqual(a.goal,b.goal);
  assert.ok(b.colliders.length>a.colliders.length);assert.ok(b.colliders.some(c=>c.rotation.x!==0));
  assert.equal(new Set(b.colliders.map(c=>c.id)).size,b.colliders.length);
});
test('no caller course, executable URL or machine override is admitted',()=>{
  for(const id of ['other','https://example.invalid/engine.js',{},()=>{},null])assert.throws(()=>getCourse(id),TypeError);
});
test('compatible passport accepted without claiming model quality',()=>{
  assert.deepEqual(checkRoverCompatibility(compatible()),{compatible:true,errors:[]});
});
test('planar and mismatched machine passports are incompatible',()=>{
  for(const c of [{...compatible(),profile:'stone.arena.control/0.1'},
    {...compatible(),machineVersion:'other'}, {...compatible(),execution:'cloud'},
    {...compatible(),actions:['acceleration']}, null]){
    const r=checkRoverCompatibility(c);assert.ok(r);assert.equal(r.compatible,false);assert.ok(r.errors.length);
  }
});
test('replay pins course, engine, host and machine; makes detached frozen actions',()=>{
  const a=[action(0.2)];const r=makeReplay('flat-lane',a);assert.ok(r);
  assert.equal(r.profile,profile);assert.deepEqual(r.engine,ENGINE);assert.equal(r.actions.length,1);
  a[0].throttle=1;assert.equal(r.actions[0].throttle,0.2);assert.ok(Object.isFrozen(r.actions));
  assert.deepEqual(parseReplay(JSON.stringify(r)),r);
});
test('all replay compatibility mismatches reject before engine execution',()=>{
  const r=makeReplay('flat-lane',[action()]);assert.ok(r);
  for(const [field,value] of [['profile','stone.arena.control/0.1'],['courseId','other'],
    ['courseVersion','other'],['machineVersion','other'],['schemaVersion','other'],
    ['engine',{...ENGINE,version:'0.0.0'}]])assert.throws(()=>parseReplay(JSON.stringify({...r,[field]:value})),TypeError);
});
test('replay shape, size and action limits are checked',()=>{
  for(const s of ['',null,'{','[]',' '.repeat(1048577)])assert.throws(()=>parseReplay(s),TypeError);
  assert.throws(()=>makeReplay('flat-lane',Array(3601).fill(action())),TypeError);
  assert.throws(()=>makeReplay('flat-lane',Array(2)),TypeError);
  assert.throws(()=>makeReplay('flat-lane',[action(2)]),TypeError);
});
test('replay actions cannot execute accessors or carry non-index properties',()=>{
  let called=0;const a=[action()];Object.defineProperty(a,'0',{get(){called++;return action();}});
  assert.throws(()=>makeReplay('flat-lane',a),TypeError);assert.equal(called,0);
  const b=[action()];b.extra=1;assert.throws(()=>makeReplay('flat-lane',b),TypeError);
});
test('custom array prototypes are rejected before inherited methods execute',()=>{
  let calls=0;const actions=[action()];
  Object.setPrototypeOf(actions,{map(){calls++;return [];}});
  assert.throws(()=>makeReplay('flat-lane',actions),TypeError);assert.equal(calls,0);
  const o=observation();Object.setPrototypeOf(o.wheelContacts,{every(){calls++;return true;}});
  assert.equal(validObservation(o),false);assert.equal(calls,0);
});
test('experiment package pins the same exact dependency as the replay contract',async()=>{
  const {readFile}=await import('node:fs/promises');
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.deepEqual(pkg.dependencies,{[ENGINE.package]:ENGINE.version});assert.equal(pkg.private,true);
});
