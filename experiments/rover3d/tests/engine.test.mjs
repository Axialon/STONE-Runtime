import test from 'node:test';
import assert from 'node:assert/strict';
import {createRover, replayRover} from '../host.mjs';
import {loadRapier} from '../engine.mjs';
import {MACHINE, validObservation, makeReplay} from '../contract.mjs';
const a = (throttle=0,steering=0,brake=0) => ({throttle,steering,brake});
async function withHost(fn, course='flat-lane') {
  const h=await createRover(course); assert.ok(h && typeof h.step==='function','Rapier host must exist');
  try { await fn(h); } finally { h.dispose(); }
}
const steps = (h,n,action=a()) => {for(let i=0;i<n && h.snapshot().status==='running';i++)h.step(action);return h.snapshot();};
const speed = h => {const v=h.snapshot().observation.linearVelocity;return Math.hypot(v.x,v.y,v.z);};

test('actual pinned Rapier module initialises; no mocked physics permitted',async()=>{
  const R=await loadRapier();assert.ok(R && typeof R.World==='function','actual Rapier must load');
});
test('gravity settles the actual chassis onto ray-cast wheels',()=>withHost(h=>{
  const before=h.snapshot().observation;const after=steps(h,180).observation;
  assert.equal(validObservation(after),true);assert.ok(after.position.y<before.position.y);
  assert.ok(after.position.y>0.2);assert.ok(after.wheelContacts.some(Boolean));
}));
test('positive throttle moves forward and braking reduces speed',()=>withHost(h=>{
  steps(h,90);const start=h.snapshot().observation.position.z;
  steps(h,120,a(0.4));assert.ok(h.snapshot().observation.position.z>start+0.5);
  const moving=speed(h);assert.ok(moving>0.2);steps(h,30,a(0,0,1));assert.ok(speed(h)<moving);
}));
test('steering affects orientation without replacing body physics',()=>withHost(h=>{
  steps(h,90);steps(h,90,a(0.4,0.6));const q=h.snapshot().observation.rotation;
  assert.ok(Math.abs(q.y)>0.001);assert.equal(validObservation(h.snapshot().observation),true);
}));
test('ramp course can produce genuine vertical displacement',()=>withHost(h=>{
  steps(h,90);const rest=h.snapshot().observation.position.y;let top=rest;
  for(let i=0;i<600 && h.snapshot().status==='running';i++){
    h.step(a(0.35));top=Math.max(top,h.snapshot().observation.position.y);
  }
  assert.ok(top>rest+0.2,'height must come from engine contact with ramp, not a rendering offset');
},'ramp-lane'));
test('chassis collides with the end barrier rather than passing through it',()=>withHost(h=>{
  steps(h,90);const final=steps(h,1000,a(0.8));
  assert.ok(final.chassisContactStarts>0);assert.ok(final.observation.position.z<11.5);
}));
test('recorded actions replay identically on the same engine and host',async()=>{
  const tape=makeReplay('flat-lane',[...Array(90).fill(a()),...Array(100).fill(a(0.3,0.2)),...Array(30).fill(a(0,0,1))]);
  const first=await replayRover(JSON.stringify(tape));assert.ok(first && first.frames,'engine replay must exist');
  const second=await replayRover(JSON.stringify(tape));assert.deepEqual(first,second);
  assert.equal(first.frames.length,221);assert.equal(first.final.observation.tick,220);
});
test('invalid actions stop without advancing or accepting extra authority',()=>withHost(h=>{
  steps(h,30);const before=h.snapshot();const after=h.step({...a(),massKg:0});
  assert.equal(after.status,'invalid-action');assert.deepEqual(after.observation,before.observation);
}));
test('timeout, terminal stop and idempotent disposal are bounded',()=>withHost(h=>{
  const final=steps(h,MACHINE.maxSteps+1);assert.equal(final.status,'timed-out');
  assert.equal(final.observation.tick,MACHINE.maxSteps);assert.deepEqual(h.step(a(1)),final);
  h.dispose();h.dispose();assert.throws(()=>h.step(a()),/disposed/);
}));
test('Stop freezes simulation progression, not a claim of physical emergency braking',()=>withHost(h=>{
  steps(h,100,a(0.2));const before=h.snapshot();const stopped=h.stop();
  assert.equal(stopped.status,'stopped');assert.deepEqual(stopped.observation,before.observation);
  assert.deepEqual(h.step(a(1)),stopped);assert.deepEqual(h.stop(),stopped);
}));
