import test from 'node:test';import assert from 'node:assert/strict';
import {loadRapier} from '../experiments/rover3d/engine.mjs';
import {createHumanoid,humanoidDecision,HUMANOID} from '../packages/lab/humanoid.mjs';
const R=await loadRapier();
async function host(fn,task='reach'){const h=createHumanoid(R,task);try{await fn(h);}finally{h.dispose();}}
test('anchored humanoid uses actual jointed bodies',()=>host(h=>{const s=h.read();assert.equal(s.profile,HUMANOID.profile);assert.equal(s.segments.length,2);assert.equal(s.anchored,true);assert.equal(s.jointAngles.length,2);}));
test('motor target changes actual articulated pose',()=>host(h=>{const p=h.read().tip;for(let i=0;i<240;i++)h.step([-.5,-1.2]);assert.ok(h.read().tip.z>p.z+.2);assert.ok(h.read().jointAngles[1]<-.5);}));
for(const a of [null,[0],[-4,0],[0,1],[NaN,0]])test('invalid reach command rejected '+JSON.stringify(a),()=>host(h=>{const b=h.read();assert.equal(h.step(a).status,'invalid-action');assert.equal(h.read().tick,b.tick);assert.deepEqual(h.read().segments,b.segments);}));
for(const task of ['reach','high-reach'])for(const id of ['humanoid.fluid','humanoid.precise','humanoid.brisk'])test(id+' completes '+task,()=>host(h=>{while(h.read().status==='running')h.step(humanoidDecision(id,h.read()));const s=h.read();assert.equal(s.status,'succeeded',JSON.stringify(s));assert.equal(s.completed,s.targets.length);},task));
test('cross-host and invalid observation are rejected',()=>host(h=>{assert.throws(()=>humanoidDecision('drone.survey',h.read()));assert.throws(()=>humanoidDecision('humanoid.fluid',{}));}));
test('detached state and motor commands replay identically',()=>host(h=>{const actions=[];for(let i=0;i<240;i++){const s=h.read();assert.ok(Object.isFrozen(s));const a=humanoidDecision('humanoid.fluid',s);actions.push(a);h.step(a);}const b=createHumanoid(R);try{actions.forEach(a=>b.step(a));assert.deepEqual(b.read(),h.read());}finally{b.dispose();}}));
test('stopped host never advances and dispose is idempotent',()=>host(h=>{const b=h.stop();assert.equal(b.status,'stopped');assert.deepEqual(h.step([0,0]),b);h.dispose();h.dispose();assert.throws(()=>h.step([0,0]));}));

test('controller rejects an out-of-plane target or another machine version',()=>host(h=>{const s=structuredClone(h.read());s.goal.x+=.2;assert.throws(()=>humanoidDecision('humanoid.fluid',s));const t=structuredClone(h.read());t.machineVersion='other';assert.throws(()=>humanoidDecision('humanoid.fluid',t));}));
