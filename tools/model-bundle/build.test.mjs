import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
import {buildBundle} from './build.mjs';
test('pinned offline build produces deterministic browser ESM, source digests and upstream notices',async()=>{
 const a=await buildBundle(),b=await buildBundle();assert.equal(a.code,b.code);assert.equal(a.metadata.bundleSha256,createHash('sha256').update(a.code).digest('hex'));assert.deepEqual(a.metadata,b.metadata);
 assert.equal(a.metadata.builder,'esbuild-wasm/0.28.2');assert.equal(a.metadata.modelSha256,'d9a1ef32fa555b5f9d8fdd326a90b59f8c03228b3854564d99bed708d0a210c2');
 assert.ok(Object.keys(a.metadata.sources).some(k=>k.endsWith('ml-cart/cart.js')));assert.ok(Object.keys(a.metadata.sources).every(k=>!k.startsWith('/')&&!k.includes('..')));
 assert.ok(a.code.includes('fetchPolicy'));assert.ok(!a.code.includes('node:fs'));assert.match(a.notices,/ml-cart/);assert.match(a.notices,/Permission is hereby granted/);
});
test('the build graph adds one exact tool package and does not enable lifecycle hooks',()=>{
 const lock=JSON.parse(readFileSync(new URL('./package-lock.json',import.meta.url)));const entries=Object.entries(lock.packages).filter(([k])=>k);assert.equal(entries.length,1);
 const [,p]=entries[0];assert.equal(p.version,'0.28.2');assert.equal(p.license,'MIT');assert.ok(p.integrity.startsWith('sha512-'));assert.equal(p.hasInstallScript,undefined);
});
