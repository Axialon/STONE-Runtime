import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadArtifact,predictAction,runEpisode} from '../experiment.mjs';
import {loadRapier} from '../../rover3d/engine.mjs';
const read=p=>readFileSync(new URL('../model/'+p,import.meta.url),'utf8');
const text=read('model.json'),digest='d9a1ef32fa555b5f9d8fdd326a90b59f8c03228b3854564d99bed708d0a210c2';
const hash=x=>createHash('sha256').update(x).digest('hex');
test('saved trained tree has the pinned byte identity and 203 finite nodes',()=>{
 assert.equal(hash(text),digest);assert.match(read('model.json.sha256'),new RegExp('^'+digest));
 const m=JSON.parse(text);let nodes=0,leaves=0,maxDepth=0;
 const visit=(n,d=0)=>{nodes++;maxDepth=Math.max(maxDepth,d);if('distribution' in n){leaves++;assert.ok(Number.isFinite(n.distribution));}else{visit(n.left,d+1);visit(n.right,d+1);}};
 visit(m.tree.root);assert.deepEqual({nodes,leaves,maxDepth},{nodes:203,leaves:102,maxDepth:8});assert.equal(m.meta.trainingRows,4021);
});
test('committed evidence keeps test/validation/reference episodes separate and every model uses inference',()=>{
 const e=JSON.parse(read('evaluation-summary.json'));
 assert.equal(e.modelSha256,digest);assert.deepEqual(['train','validation','test','reference'].map(k=>e.episodes.filter(x=>x.partition===k).length),[0,16,24,2]);
 assert.ok(e.episodes.every(p=>p.learned.metrics.modelCalls>0&&p.replay.passed));assert.equal(e.liveRegistered,false);
 const p=JSON.parse(read('data-provenance.json'));assert.equal(p.fit.partition,'train');assert.equal(p.fit.calls,1);
 assert.ok(p.exactStateLabelOverlap.every(x=>x.distinctShared===0));
});
for(const [name,edit] of [
 ['unknown field',m=>m.script='not-executed'],['invalid feature index',m=>m.tree.root.splitColumn=999],
 ['unsupported options',m=>m.tree.options.maxDepth=999],['wrong protocol',m=>m.protocolSha256='0'.repeat(64)],
 ['oversized leaf',m=>m.tree.root={distribution:2}],['missing leaf value',m=>m.tree.root={}],
 ['unsupported scalar array',m=>m.tree.root={distribution:[.2]}],['bad row count',m=>m.meta.trainingRows=20001],
 ['null branch',m=>m.tree.root.left=null]
])test('model ingress rejects '+name+' even with recomputed byte checksum',()=>{
 const m=JSON.parse(text);edit(m);const changed=JSON.stringify(m);assert.throws(()=>loadArtifact(changed,hash(changed)));
});
for(const course of ['flat-lane','ramp-lane'])test('saved model executes actual closed-loop '+course+' without refitting',async()=>{
 const R=await loadRapier(),model=loadArtifact(text,digest),e=runEpisode(R,course,0,o=>predictAction(model,o),{partition:'reference',policyKind:'learned'});
 assert.equal(e.final.status,'succeeded');assert.ok(e.metrics.modelCalls>100);assert.equal(e.metrics.domainFallbackSteps,0);
 const stored=JSON.parse(read('evaluation-summary.json')).episodes.find(p=>p.partition==='reference'&&p.course===course);
 assert.equal(e.final.timeSeconds,stored.learned.totalSeconds);
});
