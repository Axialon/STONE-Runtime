import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {reviewInputs} from '../build.mjs';import {usesDataAdapter} from '../dispatch.mjs';import {createDataPackage,PRESETS} from '../package.mjs';import {executeData} from '../adapter.mjs';
const bytes=s=>new TextEncoder().encode(s);
test('actual local dependency bytes and reviewed locks match approved integrity',async()=>{
 const r=await reviewInputs();assert.equal(r.dependency.version,'5.5.3');assert.equal(r.reviewedSources['packages/data-quality/node_modules/papaparse/papaparse.js'],'10778b8bb3e20177c52febb99e18ec53fd97ce447f4716ca10e00bae18a98594');assert.equal(Object.keys(r.sources).length,5);
});
test('explicit dispatch handles data variants and leaves FLOW admission unchanged',async()=>{
 const p=structuredClone(await createDataPackage('variant',PRESETS.TIDY));assert.equal(usesDataAdapter(JSON.stringify(p)),true);p.runtime.adapter='stone.unknown/0.1';assert.equal(usesDataAdapter(JSON.stringify(p)),true);
 assert.equal(usesDataAdapter(JSON.stringify({format:'stone.package/0.1',runtime:{adapter:'stone.rover.cart/0.1'},manifest:{task:'rover-navigation'}})),false);assert.equal(usesDataAdapter('{}'),false);assert.equal(usesDataAdapter('{'),false);
});
test('complete undo restores parsed table even with omitted leading and middle rows',async()=>{
 const original={format:'stone.data-grid/0.1',headers:['id','name'],rows:[[' ',''],['001',' a '],[],['002',' b '],['002',' b ']]};
 const r=await executeData(bytes(JSON.stringify(original)),'json',JSON.stringify(await createDataPackage('TIDY'))),restored=structuredClone(r.proposal.grid);
 for(const change of r.proposal.undo.filter(x=>x.kind==='omit-row'))restored.rows.splice(change.row,0,change.before);
 for(const change of r.proposal.undo.filter(x=>x.kind==='trim'))restored.rows[change.row][change.column]=change.before;
 assert.deepEqual(restored,original);
});
test('dedicated worker inspects presets and unknown messages without loading an execution bundle',async()=>{
 const replies=[];globalThis.self={postMessage:m=>replies.push(m)};await import('../../../apps/data-lab/worker.mjs');
 try{await self.onmessage({data:{id:1,type:'presets',payload:{}}});assert.equal(replies[0].ok,true);const p=replies[0].result.LENS;
 await self.onmessage({data:{id:2,type:'inspect',payload:{text:p,target:'auto'}}});assert.equal(replies[1].result.model,null);assert.equal(replies[1].result.compatibility.compatible,true);
 await self.onmessage({data:{id:3,type:'run',payload:{bytes:new Uint8Array(1048577),format:'csv',text:p}}});assert.equal(replies[2].ok,false);
 await self.onmessage({data:{id:4,type:'install-code',payload:{}}});assert.equal(replies[3].ok,false);
 }finally{delete globalThis.self;}
});
test('Data Lab source closure has no physics/model/network/storage processing API',async()=>{
 for(const path of ['apps/data-lab/worker.mjs','apps/data-lab/session.mjs','apps/data-lab/app.mjs','packages/data-quality/adapter.mjs','packages/data-quality/package.mjs']){
  const source=await readFile(new URL('../../../'+path,import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|eval)\s*[.(]|rapier|learned\.mjs/);
 }
});
