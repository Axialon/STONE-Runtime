import test from 'node:test';
import assert from 'node:assert/strict';
import {STONES,getStone,decide} from '../stones.mjs';
import {createRover,replayRover} from '../host.mjs';
import {PROFILE,MACHINE,readAction,makeReplay,checkRoverCompatibility} from '../contract.mjs';
const observation = (x=0,z=-8,speed=0) => ({profile:PROFILE,tick:100,position:{x,y:0.5154,z},rotation:{x:0,y:0,z:0,w:1},linearVelocity:{x:0,y:0,z:speed},angularVelocity:{x:0,y:0,z:0},wheelContacts:[true,true,true,true],goal:{x:0,y:0.5,z:8}});
test('three genuine rover packages declare honest implementation and compatibility',()=>{
  assert.deepEqual(STONES.map(s=>s.id),['rover.flow','rover.dart','rover.anchor']);
  for(const s of STONES){assert.equal(s.implementation,'rule-based');assert.equal(s.execution,'local');assert.equal(s.version,'0.1.0');assert.equal(checkRoverCompatibility(s.compatibility).compatible,true);assert.ok(Object.isFrozen(s));}
});
test('unknown and planar package IDs cannot enter the rover runtime',()=>{for(const id of ['flow','unknown','__proto__',null])assert.throws(()=>getStone(id));});
test('controllers consume only valid detached observations',()=>{for(const bad of [null,{}, {...observation(),tick:-1},{...observation(),position:{x:NaN,y:0,z:0}}])assert.throws(()=>decide('rover.flow',bad));});
test('supported commands are bounded, deterministic and do not mutate observations',()=>{
  for(const s of STONES){const o=observation();const before=structuredClone(o);const a=decide(s.id,o);assert.deepEqual(readAction(a),a);assert.deepEqual(decide(s.id,o),a);assert.deepEqual(o,before);}
});
test('airborne observations are not driven blindly',()=>{assert.equal(decide('rover.dart',{...observation(),wheelContacts:[false,false,false,false]}).throttle,0);});
test('goal approach brakes rather than increasing machine power',()=>{
  for(const s of STONES){const a=decide(s.id,observation(0,7.6,3));assert.equal(a.throttle,0);assert.ok(a.brake>0);assert.equal(decide(s.id,observation(0,0,0)).brake,0);}
});
test('new goal changes steering; style is not a prerecorded tape',()=>{
  const left=observation(),right=observation();left.goal.x=-3;right.goal.x=3;
  const a=decide('rover.flow',left),b=decide('rover.flow',right);assert.ok(a.steering*b.steering<0);
});
for(const course of ['flat-lane','ramp-lane'])for(const id of ['rover.flow','rover.dart','rover.anchor'])test(`${id} reaches and stops at the goal on ${course}`,async()=>{
  const h=await createRover(course);try{for(let i=0;i<MACHINE.maxSteps&&h.snapshot().status==='running';i++)h.step(decide(id,h.snapshot().observation));
    const f=h.snapshot();assert.equal(f.status,'succeeded',JSON.stringify(f));assert.ok(Math.hypot(...Object.values(f.observation.linearVelocity))<=MACHINE.goalSpeed);assert.equal(f.machineVersion,MACHINE.version);
  }finally{h.dispose();}
});
test('style changes produce different traces on identical hardware',async()=>{
  const traces=[];for(const s of STONES){const h=await createRover();try{const t=[];for(let i=0;i<200;i++){h.step(decide(s.id,h.snapshot().observation));t.push(h.snapshot().observation.position.z);}traces.push(t);}finally{h.dispose();}}
  assert.notDeepEqual(traces[0],traces[1]);assert.notDeepEqual(traces[0],traces[2]);
});
test('swapping a rover Stone preserves engine state and yields a replayable action tape',async()=>{
  const h=await createRover(),actions=[];try{for(let i=0;i<240;i++){const before=h.snapshot();const a=decide(i<120?'rover.flow':'rover.dart',before.observation);assert.deepEqual(h.snapshot(),before);actions.push(a);h.step(a);}
    const replay=await replayRover(JSON.stringify(makeReplay('flat-lane',actions)));assert.deepEqual(replay.final,h.snapshot());
  }finally{h.dispose();}
});
