import test from 'node:test';import assert from 'node:assert/strict';
import {loadRapier} from '../experiments/rover3d/engine.mjs';
import {createDroneSession,replayDroneSession} from '../packages/lab/drone-session.mjs';
import {createHumanoidSession,replayHumanoidSession} from '../packages/lab/humanoid-session.mjs';
const R=await loadRapier();
function use(fn){const s=createDroneSession(R,'inspection','drone.cinema');try{return fn(s);}finally{s.dispose();}}
test('drone session advances the actual host',()=>use(s=>{const r=s.advance(24);assert.equal(r.frames.length,24);assert.equal(r.state.frame.tick,24);assert.equal(r.actions.length,24);}));
for(const n of [0,-1,25,1.5,NaN])test('invalid drone session batch '+n,()=>use(s=>{const b=s.read();assert.throws(()=>s.advance(n));assert.deepEqual(s.read(),b);}));
test('drone swap keeps pose, orientation, momentum and time',()=>use(s=>{s.advance(24);const b=s.read();s.select('drone.agile');assert.deepEqual(s.read().frame,b.frame);assert.equal(s.advance(1).frames[0].stoneId,'drone.agile');}));
test('mixed-style tape replays after disposing the original world',()=>{const s=createDroneSession(R);s.advance(24);s.select('drone.survey');s.advance(24);const before=s.read(),data=s.export();s.dispose();const r=replayDroneSession(R,JSON.stringify(data));assert.deepEqual(r.frames.at(-1),before);assert.equal(r.frames[30].stoneId,'drone.survey');});
test('another host recording is rejected before execution',()=>use(s=>{assert.throws(()=>replayHumanoidSession(R,JSON.stringify(s.export())));const h=createHumanoidSession(R);try{assert.throws(()=>replayDroneSession(R,JSON.stringify(h.export())));}finally{h.dispose();}}));
test('invalid recorded rotor force is rejected',()=>use(s=>{s.advance(1);const d=structuredClone(s.export());d.actions[0][0]=2;assert.throws(()=>replayDroneSession(R,JSON.stringify(d)));}));
test('stopped drone session retains status and rejects further advance',()=>use(s=>{s.advance(2);const b=s.stop();assert.equal(s.advance(1).frames.length,0);assert.deepEqual(replayDroneSession(R,JSON.stringify(s.export())).frames.at(-1).frame,b.frame);}));
