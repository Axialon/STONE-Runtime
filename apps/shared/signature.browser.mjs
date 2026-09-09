import {chromium} from '../rover/node_modules/playwright-core/index.mjs';
import {startFieldServer} from '../field-lab/server.mjs';
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {signPackage} from '../../packages/contract/package-signature.mjs';
import {createDataPackage,PRESETS} from '../../packages/data-quality/package.mjs';
const key=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']),publicKey=new Uint8Array(await crypto.subtle.exportKey('raw',key.publicKey));
const raw=await readFile(new URL('../../examples/FLOW-Learned.stone.json',import.meta.url)),envelope=await signPackage(raw,key.privateKey,publicKey);
const fingerprint=Buffer.from(await crypto.subtle.digest('SHA-256',publicKey)).toString('hex');
const server=await startFieldServer(0);let browser;const errors=[],requests=[];let passed=0;
const ok=name=>{passed++;console.log('PASS '+name);};
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});const context=await browser.newContext({acceptDownloads:true});
 await context.addInitScript(()=>{const Native=window.Worker;window.signatureWorkers={active:0,started:0};window.Worker=class extends Native{constructor(url,options){super(url,options);this.signature=String(url).includes('signature-worker');if(this.signature){window.signatureWorkers.active++;window.signatureWorkers.started++;}}terminate(){if(this.signature){window.signatureWorkers.active--;this.signature=false;}return super.terminate();}};});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));await p.goto(server.url+'#digital');await p.waitForFunction(()=>document.body.dataset.ready==='true');
 const panel=p.locator('#signature-panel');assert.equal(await panel.getAttribute('open'),null);await panel.locator(':scope > summary').focus();await p.keyboard.press('Enter');assert.notEqual(await panel.getAttribute('open'),null);ok('panel collapsed by default and opens by keyboard alongside Data Lab');
 const upload=async(pkg=raw,env=envelope)=>{await p.locator('#signature-package-file').setInputFiles({name:'package.json',mimeType:'application/json',buffer:pkg});await p.locator('#signature-file').setInputFiles({name:'signature.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(env))});};
 const verify=async()=>{await p.locator('#signature-verify').click();await p.waitForFunction(()=>!document.querySelector('#signature-export').disabled);};
 await upload();assert.equal(await p.evaluate(()=>signatureWorkers.started),0);assert.equal(await p.locator('#signature-export').isDisabled(),true);ok('file selection does not verify');
 await verify();assert.match(await p.textContent('#signature-status'),/Signature valid/);assert.match(await p.textContent('#signature-key-state'),/not provided/);assert.equal(await p.evaluate(()=>signatureWorkers.active),0);ok('included-key signature is distinct from publisher identity and worker terminates');
 await p.locator('#signature-expected-key').fill('0'.repeat(64));assert.equal(await p.locator('#signature-export').isDisabled(),true);assert.equal(await p.textContent('#signature-report'),'');await verify();assert.match(await p.textContent('#signature-key-state'),/does not match/);ok('expected key changes clear export immediately and mismatch stays distinct');
 await p.locator('#signature-expected-key').fill(fingerprint);await verify();assert.match(await p.textContent('#signature-key-state'),/matches/);const event=p.waitForEvent('download');await p.locator('#signature-export').click();const download=await event,stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const report=JSON.parse(Buffer.concat(chunks));assert.equal(report.expectedKeyMatch,true);assert.equal(report.publisherIdentity,'not-established');assert.equal(report.executionAdmission,'unchanged');ok('export contains public report with key equality only');
 for(const id of ['signature-package-file','signature-file']){await p.locator('#'+id).dispatchEvent('cancel');assert.equal(await p.locator('#signature-export').isDisabled(),true);assert.equal(await p.locator('#'+id).evaluate(x=>x.files.length),0);await upload();await verify();}ok('native cancel events clear selection and prior exports (OS dialog not automated)');
 await p.locator('#signature-package-file').setInputFiles([]);assert.equal(await p.locator('#signature-export').isDisabled(),true);ok('empty selection clears report');
 await upload();await verify();
 await p.evaluate(async()=>{const input=document.querySelector('#signature-package-file'),file=input.files[0],original=file.arrayBuffer.bind(file);let release;file.arrayBuffer=()=>new Promise(r=>release=r);const pending=document.querySelector('#signature-verify').onclick();input.dispatchEvent(new Event('cancel',{bubbles:true}));release(await original());await pending;});
 assert.equal(await p.locator('#signature-export').isDisabled(),true);assert.equal(await p.textContent('#signature-report'),'');ok('native cancellation during a pending read cannot restore stale report/export');
 const authored=Buffer.from(JSON.stringify(await createDataPackage('Żółw <img src=x onerror=alert(1)>',PRESETS.TIDY,{id:'digital.custom',publisher:'Unverified'}))+'\n');await upload(authored,await signPackage(authored,key.privateKey,publicKey));await verify();assert.match(await p.textContent('#signature-status'),/Signature valid/);assert.equal(await panel.locator('img').count(),0);ok('authored Unicode Data package uses same generic inert boundary');
 await upload(raw,{...envelope,algorithm:'RSA'});await verify();assert.match(await p.textContent('#signature-status'),/Malformed detached/);ok('malformed envelope is separate from cryptographic failure');
 await upload(Buffer.concat([raw,Buffer.from('\n')]));await verify();assert.match(await p.textContent('#signature-status'),/hash mismatch/);ok('exact byte changes reject');
 await p.locator('#signature-package-file').setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(262145)});await p.locator('#signature-verify').click();await p.waitForFunction(()=>document.querySelector('#signature-status').textContent.startsWith('File rejected'));assert.equal(await p.locator('#signature-export').isDisabled(),true);ok('oversized input rejected without export');
 // Real module worker spins forever; the UI deadline must terminate it externally.
 await p.route('**/signature-worker.mjs',route=>route.fulfill({contentType:'text/javascript',body:'self.onmessage=()=>{while(true){}};'}));await upload();await p.locator('#signature-verify').click();await p.waitForFunction(()=>document.querySelector('#signature-status').textContent.includes('deadline'),{},{timeout:15000});assert.equal(await p.evaluate(()=>signatureWorkers.active),0);assert.equal(await p.locator('#signature-export').isDisabled(),true);ok('genuinely stalled module worker is terminated by deadline');
 // Every independent case owns a newly loaded document. A same-fragment goto
 // alone can preserve open details and pagehide-disposed application state.
 const freshDigital=async()=>{
  await p.goto(server.url+'#digital');await p.reload();
  await p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.host==='digital');
  assert.equal(await panel.getAttribute('open'),null);
  assert.deepEqual(await p.evaluate(()=>signatureWorkers),{active:0,started:0});
  for(const id of ['signature-package-file','signature-file'])assert.equal(await p.locator('#'+id).evaluate(input=>input.files.length),0);
  assert.equal(await p.locator('#signature-expected-key').inputValue(),'');
  assert.equal(await p.textContent('#signature-report'),'');
  assert.equal(await p.locator('#signature-export').isDisabled(),true);
  assert.equal(await p.locator('#signature-verify').isDisabled(),true);
  await panel.locator(':scope > summary').click();
  assert.notEqual(await panel.getAttribute('open'),null);
  assert.equal(await p.locator('#signature-verify').isVisible(),true);
 };
 for(const action of [async()=>p.locator('#signature-cancel').click(),async()=>p.locator('#signature-expected-key').fill('changed'),async()=>p.evaluate(()=>{location.hash='#drone';}),async()=>p.evaluate(()=>window.dispatchEvent(new Event('pagehide')))]){
  await freshDigital();await upload();await p.locator('#signature-verify').click();await p.waitForFunction(()=>signatureWorkers.active===1);await action();await p.waitForFunction(()=>signatureWorkers.active===0);assert.equal(await p.locator('#signature-export').isDisabled(),true);
 }ok('Stop, changed input, host leave and pagehide terminate pending worker and clear exports');
 await p.unroute('**/signature-worker.mjs');await freshDigital();
 for(const width of [320,390]){await p.setViewportSize({width,height:844});await upload();await verify();await p.locator('#signature-details > summary').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.locator('#signature-cancel').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#signature-export').isDisabled(),true);}ok('320/390px expanded receipts fit and Stop works by keyboard');
 assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(server.url)));ok('no external request or page errors');
 console.log(JSON.stringify({passed,failed:0}));
}finally{await browser?.close();await server.close();}
