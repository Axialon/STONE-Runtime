import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadRapier} from '../../rover3d/engine.mjs';
import {PROFILE,readAction,validObservation} from '../../rover3d/contract.mjs';
import {decide} from '../../rover3d/stones.mjs';
import {buildWarmup,extractFeatures,guardKind,harnessAction,fitRegressor,saveArtifact,loadArtifact,predictAction,runEpisode} from '../experiment.mjs';
const protocolBytes=readFileSync(new URL('../protocol.json',import.meta.url));
const P=JSON.parse(protocolBytes);
const fixture=()=>({profile:PROFILE,tick:10,position:{x:0,y:0.5,z:0},rotation:{x:0,y:0,z:0,w:1},linearVelocity:{x:0,y:0,z:1},angularVelocity:{x:0,y:0,z:0},wheelContacts:[true,true,true,true],goal:{x:0,y:0.5,z:5}});
const toyRows=()=>Array.from({length:80},(_,i)=>({features:[1+i/10,0,1,0],demand:i<40?0.05:0.4,partition:'train',seed:P.seeds.train[0],course:'flat-lane'}));
const meta={trainingDataSha256:'a'.repeat(64),trainingRows:80};
test('protocol is frozen before fitting and episode partitions are disjoint',()=>{
 assert.equal(createHash('sha256').update(protocolBytes).digest('hex'),'ee6f721ca0cd79788efb0023f89a322913181703b5ddb56ab33bbe56bbe978e1');
 const seeds=Object.values(P.seeds).flat();assert.equal(new Set(seeds).size,seeds.length);assert.deepEqual(Object.fromEntries(Object.entries(P.seeds).map(([k,v])=>[k,v.length])),{train:24,validation:8,test:12});
});
test('warmups are deterministic, bounded and do not mix propulsion and brakes',()=>{
 const a=buildWarmup(1001);assert.deepEqual(a,buildWarmup(1001));assert.notDeepEqual(a,buildWarmup(1002));assert.ok(a.length>=36&&a.length<=96&&a.length%12===0);
 for(const x of a){assert.deepEqual(readAction(x),x);assert.ok(x.throttle>=0&&x.throttle<=0.4&&Math.abs(x.steering)<=0.06);assert.ok(x.brake===0||x.throttle===0);}
});
test('zero seed means the separately declared no-warmup reference',()=>assert.deepEqual(buildWarmup(0),[]));
test('invalid seeds are rejected',()=>{for(const s of [-1,1.2,NaN,'1001',4294967296])assert.throws(()=>buildWarmup(s));});
test('observable features contain neither actions nor episode identity',()=>{const o=fixture(),before=structuredClone(o);assert.deepEqual(extractFeatures(o),[5,0,1,0]);assert.deepEqual(o,before);});
test('malformed observations are rejected',()=>{for(const o of [null,{}, {...fixture(),profile:'other'}, {...fixture(),linearVelocity:{x:NaN,y:0,z:0}}])assert.throws(()=>extractFeatures(o));});
test('guard ordering preserves airborne before goal and outside-domain is explicit',()=>{
 const o=fixture();assert.equal(guardKind(o),null);o.goal.z=0.1;assert.equal(guardKind(o),'goal');o.wheelContacts=[false,false,false,false];assert.equal(guardKind(o),'airborne');
 const far=fixture();far.goal.z=26;assert.equal(guardKind(far),'out-of-domain');
});
test('guards reproduce original FLOW airborne and close-goal actions',()=>{
 for(const kind of ['airborne','goal']){const o=fixture();if(kind==='airborne')o.wheelContacts=[false,false,false,false];else o.goal.z=0.1;assert.deepEqual(harnessAction(null,o),decide('rover.flow',o));}
});
test('signed output never applies both drive and brake and retains deterministic steering',()=>{
 const o=fixture();o.goal.x=1;o.angularVelocity.y=0.1;
 for(const demand of [-10,-0.2,0,0.2,10]){const a=harnessAction(demand,o);assert.deepEqual(readAction(a),a);assert.equal(a.steering,decide('rover.flow',o).steering);assert.ok(a.throttle<=0.48&&a.throttle>=0);assert.ok(a.throttle===0||a.brake===0);}
 assert.equal(harnessAction(-0.2,o).brake,0.2);assert.equal(harnessAction(10,o).throttle,0.48);
});
test('nonfinite learned predictions are rejected instead of hidden by a teacher fallback',()=>{for(const d of [NaN,Infinity,-Infinity,null])assert.throws(()=>harnessAction(d,fixture()));});
test('fitting rejects non-train partitions and held-out seed identities',()=>{
 for(const change of [r=>r.partition='test',r=>r.partition='validation',r=>r.seed=3001,r=>r.features[0]=Infinity,r=>r.demand=2]){const rows=toyRows();change(rows[0]);assert.throws(()=>fitRegressor(rows));}
});
test('the standard library fits actual nonconstant parameters and data changes predictions',()=>{
 const rows=toyRows(),before=JSON.stringify(rows),a=fitRegressor(rows),b=fitRegressor(rows.map(r=>({...r,demand:0.2})));
 const p=a.predict([[1,0,1,0],[8.9,0,1,0]]);assert.ok(p[1]-p[0]>0.2);assert.notDeepEqual(p,b.predict([[1,0,1,0],[8.9,0,1,0]]));assert.equal(JSON.stringify(rows),before);
});
test('artifact has a reproducible byte digest and fitted load parity',()=>{
 const model=fitRegressor(toyRows()),a=saveArtifact(model,meta),b=saveArtifact(model,meta);assert.equal(a.text,b.text);assert.equal(a.sha256,createHash('sha256').update(a.text).digest('hex'));
 const loaded=loadArtifact(a.text,a.sha256);assert.deepEqual(loaded.predict([[1,0,1,0],[8.9,0,1,0]]),model.predict([[1,0,1,0],[8.9,0,1,0]]));assert.deepEqual(predictAction(loaded,fixture()),predictAction(model,fixture()));
 const d=JSON.parse(a.text);assert.equal(d.format,'stone.learned-flow/0.1');assert.equal(d.protocolSha256,'ee6f721ca0cd79788efb0023f89a322913181703b5ddb56ab33bbe56bbe978e1');assert.equal(d.library,'ml-cart/2.1.1');assert.ok(d.tree);
});
test('artifact load rejects corruption, unsupported formats and oversized text',()=>{
 const a=saveArtifact(fitRegressor(toyRows()),meta);assert.throws(()=>loadArtifact(a.text+' ',a.sha256));const d=JSON.parse(a.text);d.format='other';const text=JSON.stringify(d);assert.throws(()=>loadArtifact(text,createHash('sha256').update(text).digest('hex')));assert.throws(()=>loadArtifact(' '.repeat(1048577),'0'.repeat(64)));
});
test('prediction calls learned model only for unguarded observations',()=>{
 let calls=0;const model={predict(rows){calls++;return [0.25];}},o=fixture();assert.equal(predictAction(model,o).throttle,0.25);assert.equal(calls,1);o.wheelContacts=[false,false,false,false];assert.deepEqual(predictAction(model,o),decide('rover.flow',o));assert.equal(calls,1);
});
test('actual engine episodes use repeatable warmups and preserve existing limits',async()=>{
 const R=await loadRapier(),teacher=o=>decide('rover.flow',o);
 const a=runEpisode(R,'flat-lane',1001,teacher,{partition:'train',collectRows:true}),b=runEpisode(R,'flat-lane',1001,teacher,{partition:'train',collectRows:true});
 assert.deepEqual(a,b);assert.equal(a.final.status,'succeeded');assert.equal(a.actions.length,a.final.observation.tick);assert.equal(a.warmupSteps,buildWarmup(1001).length);assert.ok(a.rows.length>10);assert.ok(validObservation(a.switchState.observation));
 for(const r of a.rows){assert.equal(r.partition,'train');assert.equal(r.seed,1001);assert.equal(r.features.length,4);assert.ok(Number.isFinite(r.demand));}
});
test('held-out rows cannot be admitted to the fitting API',async()=>{const R=await loadRapier(),a=runEpisode(R,'flat-lane',3001,o=>decide('rover.flow',o),{partition:'test',collectRows:true});assert.ok(a.rows.length>10);assert.throws(()=>fitRegressor(a.rows));});
