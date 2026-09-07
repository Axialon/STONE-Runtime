import test from 'node:test';import assert from 'node:assert/strict';
import {loadRapier} from '../experiments/rover3d/engine.mjs';import {defaultRoute} from '../packages/routes/contract.mjs';
import {createRouteSession} from '../packages/routes/runtime.mjs';import {inspectStoneData} from '../packages/lab/inspection.mjs';
const R=await loadRapier();
for(const [host,id] of [['rover','rover.flow'],['drone','drone.cinema'],['humanoid','humanoid.fluid']])test('AUDIT reexecutes '+host+' custom route rather than calling it a fixed benchmark',async()=>{
 const route=defaultRoute(host),s=createRouteSession(R,route,id);let d;
 try{s.advance(12);s.stop();d=s.export();}finally{s.dispose();}
 const r=await inspectStoneData(R,JSON.stringify(d));assert.equal(r.valid,true);assert.equal(r.verification,'engine-reexecution');assert.equal(r.summary.status,'stopped');assert.equal(r.summary.steps,12);assert.equal(r.summary.scope,'custom-route');assert.deepEqual(r.summary.route,route);assert.ok(Number.isFinite(r.results[0].pathMetres));assert.equal(r.installation,'not-performed');
 await assert.rejects(inspectStoneData(R,JSON.stringify(d),host==='drone'?'rover':'drone'));
 await assert.rejects(inspectStoneData(R,JSON.stringify({...d,finalStatus:'succeeded'})));
});
