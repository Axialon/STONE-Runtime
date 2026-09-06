import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {startServer} from '../apps/rover/server.mjs';
let server;test.before(async()=>{server=await startServer(0);});test.after(async()=>{await server?.close();});
test('loopback server serves HTML with restrictive headers and WASM permission',async()=>{const r=await fetch(server.url);assert.equal(r.status,200);const c=r.headers.get('content-security-policy');assert.match(c,/default-src 'none'/);assert.match(c,/worker-src 'self'/);assert.match(c,/wasm-unsafe-eval/);assert.equal(c.includes("'unsafe-eval'"),false);assert.equal(r.headers.get('x-content-type-options'),'nosniff');});
for(const path of ['/vendor/rapier.mjs','/vendor/three.module.js','/vendor/three.core.js','/vendor/OrbitControls.js','/rover/world.mjs','/rover/contract.mjs','/rover/session.mjs','/rover/stones.mjs','/worker.mjs'])test(`explicitly served module ${path}`,async()=>{const r=await fetch(server.url+path.slice(1));assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/javascript/);});
for(const path of ['/AGENTS.md','/.git/config','/.env','/node_modules/three/package.json','/rover/engine.mjs','/%2e%2e/config/workspace.json'])test(`unapproved path blocked ${path}`,async()=>{assert.equal((await fetch(server.url+path.slice(1))).status,404);});
test('cross-origin requests and writes are rejected',async()=>{assert.equal((await fetch(server.url,{headers:{Origin:'https://example.invalid'}})).status,403);assert.equal((await fetch(server.url,{method:'POST'})).status,405);const code=await new Promise((ok,no)=>{const r=request(server.url,{headers:{Host:'evil.invalid'}},res=>{res.resume();ok(res.statusCode);});r.on('error',no);r.end();});assert.equal(code,403);});

test('Origin must be an exact HTTP origin, not a bare allowed host',async()=>{assert.equal((await fetch(server.url,{headers:{Origin:new URL(server.url).host}})).status,403);});
