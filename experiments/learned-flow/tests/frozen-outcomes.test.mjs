import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadRapier} from '../../rover3d/engine.mjs';import {loadPolicy} from '../browser-runtime.mjs';import {runEpisode} from '../experiment.mjs';
test('portable saved inference preserves all42 previously published validation/test/reference outcomes without refitting',async()=>{
 const R=await loadRapier(),policy=await loadPolicy(readFileSync(new URL('../model/model.json',import.meta.url),'utf8'));
 const records=JSON.parse(readFileSync(new URL('../model/evaluation-summary.json',import.meta.url))).episodes;assert.equal(records.length,42);
 try{for(const expected of records){const got=runEpisode(R,expected.course,expected.seed,o=>policy.decide(o).action,{partition:expected.partition,policyKind:'learned'});
 assert.equal(got.final.status,expected.learned.status);assert.equal(got.final.timeSeconds,expected.learned.totalSeconds);for(const [key,value] of Object.entries(expected.learned.metrics))assert.equal(got.metrics[key],value,key+' / '+expected.course+' / '+expected.seed);}}
 finally{policy.dispose();}
});
