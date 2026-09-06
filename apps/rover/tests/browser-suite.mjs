import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startServer} from '../server.mjs';
const out=resolve(process.env.STONE_EVIDENCE_DIR??'evidence/browser-local');await mkdir(out,{recursive:true});
const server=await startServer(0),browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true,timeout:20000});
const results=[],errors=[],external=[];
const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS',name);};
const context=await browser.newContext({viewport:{width:1440,height:1120},acceptDownloads:true});
await context.route('**/*',route=>{if(route.request().url().startsWith(server.url))return route.continue();external.push(route.request().url());return route.abort();});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const idle=()=>page.waitForFunction(()=>document.body.dataset.busy==='false');
const tick=async()=>Number(await page.locator('#tick').textContent());
const snapshot=async()=>Promise.all(['tick','time','speed','height','contacts'].map(id=>page.locator('#'+id).textContent()));
try{
 await check('normal HTTP startup, module workers, WASM and actual WebGL 2',async()=>{await page.goto(server.url);await page.waitForFunction(()=>document.body.dataset.ready==='true');assert.equal(await page.locator('#renderer-state').textContent(),'Three.js / WebGL 2');assert.equal(await page.locator('#viewport canvas').count(),1);});
 await check('single-step advances one actual engine tick',async()=>{await page.locator('#step').click();await idle();assert.equal(await tick(),1);});
 await check('camera changes cannot change simulation state',async()=>{const before=await snapshot();await page.locator('#focus').click();await page.locator('#home').click();await page.locator('#viewplan').click();await page.locator('#view3d').click();assert.deepEqual(await snapshot(),before);});
 await check('run/pause and stable paused state',async()=>{await page.locator('#start').click();await page.waitForFunction(()=>Number(document.querySelector('#tick').textContent)>65);await page.locator('#pause').click();await idle();const t=await tick();await page.waitForTimeout(150);assert.equal(await tick(),t);});
 await check('live Stone install preserves pose and tick',async()=>{const before=await snapshot();await page.locator('[data-stone="rover.dart"]').click();await idle();assert.deepEqual(await snapshot(),before);assert.equal(await page.locator('[data-stone="rover.dart"]').getAttribute('aria-pressed'),'true');await page.locator('#step').click();await idle();assert.equal(await tick(),Number(before[0])+1);});
 await check('recorded session exports exact admitted actions',async()=>{const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);await download.saveAs(resolve(out,'session.json'));const {readFile}=await import('node:fs/promises');const data=JSON.parse(await readFile(resolve(out,'session.json')));assert.equal(data.tape.actions.length,await tick());assert.equal(data.assignments.at(-1),'rover.dart');});
 await check('Stop terminates execution and preserves last acknowledged recording',async()=>{await page.locator('#start').click();await page.waitForTimeout(160);await page.locator('#stop').click();const t=await tick();await page.waitForTimeout(180);assert.equal(await tick(),t);assert.equal(await page.locator('body').getAttribute('data-phase'),'stopped');});
 await check('replay works after the original worker is terminated',async()=>{await page.locator('#replay').click();await page.waitForFunction(()=>document.body.dataset.phase==='replay');await page.waitForFunction(()=>document.querySelector('#run-state').textContent==='Verified replay complete');assert.equal(await page.locator('#error').isVisible(),false);});
 await check('comparison still works after Stop then replay',async()=>{await page.locator('#compare').click();await idle();assert.equal(await page.locator('#results tr').count(),3);assert.equal(await page.locator('#results').textContent().then(s=>(s.match(/Goal reached/g)||[]).length),3);});
 await check('full run reaches and brakes at the goal in the browser',async()=>{await page.locator('#reset').click();await idle();await page.locator('#start').click();await page.waitForFunction(()=>document.body.dataset.phase==='complete',{},{timeout:25000});assert.ok(Number(await page.locator('#speed').textContent())<=0.4);});
 await check('keyboard install and one-step controls',async()=>{await page.locator('#reset').click();await idle();await page.locator('h1').click();await page.keyboard.press('Digit3');await idle();assert.equal(await page.locator('[data-stone="rover.anchor"]').getAttribute('aria-pressed'),'true');await page.locator('#step').click();await idle();assert.equal(await tick(),1);});
 await check('desktop design screenshot from actual running engine',async()=>{await page.locator('[data-stone="rover.dart"]').click();await idle();await page.locator('#start').click();await page.waitForFunction(()=>Number(document.querySelector('#tick').textContent)>250);await page.locator('#pause').click();await idle();await page.locator('#compare').click();await idle();await page.screenshot({path:resolve(out,'desktop.png'),fullPage:true});await page.locator('#focus').click();await page.screenshot({path:resolve(out,'rover-detail.png'),fullPage:true});});
 await check('narrow viewport has no horizontal document overflow',async()=>{for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:resolve(out,'mobile-'+width+'.png'),fullPage:true});}});
 await check('reduced-motion setting and plan fallback stay usable',async()=>{await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#viewplan').click();assert.equal(await page.locator('#plan').isVisible(),true);await page.locator('#step').click();await idle();});
 await check('both course comparisons agree exactly with the Node consumer',async()=>{
 const {loadRapier}=await import('../../../experiments/rover3d/engine.mjs');const {compareStones}=await import('../../../experiments/rover3d/session.mjs');const R=await loadRapier();
 for(const courseId of ['flat-lane','ramp-lane']){
 const actual=await page.evaluate(courseId=>new Promise((resolve,reject)=>{const w=new Worker('/worker.mjs',{type:'module'});const timer=setTimeout(()=>{w.terminate();reject(new Error('timeout'));},8000);w.onmessage=e=>{clearTimeout(timer);w.terminate();e.data.ok?resolve(e.data.result):reject(new Error('rejected'));};w.postMessage({id:1,type:'compare',payload:{courseId}});}),courseId);
 assert.deepEqual(actual,JSON.parse(JSON.stringify(compareStones(R,courseId))));
 }
 });
 await check('runtime needs no external asset or service request',async()=>assert.deepEqual(external,[]));
 await check('no browser JavaScript or console errors',async()=>assert.deepEqual(errors,[]));
}finally{await writeFile(resolve(out,'results.json'),JSON.stringify({browser:browser.version(),passed:results,errors,external},null,2));await browser.close();await server.close();}
