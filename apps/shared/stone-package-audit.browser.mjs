import {chromium} from '../rover/node_modules/playwright-core/index.mjs';import {startFieldServer} from '../field-lab/server.mjs';import {readFile,mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {createModelPackage} from '../../packages/learned-rover/package-data.mjs';
const fixture=structuredClone(await createModelPackage(await readFile(new URL('../../experiments/learned-flow/model/model.json',import.meta.url),'utf8')));fixture.manifest.name='Zażółć <img src=x onerror="window.injected=true">';
const s=await startFieldServer(0),b=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true}),c=await b.newContext({acceptDownloads:true}),p=await c.newPage(),passed=[],requests=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));c.on('request',r=>requests.push(r.url()));const idle=()=>p.waitForFunction(()=>document.body.dataset.busy==='false');
const ok=x=>{passed.push(x);console.log('PASS '+x);};await mkdir('evidence/stone-package-local',{recursive:true});
async function file(x){await p.locator('#inspection-file').setInputFiles({name:'FLOW.stone.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(x))});await idle();await p.locator('#run-digital').click();await idle();}
try{
 await p.goto(s.url+'#digital');await idle();await p.locator('[data-package="digital.audit"]').click();await file(fixture);assert.equal(await p.locator('#error').isVisible(),false);assert.match(await p.textContent('#report'),/package-artifact-integrity/);assert.equal(await p.evaluate(()=>window.injected),undefined);assert.match(await p.textContent('#report'),/<img/);
 const event=p.waitForEvent('download');await p.locator('#export-results').click();const d=await event;await d.saveAs('evidence/stone-package-local/package-audit.json');const r=JSON.parse(await readFile('evidence/stone-package-local/package-audit.json','utf8'));assert.equal(r.valid,true);assert.equal(r.compatibility.compatible,true);assert.equal(r.model,null);assert.equal(r.installation,'not-performed');assert.equal(r.authenticity,'not-verified');ok('Digital AUDIT inspects package bytes and operating metadata without inference or installing code');
 // Native-input cancel event coverage; no graphical OS dialog is automated.
 for(const pendingRead of [false,true]){
  await file(fixture);assert.match(await p.textContent('#report'),/package-artifact-integrity/);
  const result=await p.evaluate(async pendingRead=>{
   const input=document.querySelector('#inspection-file'),selected=input.files[0];if(!selected)throw Error('Expected a real selected File');
   let release,pending;if(pendingRead){Object.defineProperty(selected,'arrayBuffer',{configurable:true,value:()=>new Promise(r=>release=r)});pending=input.onchange();}
   input.dispatchEvent(new Event('cancel',{bubbles:true}));const status=document.querySelector('#audit-source').textContent;
   if(pendingRead){delete selected.arrayBuffer;release(await selected.arrayBuffer());await pending;}
   return {count:input.files.length,status,after:document.querySelector('#audit-source').textContent};
  },pendingRead);await idle();
  assert.equal(result.count,0);assert.match(result.status,/No file selected/);assert.equal(result.after,result.status);assert.doesNotMatch(await p.textContent('#report'),/package-artifact-integrity/);assert.doesNotMatch(await p.textContent('#digital-state'),/Completed|File ready/);assert.equal(await p.locator('#run-digital').isDisabled(),true);assert.equal(await p.locator('#export-results').isDisabled(),true);
  ok('Native AUDIT cancel event clears '+(pendingRead?'a pending read':'a prior report')+' and retained selection (event coverage, not OS dialog automation)');
 }
 const unknown=structuredClone(fixture);unknown.runtime.adapter='stone.other/0.1';await file(unknown);assert.equal(await p.locator('#error').isVisible(),false);assert.match(await p.textContent('#report'),/Not admitted/);ok('A format-valid unknown runtime remains explicitly unavailable');
 const broken=structuredClone(fixture);broken.artifacts[0].sha256='0'.repeat(64);await file(broken);assert.equal(await p.locator('#error').isVisible(),true);assert.equal(await p.locator('#export-results').isDisabled(),true);ok('Corrupted artifact receipts clear stale successful inspection output');
 assert.ok(!requests.some(x=>x.includes('/models/')||x.includes('/vendor/learned.mjs')));assert.ok(requests.every(x=>x.startsWith(s.url)));assert.deepEqual(errors,[]);ok('Package-only inspection loads neither model weights nor the inference bundle and makes no external request');
}finally{await writeFile('evidence/stone-package-local/audit-results.json',JSON.stringify({passed,errors},null,2));await b.close();await s.close();}
