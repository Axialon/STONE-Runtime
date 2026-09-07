import test from 'node:test';import assert from 'node:assert/strict';import {startServer} from '../../apps/rover/server.mjs';
const s=await startServer(0);test.after(()=>s.close());
test('learned mode is explicit in the existing rover and routes stay available',async()=>{const t=await (await fetch(s.url)).text();assert.match(t,/id="enable-model"/);assert.match(t,/data-stone="rover.flow-learned"/);assert.match(t,/id="route-editor"/);});
test('model server exposes only fixed model/bundle/public metadata with correct JSON type',async()=>{
 for(const p of ['model-worker.mjs','packages/learned-rover/identity.mjs','packages/learned-rover/recording.mjs','packages/learned-rover/client-state.mjs','vendor/learned.mjs','models/flow-v0.1.json'])assert.equal((await fetch(s.url+p)).status,200,p);
 const r=await fetch(s.url+'models/flow-v0.1.json');assert.match(r.headers.get('content-type'),/application\/json/);assert.equal((await r.json()).format,'stone.learned-flow/0.1');
 for(const p of ['tools/model-bundle/package.json','experiments/learned-flow/run.mjs','vendor/other.mjs','models/arbitrary.json'])assert.equal((await fetch(s.url+p)).status,404,p);
});
