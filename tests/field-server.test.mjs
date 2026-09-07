import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {startFieldServer} from '../apps/field-lab/server.mjs';
let server;
test.before(async()=>{server=await startFieldServer(0);});
test.after(async()=>{await server?.close();});
test('field lab exposes only loopback HTML with a strict module and WASM policy',async()=>{
  const r=await fetch(server.url);assert.equal(r.status,200);
  const c=r.headers.get('content-security-policy');assert.match(c,/worker-src 'self'/);assert.match(c,/wasm-unsafe-eval/);
  assert.ok(!c.includes("'unsafe-eval'"));assert.ok(!c.includes("'unsafe-inline'"));
  assert.equal(r.headers.get('x-content-type-options'),'nosniff');
});
for(const path of ['.git/config','.env','packages/lab/cloud.mjs','api/cloud','vendor/package.json','../config/workspace.json'])test('unapproved URL '+path+' is absent',async()=>{
  assert.equal((await fetch(server.url+path)).status,404);
});
test('POST and foreign origin cannot use the read-only lab server',async()=>{
  assert.equal((await fetch(server.url,{method:'POST'})).status,405);
  assert.equal((await fetch(server.url,{headers:{Origin:'https://example.invalid'}})).status,403);
  assert.equal((await fetch(server.url,{headers:{Origin:new URL(server.url).host}})).status,403);
});
test('forged Host is rejected in a real HTTP request',async()=>{
  const status=await new Promise((resolve,reject)=>{const r=request(server.url,{headers:{Host:'untrusted.invalid'}},res=>{res.resume();resolve(res.statusCode);});r.on('error',reject);r.end();});assert.equal(status,403);
});

test('served interface has no obsolete planned-drone claim',async()=>{const html=await (await fetch(server.url)).text();assert.ok(!html.includes('An executable flight host is not installed'));});
