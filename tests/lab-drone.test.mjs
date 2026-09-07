import test from 'node:test';
import assert from 'node:assert/strict';
import {loadRapier} from '../experiments/rover3d/engine.mjs';
import {DRONE,createDrone,droneDecision} from '../packages/lab/drone.mjs';
const R=await loadRapier();
function use(fn,task='hover'){const h=createDrone(R,task);try{return fn(h);}finally{h.dispose();}}
test('drone is a separate versioned simulated rigid body',()=>use(h=>{const s=h.read();assert.equal(s.profile,'stone.drone.rotors/0.1');assert.equal(s.machineVersion,DRONE.version);assert.equal(s.rotors.length,4);assert.equal(s.tick,0);}));
test('gravity moves the body without thrust',()=>use(h=>{const y=h.read().position.y;for(let i=0;i<24;i++)h.step([0,0,0,0]);assert.ok(h.read().position.y<y-.1);assert.ok(h.read().velocity.y<0);}));
test('equal weight-supporting thrust holds the initial altitude',()=>use(h=>{const y=h.read().position.y,a=DRONE.massKg*9.81/(4*DRONE.maxRotorForce);for(let i=0;i<120;i++)h.step([a,a,a,a]);assert.ok(Math.abs(h.read().position.y-y)<.02);assert.ok(Math.hypot(...Object.values(h.read().angularVelocity))<.01);}));
test('asymmetric rotor forces produce rotation through physics',()=>use(h=>{for(let i=0;i<15;i++)h.step([.6,.2,.2,.2]);const s=h.read();assert.ok(Math.hypot(s.rotation.x,s.rotation.y,s.rotation.z)>.03);}));
for(const a of [null,[],[0,0,0],[0,0,0,2],[NaN,0,0,0],[-1,0,0,0]])test('invalid rotor input does not advance '+JSON.stringify(a),()=>use(h=>{const b=h.read();assert.equal(h.step(a).status,'invalid-action');assert.equal(h.read().tick,b.tick);assert.deepEqual(h.read().position,b.position);}));
for(const task of ['hover','inspection'])for(const id of ['drone.cinema','drone.survey','drone.agile'])test(id+' completes '+task,()=>use(h=>{while(h.read().status==='running')h.step(droneDecision(id,h.read()));const s=h.read();assert.equal(s.status,'succeeded',JSON.stringify(s));assert.equal(s.completed,s.targets.length);},task));
test('commands and physics replay deterministically',()=>use(h=>{const tape=[];for(let i=0;i<240;i++){const a=droneDecision('drone.cinema',h.read());tape.push(a);h.step(a);}const other=createDrone(R);try{tape.forEach(a=>other.step(a));assert.deepEqual(other.read(),h.read());}finally{other.dispose();}}));
test('wrong host and machine version are rejected',()=>use(h=>{assert.throws(()=>droneDecision('humanoid.fluid',h.read()));assert.throws(()=>droneDecision('drone.cinema',{...h.read(),machineVersion:'other'}));assert.throws(()=>droneDecision('drone.cinema',{}));}));
test('Stop and dispose prevent further state advances',()=>use(h=>{const s=h.stop();assert.equal(s.status,'stopped');assert.deepEqual(h.step([0,0,0,0]),s);h.dispose();h.dispose();assert.throws(()=>h.step([0,0,0,0]));}));
test('engine identity is checked before allocating a simulation',()=>{let created=false;assert.throws(()=>createDrone({version:()=> 'other',World:class{constructor(){created=true;}}}),/engine version/i);assert.equal(created,false);});
test('extreme or malformed state is rejected instead of producing invalid commands',()=>use(h=>{for(const patch of [{tick:-1},{tick:1.5},{velocity:{x:1e308,y:0,z:0}},{goal:{x:1e200,y:0,z:0}},{rotation:{x:0,y:0,z:0,w:2}}])assert.throws(()=>droneDecision('drone.cinema',{...h.read(),...patch}));}));
