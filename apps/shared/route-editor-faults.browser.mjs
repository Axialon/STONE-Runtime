import {chromium} from '../rover/node_modules/playwright-core/index.mjs';import {startFieldServer} from '../field-lab/server.mjs';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const server=await startFieldServer(0),browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true});const page=await browser.newPage();const passed=[];page.setDefaultTimeout(12000);
try{
 await page.goto(server.url+'#drone');await page.waitForFunction(()=>document.body.dataset.phase==='ready');
 const stale=await page.evaluate(async()=>{
  const {createRouteEditor}=await import('/shared/route-editor.mjs');const div=document.createElement('section');document.body.append(div);let finish;
  const editor=createRouteEditor(div,{onApply:()=>new Promise(resolve=>finish=resolve)});editor.setHost('drone');div.querySelector('[data-route="apply"]').click();editor.setHost('humanoid');finish();await new Promise(r=>setTimeout(r,20));
  const message=div.querySelector('[data-route="message"]').textContent,applied=editor.applied();div.remove();return {message,applied};
 });assert.equal(stale.applied,null);assert.ok(!stale.message.includes('Applied drone'));passed.push('A late Apply completion cannot overwrite the newly selected host status');
 const rejected=await page.evaluate(async()=>{
  const {createRouteEditor}=await import('/shared/route-editor.mjs');const div=document.createElement('section');document.body.append(div);
  const editor=createRouteEditor(div,{onApply:async()=>{throw new Error('Rejected fixture');}});editor.setHost('drone');await div.querySelector('[data-route="apply"]').onclick();
  const result={message:div.querySelector('[data-route="message"]').textContent,applied:editor.applied()};div.remove();return result;
 });assert.match(rejected.message,/failed|rejected/i);assert.equal(rejected.applied,null);passed.push('Failed application does not keep a falsely applied route');
 await page.locator('#route-editor summary').click();const canvas=page.locator('[data-route="canvas"]'),box=await canvas.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.evaluate(()=>{const c=document.querySelector('[data-route="canvas"]');c.releasePointerCapture(1);});
 await page.mouse.move(box.x+box.width*.8,box.y+box.height*.7);await page.mouse.up();
 assert.equal(await page.locator('[data-route="rows"] input[data-index="0"][data-axis="x"]').inputValue(),'0');passed.push('Lost pointer capture ends a drag rather than moving a checkpoint later');
 console.log(passed.map(s=>'PASS '+s).join(String.fromCharCode(10)));
}finally{await mkdir('evidence/routes-local',{recursive:true});await writeFile('evidence/routes-local/editor-fault-results.json',JSON.stringify({passed},null,2));await browser.close();await server.close();}
