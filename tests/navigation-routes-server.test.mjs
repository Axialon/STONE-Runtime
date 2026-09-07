import test from 'node:test';import assert from 'node:assert/strict';
import {startServer} from '../apps/rover/server.mjs';import {startFieldServer} from '../apps/field-lab/server.mjs';
for(const [name,start] of [['rover',startServer],['field',startFieldServer]]){
 test(name+' includes the persistent host navigation and route editor mount',async()=>{const s=await start(0);try{const text=await(await fetch(s.url)).text();assert.match(text,/id="host-navigation"/);assert.match(text,/id="route-editor"/);}finally{await s.close();}});
 test(name+' serves only reviewed shared route/navigation code',async()=>{const s=await start(0);try{for(const path of ['shared/navigation.mjs','shared/route-editor.mjs','shared/workbench.css','packages/routes/contract.mjs'])assert.equal((await fetch(s.url+path)).status,200,path);assert.equal((await fetch(s.url+'shared/../../.env')).status,404);}finally{await s.close();}});
}
