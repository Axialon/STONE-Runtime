import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {createModelPackage} from '../../../packages/learned-rover/package-data.mjs';
const root=new URL('../../../',import.meta.url);
const raw=JSON.stringify(await createModelPackage(readFileSync(new URL('experiments/learned-flow/model/model.json',root),'utf8')));
// Adapt browser transport/import URLs only. Execute the actual worker, Rapier and CART.
const source=readFileSync(new URL('apps/rover/model-worker.mjs',root),'utf8').replaceAll("'/vendor/rapier.mjs'",JSON.stringify(new URL('experiments/rover3d/node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs',root).href)).replaceAll("'/vendor/learned.mjs'",JSON.stringify(new URL('experiments/learned-flow/live-entry.mjs',root).href)).replaceAll("'/packages/learned-rover/identity.mjs'",JSON.stringify(new URL('packages/learned-rover/identity.mjs',root).href)).replaceAll("'/rover/contract.mjs'",JSON.stringify(new URL('experiments/rover3d/contract.mjs',root).href));
function worker(){
 const bootstrap=`import {parentPort} from 'node:worker_threads';
 globalThis.fetch=()=>{parentPort.postMessage({fetchAttempt:true});throw Error('Separate weights unavailable');};
 globalThis.self=globalThis;self.postMessage=m=>parentPort.postMessage(m);
 await import(${JSON.stringify('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))});
 parentPort.on('message',data=>self.onmessage({data}));`;
 const w=new Worker(new URL('data:text/javascript;base64,'+Buffer.from(bootstrap).toString('base64'))),pending=new Map();let id=0,fetches=0;
 w.on('message',m=>{if(m.fetchAttempt){fetches++;return;}const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);p.resolve(m);}});
 w.on('error',error=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();});
 return {request(type,payload){const key=++id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(key);reject(Error('Worker deadline'));},15000);pending.set(key,{resolve,reject,timer});w.postMessage({id:key,type,payload});});},fetches:()=>fetches,close:()=>w.terminate()};
}
test('actual worker keeps active supplied policy across temporary sources, rejected starts, comparison, export and replay',async()=>{
 const w=worker();try{
  const start={courseId:'flat-lane',stoneId:'rover.flow-learned',packageText:raw};assert.equal((await w.request('start',start)).ok,true,'supplied start');assert.equal((await w.request('advance',{steps:80})).ok,true,'initial advance');
  const before=(await w.request('read',{})).result,variant=JSON.parse(raw);variant.manifest.name='Inspected <img src=x> label';const other=JSON.stringify(variant);
  const compared=await w.request('compare',{courseId:'flat-lane',packageText:other});assert.equal(compared.ok,true);assert.equal(compared.result.results.length,4);assert.deepEqual((await w.request('read',{})).result,before);
  variant.runtime.adapter='stone.other/0.1';const unknown=JSON.stringify(variant);
  for(const [type,payload] of [['start',{...start,packageText:unknown}],['compare',{courseId:'flat-lane',packageText:unknown}],['start',{...start,route:{}}],['compare',{courseId:'custom-route',packageText:raw}]]){assert.equal((await w.request(type,payload)).ok,false);assert.deepEqual((await w.request('read',{})).result,before);}
  const saved=await w.request('inspect',{kind:'export-package',packageText:other});assert.equal(saved.ok,true);assert.deepEqual(saved.result.artifacts,JSON.parse(raw).artifacts);assert.deepEqual((await w.request('read',{})).result,before);
  const commands=await w.request('export',{}),replay=await w.request('replay',{recording:JSON.stringify(commands.result),packageText:raw});assert.equal(replay.ok,true);assert.equal(replay.result.policyVerified,true);assert.deepEqual((await w.request('read',{})).result,before);
  assert.equal((await w.request('advance',{steps:1})).result.snapshot.frame.observation.tick,81);assert.equal(w.fetches(),0);
 }finally{await w.close();}
});
test('worker validates every supplied source without treating invalid input as a builtin request',async()=>{
 const w=worker();try{
  for(const packageText of [null,{},'', ' '.repeat(262145),'😀'.repeat(100000)])for(const [type,payload] of [['start',{courseId:'flat-lane',stoneId:'rover.flow-learned'}],['compare',{courseId:'flat-lane'}],['replay',{recording:'{}'}],['inspect',{kind:'export-package'}]])assert.equal((await w.request(type,{...payload,packageText})).ok,false);
  assert.equal(w.fetches(),0);
 }finally{await w.close();}
});
