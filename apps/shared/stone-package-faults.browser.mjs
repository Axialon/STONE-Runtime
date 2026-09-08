import {chromium} from '../rover/node_modules/playwright-core/index.mjs';import {startServer} from '../rover/server.mjs';import {readFile,mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {createModelPackage} from '../../packages/learned-rover/package-data.mjs';
const packageObject=await createModelPackage(await readFile(new URL('../../experiments/learned-flow/model/model.json',import.meta.url),'utf8')),raw=JSON.stringify(packageObject);
const corrupt=structuredClone(packageObject);corrupt.artifacts[0].sha256='0'.repeat(64);
const unknownModel=structuredClone(packageObject);unknownModel.manifest.implementation.modelRef=unknownModel.manifest.implementation.modelRef.replace(packageObject.artifacts[0].sha256,'0'.repeat(64));
const s=await startServer(0),b=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true}),passed=[];
const ready=p=>p.waitForFunction(()=>document.body.dataset.phase==='ready'&&document.body.dataset.busy==='false'),inspectDone=p=>p.waitForFunction(()=>document.body.dataset.packageBusy==='false');
const ok=t=>{passed.push(t);console.log('PASS '+t);};
try{
 {const c=await b.newContext(),p=await c.newPage();try{await p.goto(s.url);await ready(p);await p.locator('#step').click();await p.waitForFunction(()=>document.querySelector('#tick').textContent==='1');
  for(const [name,buffer] of [['oversized',Buffer.alloc(262145)],['invalid UTF8',Buffer.from([255])],['malformed JSON',Buffer.from('{')],['bad checksum',Buffer.from(JSON.stringify(corrupt))]]){
   await p.locator('#package-file').setInputFiles({name:'valid.stone.json',mimeType:'application/json',buffer:Buffer.from(raw)});await inspectDone(p);assert.equal(await p.locator('#package-activate').isDisabled(),false);
   await p.locator('#package-file').setInputFiles({name:name+'.stone.json',mimeType:'application/json',buffer});await inspectDone(p);assert.equal(await p.locator('#package-activate').isDisabled(),true);assert.equal(await p.textContent('#tick'),'1');assert.equal(await p.locator('#enable-model').isChecked(),false);assert.match(await p.textContent('#package-status'),/rejected/);ok(name+' input clears a prior admitted draft without changing the active machine');
  }
  await p.locator('#package-file').setInputFiles({name:'unknown-reference.stone.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(unknownModel))});await inspectDone(p);assert.equal(await p.locator('#package-activate').isDisabled(),true);assert.match(await p.textContent('#package-status'),/Not admitted/);assert.equal(await p.textContent('#tick'),'1');ok('Consistent artifacts with an unknown model reference are unavailable, not checksum-corrupt');
 }finally{await c.close();}}
 {const c=await b.newContext(),p=await c.newPage();try{await p.goto(s.url);await ready(p);
  const result=await p.evaluate(async raw=>{
   const field=document.querySelector('#package-file');let release;const slow=new Promise(r=>release=r);const validBytes=new TextEncoder().encode(raw),badBytes=new TextEncoder().encode('{}');
   Object.defineProperty(field,'files',{configurable:true,value:[{name:'old-valid.json',size:validBytes.length,arrayBuffer:()=>slow}]});const old=field.onchange();
   Object.defineProperty(field,'files',{configurable:true,value:[{name:'new-invalid.json',size:2,arrayBuffer:async()=>badBytes.buffer}]});await field.onchange();const before=document.querySelector('#package-status').textContent;
   release(validBytes.buffer);await old;return{before,after:document.querySelector('#package-status').textContent,disabled:document.querySelector('#package-activate').disabled,busy:document.body.dataset.packageBusy,tick:document.querySelector('#tick').textContent};
  },raw);assert.equal(result.after,result.before);assert.match(result.after,/rejected/);assert.equal(result.disabled,true);assert.equal(result.busy,'false');assert.equal(result.tick,'0');ok('A delayed older file read cannot resurrect admission after a newer rejected file');
 }finally{await c.close();}}
 {const c=await b.newContext(),p=await c.newPage();try{await p.goto(s.url);await ready(p);
  const result=await p.evaluate(async raw=>{
   const {createStoneFilePicker}=await import('/shared/stone-file-picker.mjs');
   const root=document.createElement('div');root.innerHTML='<div id="package-status"><b>Inherited receipt</b></div>';document.body.append(root);
   let activations=0;const picker=createStoneFilePicker(root,{activate:async()=>{activations++;},builtin:async()=>{},exportFile:async()=>{}});
   picker.setContext({busy:false,phase:'ready',modelMode:false,hasState:true,routeActive:false,source:null});
   const field=root.querySelector('#package-file'),markupName='<img src=x onerror="window.injected=true">.json',bytes=new TextEncoder().encode(raw);
   Object.defineProperty(field,'files',{value:[{name:markupName,size:bytes.length,arrayBuffer:async()=>bytes.buffer}],configurable:true});await field.onchange();
   const literal=root.querySelector('#package-status').textContent.includes(markupName),markup=root.querySelectorAll('img,b').length;
   let release;Object.defineProperty(field,'files',{value:[{name:'slow.json',size:bytes.length,arrayBuffer:()=>new Promise(r=>release=r)}],configurable:true});const pending=field.onchange();picker.dispose();release(bytes.buffer);await pending;
   const result={literal,markup,activations,busy:document.body.dataset.packageBusy,disabled:root.querySelector('#package-activate').disabled,removed:field.onchange===null};root.remove();return result;
  },raw);
  assert.deepEqual(result,{literal:true,markup:0,activations:0,busy:'false',disabled:true,removed:true});ok('Picker replaces inherited markup, treats native names as text and ignores reads after disposal');
 }finally{await c.close();}}
 {const c=await b.newContext(),p=await c.newPage();let weights=0;await c.route('**/models/flow-v0.1.json',r=>{weights++;return r.abort();});await c.route('**/model-worker.mjs',r=>r.fulfill({contentType:'text/javascript',body:'self.onmessage=({data:m})=>self.postMessage({id:m.id,ok:false});'}));try{await p.goto(s.url);await ready(p);
  await p.locator('#package-file').setInputFiles({name:'FLOW.stone.json',mimeType:'application/json',buffer:Buffer.from(raw)});await inspectDone(p);await p.locator('#package-activate').click();await p.waitForFunction(()=>document.body.dataset.phase==='error');
  await p.waitForFunction(()=>document.querySelector('#package-status').textContent.includes('Activation failed'));assert.equal(await p.locator('#start').isDisabled(),true);assert.equal(await p.locator('#package-export').isDisabled(),true);assert.match(await p.textContent('#package-source'),/selected/);assert.equal(weights,0);ok('Failed explicit activation reports failure without claiming an active supplied model or fetching fallback weights');
 }finally{await c.close();}}

 {const c=await b.newContext(),p=await c.newPage();let weightRequests=0;await c.route('**/models/flow-v0.1.json',r=>{weightRequests++;return r.fulfill({status:404,body:'Not available'});});try{await p.goto(s.url);await ready(p);
  const results=await p.evaluate(async raw=>{
   const w=new Worker('/model-worker.mjs',{type:'module'});let n=0;
   async function request(type,payload){const id=++n;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{w.removeEventListener('message',listener);reject(Error('No worker reply'));},10000);function listener({data}){if(data.id===id){clearTimeout(timer);w.removeEventListener('message',listener);resolve(data);}}w.addEventListener('message',listener);w.postMessage({id,type,payload});});}
   try{
    const started=await request('start',{courseId:'flat-lane',stoneId:'rover.flow-learned',packageText:raw});if(!started.ok)throw Error('Supplied start failed');
    const first=await request('advance',{steps:80});if(!first.ok)throw Error('Initial advance failed');const before=(await request('read',{})).result;
    const variant=JSON.parse(raw);variant.manifest.name='Temporary inspection variant';const other=JSON.stringify(variant);
    const compared=await request('compare',{courseId:'flat-lane',packageText:other});const after=(await request('read',{})).result;
    variant.runtime.adapter='stone.unreviewed/0.1';const refused=await request('compare',{courseId:'flat-lane',packageText:JSON.stringify(variant)});const afterRejection=(await request('read',{})).result;
    const more=await request('advance',{steps:1});const exported=await request('inspect',{kind:'export-package',packageText:other});const final=(await request('read',{})).result;
    const commands=await request('export',{});const replay=await request('replay',{recording:JSON.stringify(commands.result),packageText:raw});
    return{before,after,afterRejection,compared:compared.ok,refused:refused.ok,more:more.ok,afterTick:more.result.snapshot.frame.observation.tick,exported:exported.ok,final,policyVerified:replay.result.policyVerified};
   }finally{w.terminate();}
  },raw);
  assert.equal(results.compared,true);assert.deepEqual(results.after,results.before);assert.equal(results.refused,false);assert.deepEqual(results.afterRejection,results.before);assert.equal(results.more,true);assert.equal(results.afterTick,81);assert.equal(results.exported,true);assert.equal(results.final.frame.observation.tick,81);assert.equal(results.policyVerified,true);assert.equal(weightRequests,0);
  ok('Temporary package comparison and failed admission cannot dispose or replace an active supplied policy');ok('Package export and replay preserve the original live session without consulting separate server weights');
 }finally{await c.close();}}
}finally{await mkdir('evidence/stone-package-local',{recursive:true});await writeFile('evidence/stone-package-local/fault-results.json',JSON.stringify({passed},null,2));await b.close();await s.close();}
