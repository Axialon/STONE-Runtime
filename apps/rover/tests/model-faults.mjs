import {chromium} from '../node_modules/playwright-core/index.mjs';import {startServer} from '../server.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const s=await startServer(0),b=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true}),passed=[];
const source=await readFile(new URL('../model-worker.mjs',import.meta.url),'utf8');
const ok=x=>{passed.push(x);console.log('PASS '+x);};
async function fresh(setup){const c=await b.newContext(),p=await c.newPage();p.setDefaultTimeout(15000);if(setup)await setup(c);await p.goto(s.url);await p.waitForFunction(()=>document.body.dataset.phase==='ready');return{c,p};}
const enable=async p=>{await p.locator('#enable-model').check();};
const ready=p=>p.waitForFunction(()=>document.body.dataset.phase==='ready'&&document.body.dataset.busy==='false');
async function recover(p){await p.locator('#enable-model').uncheck();await ready(p);await p.locator('#step').click();await p.waitForFunction(()=>document.querySelector('#tick').textContent==='1');}
try{
 for(const [name,body,status] of [['missing model','missing',404],['changed model','{}',200],['oversized model',' '.repeat(70000),200],['invalid model UTF8',Buffer.from([255]),200]]){
  const {c,p}=await fresh(c=>c.route('**/models/flow-v0.1.json',r=>r.fulfill({status,body,contentType:'application/json'})));
  try{await enable(p);await p.waitForFunction(()=>document.body.dataset.phase==='error');assert.equal(await p.textContent('#tick'),'0');assert.match(await p.textContent('#error'),/No rule fallback/);assert.equal(await p.textContent('#inference-count'),'0');await recover(p);ok(name+' fails explicitly without executing a fallback; rules remain recoverable');}finally{await c.close();}
 }
 {
  const {c,p}=await fresh(c=>c.route('**/vendor/learned.mjs',r=>r.fulfill({status:404,body:'missing'})));
  try{await enable(p);await p.waitForFunction(()=>document.body.dataset.phase==='error');await recover(p);ok('Missing built inference bundle cannot leave a permanent loading state');}finally{await c.close();}
 }
 {
  const {c,p}=await fresh();try{await enable(p);await ready(p);await p.locator('#start').click();await p.waitForFunction(()=>Number(document.querySelector('#inference-count').textContent)>10);await p.locator('#pause').click();await p.waitForFunction(()=>document.body.dataset.busy==='false');
   await c.route('**/models/flow-v0.1.json',r=>r.fulfill({status:404,body:'missing'}));await p.locator('#reset').click();await p.waitForFunction(()=>document.body.dataset.phase==='error');assert.equal(await p.textContent('#inference-count'),'0');assert.equal(await p.locator('#export').isDisabled(),true);ok('A failed reload clears old inference counts instead of presenting them as new execution');
  }finally{await c.close();}
 }
 {
  const {c,p}=await fresh(c=>c.route('**/models/flow-v0.1.json',()=>{}));try{await enable(p);await p.waitForFunction(()=>document.body.dataset.busy==='true');await p.locator('#stop').click();assert.equal(await p.getAttribute('body','data-phase'),'stopped');await recover(p);ok('Stop cancels an actually pending model download independently of its reply');}finally{await c.close();}
 }
 const hung=source.replace('result=session.advance(p.steps);','result=(()=>{while(true){}})();');assert.notEqual(hung,source);
 for(const watchdog of [false,true]){
  const {c,p}=await fresh(c=>c.route('**/model-worker.mjs',r=>r.fulfill({contentType:'text/javascript',body:hung})));
  try{await enable(p);await ready(p);await p.locator('#start').click();await p.waitForFunction(()=>document.body.dataset.busy==='true');
   if(watchdog)await p.waitForFunction(()=>document.body.dataset.phase==='error');else{await p.locator('#stop').click();assert.equal(await p.getAttribute('body','data-phase'),'stopped');}
   assert.equal(await p.textContent('#tick'),'0');await recover(p);ok(watchdog?'Watchdog terminates a genuinely infinite model worker':'Stop terminates a genuinely infinite model worker');
  }finally{await c.close();}
 }
 {
  const malformed=source.replace('result=session.advance(p.steps);',"result=(()=>{const x=structuredClone(session.advance(p.steps));x.snapshot.execution.modelCalls++;return x;})();");
  const {c,p}=await fresh(c=>c.route('**/model-worker.mjs',r=>r.fulfill({contentType:'text/javascript',body:malformed})));
  try{await enable(p);await ready(p);await p.locator('#step').click();await p.waitForFunction(()=>document.body.dataset.phase==='error');assert.equal(await p.textContent('#tick'),'0');assert.equal(await p.locator('#export').isDisabled(),true);ok('A forged inference-count reply is rejected before display or recording advances');}finally{await c.close();}
 }
 {
  const {c,p}=await fresh();try{await enable(p);await ready(p);await p.locator('#step').click();await p.waitForFunction(()=>document.body.dataset.busy==='false');
   await p.evaluate(()=>{const gl=document.querySelector('#viewport canvas').getContext('webgl2');gl.getExtension('WEBGL_lose_context').loseContext();});await p.waitForFunction(()=>!document.querySelector('#plan').hidden);
   await p.locator('#step').click();await p.waitForFunction(()=>document.querySelector('#tick').textContent==='2');ok('Actual graphics-context loss preserves model execution in Plan view');
  }finally{await c.close();}
 }
}finally{await mkdir('evidence/live-model-local',{recursive:true});await writeFile('evidence/live-model-local/fault-results.json',JSON.stringify({passed},null,2));await b.close();await s.close();}
