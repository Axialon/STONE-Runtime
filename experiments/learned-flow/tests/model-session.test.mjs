import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadPolicy,MODEL_SHA256} from '../browser-runtime.mjs';
import {createModelSession,replayModelRecording,compareModelStones} from '../../../packages/learned-rover/session.mjs';
import {createSession} from '../../rover3d/session.mjs';import {loadRapier} from '../../rover3d/engine.mjs';
const R=await loadRapier(),text=readFileSync(new URL('../model/model.json',import.meta.url),'utf8');
const model=await loadPolicy(text);
for(const course of ['flat-lane','ramp-lane'])test('loaded model completes fixed '+course+' with actual inference and policy-verified replay',()=>{
 const s=createModelSession(R,course,'rover.flow-learned',model);try{
 while(s.read().frame.status==='running')s.advance(120);
 assert.equal(s.read().frame.status,'succeeded');assert.ok(s.metrics().modelCalls>400);assert.equal(s.metrics().ruleDecisions,0);
 const d=s.export();assert.equal(d.format,'stone.rover.policy-session/0.1');assert.equal(d.implementations['rover.flow-learned'].modelSha256,MODEL_SHA256);
 const r=replayModelRecording(R,JSON.stringify(d),model);assert.equal(r.policyVerified,true);assert.deepEqual(r.state,s.read());assert.equal(r.frames.length,d.tape.actions.length+1);
 }finally{s.dispose();}
});
test('rule/model/rule swaps preserve engine state and retain exact per-action attribution',()=>{
 const s=createModelSession(R,'flat-lane','rover.flow',model);try{
 s.advance(100);const before=s.read();s.select('rover.flow-learned');assert.deepEqual(s.read().frame,before.frame);assert.deepEqual(s.read().visual,before.visual);
 s.advance(100);const middle=s.read();s.select('rover.anchor');assert.deepEqual(s.read().frame,middle.frame);s.advance(2);s.stop();
 const d=s.export();assert.equal(d.counters.ruleDecisions,102);assert.ok(d.counters.modelCalls>0);assert.deepEqual(d.assignments.slice(0,100),Array(100).fill('rover.flow'));
 assert.equal(d.finalStatus,'stopped');assert.deepEqual(replayModelRecording(R,JSON.stringify(d),model).state,s.read());
 }finally{s.dispose();}
});
test('selecting after the last action and zero-action Stop survive replay without an extra tick',()=>{
 for(const n of [0,20]){const s=createModelSession(R,'flat-lane','rover.flow-learned',model);try{if(n)s.advance(n);s.select('rover.dart');s.stop();const d=s.export(),r=replayModelRecording(R,JSON.stringify(d),model);assert.deepEqual(r.state,s.read());assert.equal(r.frames.length,n+1);assert.equal(r.state.frame.observation.tick,n);}finally{s.dispose();}}
});
test('rules preserve their original trajectory and do not invoke the model',()=>{
 const a=createModelSession(R,'ramp-lane','rover.dart',model),b=createSession(R,'ramp-lane','rover.dart');try{for(let i=0;i<3;i++){a.advance(100);b.advance(100);assert.deepEqual(a.read().frame,b.read().frame);assert.deepEqual(a.read().visual,b.read().visual);}assert.equal(a.metrics().modelCalls,0);}finally{a.dispose();b.dispose();}
});
test('model comparison exposes four equivalent fixed-task outcomes and model identity',()=>{
 const b=compareModelStones(R,'flat-lane',model);assert.equal(b.scope,'fixed-model-reference');assert.equal(b.results.length,4);assert.ok(b.results.every(r=>r.status==='succeeded'));assert.equal(b.modelSha256,MODEL_SHA256);assert.ok(b.results.at(-1).modelCalls>400);assert.ok(b.results.slice(0,3).every(r=>r.modelCalls===0));
});
const recorded=()=>{const s=createModelSession(R,'flat-lane','rover.flow-learned',model);try{s.advance(80);s.stop();return structuredClone(s.export());}finally{s.dispose();}};
for(const [name,change] of [
 ['model hash',d=>d.implementations['rover.flow-learned'].modelSha256='0'.repeat(64)],
 ['harness identity',d=>d.implementations['rover.flow-learned'].harnessVersion='changed'],
 ['false success',d=>d.finalStatus='succeeded'],['false count',d=>d.counters.modelCalls++],
 ['different command',d=>d.tape.actions[65].throttle=.33],['misattribution',d=>d.assignments[65]='rover.dart'],
 ['extra URL',d=>d.modelUrl='https://invalid/'],['unknown stone',d=>d.finalStoneId='drone.agile']
])test('policy recording rejects '+name,()=>{const d=recorded();change(d);assert.throws(()=>replayModelRecording(R,JSON.stringify(d),model));});
test('model sessions reject untrusted handles, routes, invalid batches and disposed use',()=>{
 assert.throws(()=>createModelSession(R,'flat-lane','rover.flow-learned',{identity:{},decide(){}}));
 assert.throws(()=>createModelSession(R,'custom-route','rover.flow-learned',model));
 const s=createModelSession(R,'flat-lane','rover.flow',model);for(const n of [0,121,NaN,.5])assert.throws(()=>s.advance(n));assert.throws(()=>s.select('humanoid.fluid'));s.dispose();s.dispose();assert.throws(()=>s.advance(1));assert.throws(()=>s.export());
});
