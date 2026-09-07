import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loadPolicy,fetchPolicy,MODEL_SHA256} from '../browser-runtime.mjs';
import {loadArtifact,predictAction} from '../experiment.mjs';
import {createRoverWorld} from '../../rover3d/world.mjs';import {loadRapier} from '../../rover3d/engine.mjs';
const text=readFileSync(new URL('../model/model.json',import.meta.url),'utf8');
const R=await loadRapier();
test('portable loader returns the real fixed artifact identity without exposing writable model parameters',async()=>{
 const p=await loadPolicy(text);assert.equal(p.identity.modelSha256,MODEL_SHA256);assert.equal(p.identity.id,'rover.flow-learned');assert.ok(Object.isFrozen(p));assert.ok(Object.isFrozen(p.identity));assert.equal(p.model,undefined);
});
for(const course of ['flat-lane','ramp-lane'])test('portable actual model equals accepted Node decisions through '+course,async()=>{
 const p=await loadPolicy(text),m=loadArtifact(text,MODEL_SHA256),h=createRoverWorld(R,course);let calls=0;
 try{while(h.snapshot().status==='running'){const o=h.snapshot().observation,got=p.decide(o),expected=predictAction(m,o);assert.deepEqual(got.action,expected);calls+=got.modelCalls;h.step(got.action);}
 assert.equal(h.snapshot().status,'succeeded');assert.ok(calls>400);assert.equal(p.stats().modelCalls,calls);}finally{h.dispose();p.dispose();}
});
for(const [name,bad] of [['changed bytes',text+' '],['missing',null],['oversized',' '.repeat(65537)],['invalid UTF8','\ufffd'],['wrong model','{}']])test('pinned loader rejects '+name,async()=>await assert.rejects(loadPolicy(bad)));
test('already aborted loading is rejected without inference',async()=>{const c=new AbortController();c.abort();await assert.rejects(loadPolicy(text,{signal:c.signal}));});
test('model disposal rejects subsequent decisions',async()=>{const p=await loadPolicy(text),h=createRoverWorld(R);p.dispose();p.dispose();try{assert.throws(()=>p.decide(h.snapshot().observation));}finally{h.dispose();}});
test('fixed-path fetch succeeds with bounded plain data and no credentials/redirect following',async()=>{
 let seen;const p=await fetchPolicy({fetcher:async(...args)=>{seen=args;return new Response(text,{headers:{'Content-Length':String(Buffer.byteLength(text))}});}});
 assert.equal(seen[0],'/models/flow-v0.1.json');assert.equal(seen[1].credentials,'omit');assert.equal(seen[1].redirect,'error');assert.equal(p.identity.modelSha256,MODEL_SHA256);p.dispose();
});
for(const [name,response] of [['missing',()=>new Response('missing',{status:404})],['oversized length',()=>new Response(text,{headers:{'Content-Length':'9999999'}})],['wrong bytes',()=>new Response('{}')],['bad encoding',()=>new Response(new Uint8Array([255]))]])test('model fetch rejects '+name,async()=>await assert.rejects(fetchPolicy({fetcher:async()=>response()})));
test('stream without content-length is bounded before allocating the full response',async()=>{
 let cancelled=false,n=0;const stream=new ReadableStream({pull(c){n++;c.enqueue(new Uint8Array(32768));},cancel(){cancelled=true;}});
 await assert.rejects(fetchPolicy({fetcher:async()=>new Response(stream)}));assert.equal(cancelled,true);assert.ok(n<8);
});
