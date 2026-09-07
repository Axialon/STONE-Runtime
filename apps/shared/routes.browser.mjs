import {chromium} from '../rover/node_modules/playwright-core/index.mjs';
import {startFieldServer} from '../field-lab/server.mjs';import {startServer} from '../rover/server.mjs';
import {loadRapier} from '../../experiments/rover3d/engine.mjs';import {defaultRoute,parseRoute} from '../../packages/routes/contract.mjs';
import {replayRoute,compareRoute} from '../../packages/routes/runtime.mjs';
import assert from 'node:assert/strict';import {mkdir,readFile,writeFile} from 'node:fs/promises';
const field=await startFieldServer(0),rover=await startServer(0),R=await loadRapier(),dir='evidence/routes-local';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});
const context=await browser.newContext({viewport:{width:1400,height:1000},acceptDownloads:true}),page=await context.newPage();page.setDefaultTimeout(15000);
const passed=[],errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',r=>[field.url,rover.url].some(u=>r.request().url().startsWith(u))?r.continue():(external.push(r.request().url()),r.abort()));
const idle=()=>page.waitForFunction(()=>document.body.dataset.busy==='false');
const ready=()=>page.waitForFunction(()=>document.body.dataset.phase==='ready'&&document.body.dataset.busy==='false');
const route=id=>page.locator('[data-route="'+id+'"]');
let downloadId=0;
async function download(button){const [d]=await Promise.all([page.waitForEvent('download'),button.click()]),file=dir+'/download-'+(++downloadId)+'.json';await d.saveAs(file);return JSON.parse(await readFile(file,'utf8'));}
const ok=s=>{passed.push(s);console.log('PASS '+s);};
try{
 await page.goto(field.url+'#digital');await page.waitForFunction(()=>document.body.dataset.host==='digital');assert.equal(await page.getAttribute('body','data-ready'),'true');
 assert.equal(await page.locator('#host-navigation [data-destination]').count(),4);assert.equal(await page.locator('#host-navigation [aria-current="page"]').getAttribute('data-destination'),'digital');ok('Direct Digital entry exposes all hosts and finishes startup');
 await page.locator('#host-navigation [data-host="drone"]').click();await ready();assert.equal(new URL(page.url()).hash,'#drone');
 await page.reload();await ready();assert.equal(await page.getAttribute('body','data-host'),'drone');
 await page.locator('#host-navigation [data-host="humanoid"]').click();await ready();await page.goBack();await ready();assert.equal(await page.getAttribute('body','data-host'),'drone');ok('Host deep links survive refresh and browser Back');
 for(const host of ['rover','drone','humanoid']){
  await page.goto(host==='rover'?rover.url:field.url+'#'+host);if(host!=='rover')await page.waitForFunction(h=>document.body.dataset.host===h,host);await ready();if(!(await page.locator('#route-editor details').getAttribute('open')!==null))await page.locator('#route-editor summary').click();
  assert.equal(await page.locator('#host-navigation [data-destination]').count(),4);
  const initial=await download(route('export'));assert.deepEqual(initial,defaultRoute(host));
  const axis=host==='drone'?'y':host==='humanoid'?'y':'x',value=host==='drone'?'1.9':host==='humanoid'?'1.2':'.1';
  await page.locator('[data-route="rows"] input[data-index="0"][data-axis="'+axis+'"]').fill(value);
  await route('name').fill(host+' route test');const applied=await download(route('export'));parseRoute(JSON.stringify(applied),host);
  assert.equal(await page.textContent('#tick'),'0');await route('apply').click();await ready();assert.equal(await page.textContent('#tick'),'0');assert.match(await route('badge').textContent(),/Custom route/);
  await page.locator('#start').click();await page.waitForFunction(()=>Number(document.querySelector('#tick').textContent)>12);await page.locator('#pause').click();await idle();
  const before=Number(await page.textContent('#tick'));await route('name').fill('Unapplied draft');assert.equal(Number(await page.textContent('#tick')),before);
  await page.locator(host==='rover'?'[data-stone="rover.dart"]':'[data-package="'+(host==='drone'?'drone.agile':'humanoid.brisk')+'"]').click();await idle();assert.equal(Number(await page.textContent('#tick')),before);
  await page.locator('#step').click();await idle();assert.equal(Number(await page.textContent('#tick')),before+1);
  await page.locator('#stop').click();await idle();const recording=await download(page.locator(host==='rover'?'#export':'#export-session'));
  assert.deepEqual(recording.route,applied);assert.equal(recording.finalStatus,'stopped');assert.equal(recording.actions.length,before+1);
  const replay=replayRoute(R,JSON.stringify(recording),host);assert.equal(replay.state.frame.status,'stopped');assert.equal(replay.state.frame.completed,0);
  await page.locator('#replay').click();await idle();assert.equal(await page.locator('#error').isVisible(),false);ok(host+' route uses actual engine decisions, stable swaps and route-bound Stop/replay');
  if(host==='rover'){await page.locator('#live').click();}else{await page.locator('#live').click();}
  await page.locator('#compare').click();await idle();const result=await download(page.locator('#export-results')),expected=compareRoute(R,applied);
  assert.deepEqual(result.route,applied);assert.deepEqual(result.results,expected.results);assert.equal(result.scope,'custom-route');assert.ok(result.results.every(r=>r.status==='succeeded'));ok(host+' custom comparison matches Node and remains separate from fixed benchmarks');
  await page.screenshot({path:dir+'/'+host+'-route.png',fullPage:true});
  await route('fixed').click();await ready();assert.match(await route('badge').textContent(),/Fixed benchmark/);assert.equal(await page.textContent('#tick'),'0');ok(host+' returns to a fixed benchmark without altering its controller');
 }
 await page.goto(field.url+'#drone');await page.waitForFunction(()=>document.body.dataset.host==='drone');await ready();if(await page.locator('#route-editor details').getAttribute('open')===null)await page.locator('#route-editor summary').click();
 const old=await download(route('export'));await route('add').click();assert.equal(await page.locator('[data-route="rows"] tr').count(),4);
 await page.locator('[data-action="up"][data-index="3"]').click();await page.locator('[data-action="remove"][data-index="2"]').click();assert.equal(await page.locator('[data-route="rows"] tr').count(),3);ok('Checkpoint rows can be added, reordered and removed');
 await route('reset').click();const canvas=route('canvas'),box=await canvas.boundingBox();
 await page.mouse.click(box.x+box.width*.75,box.y+box.height*.7);assert.equal(await page.locator('[data-route="rows"] tr').count(),4);
 let draft=await download(route('export'));assert.ok(draft.points[3].x>1&&draft.points[3].z<0);ok('Clicking the plan adds a bounded X/Z node with separate altitude');
 await route('reset').click();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.55,{steps:4});await page.mouse.up();const moved=await download(route('export'));assert.ok(moved.points[0].x>.4);assert.equal(moved.points[0].y,1.8);ok('Dragging changes a selected point in the displayed plane without changing altitude');
 await page.locator('#host-navigation [data-host="humanoid"]').click();await ready();await page.locator('#host-navigation [data-host="drone"]').click();await ready();assert.deepEqual(await download(route('export')),moved);ok('Each host keeps its own route draft when changing tabs');
 await route('reset').click();await page.locator('[data-route="rows"] input[data-index="0"][data-axis="y"]').fill('9');assert.equal(await route('apply').isDisabled(),true);ok('Invalid flight altitude cannot be applied');
 await route('file').setInputFiles({name:'route.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});await page.waitForFunction(()=>document.querySelector('[data-route="message"]').textContent.includes('Imported draft'));
 assert.deepEqual(await download(route('export')),old);assert.match(await route('badge').textContent(),/Fixed benchmark/);ok('Native JSON route import is local and remains unapplied');
 for(const bad of [Buffer.alloc(8193,32),Buffer.from([255]),Buffer.from(JSON.stringify(defaultRoute('rover')))]){
  await route('file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:bad});await page.waitForFunction(()=>document.querySelector('[data-route="message"]').textContent.includes('Import rejected'));assert.deepEqual(await download(route('export')),old);
 }ok('Oversized, malformed UTF-8 and cross-host imports retain the prior valid draft');
 for(const width of [390,320]){await page.setViewportSize({width,height:900});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:dir+'/route-'+width+'.png',fullPage:true});}ok('Navigation and expanded route editor fit 390px and 320px layouts');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);ok('Custom-route workflows need no external request and produce no page errors');
}finally{await page.screenshot({path:dir+'/last-state.png',fullPage:true}).catch(()=>{});await writeFile(dir+'/results.json',JSON.stringify({passed,errors,external},null,2));await browser.close();await field.close();await rover.close();}
