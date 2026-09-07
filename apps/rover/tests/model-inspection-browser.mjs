import {chromium} from '../node_modules/playwright-core/index.mjs';import {startFieldServer} from '../../field-lab/server.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {loadRapier} from '../../../experiments/rover3d/engine.mjs';import {loadPolicy} from '../../../experiments/learned-flow/browser-runtime.mjs';import {createModelSession} from '../../../packages/learned-rover/session.mjs';
const R=await loadRapier(),policy=await loadPolicy(await readFile(new URL('../../../experiments/learned-flow/model/model.json',import.meta.url),'utf8'));
const session=createModelSession(R,'flat-lane','rover.flow-learned',policy);session.advance(120);session.select('rover.flow');session.advance(5);session.stop();const record=session.export(),raw=JSON.stringify(record);session.dispose();policy.dispose();
const server=await startFieldServer(0),browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/google-chrome',headless:true,chromiumSandbox:true}),c=await browser.newContext({acceptDownloads:true}),p=await c.newPage(),passed=[],errors=[],external=[];
p.on('pageerror',e=>errors.push(e.message));await c.route('**/*',r=>r.request().url().startsWith(server.url)?r.continue():(external.push(r.request().url()),r.abort()));
const idle=()=>p.waitForFunction(()=>document.body.dataset.busy==='false');
const file=async text=>{await p.locator('#inspection-file').setInputFiles({name:'local-policy-recording.json',mimeType:'application/json',buffer:Buffer.from(text)});await idle();};
const ok=s=>{passed.push(s);console.log('PASS '+s);};
await mkdir('evidence/live-model-local',{recursive:true});
async function inspect(){await p.locator('#run-digital').click();await idle();}
try{
 await p.goto(server.url+'#digital');await idle();await p.locator('[data-package="digital.audit"]').click();await file(raw);await inspect();assert.equal(await p.locator('#error').isVisible(),false);assert.match(await p.textContent('#report'),/local model calls/);assert.match(await p.textContent('#digital-state'),/local model calls/);
 const event=p.waitForEvent('download');await p.locator('#export-results').click();const d=await event;await d.saveAs('evidence/live-model-local/policy-audit.json');const r=JSON.parse(await readFile('evidence/live-model-local/policy-audit.json','utf8'));
 assert.equal(r.source.sha256,createHash('sha256').update(raw).digest('hex'));assert.equal(r.verificationModel.inferenceCalls,record.counters.modelCalls);assert.equal(r.summary.ruleDecisions,5);assert.equal(r.summary.status,'stopped');assert.equal(r.verification,'policy-and-engine-reexecution');ok('Digital AUDIT reexecutes identified model/rule actions with exact byte identity and actual model counts');
 const bad=structuredClone(record);bad.tape.actions[80].throttle=.333;await file(JSON.stringify(bad));await inspect();assert.equal(await p.locator('#error').isVisible(),true);assert.equal(await p.locator('#export-results').isDisabled(),true);ok('Altered model commands are rejected without retaining a stale successful report');
 await file(raw);await p.selectOption('#inspection-target','drone');await inspect();assert.equal(await p.locator('#error').isVisible(),true);ok('Model replay cannot be misrepresented as another machine host');
 await p.selectOption('#inspection-target','auto');await c.route('**/models/flow-v0.1.json',r=>r.fulfill({status:404,body:'missing'}));await file(raw);await inspect();assert.equal(await p.locator('#error').isVisible(),true);assert.equal(await p.locator('#export-results').isDisabled(),true);ok('Missing verification model yields no fabricated replay result');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);ok('Model-aware inspection stays local and does not install uploaded code');
}finally{await writeFile('evidence/live-model-local/model-audit-results.json',JSON.stringify({passed,errors,external},null,2));await browser.close();await server.close();}
