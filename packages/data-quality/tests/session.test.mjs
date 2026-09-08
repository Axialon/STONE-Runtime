import test from 'node:test';import assert from 'node:assert/strict';
import {DataSession,WorkerClient,readLocalFile} from '../../../apps/data-lab/session.mjs';
const encoder=new TextEncoder(),file=s=>({size:encoder.encode(s).length,arrayBuffer:async()=>encoder.encode(s).buffer});
const policy='{"policy":true}',inspection={compatibility:{compatible:true}};
function fixture(){const pending=[];let cancelled=0;const client={request:(type,payload)=>new Promise((resolve,reject)=>pending.push({type,payload,resolve,reject})),cancel:()=>{cancelled++;}};return {session:new DataSession(client),pending,get cancelled(){return cancelled;}};}
test('file ingress checks size before reading, after reading, and strict package decoding',async()=>{
 let read=false;await assert.rejects(()=>readLocalFile({size:1048577,arrayBuffer:()=>{read=true;}},1048576));assert.equal(read,false);
 await assert.rejects(()=>readLocalFile({size:1,arrayBuffer:async()=>new ArrayBuffer(1048577)},1048576));
 await assert.rejects(()=>readLocalFile({size:2,arrayBuffer:async()=>new Uint8Array([0xc3,0x28]).buffer},262144,true));
});
test('selecting data never executes; late file reads cannot replace newer input',async()=>{
 const f=fixture();let release;const late=f.session.loadData({size:1,arrayBuffer:()=>new Promise(r=>release=r)});
 await f.session.loadData(file('new'));release(encoder.encode('x').buffer);await late;assert.equal(new TextDecoder().decode(f.session.state.bytes),'new');assert.equal(f.pending.length,0);
});
test('policy import is inspection first with explicit activation and no automatic run',async()=>{
 const f=fixture(),p=f.session.importPackage(file(policy));await new Promise(r=>setImmediate(r));assert.equal(f.pending[0].type,'inspect');f.pending[0].resolve(inspection);await p;
 assert.equal(f.session.state.active,null);assert.equal(f.session.state.result,null);assert.equal(f.pending.length,1);f.session.activate();assert.equal(f.session.state.active,policy);assert.equal(f.pending.length,1);
});
test('changed policy and late worker reply clear all previous results and exports',async()=>{
 const f=fixture();f.session.select(policy);await f.session.loadData(file('a'));const run=f.session.run('csv');f.session.select('different');f.pending[0].resolve({report:{},proposal:{}});await run;assert.equal(f.session.state.result,null);
});
test('real cancel path clears pending file, imported policy and result',async()=>{
 const f=fixture();f.session.select(policy);await f.session.loadData(file('a'));const run=f.session.run('csv');f.session.cancel();f.pending[0].resolve({report:{}});await run;
 assert.equal(f.session.state.result,null);assert.equal(f.session.state.busy,false);assert.match(f.session.state.status,/Cancelled/);assert.ok(f.cancelled>0);
 await f.session.loadData(null);assert.equal(f.session.state.bytes,null);
});
test('rejected import cannot activate the last successful package',async()=>{
 const f=fixture();f.session.select(policy);const p=f.session.importPackage(file(policy));await new Promise(r=>setImmediate(r));f.pending[0].resolve({compatibility:{compatible:false}});await p;assert.throws(()=>f.session.activate());assert.equal(f.session.state.active,null);
});
class FakeWorker {static all=[];constructor(){FakeWorker.all.push(this);}postMessage(m){this.sent=m;}terminate(){this.terminated=true;}}
test('deadline terminates stalled worker, ignores late replies and permits explicit new request',async()=>{
 const c=new WorkerClient({WorkerClass:FakeWorker,deadline:10});const p=c.request('inspect',{text:'{}'}),w=FakeWorker.all.at(-1);await assert.rejects(p,/deadline/);assert.equal(w.terminated,true);
 const next=c.request('inspect',{text:'{}'}),w2=FakeWorker.all.at(-1);w.onmessage({data:{id:w.sent.id,ok:true,result:'stale'}});w2.onmessage({data:{id:w2.sent.id,ok:true,result:'new'}});assert.equal(await next,'new');assert.equal(w2.terminated,true);
});
test('Stop terminates a real worker handle and rejects its pending request',async()=>{
 const c=new WorkerClient({WorkerClass:FakeWorker});const p=c.request('inspect',{text:'{}'}),w=FakeWorker.all.at(-1);c.cancel();await assert.rejects(p,/Cancelled/);assert.equal(w.terminated,true);
});
