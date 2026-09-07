import {chromium} from '../../../apps/rover/node_modules/playwright-core/index.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {startFieldServer} from '../../../apps/field-lab/server.mjs';
const manifest=await readFile(new URL('../model/core-manifest.json',import.meta.url));
const dir='evidence/learned-flow-browser';await mkdir(dir,{recursive:true});
const server=await startFieldServer(0),browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});
const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),passed=[],errors=[],external=[];
page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>r.request().url().startsWith(server.url)?r.continue():(external.push(r.request().url()),r.abort()));
const idle=()=>page.waitForFunction(()=>document.body.dataset.busy==='false');
async function report(){const event=page.waitForEvent('download');await page.locator('#export-results').click();const d=await event;await d.saveAs(dir+'/inspection.json');return JSON.parse(await readFile(dir+'/inspection.json','utf8'));}
try{
 await page.goto(server.url);await page.waitForFunction(()=>document.body.dataset.ready==='true');
 await page.locator('[data-host="digital"]').click();await page.locator('[data-package="digital.audit"]').click();
 await page.locator('#inspection-file').setInputFiles({name:'FLOW-Learned-core-manifest.json',mimeType:'application/json',buffer:manifest});await idle();
 await page.locator('#run-digital').click();await idle();let r=await report();
 assert.equal(r.valid,true);assert.equal(r.compatibility.compatible,true);assert.equal(r.summary.id,'rover.flow-learned');assert.equal(r.source.sha256,createHash('sha256').update(manifest).digest('hex'));
 passed.push('Learned core manifest is validated in the real browser against the rover policy');
 assert.match(r.summary.requestedModel,/sha256:d9a1ef32/);assert.equal(r.model,null);assert.equal(r.installation,'not-performed');assert.equal(r.verification,'metadata-only');
 passed.push('Model declaration stays distinct from live inference and installation');
 await page.selectOption('#inspection-target','drone');await page.locator('#run-digital').click();await idle();r=await report();assert.equal(r.valid,true);assert.equal(r.compatibility.compatible,false);
 passed.push('Cross-host learned declaration is rejected as incompatible without rejecting valid metadata');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);passed.push('No provider requests, imported code execution or browser page errors');
 console.log(passed.map(s=>'PASS '+s).join(String.fromCharCode(10)));
}finally{await writeFile(dir+'/results.json',JSON.stringify({passed,errors,external},null,2));await browser.close();await server.close();}
