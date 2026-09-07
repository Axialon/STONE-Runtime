import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../measurements.mjs';
import {runEpisode,predictAction} from '../experiment.mjs';
import {loadRapier} from '../../rover3d/engine.mjs';
import {decide} from '../../rover3d/stones.mjs';
const episode=(status='succeeded',calls=2,warmupStatus='running')=>({
 switchState:{status:warmupStatus,timeSeconds:1},final:{status,timeSeconds:2},
 metrics:{pathMetres:1,peakSpeed:1,goalDistance:.2,chassisContactStarts:0,
 modelSteps:calls,policySteps:3,modelCalls:calls,policyCalls:3,
 guardCounts:{airborne:1,goal:0,'out-of-domain':0},domainFallbackSteps:0}});
test('success is labelled system outcome and separates zero-inference and warmup completion',()=>{
 const a=episode(),b=episode('succeeded',0),c=episode('succeeded',0,'succeeded');c.final.timeSeconds=1;
 const r=summarize([a,b,c].map(learned=>({learned})),'learned');
 assert.equal(r.system,'learned-plus-deterministic-harness');assert.equal(r.successes,3);
 assert.equal(r.modelInvokedSuccesses,1);assert.equal(r.zeroModelCallSuccesses,2);
 assert.equal(r.warmupOnlySuccesses,1);assert.equal(r.meanTotalSeconds,5/3);
});
test('summary preserves ordinary failures instead of replacing their seeds',()=>{
 const r=summarize([{teacher:episode('succeeded',0)},{teacher:episode('timed-out',0)},{teacher:episode('out-of-bounds',0)}],'teacher');
 assert.equal(r.episodes,3);assert.equal(r.successRate,1/3);assert.equal(r.statuses['timed-out'],1);
 assert.equal(r.system,'rule-reference');
});
test('summary does not accept engine faults or nonfinite measurements as task evidence',()=>{
 assert.throws(()=>summarize([{learned:episode('engine-fault')}],'learned'));
 const e=episode();e.metrics.peakSpeed=NaN;assert.throws(()=>summarize([{learned:e}],'learned'));
});
test('actual model inference calls and applied policy ticks are counted separately',async()=>{
 const R=await loadRapier();let calls=0;const model={predict(){calls++;return [.2];}};
 const e=runEpisode(R,'flat-lane',1001,o=>predictAction(model,o),{partition:'train',policyKind:'learned'});
 assert.equal(e.metrics.modelCalls,calls);assert.equal(e.metrics.modelSteps,calls);
 assert.equal(e.metrics.policyCalls,e.metrics.policySteps);
 assert.equal(e.metrics.policySteps+e.warmupSteps,e.final.observation.tick);
 assert.equal(e.metrics.policySteps,e.actions.length-e.warmupSteps);
});
test('returned engine-fault fails the experiment, not just one performance score',async()=>{
 const R=await loadRapier(),FaultR={...R,World:class extends R.World{step(){throw new Error('deliberate test fault');}}};
 assert.throws(()=>runEpisode(FaultR,'flat-lane',1001,o=>decide('rover.flow',o),{partition:'train'}),/engine|advance/i);
});
